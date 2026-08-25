package controllers

import (
	"bytes"
	"context"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
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
	err := database.DB.Where("`key` = ? OR key = ?", "upload_quotas", "upload_quotas").First(&setting).Error
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

// generateRandomString generates a random hex string of specified byte length
func generateRandomString(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// formatFileNameBySystemRule applies the system-level naming policy
func formatFileNameBySystemRule(originalName string, rule, prefix string) string {
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".png"
	}
	baseName := strings.TrimSuffix(originalName, ext)

	switch rule {
	case "timestamp":
		now := time.Now()
		randPart := generateRandomString(3)
		return fmt.Sprintf("%s_%s%s", now.Format("20060102_150405"), randPart, ext)
	case "random":
		return fmt.Sprintf("img_%s%s", generateRandomString(6), ext)
	case "custom":
		if prefix == "" {
			prefix = "pic_"
		}
		return fmt.Sprintf("%s%s%s", prefix, generateRandomString(4), ext)
	case "original":
		fallthrough
	default:
		// Safe original
		safe := strings.ReplaceAll(baseName, " ", "_")
		safe = strings.ReplaceAll(safe, "/", "_")
		safe = strings.ReplaceAll(safe, "\\", "_")
		return fmt.Sprintf("%s%s", safe, ext)
	}
}

// generateStoragePath partitions storage keys by date (uploads/YYYY/MM/DD/filename)
func generateStoragePath(fileName string) string {
	now := time.Now()
	return fmt.Sprintf("uploads/%04d/%02d/%02d/%s", now.Year(), int(now.Month()), now.Day(), fileName)
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

	// Instant upload matched! Atomically increment ref_count
	database.DB.Model(&fileAsset).Update("ref_count", fileAsset.RefCount+1)

	// Determine image name
	quotas := GetSystemQuotaSettings()
	imgName := req.Name
	if imgName == "" {
		imgName = formatFileNameBySystemRule(fileAsset.StorageKey, quotas.NamingRule, quotas.CustomPrefix)
	} else {
		imgName = formatFileNameBySystemRule(imgName, quotas.NamingRule, quotas.CustomPrefix)
	}

	albumID := req.AlbumID
	if albumID == "" {
		albumID = "default"
	}

	imageID := fmt.Sprintf("img_%d_%s", time.Now().UnixNano()/1e6, generateRandomString(3))

	newImage := models.Image{
		ID:            imageID,
		Name:          imgName,
		OriginalName:  req.Name,
		Size:          fileAsset.Size,
		Type:          fileAsset.MimeType,
		Extension:     fileAsset.Extension,
		Width:         fileAsset.Width,
		Height:        fileAsset.Height,
		AspectRatio:   fileAsset.AspectRatio,
		Url:           fileAsset.URL,
		AlbumID:       albumID,
		UserID:        userID,
		Tags:          fmt.Sprintf("[\"%s\"]", strings.ToUpper(fileAsset.Extension)),
		ColorPalette:  fileAsset.ColorPalette,
		StorageDriver: fileAsset.StorageDriver,
		FileAssetID:   fileAsset.ID,
		FileHash:      fileAsset.FileHash,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Create(&newImage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create image record: "+err.Error()))
		return
	}

	// Record upload log
	database.DB.Create(&models.UploadLog{
		UserID:    userID,
		IPAddress: clientIP,
		ImageID:   newImage.ID,
		FileHash:  fileAsset.FileHash,
		Size:      fileAsset.Size,
		IsInstant: true,
		CreatedAt: time.Now(),
	})

	c.JSON(http.StatusOK, models.SuccessResponse(models.CheckHashResponse{
		Exists:    true,
		IsInstant: true,
		Image:     &newImage,
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

	albumID := c.DefaultPostForm("album_id", "default")
	if albumID == "" {
		albumID = "default"
	}

	quotas := GetSystemQuotaSettings()

	// 4. Check if file already exists in file_assets for instant deduplication (秒传)
	var existingAsset models.FileAsset
	if err := database.DB.Where("file_hash = ?", sha256Hash).First(&existingAsset).Error; err == nil {
		// Increment ref count
		database.DB.Model(&existingAsset).Update("ref_count", existingAsset.RefCount+1)

		formattedName := formatFileNameBySystemRule(fileHeader.Filename, quotas.NamingRule, quotas.CustomPrefix)
		imageID := fmt.Sprintf("img_%d_%s", time.Now().UnixNano()/1e6, generateRandomString(3))

		newImage := models.Image{
			ID:            imageID,
			Name:          formattedName,
			OriginalName:  fileHeader.Filename,
			Size:          existingAsset.Size,
			Type:          existingAsset.MimeType,
			Extension:     existingAsset.Extension,
			Width:         existingAsset.Width,
			Height:        existingAsset.Height,
			AspectRatio:   existingAsset.AspectRatio,
			Url:           existingAsset.URL,
			AlbumID:       albumID,
			UserID:        userID,
			Tags:          fmt.Sprintf("[\"%s\"]", strings.ToUpper(existingAsset.Extension)),
			ColorPalette:  existingAsset.ColorPalette,
			StorageDriver: existingAsset.StorageDriver,
			FileAssetID:   existingAsset.ID,
			FileHash:      existingAsset.FileHash,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		database.DB.Create(&newImage)
		database.DB.Create(&models.UploadLog{
			UserID:    userID,
			IPAddress: clientIP,
			ImageID:   newImage.ID,
			FileHash:  existingAsset.FileHash,
			Size:      existingAsset.Size,
			IsInstant: true,
			CreatedAt: time.Now(),
		})

		c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
			"is_instant": true,
			"image":      newImage,
		}, "⚡ 秒传成功"))
		return
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

	// 9. Insert FileAsset
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
		ColorPalette:  "[\"#3B82F6\",\"#6366F1\",\"#10B981\"]",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Create(&newAsset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to record asset: "+err.Error()))
		return
	}

	// 10. Insert Image
	imageID := fmt.Sprintf("img_%d_%s", time.Now().UnixNano()/1e6, generateRandomString(3))
	newImage := models.Image{
		ID:            imageID,
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
		Tags:          fmt.Sprintf("[\"%s\"]", strings.ToUpper(cleanExt)),
		ColorPalette:  newAsset.ColorPalette,
		StorageDriver: string(driver),
		FileAssetID:   newAsset.ID,
		FileHash:      newAsset.FileHash,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Create(&newImage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create image: "+err.Error()))
		return
	}

	// 11. Record upload log
	database.DB.Create(&models.UploadLog{
		UserID:    userID,
		IPAddress: clientIP,
		ImageID:   newImage.ID,
		FileHash:  sha256Hash,
		Size:      int64(len(fileBytes)),
		IsInstant: false,
		CreatedAt: time.Now(),
	})

	_ = imgErr // keep compiler happy if image decode error
	c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
		"is_instant": false,
		"image":      newImage,
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

// DeleteImageWithRefCount handles safe deletion with reference counting
func DeleteImageWithRefCount(imageID string) error {
	var img models.Image
	if err := database.DB.Where("id = ?", imageID).First(&img).Error; err != nil {
		return err
	}

	// Delete logical image record
	if err := database.DB.Delete(&img).Error; err != nil {
		return err
	}

	// If linked to a FileAsset, safely decrement RefCount
	if img.FileAssetID > 0 || img.FileHash != "" {
		var asset models.FileAsset
		var errAsset error
		if img.FileAssetID > 0 {
			errAsset = database.DB.First(&asset, img.FileAssetID).Error
		} else {
			errAsset = database.DB.Where("file_hash = ?", img.FileHash).First(&asset).Error
		}

		if errAsset == nil {
			newRefCount := asset.RefCount - 1
			if newRefCount <= 0 {
				// No more references anywhere in the system! Safe to physically delete
				mgr := storage.GetManager()
				if eng, err := mgr.GetEngineByDriver(models.StorageDriver(asset.StorageDriver)); err == nil {
					_ = eng.Delete(context.Background(), asset.StorageKey)
				}
				database.DB.Delete(&asset)
			} else {
				// Still referenced by other images/users! Keep physical file safe
				database.DB.Model(&asset).Update("ref_count", newRefCount)
			}
		}
	}

	return nil
}
