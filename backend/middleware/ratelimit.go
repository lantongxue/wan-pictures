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
	rateLimitWindow   = time.Second     // QPS semantics: fixed 1s sliding window
	rateLimitCacheTTL = 5 * time.Second // admin config takes effect within this delay
	rateLimitDimUser  = "user"          // logged-in dimension, keyed by user ID
	rateLimitDimAnon  = "anon"          // anonymous dimension, keyed by client IP
)

type userQPSEntry struct {
	qps      *int
	expireAt time.Time
}

type rateLimitCache struct {
	mu           sync.RWMutex
	global       models.UploadQuotaSettings
	globalValid  bool
	globalExpire time.Time
	users        map[uint]userQPSEntry
}

var rlCache = &rateLimitCache{users: make(map[uint]userQPSEntry)}

// loadGlobalQPS reads global QPS thresholds from system settings with a short TTL cache
func (rc *rateLimitCache) loadGlobalQPS() (anonymousQPS, userQPS int) {
	rc.mu.RLock()
	if rc.globalValid && time.Now().Before(rc.globalExpire) {
		a := rc.global.EffectiveAnonymousUploadQPS()
		u := rc.global.EffectiveUserUploadQPS()
		rc.mu.RUnlock()
		return a, u
	}
	rc.mu.RUnlock()

	quotas := models.DefaultUploadQuotaSettings()
	var setting models.SystemSetting
	if err := database.DB.Where("`key` = ? OR key = ?", "upload_quotas", "upload_quotas").First(&setting).Error; err == nil && setting.Value != "" {
		if err := json.Unmarshal([]byte(setting.Value), &quotas); err == nil {
			rc.mu.Lock()
			rc.global = quotas
			rc.globalValid = true
			rc.globalExpire = time.Now().Add(rateLimitCacheTTL)
			rc.mu.Unlock()
		}
	}
	return quotas.EffectiveAnonymousUploadQPS(), quotas.EffectiveUserUploadQPS()
}

// loadUserQPS reads the per-account override (users.upload_qps) with a short TTL cache
func (rc *rateLimitCache) loadUserQPS(userID uint) *int {
	now := time.Now()

	rc.mu.RLock()
	entry, ok := rc.users[userID]
	if ok && now.Before(entry.expireAt) {
		qps := entry.qps
		rc.mu.RUnlock()
		return qps
	}
	rc.mu.RUnlock()

	var user models.User
	if err := database.DB.Select("id", "upload_qps").First(&user, userID).Error; err != nil {
		return nil
	}

	rc.mu.Lock()
	rc.users[userID] = userQPSEntry{qps: user.UploadQPS, expireAt: now.Add(rateLimitCacheTTL)}
	rc.mu.Unlock()
	return user.UploadQPS
}

// UploadRateLimit enforces Redis sliding-window QPS limits for upload endpoints.
// Dimension: logged-in users are keyed by user ID, anonymous visitors by client IP.
// Threshold priority: per-account users.upload_qps (NULL=follow global, 0=unlimited,
// >0=override) -> global anonymous_upload_qps / user_upload_qps.
// The check is fail-closed: if Redis is unavailable the request is rejected with 503.
func UploadRateLimit() gin.HandlerFunc {
	limiter := ratelimit.NewLimiter(database.Rdb)

	return func(c *gin.Context) {
		dimension, identity, userID := resolveRateLimitIdentity(c)

		var limit int64
		if dimension == rateLimitDimUser {
			if override := rlCache.loadUserQPS(userID); override != nil {
				limit = int64(*override)
			} else {
				_, userQPS := rlCache.loadGlobalQPS()
				limit = int64(userQPS)
			}
		} else {
			anonymousQPS, _ := rlCache.loadGlobalQPS()
			limit = int64(anonymousQPS)
		}

		result, err := limiter.Allow(c.Request.Context(), limiter.BuildKey(dimension, identity), limit, rateLimitWindow)
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
				"上传请求过于频繁，请稍后再试（Rate limit exceeded）"))
			c.Abort()
			return
		}

		c.Next()
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
	}

	return rateLimitDimAnon, clientIP, 0
}
