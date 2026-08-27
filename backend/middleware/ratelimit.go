package middleware

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/services/ratelimit"
	"wanpictures-backend/utils"
)

const (
	rateLimitQPSWindow = time.Second       // QPS semantics: fixed 1s sliding window
	rateLimitRPMWindow = time.Minute       // RPM semantics: fixed 60s sliding window
	rateLimitCacheTTL  = 5 * time.Second   // admin config takes effect within this delay
	rateLimitDimUser   = "user"            // logged-in dimension, keyed by user ID
	rateLimitDimAnon   = "anon"            // anonymous dimension, keyed by client IP
)

type userLimits struct {
	qps *int // NULL=follow global, 0=unlimited, >0=custom
	rpm *int // NULL=follow global, 0=unlimited, >0=custom
}

type rateLimitCache struct {
	mu           sync.RWMutex
	global       models.UploadQuotaSettings
	globalValid  bool
	globalExpire time.Time
	users        map[uint]userLimitsWithExpiry
}

type userLimitsWithExpiry struct {
	limits   userLimits
	expireAt time.Time
}

var rlCache = &rateLimitCache{users: make(map[uint]userLimitsWithExpiry)}

// loadGlobalLimits reads global QPS/RPM thresholds from system settings with a short TTL cache
func (rc *rateLimitCache) loadGlobalLimits() (anonQPS, anonRPM, userQPS, userRPM int) {
	rc.mu.RLock()
	if rc.globalValid && time.Now().Before(rc.globalExpire) {
		g := rc.global
		rc.mu.RUnlock()
		return g.EffectiveAnonymousUploadQPS(), g.EffectiveAnonymousUploadRPM(),
			g.EffectiveUserUploadQPS(), g.EffectiveUserUploadRPM()
	}
	rc.mu.RUnlock()

	quotas := models.DefaultUploadQuotaSettings()
	var setting models.SystemSetting
	if err := database.DB.Where(map[string]interface{}{"key": "upload_quotas"}).First(&setting).Error; err == nil && setting.Value != "" {
		if err := json.Unmarshal([]byte(setting.Value), &quotas); err == nil {
			rc.mu.Lock()
			rc.global = quotas
			rc.globalValid = true
			rc.globalExpire = time.Now().Add(rateLimitCacheTTL)
			rc.mu.Unlock()
		}
	}
	return quotas.EffectiveAnonymousUploadQPS(), quotas.EffectiveAnonymousUploadRPM(),
		quotas.EffectiveUserUploadQPS(), quotas.EffectiveUserUploadRPM()
}

// loadUserLimits reads per-account overrides (users.upload_qps / upload_rpm) with a short TTL cache
func (rc *rateLimitCache) loadUserLimits(userID uint) (qps, rpm *int, ok bool) {
	now := time.Now()

	rc.mu.RLock()
	entry, found := rc.users[userID]
	if found && now.Before(entry.expireAt) {
		rc.mu.RUnlock()
		return entry.limits.qps, entry.limits.rpm, true
	}
	rc.mu.RUnlock()

	var user models.User
	if err := database.DB.Select("id", "upload_qps", "upload_rpm").First(&user, userID).Error; err != nil {
		return nil, nil, false
	}

	limits := userLimits{qps: user.UploadQPS, rpm: user.UploadRPM}
	rc.mu.Lock()
	rc.users[userID] = userLimitsWithExpiry{limits: limits, expireAt: now.Add(rateLimitCacheTTL)}
	rc.mu.Unlock()
	return limits.qps, limits.rpm, true
}

// resolveUserLimits merges per-account overrides over the role-global defaults (field-wise)
func resolveUserLimits(override userLimits, gQPS, gRPM int) (qpsLimit, rpmLimit int64) {
	if override.qps != nil {
		qpsLimit = int64(*override.qps)
	} else {
		qpsLimit = int64(gQPS)
	}
	if override.rpm != nil {
		rpmLimit = int64(*override.rpm)
	} else {
		rpmLimit = int64(gRPM)
	}
	return qpsLimit, rpmLimit
}

// UploadRateLimit enforces Redis sliding-window QPS + RPM limits for upload endpoints.
// Dimension: logged-in users are keyed by user ID, anonymous visitors by client IP.
// Threshold priority (per field): per-account users.upload_qps/upload_rpm
// (NULL=follow global, 0=unlimited, >0=override) -> global defaults.
// Both windows are checked atomically with all-or-nothing recording: a request
// rejected by one constraint never consumes quota of the other.
// The check is fail-closed: if Redis is unavailable the request is rejected with 503.
func UploadRateLimit() gin.HandlerFunc {
	limiter := ratelimit.NewLimiter(database.Rdb)

	return func(c *gin.Context) {
		dimension, identity, userID := resolveRateLimitIdentity(c)

		var qpsLimit, rpmLimit int64
		if dimension == rateLimitDimUser {
			_, _, userQPS, userRPM := rlCache.loadGlobalLimits()
			qpsPtr, rpmPtr, found := rlCache.loadUserLimits(userID)
			override := userLimits{}
			if found {
				override = userLimits{qps: qpsPtr, rpm: rpmPtr}
			}
			qpsLimit, rpmLimit = resolveUserLimits(override, userQPS, userRPM)
		} else {
			anonQPS, anonRPM, _, _ := rlCache.loadGlobalLimits()
			qpsLimit, rpmLimit = int64(anonQPS), int64(anonRPM)
		}

		qpsKey, rpmKey := limiter.BuildKeys(dimension, identity)
		result, err := limiter.AllowBoth(c.Request.Context(), qpsKey, rpmKey,
			qpsLimit, rpmLimit, rateLimitQPSWindow, rateLimitRPMWindow)
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, models.ErrorResponse(http.StatusServiceUnavailable,
				"限流服务暂时不可用，请稍后重试（Rate limiter temporarily unavailable）"))
			c.Abort()
			return
		}

		if !result.Allowed {
			retrySeconds := int(math.Ceil(result.RetryAfter.Seconds()))
			if retrySeconds < 1 {
				retrySeconds = 1
			}
			c.Header("Retry-After", strconv.Itoa(retrySeconds))
			c.JSON(http.StatusTooManyRequests, models.ErrorResponse(http.StatusTooManyRequests,
				rateLimitMessage(result.Constraint)))
			c.Abort()
			return
		}

		c.Next()
	}
}

// rateLimitMessage tailors the rejection message to the binding constraint
func rateLimitMessage(constraint ratelimit.BindingConstraint) string {
	switch constraint {
	case ratelimit.BindRPM:
		return "上传请求过于频繁（已达每分钟上限），请稍后再试（Rate limit exceeded）"
	case ratelimit.BindBoth:
		return "上传请求过于频繁（每秒与每分钟上限均已触发），请稍后再试（Rate limit exceeded）"
	default:
		return "上传请求过于频繁，请稍后再试（Rate limit exceeded）"
	}
}

// resolveRateLimitIdentity determines which dimension and key the request counts against
func resolveRateLimitIdentity(c *gin.Context) (dimension string, identity string, userID uint) {
	clientIP := c.ClientIP()
	if clientIP == "" {
		clientIP = "127.0.0.1"
	}

	// Reuse the context set by JWTAuthMiddleware when present
	if u, exists := c.Get("currentUser"); exists {
		if user, ok := u.(models.User); ok && user.ID > 0 {
			id := strconv.FormatUint(uint64(user.ID), 10)
			return rateLimitDimUser, id, user.ID
		}
	}

	// Optionally parse Bearer token so logged-in callers get their own bucket
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := utils.ParseToken(tokenStr); err == nil {
			var user models.User
			if err := database.DB.First(&user, claims.UserID).Error; err == nil {
				id := strconv.FormatUint(uint64(user.ID), 10)
				return rateLimitDimUser, id, user.ID
			}
		}
		// Developer API keys (wpk_...) count against their owner's bucket
		if utils.IsApiKeyToken(tokenStr) {
			if key, ok := lookupApiKey(tokenStr); ok {
				var user models.User
				if err := database.DB.First(&user, key.UserID).Error; err == nil {
					id := strconv.FormatUint(uint64(user.ID), 10)
					return rateLimitDimUser, id, user.ID
				}
			}
		}
	}

	return rateLimitDimAnon, clientIP, 0
}
