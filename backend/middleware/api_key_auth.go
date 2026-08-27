package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/utils"
)

// ApiKeyAuthMiddleware authenticates requests to the dedicated open upload
// endpoints (/openapi/v1/*) using a developer API key passed as
// "Authorization: Bearer <key>". JWT tokens are NOT accepted here — the
// token must carry the wpk_ prefix.
//
// On success the owning user, role, and resolved ApiKey are stored in the
// context so downstream handlers can reuse the standard upload pipeline.
func ApiKeyAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "authorization header required"))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && strings.EqualFold(parts[0], "Bearer")) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid authorization format, expected 'Bearer <api_key>'"))
			c.Abort()
			return
		}

		token := parts[1]
		if !utils.IsApiKeyToken(token) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid api key: expected a token starting with '"+utils.ApiKeyPrefix+"'"))
			c.Abort()
			return
		}

		key, ok := lookupApiKey(token)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid or revoked api key"))
			c.Abort()
			return
		}

		now := time.Now()
		if key.IsExpired(now) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "api key has expired"))
			c.Abort()
			return
		}

		// Verify the owning user still exists and is active
		var user models.User
		if err := database.DB.First(&user, key.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "api key owner not found"))
			c.Abort()
			return
		}

		role := user.Role
		if role == "" {
			role = "user"
		}

		// Best-effort last-used tracking (never fails the request)
		_ = database.DB.Model(&models.ApiKey{}).Where("id = ?", key.ID).
			UpdateColumn("last_used_at", now).Error

		c.Set("userID", user.ID)
		c.Set("username", user.Username)
		c.Set("role", role)
		c.Set("currentUser", user)
		c.Set("apiKey", *key)

		c.Next()
	}
}

// lookupApiKey resolves an API key by its stored SHA-256 hash
func lookupApiKey(token string) (*models.ApiKey, bool) {
	hash := utils.HashApiKey(token)
	var key models.ApiKey
	// GORM's default scope excludes soft-deleted (revoked) keys automatically
	if err := database.DB.Where("key_hash = ?", hash).First(&key).Error; err != nil {
		return nil, false
	}
	return &key, true
}
