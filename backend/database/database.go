package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"wanpictures-backend/config"
	"wanpictures-backend/models"
	"wanpictures-backend/utils"
)

var DB *gorm.DB

// InitDB initializes GORM database connection according to config
func InitDB() (*gorm.DB, error) {
	cfg := config.AppConfig
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "mysql":
		dialector = mysql.Open(cfg.DBDSN)
	case "postgres", "postgresql":
		dialector = postgres.Open(cfg.DBDSN)
	case "sqlite", "sqlite3":
		fallthrough
	default:
		dialector = sqlite.Open(cfg.DBDSN)
	}

	gormLogger := logger.Default.LogMode(logger.Info)
	if cfg.GinMode == "release" {
		gormLogger = logger.Default.LogMode(logger.Warn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:                                   gormLogger,
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database (%s): %w", cfg.DBDriver, err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	DB = db

	// Auto migrate database tables
	if err := AutoMigrate(db); err != nil {
		return nil, fmt.Errorf("auto migration failed: %w", err)
	}

	log.Printf("[Database] Initialized successfully with driver: %s", cfg.DBDriver)
	return DB, nil
}

// AutoMigrate runs GORM auto-migration for models
func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&models.User{},
		&models.Image{},
		&models.Album{},
		&models.Tag{},
		&models.StorageConfig{},
		&models.FileAsset{},
		&models.SystemSetting{},
		&models.UploadLog{},
	); err != nil {
		return err
	}

	// Run Seed Data
	SeedInitialData(db)
	return nil
}

// SeedInitialData sets up initial albums, tags, storage configs, system settings, and admin user
func SeedInitialData(db *gorm.DB) {
	// 1. Ensure initial admin account exists (credentials from env config)
	ensureAdminUser(db)

	// 2. Seed Default Albums
	var albumCount int64
	db.Model(&models.Album{}).Count(&albumCount)
	if albumCount == 0 {
		defaultAlbums := []models.Album{
			{
				ID:          "default",
				Name:        "默认相册",
				Description: "未分类的所有上传图片",
				Color:       "#6366F1",
				IsDefault:   true,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          "wallpapers",
				Name:        "壁纸精选",
				Description: "高清电脑与手机壁纸合集",
				Color:       "#0EA5E9",
				IsDefault:   false,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          "photography",
				Name:        "光影记录",
				Description: "自然风光与街头人文摄影",
				Color:       "#10B981",
				IsDefault:   false,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          "designs",
				Name:        "设计灵感",
				Description: "UI 界面、插画与设计素材",
				Color:       "#F59E0B",
				IsDefault:   false,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
		}
		for _, alb := range defaultAlbums {
			db.Create(&alb)
		}
	}

	// 3. Seed Default Tags
	var tagCount int64
	db.Model(&models.Tag{}).Count(&tagCount)
	if tagCount == 0 {
		defaultTags := []models.Tag{
			{Name: "WALLPAPER", Color: "#0EA5E9", Description: "高清桌面与手机壁纸", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{Name: "PHOTOGRAPHY", Color: "#10B981", Description: "真实拍摄与自然风光", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{Name: "DESIGN", Color: "#F59E0B", Description: "UI/UX 设计、插画与矢量图形", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{Name: "AVATAR", Color: "#8B5CF6", Description: "头像与个人标识", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{Name: "BANNER", Color: "#EC4899", Description: "横幅与宽屏视觉图", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{Name: "4K", Color: "#EF4444", Description: "超清超高分辨率画质", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		}
		for _, t := range defaultTags {
			db.Create(&t)
		}
	}

	// 4. Seed Storage Configs (Local active, S3 and WebDAV templates)
	var storageCount int64
	db.Model(&models.StorageConfig{}).Count(&storageCount)
	if storageCount == 0 {
		defaultConfigs := []models.StorageConfig{
			{
				Driver:     models.StorageDriverLocal,
				Name:       "本地存储 (Local Storage)",
				IsEnabled:  true,
				IsActive:   true,
				ConfigJSON: `{"max_size_mb": 50, "storage_path": "./uploads"}`,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			},
			{
				Driver:     models.StorageDriverS3,
				Name:       "Amazon S3 / R2 / OSS / COS / MinIO",
				IsEnabled:  true,
				IsActive:   false,
				ConfigJSON: `{"endpoint":"https://s3.us-east-1.amazonaws.com","region":"us-east-1","bucket":"wanpictures-bucket","access_key_id":"","secret_access_key":"","custom_domain":"","path_prefix":"uploads/{year}/{month}/","force_path_style":false,"acl":"public-read"}`,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			},
			{
				Driver:     models.StorageDriverWebDAV,
				Name:       "WebDAV 网络存储 (Nextcloud / 坚果云 / Alist)",
				IsEnabled:  true,
				IsActive:   false,
				ConfigJSON: `{"server_url":"https://dav.jianguoyun.com/dav/","username":"","password":"","root_path":"/wanpictures/uploads/","public_proxy":""}`,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			},
		}
		for _, cfg := range defaultConfigs {
			db.Create(&cfg)
		}
	}

	// 5. Seed Default System Upload Quotas & Naming Settings
	var settingCount int64
	db.Model(&models.SystemSetting{}).Where("`key` = ? OR key = ?", "upload_quotas", "upload_quotas").Count(&settingCount)
	if settingCount == 0 {
		defaultQuotas := `{"allow_anonymous":true,"anonymous_daily_limit":20,"anonymous_max_size_mb":5,"free_user_daily_limit":50,"free_user_max_size_mb":10,"vip_daily_limit":500,"vip_max_size_mb":50,"anonymous_upload_qps":2,"user_upload_qps":10,"anonymous_upload_rpm":30,"user_upload_rpm":200,"naming_rule":"uuid","custom_prefix":"pic_","auto_compress":false,"compress_quality":85,"convert_to_webp":false}`
		db.Create(&models.SystemSetting{
			Key:       "upload_quotas",
			Value:     defaultQuotas,
			UpdatedAt: time.Now(),
		})
	}
}

// ensureAdminUser creates the initial admin account (from env config) if it does not exist
func ensureAdminUser(db *gorm.DB) {
	cfg := config.AppConfig

	var count int64
	db.Model(&models.User{}).Where("username = ?", cfg.AdminUsername).Count(&count)
	if count > 0 {
		return
	}

	hashedPassword, err := utils.HashPassword(cfg.AdminPassword)
	if err != nil {
		log.Printf("[Seed] Failed to hash initial admin password: %v", err)
		return
	}

	adminUser := models.User{
		Username: cfg.AdminUsername,
		Email:    cfg.AdminEmail,
		Password: hashedPassword,
		Nickname: "万图 Admin",
		Avatar:   "https://api.dicebear.com/7.x/identicon/svg?seed=" + cfg.AdminUsername,
		Role:     "admin",
		Bio:      "万图 (Wan Pictures) 系统超级管理员",
	}

	if err := db.Create(&adminUser).Error; err != nil {
		log.Printf("[Seed] Failed to create initial admin account: %v", err)
		return
	}

	log.Printf("[Seed] Initial admin account created: %s", cfg.AdminUsername)
}
