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
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"wanpictures-backend/config"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/services/storage"
	"wanpictures-backend/services/thumbnail"
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
func buildImageFromAsset(asset *models.FileAsset, name, originalName string, albumID, userID uint, tags []string) models.Image {
	if len(tags) == 0 {
		tags = []string{strings.ToUpper(asset.Extension)}
	}
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
		ThumbUrl:      asset.ThumbUrl,
		AlbumID:       albumID,
		UserID:        userID,
		Tags:          tags,
		StorageDriver: asset.StorageDriver,
		FileAssetID:   asset.ID,
		FileHash:      asset.FileHash,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}

// saveThumbnail generates a downscaled copy of an upload and stores it next to
// the original under the same storage driver (uploads/thumbs/<date>/<name>).
// Any failure (unrasterizable format, decode error, storage error) is logged
// and swallowed so the upload itself always succeeds - the frontend then
// falls back to the original URL. Returns the stored thumbnail public URL.
func saveThumbnail(ctx context.Context, engine storage.StorageEngine, fileBytes []byte, contentType, storageKey string) string {
	cfg := config.AppConfig
	thumbBytes, thumbMime, err := thumbnail.Generate(fileBytes, contentType, cfg.ThumbMaxDim, cfg.ThumbQuality)
	if err != nil {
		log.Printf("[Thumbnail] skipped for %s: %v", storageKey, err)
		return ""
	}
	thumbKey := thumbnail.ThumbKey(storageKey)
	thumbURL, err := engine.Save(ctx, thumbKey, bytes.NewReader(thumbBytes), int64(len(thumbBytes)), thumbMime)
	if err != nil {
		log.Printf("[Thumbnail] failed to store %s: %v", thumbKey, err)
		return ""
	}
	return thumbURL
}

var (
	svgSizeAttrRe    = regexp.MustCompile(`(?i)(width|height)\s*=\s*["']\s*([\d.]+)\s*(?:px)?\s*["']`)
	svgViewBoxSizeRe = regexp.MustCompile(`(?i)viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']`)
)

// parseSVGDimensions extracts the intrinsic dimensions of an SVG document from
// its width/height attributes, falling back to viewBox when those are missing.
// Returns an error when neither can be determined.
func parseSVGDimensions(data []byte) (int, int, error) {
	s := string(data)

	var w, h float64
	for _, m := range svgSizeAttrRe.FindAllStringSubmatch(s, -1) {
		v, err := strconv.ParseFloat(m[2], 64)
		if err != nil {
			continue
		}
		switch strings.ToLower(m[1]) {
		case "width":
			w = v
		case "height":
			h = v
		}
	}
	if w > 0 && h > 0 {
		return int(w), int(h), nil
	}

	if m := svgViewBoxSizeRe.FindStringSubmatch(s); len(m) == 3 {
		vw, _ := strconv.ParseFloat(m[1], 64)
		vh, _ := strconv.ParseFloat(m[2], 64)
		if vw > 0 && vh > 0 {
			switch {
			case w > 0:
				return int(w), int(vh * w / vw), nil
			case h > 0:
				return int(vw * h / vh), int(h), nil
			default:
				return int(vw), int(vh), nil
			}
		}
	}
	return 0, 0, fmt.Errorf("svg dimensions not found")
}

// persistInstantImage atomically links a new logical Image to an existing FileAsset:
// locks the asset row against concurrent deletions of the last reference, then
// inserts the Image + UploadLog and bumps ref_count in a single transaction.
// Returns gorm.ErrRecordNotFound wrapped if the asset vanished concurrently.
func persistInstantImage(asset *models.FileAsset, name, originalName string, albumID, userID uint, clientIP string, tags []string) (*models.Image, error) {
	var created *models.Image
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var locked models.FileAsset
		if err := withRowLock(tx.Where("id = ?", asset.ID)).First(&locked).Error; err != nil {
			return fmt.Errorf("file asset unavailable for instant upload: %w", err)
		}

		img := buildImageFromAsset(&locked, name, originalName, albumID, userID, tags)
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

	newImage, linkErr := persistInstantImage(&fileAsset, imgName, req.Name, albumID, userID, clientIP, nil)
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
		Image:     newImage.PublicCopy(),
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

	// Web uploads carry no user tags; the extension tag is applied automatically
	status, payload, message, err := ctrl.processUpload(c, role, userID, clientIP, fileHeader, nil)
	if err != nil {
		c.JSON(status, models.ErrorResponse(status, err.Error()))
		return
	}
	c.JSON(status, models.SuccessResponse(payload, message))
}

// processUpload is the shared upload pipeline used by both the public web
// endpoint (/api/v1/upload) and the dedicated open API endpoint
// (/openapi/v1/upload). It enforces quota policies, performs SHA-256 instant
// deduplication (秒传), stores the file through the active storage engine,
// generates a thumbnail, and persists FileAsset + Image + UploadLog atomically.
// extraTags (optional) are validated user tags applied to the created Image.
func (ctrl *UploadController) processUpload(c *gin.Context, role string, userID uint, clientIP string, fileHeader *multipart.FileHeader, extraTags []string) (int, gin.H, string, error) {
	// 1. Quota & Size check
	if err := ctrl.checkUploadQuota(role, userID, clientIP, fileHeader.Size); err != nil {
		return http.StatusBadRequest, nil, "", err
	}

	// 2. Read file content into memory
	f, err := fileHeader.Open()
	if err != nil {
		return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to read file: %w", err)
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to read file content: %w", err)
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

		newImage, linkErr := persistInstantImage(&existingAsset, formattedName, fileHeader.Filename, albumID, userID, clientIP, extraTags)
		if linkErr == nil {
			return http.StatusOK, gin.H{
				"is_instant": true,
				"image":      newImage.PublicCopy(),
			}, "⚡ 秒传成功", nil
		}
		if !errors.Is(linkErr, gorm.ErrRecordNotFound) {
			return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to create image record: %w", linkErr)
		}
		// Asset purged between lookup and linking (last reference deleted
		// concurrently) - fall through and store the file as a fresh upload.
	}

	// 5. Decode Image Dimensions via libvips (covers jpeg/png/webp/gif/avif/svg/bmp/ico)
	width, height, dimErr := thumbnail.Dimensions(fileBytes)
	fileNameExt := strings.ToLower(strings.TrimPrefix(filepath.Ext(fileHeader.Filename), "."))
	if dimErr != nil && fileNameExt == "svg" {
		// librsvg may be unavailable; fall back to parsing the SVG markup's
		// width/height (or viewBox) so cards still display real dimensions.
		if w, h, perr := parseSVGDimensions(fileBytes); perr == nil {
			width, height = w, h
		}
	}
	aspectRatio := 1.0
	if width > 0 && height > 0 {
		aspectRatio = float64(width) / float64(height)
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext == "" {
		ext = ".png"
	}
	cleanExt := strings.TrimPrefix(ext, ".")

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = "image/" + cleanExt
	}

	// 5b. Merge user-provided tags (already validated) with the format tag
	tags := finalizeUploadTags(extraTags, cleanExt)

	// 6. Apply system-level renaming and construct storage path
	formattedName := formatFileNameBySystemRule(fileHeader.Filename, quotas.NamingRule, quotas.CustomPrefix)
	storageKey := generateStoragePath(formattedName)

	// 7. Get active storage engine
	mgr := storage.GetManager()
	engine, driver, err := mgr.GetActiveEngine()
	if err != nil {
		return http.StatusInternalServerError, nil, "", fmt.Errorf("Storage engine unavailable: %w", err)
	}

	// 8. Save to storage backend
	publicURL, err := engine.Save(c.Request.Context(), storageKey, bytes.NewReader(fileBytes), int64(len(fileBytes)), contentType)
	if err != nil {
		return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to save file to storage: %w", err)
	}

	// 8b. Generate a downscaled thumbnail next to the original so gallery
	// cards never download the full-resolution file. Failure is non-fatal.
	thumbURL := saveThumbnail(c.Request.Context(), engine, fileBytes, contentType, storageKey)

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
		ThumbUrl:      thumbURL,
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
			ThumbUrl:      thumbURL,
			AlbumID:       albumID,
			UserID:        userID,
			Tags:          tags,
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
			_ = engine.Delete(c.Request.Context(), thumbnail.ThumbKey(storageKey))

			var winner models.FileAsset
			if ferr := database.DB.Where("file_hash = ?", sha256Hash).First(&winner).Error; ferr == nil {
				newImage, linkErr := persistInstantImage(&winner, formattedName, fileHeader.Filename, albumID, userID, clientIP, extraTags)
				if linkErr == nil {
					return http.StatusOK, gin.H{
						"is_instant": true,
						"image":      newImage.PublicCopy(),
					}, "⚡ 秒传成功", nil
				}
				if !errors.Is(linkErr, gorm.ErrRecordNotFound) {
					return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to create image record: %w", linkErr)
				}
			}
			return http.StatusInternalServerError, nil, "", errors.New("File asset disappeared during deduplication, please retry")
		}

		// Transaction rolled back - remove the object we saved to storage
		_ = engine.Delete(c.Request.Context(), storageKey)
		_ = engine.Delete(c.Request.Context(), thumbnail.ThumbKey(storageKey))
		return http.StatusInternalServerError, nil, "", fmt.Errorf("Failed to persist upload: %w", err)
	}

	return http.StatusOK, gin.H{
		"is_instant": false,
		"image":      createdImage.PublicCopy(),
	}, "上传成功", nil
}

// parseUploadTags parses a multipart 'tags' field into a validated list.
// Separators: comma, Chinese comma, semicolon, Chinese semicolon, Chinese dash.
// Rules: trim whitespace, drop empty items, dedupe case-insensitively,
// max 32 runes per tag, max 10 tags total.
func parseUploadTags(raw string) ([]string, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == '，' || r == ';' || r == '；' || r == '、'
	})

	seen := make(map[string]bool, len(parts))
	tags := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t == "" {
			continue
		}
		if len([]rune(t)) > 32 {
			return nil, fmt.Errorf("标签「%s」长度超出限制（每个标签最多 32 字符）", t)
		}
		key := strings.ToLower(t)
		if seen[key] {
			continue
		}
		seen[key] = true
		tags = append(tags, t)
		if len(tags) > 10 {
			return nil, errors.New("标签数量超出限制（最多 10 个标签）")
		}
	}
	return tags, nil
}

// finalizeUploadTags merges validated user tags with the mandatory format tag
// (e.g. "PNG"), deduplicating case-insensitively and capping at 10 total.
func finalizeUploadTags(userTags []string, ext string) []string {
	extTag := strings.ToUpper(ext)
	seen := make(map[string]bool, len(userTags)+1)
	result := make([]string, 0, len(userTags)+1)
	for _, t := range userTags {
		key := strings.ToLower(t)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, t)
		if len(result) >= 10 {
			return result
		}
	}
	if !seen[strings.ToLower(extTag)] && len(result) < 10 {
		result = append(result, extTag)
	}
	return result
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
			_ = eng.Delete(context.Background(), thumbnail.ThumbKey(purgeKey))
		}
	}

	return nil
}
