package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

// UserController handles all /api/v1/user/* workspace endpoints.
// It is deliberately kept separate from AdminController so that
// authenticated user operations never share handler code with
// the /api/v1/admin/* management surface.
type UserController struct{}

func NewUserController() *UserController {
	return &UserController{}
}

// currentUserID resolves the authenticated user id injected by the JWT
// middleware. Falls back to the legacy shared owner (1) when absent.
func currentUserID(c *gin.Context) uint {
	if v, exists := c.Get("userID"); exists {
		if id, ok := v.(uint); ok && id > 0 {
			return id
		}
	}
	return 1
}

// parseUserIDParam parses a numeric auto-increment route parameter
func parseUserIDParam(raw string) (uint, error) {
	parsed, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || parsed == 0 {
		return 0, fmt.Errorf("invalid id %q", raw)
	}
	return uint(parsed), nil
}

// -------------------------------------------------------------
// USER IMAGE CRUD
// -------------------------------------------------------------

// CreateImage saves a new image record owned by the authenticated user
// POST /api/v1/user/images
func (ctrl *UserController) CreateImage(c *gin.Context) {
	var req models.SaveImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	tagsJSON, _ := json.Marshal(req.Tags)
	paletteJSON, _ := json.Marshal(req.ColorPalette)

	storageDriver := req.StorageDriver
	if storageDriver == "" {
		storageDriver = "local"
	}

	albumID := req.AlbumID
	if albumID == 0 {
		albumID = models.DefaultAlbumID
	}

	img := models.Image{
		Name:          req.Name,
		OriginalName:  req.OriginalName,
		Size:          req.Size,
		Type:          req.Type,
		Extension:     req.Extension,
		Width:         req.Width,
		Height:        req.Height,
		AspectRatio:   req.AspectRatio,
		DataUrl:       req.DataUrl,
		Url:           req.Url,
		AlbumID:       albumID,
		UserID:        currentUserID(c),
		Tags:          string(tagsJSON),
		Favorite:      req.Favorite,
		ColorPalette:  string(paletteJSON),
		StorageDriver: storageDriver,
		Compressed:    req.Compressed,
		OriginalSize:  req.OriginalSize,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Save(&img).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse(img, "Image saved successfully"))
}

// UpdateImage updates image metadata for the authenticated user
// PUT /api/v1/user/images/:id
func (ctrl *UserController) UpdateImage(c *gin.Context) {
	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid image id"))
		return
	}
	var img models.Image
	if err := database.DB.Where("id = ?", id).First(&img).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
		return
	}

	var req models.UpdateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	updates := make(map[string]interface{})
	if req.Name != nil && *req.Name != "" {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.AlbumID != nil && *req.AlbumID != 0 {
		updates["album_id"] = *req.AlbumID
	}
	if req.Favorite != nil {
		updates["favorite"] = *req.Favorite
	}
	if req.StorageDriver != nil && *req.StorageDriver != "" {
		updates["storage_driver"] = *req.StorageDriver
	}
	if req.Tags != nil {
		tagsJSON, _ := json.Marshal(*req.Tags)
		updates["tags"] = string(tagsJSON)
	}
	updates["updated_at"] = time.Now()

	if err := database.DB.Model(&img).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	database.DB.First(&img, "id = ?", id)
	c.JSON(http.StatusOK, models.SuccessResponse(img, "Image updated successfully"))
}

// isValidHexColor validates "#RGB" / "#RRGGBB" hex color strings
func isValidHexColor(s string) bool {
	hexPart := strings.TrimPrefix(strings.TrimSpace(s), "#")
	if len(hexPart) != 3 && len(hexPart) != 6 {
		return false
	}
	for _, ch := range hexPart {
		if !strings.ContainsRune("0123456789abcdefABCDEF", ch) {
			return false
		}
	}
	return true
}

// UpdateImageMetadata updates ONLY tags and color_palette of an image.
// Any other field present in the payload is rejected with a 400 error.
// PUT /api/v1/user/images/:id/metadata
func (ctrl *UserController) UpdateImageMetadata(c *gin.Context) {
	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid image id"))
		return
	}
	var img models.Image
	if err := database.DB.Where("id = ?", id).First(&img).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
		return
	}

	raw, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid request body"))
		return
	}

	// Strict field whitelist inspection: reject everything except the two
	// editable metadata fields (tags, color_palette)
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid JSON payload"))
		return
	}
	allowedFields := map[string]bool{"tags": true, "color_palette": true}
	for key := range fields {
		if !allowedFields[key] {
			c.JSON(http.StatusBadRequest, models.ErrorResponse(
				http.StatusBadRequest,
				fmt.Sprintf("字段 %q 不允许修改：该接口仅支持修改 tags 与 color_palette", key),
			))
			return
		}
	}

	var req models.UpdateImageMetadataRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	updates := make(map[string]interface{})
	if req.Tags != nil {
		cleanedTags := make([]string, 0, len(*req.Tags))
		for _, tag := range *req.Tags {
			trimmed := strings.TrimSpace(tag)
			if trimmed == "" {
				continue
			}
			if len([]rune(trimmed)) > 32 {
				c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "单个标签长度不能超过 32 个字符"))
				return
			}
			cleanedTags = append(cleanedTags, trimmed)
		}
		if len(cleanedTags) > 20 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "标签数量不能超过 20 个"))
			return
		}
		tagsJSON, _ := json.Marshal(cleanedTags)
		updates["tags"] = string(tagsJSON)
	}

	if req.ColorPalette != nil {
		if len(*req.ColorPalette) > 12 {
			c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "色系颜色数量不能超过 12 个"))
			return
		}
		for _, hex := range *req.ColorPalette {
			if !isValidHexColor(hex) {
				c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, fmt.Sprintf("无效的颜色值 %q：仅支持 #RGB 或 #RRGGBB 格式", hex)))
				return
			}
		}
		paletteJSON, _ := json.Marshal(*req.ColorPalette)
		updates["color_palette"] = string(paletteJSON)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "请求体为空：仅支持修改 tags 与 color_palette 字段"))
		return
	}
	updates["updated_at"] = time.Now()

	if err := database.DB.Model(&img).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	database.DB.First(&img, "id = ?", id)
	c.JSON(http.StatusOK, models.SuccessResponse(img, "图片元信息更新成功"))
}

// DeleteImage deletes a single image using reference counting safe deletion
// DELETE /api/v1/user/images/:id
func (ctrl *UserController) DeleteImage(c *gin.Context) {
	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid image id"))
		return
	}
	if err := DeleteImageWithRefCount(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}
	c.JSON(http.StatusOK, models.SuccessResponse(nil, "Image deleted successfully"))
}

// -------------------------------------------------------------
// USER ALBUM CRUD
// -------------------------------------------------------------

// CreateAlbum creates a new album owned by the authenticated user
// POST /api/v1/user/albums
func (ctrl *UserController) CreateAlbum(c *gin.Context) {
	var req models.SaveAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	color := req.Color
	if color == "" {
		color = "#6366F1"
	}

	album := models.Album{
		Name:          strings.TrimSpace(req.Name),
		Description:   strings.TrimSpace(req.Description),
		Color:         color,
		CoverImageUrl: req.CoverImageUrl,
		CoverImageID:  req.CoverImageID,
		IsDefault:     req.IsDefault,
		UserID:        currentUserID(c),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Create(&album).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse(album, "Album created successfully"))
}

// UpdateAlbum updates an album of the authenticated user
// PUT /api/v1/user/albums/:id
func (ctrl *UserController) UpdateAlbum(c *gin.Context) {
	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid album id"))
		return
	}
	var album models.Album
	if err := database.DB.Where("id = ?", id).First(&album).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Album not found"))
		return
	}

	var req models.SaveAlbumRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	updates := map[string]interface{}{
		"name":            strings.TrimSpace(req.Name),
		"description":     strings.TrimSpace(req.Description),
		"color":           req.Color,
		"cover_image_url": req.CoverImageUrl,
		"cover_image_id":  req.CoverImageID,
		"updated_at":      time.Now(),
	}

	if err := database.DB.Model(&album).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	database.DB.First(&album, "id = ?", id)
	c.JSON(http.StatusOK, models.SuccessResponse(album, "Album updated successfully"))
}

// DeleteAlbum deletes an album (reassigns its images to the default album)
// DELETE /api/v1/user/albums/:id
func (ctrl *UserController) DeleteAlbum(c *gin.Context) {
	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid album id"))
		return
	}
	if id == models.DefaultAlbumID {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Default album cannot be deleted"))
		return
	}

	// Reassign images to the default album
	database.DB.Model(&models.Image{}).Where("album_id = ?", id).Updates(map[string]interface{}{
		"album_id":   models.DefaultAlbumID,
		"updated_at": time.Now(),
	})

	if err := database.DB.Where("id = ?", id).Delete(&models.Album{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(nil, "Album deleted and images safely moved to default album"))
}
