package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/utils"
)

// JWTAuthMiddleware checks and validates the Bearer token in the Authorization header
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "authorization header required"))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && strings.EqualFold(parts[0], "Bearer")) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid authorization format, expected 'Bearer <token>'"))
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := utils.ParseToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid or expired token: "+err.Error()))
			c.Abort()
			return
		}

		// Verify user exists in database
		var user models.User
		if err := database.DB.First(&user, claims.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "user not found or inactive"))
			c.Abort()
			return
		}

		// Store user and user claims in context
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("currentUser", user)

		c.Next()
	}
}

// RequireAdmin verifies that the authenticated user has admin privileges
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "admin" {
			c.JSON(http.StatusForbidden, models.ErrorResponse(http.StatusForbidden, "admin privileges required"))
			c.Abort()
			return
		}
		c.Next()
	}
}
