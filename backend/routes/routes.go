package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/config"
	"wanpictures-backend/controllers"
	"wanpictures-backend/middleware"
	"wanpictures-backend/models"
)

// SetupRouter sets up Gin router, middlewares, and API route groups
func SetupRouter() *gin.Engine {
	cfg := config.AppConfig
	gin.SetMode(cfg.GinMode)

	r := gin.New()

	// Global Middlewares
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CorsMiddleware())

	// Root & Health check endpoints
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "wanpictures-backend-api",
			"version": "1.1.0",
		})
	})

	// Controllers
	authCtrl := controllers.NewAuthController()
	adminCtrl := controllers.NewAdminController()
	uploadCtrl := controllers.NewUploadController()

	// Static route to serve uploaded local image assets
	r.Static("/uploads", "./uploads")

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// Public Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authCtrl.Register)
			auth.POST("/login", authCtrl.Login)
		}

		// Protected Auth routes (Requires JWT)
		protectedAuth := v1.Group("/auth")
		protectedAuth.Use(middleware.JWTAuthMiddleware())
		{
			protectedAuth.GET("/me", authCtrl.GetMe)
			protectedAuth.PUT("/profile", authCtrl.UpdateProfile)
			protectedAuth.POST("/password", authCtrl.ChangePassword)
		}

		// Public Upload & Instant Deduplication APIs (Redis sliding-window QPS limit)
		uploadRateLimit := middleware.UploadRateLimit()
		v1.POST("/upload/check-hash", uploadRateLimit, uploadCtrl.CheckHash)
		v1.POST("/upload", uploadRateLimit, uploadCtrl.UploadFile)
		v1.GET("/upload/quota", uploadCtrl.GetQuota)

		// Public Read & Workspace APIs
		v1.GET("/images", adminCtrl.ListImages)
		v1.GET("/images/:id", adminCtrl.GetImage)
		v1.GET("/albums", adminCtrl.ListAlbums)
		v1.GET("/tags", adminCtrl.ListTags)

		// Protected Workspace User Actions (Requires JWT)
		userSpace := v1.Group("/user")
		userSpace.Use(middleware.JWTAuthMiddleware())
		{
			userSpace.POST("/images", adminCtrl.CreateImage)
			userSpace.PUT("/images/:id", adminCtrl.UpdateImage)
			userSpace.DELETE("/images/:id", adminCtrl.DeleteImage)
			userSpace.POST("/albums", adminCtrl.CreateAlbum)
			userSpace.PUT("/albums/:id", adminCtrl.UpdateAlbum)
			userSpace.DELETE("/albums/:id", adminCtrl.DeleteAlbum)
		}

		// Admin Management Module Routes (Requires JWT + Admin role)
		admin := v1.Group("/admin")
		admin.Use(middleware.JWTAuthMiddleware(), middleware.RequireAdmin())
		{
			// 1. Overview & Statistics
			admin.GET("/stats", adminCtrl.GetOverviewStats)

			// 2. Images Management CRUD
			admin.GET("/images", adminCtrl.ListImages)
			admin.GET("/images/:id", adminCtrl.GetImage)
			admin.POST("/images", adminCtrl.CreateImage)
			admin.PUT("/images/:id", adminCtrl.UpdateImage)
			admin.DELETE("/images/:id", adminCtrl.DeleteImage)
			admin.POST("/images/batch", adminCtrl.BatchImageAction)

			// 3. Albums Management CRUD
			admin.GET("/albums", adminCtrl.ListAlbums)
			admin.POST("/albums", adminCtrl.CreateAlbum)
			admin.PUT("/albums/:id", adminCtrl.UpdateAlbum)
			admin.DELETE("/albums/:id", adminCtrl.DeleteAlbum)

			// 4. Tags Management CRUD
			admin.GET("/tags", adminCtrl.ListTags)
			admin.POST("/tags", adminCtrl.CreateTag)
			admin.PUT("/tags/:id", adminCtrl.UpdateTag)
			admin.DELETE("/tags/:id", adminCtrl.DeleteTag)
			admin.POST("/tags/merge", adminCtrl.MergeTags)

			// 5. Storage Engine Configuration (S3, WebDAV, Local)
			admin.GET("/storage", adminCtrl.GetStorageConfigs)
			admin.POST("/storage", adminCtrl.SaveStorageConfig)
			admin.POST("/storage/active", adminCtrl.SetActiveStorage)
			admin.POST("/storage/toggle", adminCtrl.ToggleStorageEnabled)
			admin.POST("/storage/test", adminCtrl.TestStorageConnection)

			// 6. System Settings & Upload Quotas
			admin.GET("/settings/quotas", adminCtrl.GetQuotaSettings)
			admin.PUT("/settings/quotas", adminCtrl.UpdateQuotaSettings)

			// 7. Users Management CRUD
			admin.GET("/users", adminCtrl.ListUsers)
			admin.GET("/users/:id", adminCtrl.GetUser)
			admin.POST("/users", adminCtrl.CreateUser)
			admin.PUT("/users/:id", adminCtrl.UpdateUser)
			admin.DELETE("/users/:id", adminCtrl.DeleteUser)
			admin.POST("/users/:id/reset-password", adminCtrl.ResetUserPassword)
		}

		// Ping test route
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
				"pong":       true,
				"modules":    []string{"auth", "admin", "images", "albums", "tags", "storage", "users"},
				"admin_path": "/api/v1/admin",
			}, "Wan Pictures (万图) backend & admin management engine is online"))
		})
	}

	return r
}
