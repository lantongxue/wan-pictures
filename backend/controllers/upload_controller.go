package controllers

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/services/storage"
	"wanpictures-backend/utils"
)

type UploadController struct{}

func NewUploadController() *UploadController {
	return &UploadController{}
}

// GetSystemQuotaSettings retrieves system-level upload quota settings from DB or defaults
func GetSystemQuotaSettings() models.UploadQuotaSettings {
	var setting models.SystemSetting
	err := database.DB.Where(map[string]interface{}{"key": "upload_quotas"}).First(&setting).Error
	if err != nil || setting.Value == "" {
		return models.DefaultUploadQuotaSettings()
	}

	var quotas models.UploadQuotaSettings
	if err := json.Unmarshal([]byte(setting.Value), &quotas); err != nil {
		return models.DefaultUploadQuotaSettings()
	}
	return quotas
}

// getUserContext extracts user role, user ID, and client IP safely (supports anonymous)
func (ctrl *UploadController) getUserContext(c *gin.Context) (role string, userID uint, clientIP string) {
	clientIP = c.ClientIP()
	if clientIP == "" {
		clientIP = "127.0.0.1"
	}

	// Try extracting user from context set by JWT middleware
	if u, exists := c.Get("currentUser"); exists {
		if user, ok := u.(models.User); ok {
			r := user.Role
			if r == "" {
				r = "user"
			}
			return r, user.ID, clientIP
		}
	}

	// Fallback to token parse if Bearer token passed in header
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := utils.ParseToken(tokenStr); err == nil {
			var user models.User
			if err := database.DB.First(&user, claims.UserID).Error; err == nil {
				r := user.Role
				if r == "" {
					r = "user"
				}
				return r, user.ID, clientIP
			}
		}
	}

	return "anonymous", 0, clientIP
}

// checkUploadQuota validates single file size and daily upload limits for the given user/guest
func (ctrl *UploadController) checkUploadQuota(role string, userID uint, clientIP string, fileSize int64) error {
	quotas := GetSystemQuotaSettings()

	// 1. Check anonymous permissions
	if role == "anonymous" && !quotas.AllowAnonymous {
		return fmt.Errorf("匿名用户上传功能已被管理员关闭，请登录后继续")
	}

	// 2. Check single file size limit
	var maxMB int
	switch role {
	case "admin":
		maxMB = 100 // Admin generous limit
	case "vip":
		maxMB = quotas.VIPMaxSizeMB
		if maxMB <= 0 {
			maxMB = 50
		}
	case "user":
		maxMB = quotas.FreeUserMaxSizeMB
		if maxMB <= 0 {
			maxMB = 10
		}
	case "anonymous":
		fallthrough
	default:
		maxMB = quotas.AnonymousMaxSizeMB
		if maxMB <= 0 {
			maxMB = 5
		}
	}

	maxBytes := int64(maxMB) * 1024 * 1024
	if fileSize > maxBytes {
		return fmt.Errorf("单张图片文件大小超出限制（当前: %.2fMB，最大允许: %dMB）", float64(fileSize)/(1024*1024), maxMB)
	}

	// 3. Admin has no daily count limit
	if role == "admin" {
		return nil
	}

	// 4. Check daily upload count
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var todayCount int64
	if userID > 0 {
		database.DB.Model(&models.UploadLog{}).Where("user_id = ? AND created_at >= ?", userID, todayStart).Count(&todayCount)
	} else {
		database.DB.Model(&models.UploadLog{}).Where("user_id = 0 AND ip_address = ? AND created_at >= ?", clientIP, todayStart).Count(&todayCount)
	}

	var dailyLimit int
	switch role {
	case "vip":
		dailyLimit = quotas.VIPDailyLimit // 0 means unlimited
	case "user":
		dailyLimit = quotas.FreeUserDailyLimit
	case "anonymous":
		fallthrough
	default:
		dailyLimit = quotas.AnonymousDailyLimit
	}

	if dailyLimit > 0 && todayCount >= int64(dailyLimit) {
		return fmt.Errorf("今日上传次数已达上限（%d/%d 张），请明天再试或升级权限", todayCount, dailyLimit)
	}

	return nil
}

// formatFileNameBySystemRule applies the system-level naming policy.
// Renamed files always use a UUID (v4) — random-string / timestamp names
// are no longer produced.
func formatFileNameBySystemRule(originalName string, rule, prefix string) string {
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".png"
	}

	if rule == "original" {
		baseName := strings.TrimSuffix(originalName, ext)
		safe := strings.ReplaceAll(baseName, " ", "_")
		safe = strings.ReplaceAll(safe, "/", "_")
		safe = strings.ReplaceAll(safe, "\\", "_")
		return fmt.Sprintf("%s%s", safe, ext)
	}

	// 'uuid' and any legacy rules ('timestamp' / 'random' / 'custom') -> UUID
	return uuid.NewString() + ext
}

// generateStoragePath partitions storage keys by date (uploads/YYYY/MM/DD/filename)
func generateStoragePath(fileName string) string {
	now := time.Now()
	return fmt.Sprintf("uploads/%04d/%02d/%02d/%s", now.Year(), int(now.Month()), now.Day(), fileName)
}

// withRowLock appends SELECT ... FOR UPDATE on databases that support it.
// SQLite serializes writers internally and does not support the locking clause,
// so it is skipped there.
func withRowLock(tx *gorm.DB) *gorm.DB {
	switch tx.Dialector.Name() {
	case "mysql", "postgres", "postgresql":
		return tx.Clauses(clause.Locking{Strength: "UPDATE"})
	default:
		return tx
	}
}

// isDuplicateKeyError reports whether err was caused by violating a unique index
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "duplicate entry") ||
		strings.Contains(msg, "duplicate key")
}

// buildImageFromAsset constructs a logical Image record pointing at an existing
// physical FileAsset (the deduplicated original). Used by all instant-upload paths.
func buildImageFromAsset(asset *models.FileAsset, name, originalName string, albumID, userID uint) models.Image {
	now := time.Now()
	return models.Image{
		Name:          name,
		OriginalName:  originalName,
		Size:          asset.Size,
		Type:          asset.MimeType,
		Extension:     asset.Extension,
		Width:         asset.Width,
		Height:        asset.Height,
		AspectRatio:   asset.AspectRatio,
		Url:           asset.URL,
		AlbumID:       albumID,
		UserID:        userID,
		Tags:          []string{strings.ToUpper(asset.Extension)},
		StorageDriver: asset.StorageDriver,
		FileAssetID:   asset.ID,
		FileHash:      asset.FileHash,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// persistInstantImage atomically links a new logical Image to an existing FileAsset:
// locks the asset row against concurrent deletions of the last reference, then
// inserts the Image + UploadLog and bumps ref_count in a single transaction.
// Returns gorm.ErrRecordNotFound wrapped if the asset vanished concurrently.
func persistInstantImage(asset *models.FileAsset, name, originalName string, albumID, userID uint, clientIP string) (*models.Image, error) {
	var created *models.Image
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var locked models.FileAsset
		if err := withRowLock(tx.Where("id = ?", asset.ID)).First(&locked).Error; err != nil {
			return fmt.Errorf("file asset unavailable for instant upload: %w", err)
		}

		img := buildImageFromAsset(&locked, name, originalName, albumID, userID)
		if err := tx.Create(&img).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.FileAsset{}).Where("id = ?", locked.ID).
			UpdateColumn("ref_count", gorm.Expr("ref_count + ?", 1)).Error; err != nil {
			return err
		}

		tx.Create(&models.UploadLog{
			UserID:    userID,
			IPAddress: clientIP,
			ImageID:   img.ID,
			FileHash:  locked.FileHash,
			Size:      locked.Size,
			IsInstant: true,
			CreatedAt: time.Now(),
		})

		created = &img
		return nil
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

// CheckHash handles pre-flight instant-upload checks (秒传预检)
// POST /api/v1/upload/check-hash
func (ctrl *UploadController) CheckHash(c *gin.Context) {
	var req models.CheckHashRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	role, userID, clientIP := ctrl.getUserContext(c)

	// Check quota
	if err := ctrl.checkUploadQuota(role, userID, clientIP, req.Size); err != nil {
		c.JSON(http.StatusTooManyRequests, models.ErrorResponse(http.StatusTooManyRequests, err.Error()))
		return
	}

	// Search file_assets for matching SHA-256
	var fileAsset models.FileAsset
	err := database.DB.Where("file_hash = ?", req.Hash).First(&fileAsset).Error
	if err != nil {
		// Not found -> client should proceed to normal multipart upload
		c.JSON(http.StatusOK, models.SuccessResponse(models.CheckHashResponse{
			Exists:    false,
			IsInstant: false,
		}))
		return
	}

	// Determine image name
	quotas := GetSystemQuotaSettings()
	imgName := req.Name
	if imgName == "" {
		imgName = formatFileNameBySystemRule(fileAsset.StorageKey, quotas.NamingRule, quotas.CustomPrefix)
	} else {
		imgName = formatFileNameBySystemRule(imgName, quotas.NamingRule, quotas.CustomPrefix)
	}

	albumID := req.AlbumID
	if albumID == 0 {
		albumID = models.DefaultAlbumID
	}

	newImage, linkErr := persistInstantImage(&fileAsset, imgName, req.Name, albumID, userID, clientIP)
	if linkErr != nil {
		if errors.Is(linkErr, gorm.ErrRecordNotFound) {
			// Asset purged between lookup and linking (last reference deleted
			// concurrently) - tell the client to fall back to a regular upload.
			c.JSON(http.StatusOK, models.SuccessResponse(models.CheckHashResponse{
				Exists:    false,
				IsInstant: false,
			}))
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create image record: "+linkErr.Error()))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(models.CheckHashResponse{
		Exists:    true,
		IsInstant: true,
		Image:     newImage,
	}, "⚡ 秒传成功 (Instant Upload Success)"))
}

// UploadFile handles standard multipart file uploads
// POST /api/v1/upload
func (ctrl *UploadController) UploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "No file uploaded: "+err.Error()))
		return
	}

	role, userID, clientIP := ctrl.getUserContext(c)

	// 1. Quota & Size check
	if err := ctrl.checkUploadQuota(role, userID, clientIP, fileHeader.Size); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	// 2. Read file content into memory
	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to read file: "+err.Error()))
		return
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to read file content: "+err.Error()))
		return
	}

	// 3. Compute SHA-256 and MD5 hashes
	sha256HashBytes := sha256.Sum256(fileBytes)
	sha256Hash := hex.EncodeToString(sha256HashBytes[:])

	md5HashBytes := md5.Sum(fileBytes)
	md5Hash := hex.EncodeToString(md5HashBytes[:])

	albumID := models.DefaultAlbumID
	if raw := c.PostForm("album_id"); raw != "" {
		if parsed, perr := strconv.ParseUint(raw, 10, 64); perr == nil {
			albumID = uint(parsed)
		}
	}

	quotas := GetSystemQuotaSettings()

	// 4. Check if file already exists in file_assets for instant deduplication (秒传)
	var existingAsset models.FileAsset
	if err := database.DB.Where("file_hash = ?", sha256Hash).First(&existingAsset).Error; err == nil {
		formattedName := formatFileNameBySystemRule(fileHeader.Filename, quotas.NamingRule, quotas.CustomPrefix)

		newImage, linkErr := persistInstantImage(&existingAsset, formattedName, fileHeader.Filename, albumID, userID, clientIP)
		if linkErr == nil {
			c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
				"is_instant": true,
				"image":      newImage,
			}, "⚡ 秒传成功"))
			return
		}
		if !errors.Is(linkErr, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create image record: "+linkErr.Error()))
			return
		}
		// Asset purged between lookup and linking (last reference deleted
		// concurrently) - fall through and store the file as a fresh upload.
	}

	// 5. Decode Image Dimensions
	cfg, format, imgErr := image.DecodeConfig(bytes.NewReader(fileBytes))
	width := cfg.Width
	height := cfg.Height
	aspectRatio := 1.0
	if width > 0 && height > 0 {
		aspectRatio = float64(width) / float64(height)
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		if format != "" {
			ext = "." + format
		} else {
			ext = ".png"
		}
	}
	cleanExt := strings.TrimPrefix(ext, ".")

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = "image/" + cleanExt
	}

	// 6. Apply system-level renaming and construct storage path
	formattedName := formatFileNameBySystemRule(fileHeader.Filename, quotas.NamingRule, quotas.CustomPrefix)
	storageKey := generateStoragePath(formattedName)

	// 7. Get active storage engine
	mgr := storage.GetManager()
	engine, driver, err := mgr.GetActiveEngine()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Storage engine unavailable: "+err.Error()))
		return
	}

	// 8. Save to storage backend
	publicURL, err := engine.Save(c.Request.Context(), storageKey, bytes.NewReader(fileBytes), int64(len(fileBytes)), contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to save file to storage: "+err.Error()))
		return
	}

	// 9-11. Persist FileAsset + Image (+ upload log) atomically so a partial
	// failure never leaves an orphaned asset with a phantom reference.
	newAsset := models.FileAsset{
		FileHash:      sha256Hash,
		MD5Hash:       md5Hash,
		Size:          int64(len(fileBytes)),
		MimeType:      contentType,
		Extension:     cleanExt,
		Width:         width,
		Height:        height,
		AspectRatio:   aspectRatio,
		StorageDriver: string(driver),
		StorageKey:    storageKey,
		URL:           publicURL,
		RefCount:      1,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	var createdImage models.Image
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&newAsset).Error; err != nil {
			return err
		}

		now := time.Now()
		createdImage = models.Image{
			Name:          formattedName,
			OriginalName:  fileHeader.Filename,
			Size:          int64(len(fileBytes)),
			Type:          contentType,
			Extension:     cleanExt,
			Width:         width,
			Height:        height,
			AspectRatio:   aspectRatio,
			Url:           publicURL,
			AlbumID:       albumID,
			UserID:        userID,
			Tags:          []string{strings.ToUpper(cleanExt)},
			StorageDriver: string(driver),
			FileAssetID:   newAsset.ID,
			FileHash:      newAsset.FileHash,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		if err := tx.Create(&createdImage).Error; err != nil {
			return err
		}

		tx.Create(&models.UploadLog{
			UserID:    userID,
			IPAddress: clientIP,
			ImageID:   createdImage.ID,
			FileHash:  sha256Hash,
			Size:      int64(len(fileBytes)),
			IsInstant: false,
			CreatedAt: time.Now(),
		})

		return nil
	})

	if err != nil {
		if isDuplicateKeyError(err) {
			// A concurrent request stored the identical physical file first.
			// The transaction rolled back; clean up our redundant object and
			// degrade gracefully to instant-upload reuse of the winner's asset.
			_ = engine.Delete(c.Request.Context(), storageKey)

			var winner models.FileAsset
			if ferr := database.DB.Where("file_hash = ?", sha256Hash).First(&winner).Error; ferr == nil {
				newImage, linkErr := persistInstantImage(&winner, formattedName, fileHeader.Filename, albumID, userID, clientIP)
				if linkErr == nil {
					c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
						"is_instant": true,
						"image":      newImage,
					}, "⚡ 秒传成功"))
					return
				}
				if !errors.Is(linkErr, gorm.ErrRecordNotFound) {
					c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create image record: "+linkErr.Error()))
					return
				}
			}
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "File asset disappeared during deduplication, please retry"))
			return
		}

		// Transaction rolled back - remove the object we saved to storage
		_ = engine.Delete(c.Request.Context(), storageKey)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to persist upload: "+err.Error()))
		return
	}

	_ = imgErr // keep compiler happy if image decode error
	c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
		"is_instant": false,
		"image":      createdImage,
	}, "上传成功"))
}

// GetQuota returns remaining upload limit and quota policy for the current caller
// GET /api/v1/upload/quota
func (ctrl *UploadController) GetQuota(c *gin.Context) {
	role, userID, clientIP := ctrl.getUserContext(c)
	quotas := GetSystemQuotaSettings()

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var todayCount int64
	if userID > 0 {
		database.DB.Model(&models.UploadLog{}).Where("user_id = ? AND created_at >= ?", userID, todayStart).Count(&todayCount)
	} else {
		database.DB.Model(&models.UploadLog{}).Where("user_id = 0 AND ip_address = ? AND created_at >= ?", clientIP, todayStart).Count(&todayCount)
	}

	var dailyLimit int
	var maxMB int

	switch role {
	case "admin":
		dailyLimit = 5000
		maxMB = 100
	case "vip":
		dailyLimit = quotas.VIPDailyLimit
		maxMB = quotas.VIPMaxSizeMB
	case "user":
		dailyLimit = quotas.FreeUserDailyLimit
		maxMB = quotas.FreeUserMaxSizeMB
	case "anonymous":
		fallthrough
	default:
		dailyLimit = quotas.AnonymousDailyLimit
		maxMB = quotas.AnonymousMaxSizeMB
	}

	remaining := dailyLimit - int(todayCount)
	if remaining < 0 {
		remaining = 0
	}

	c.JSON(http.StatusOK, models.SuccessResponse(models.UploadQuotaInfo{
		Role:               role,
		DailyLimit:         dailyLimit,
		TodayUsed:          int(todayCount),
		RemainingToday:     remaining,
		SingleMaxSizeMB:    maxMB,
		SingleMaxSizeBytes: int64(maxMB) * 1024 * 1024,
		AllowAnonymous:     quotas.AllowAnonymous,
		NamingRule:         quotas.NamingRule,
	}))
}

// DeleteImageWithRefCount safely deletes a logical image while honoring the
// deduplicated storage model (Image.FileAssetID acts as "pid" to the real file):
//
//   - The current Image record is ALWAYS soft-deleted only.
//   - Remaining ACTIVE images referencing the same FileAsset are counted:
//       * refs > 0 -> keep the asset & physical file untouched; ref_count is
//         repaired from the live count in case it drifted.
//       * refs = 0 -> the physical file is removed AND the FileAsset row is
//         hard-deleted, releasing its unique file_hash index so identical
//         content can be uploaded again later.
//
// The exact same code path serves both original uploads and instant-upload
// copies, because both are just Image rows pointing at a shared FileAsset.
func DeleteImageWithRefCount(imageID uint) error {
	var (
		purgeNeeded bool
		purgeDriver string
		purgeKey    string
	)

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var img models.Image
		if err := withRowLock(tx.Where("id = ?", imageID)).First(&img).Error; err != nil {
			return err
		}

		// Soft-delete the logical record (original or instant-upload copy alike)
		if err := tx.Delete(&img).Error; err != nil {
			return err
		}

		if img.FileAssetID <= 0 && img.FileHash == "" {
			return nil // manually imported record without dedup linkage
		}

		var asset models.FileAsset
		assetQuery := tx
		if img.FileAssetID > 0 {
			assetQuery = tx.Where("id = ?", img.FileAssetID)
		} else {
			assetQuery = tx.Where("file_hash = ?", img.FileHash)
		}
		if err := withRowLock(assetQuery).First(&asset).Error; err != nil {
			return nil // asset already gone; nothing left to clean up
		}

		// Live references: non-deleted Image rows pointing at this asset.
		// GORM's default scope already excludes soft-deleted images here,
		// which is exactly the "is anyone still referencing this pid?" check.
		var liveRefs int64
		if err := tx.Model(&models.Image{}).Where("file_asset_id = ?", asset.ID).Count(&liveRefs).Error; err != nil {
			return err
		}

		if liveRefs > 0 {
			// Others still reference the physical file - keep everything,
			// and self-heal any counter drift with the authoritative count.
			return tx.Model(&models.FileAsset{}).Where("id = ?", asset.ID).
				UpdateColumn("ref_count", liveRefs).Error
		}

		// Last reference gone: release the unique hash slot and drop metadata.
		// Physical file removal happens after commit below.
		purgeNeeded = true
		purgeDriver = asset.StorageDriver
		purgeKey = asset.StorageKey
		return tx.Unscoped().Delete(&asset).Error
	})
	if err != nil {
		return err
	}

	if purgeNeeded {
		mgr := storage.GetManager()
		if eng, derr := mgr.GetEngineByDriver(models.StorageDriver(purgeDriver)); derr == nil {
			_ = eng.Delete(context.Background(), purgeKey)
		}
	}

	return nil
}
