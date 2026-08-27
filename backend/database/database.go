package database

import (
	"errors"
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
		&models.ApiKey{},
	); err != nil {
		return err
	}

	// Drop the unused legacy data_url column (GORM never drops columns on its own).
	// The images table now serves asset URLs purely via the `url` column.
	if db.Migrator().HasColumn(&models.Image{}, "data_url") {
		if err := db.Migrator().DropColumn(&models.Image{}, "data_url"); err != nil {
			return fmt.Errorf("failed to drop images.data_url column: %w", err)
		}
		log.Printf("[Database] Dropped unused images.data_url column")
	}

	// Drop the removed color_palette (色系) columns from images & file_assets
	for _, m := range []interface{}{&models.Image{}, &models.FileAsset{}} {
		if db.Migrator().HasColumn(m, "color_palette") {
			if err := db.Migrator().DropColumn(m, "color_palette"); err != nil {
				return fmt.Errorf("failed to drop color_palette column: %w", err)
			}
			log.Printf("[Database] Dropped removed color_palette column")
		}
	}

	// Drop the removed key_prefix column from api_keys
	if db.Migrator().HasColumn(&models.ApiKey{}, "key_prefix") {
		if err := db.Migrator().DropColumn(&models.ApiKey{}, "key_prefix"); err != nil {
			return fmt.Errorf("failed to drop api_keys.key_prefix column: %w", err)
		}
		log.Printf("[Database] Dropped removed api_keys.key_prefix column")
	}

	// Multi-valued index on the tags JSON array, enabling indexed tag
	// membership queries (JSON_CONTAINS / =) in MySQL.
	if db.Dialector.Name() == "mysql" {
		if !db.Migrator().HasIndex(&models.Image{}, "idx_images_tags_mv") {
			if err := db.Exec("CREATE INDEX idx_images_tags_mv ON images ((CAST(tags AS CHAR(64) ARRAY)))").Error; err != nil {
				// GORM may translate MySQL 1061 into gorm.ErrDuplicatedKey;
				// treat a concurrently-created duplicate as a no-op.
				if !errors.Is(err, gorm.ErrDuplicatedKey) {
					return fmt.Errorf("failed to create multi-valued index on images.tags: %w", err)
				}
			} else {
				log.Printf("[Database] Created multi-valued index idx_images_tags_mv on images.tags")
			}
		}
	}

	PurgeOrphanSoftDeletedAssets(db)

	// Run Seed Data
	SeedInitialData(db)
	return nil
}

// PurgeOrphanSoftDeletedAssets removes legacy soft-deleted FileAsset rows that
// are no longer referenced by any active Image. Their physical files were
// already removed when the last reference was deleted, but the stale rows kept
// occupying the unique file_hash index, which made re-uploading identical
// content fail with a duplicate-key error.
func PurgeOrphanSoftDeletedAssets(db *gorm.DB) {
	activeRefSubQuery := db.Model(&models.Image{}).
		Select("file_asset_id").
		Where("file_asset_id > 0") // default scope excludes soft-deleted images

	var orphanIDs []uint
	if err := db.Unscoped().Model(&models.FileAsset{}).
		Where("deleted_at IS NOT NULL").
		Where("id NOT IN (?)", activeRefSubQuery).
		Pluck("id", &orphanIDs).Error; err != nil {
		log.Printf("[Database] Orphan asset purge skipped, query failed: %v", err)
		return
	}
	if len(orphanIDs) == 0 {
		return
	}

	if err := db.Unscoped().Where("id IN ?", orphanIDs).Delete(&models.FileAsset{}).Error; err != nil {
		log.Printf("[Database] Orphan asset purge failed: %v", err)
		return
	}
	log.Printf("[Database] Purged %d orphan soft-deleted file asset(s), released their hash slots", len(orphanIDs))
}

// SeedInitialData sets up initial albums, tags, storage configs, system settings, and admin user
func SeedInitialData(db *gorm.DB) {
	// 1. Ensure initial admin account exists (credentials from env config)
	ensureAdminUser(db)

	// 2. Seed Default Albums (fixed auto-increment IDs; DefaultAlbumID must stay 1)
	var albumCount int64
	db.Model(&models.Album{}).Count(&albumCount)
	if albumCount == 0 {
		defaultAlbums := []models.Album{
			{
				ID:          models.DefaultAlbumID,
				Name:        "默认相册",
				Description: "未分类的所有上传图片",
				Color:       "#6366F1",
				IsDefault:   true,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          models.DefaultAlbumID + 1,
				Name:        "壁纸精选",
				Description: "高清电脑与手机壁纸合集",
				Color:       "#0EA5E9",
				IsDefault:   false,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          models.DefaultAlbumID + 2,
				Name:        "光影记录",
				Description: "自然风光与街头人文摄影",
				Color:       "#10B981",
				IsDefault:   false,
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          models.DefaultAlbumID + 3,
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
	// NOTE: use a map condition so GORM quotes the reserved-word column `key`
	// correctly for each dialect (MySQL backticks / PostgreSQL double quotes).
	var settingCount int64
	db.Model(&models.SystemSetting{}).Where(map[string]interface{}{"key": "upload_quotas"}).Count(&settingCount)
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
