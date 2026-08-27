package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/utils"
)

// DevController handles the Developer Module — API KEY management only:
//   - GET/POST/DELETE /api/v1/dev/keys (JWT authenticated)
// Open upload is handled separately by OpenApiController (/openapi/v1/upload).
type DevController struct{}

func NewDevController() *DevController {
	return &DevController{}
}

// maxApiKeysPerUser caps how many active keys a single account may hold
const maxApiKeysPerUser = 10

// keyToResponse maps a stored ApiKey to its response DTO (no hash)
func keyToResponse(key *models.ApiKey) models.ApiKeyResponse {
	return models.ApiKeyResponse{
		ID:         key.ID,
		Name:       key.Name,
		Key:        key.Key,
		LastUsedAt: key.LastUsedAt,
		ExpiresAt:  key.ExpiresAt,
		CreatedAt:  key.CreatedAt,
	}
}

// ListApiKeys returns all API keys owned by the authenticated user
// GET /api/v1/dev/keys
func (ctrl *DevController) ListApiKeys(c *gin.Context) {
	userID := currentUserID(c)

	var keys []models.ApiKey
	if err := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC").Find(&keys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to load API keys: "+err.Error()))
		return
	}

	resp := make([]models.ApiKeyResponse, 0, len(keys))
	for i := range keys {
		resp = append(resp, keyToResponse(&keys[i]))
	}
	c.JSON(http.StatusOK, models.SuccessResponse(resp, "API keys loaded"))
}

// CreateApiKey creates a new API key for the authenticated user.
// The plaintext key is persisted so the owner can review it at any time;
// a SHA-256 hash is also stored for fast auth lookups.
// POST /api/v1/dev/keys
func (ctrl *DevController) CreateApiKey(c *gin.Context) {
	userID := currentUserID(c)

	var req models.CreateApiKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
		return
	}

	// Per-user active key cap
	var count int64
	if err := database.DB.Model(&models.ApiKey{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to count API keys: "+err.Error()))
		return
	}
	if count >= maxApiKeysPerUser {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest,
			"API KEY 数量已达上限（最多 10 个），请先吊销不再使用的 KEY"))
		return
	}

	plain, hash, err := utils.GenerateApiKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, err.Error()))
		return
	}

	var expiresAt *time.Time
	if req.ExpiresInDays != nil && *req.ExpiresInDays > 0 {
		t := time.Now().AddDate(0, 0, *req.ExpiresInDays)
		expiresAt = &t
	}

	now := time.Now()
	key := models.ApiKey{
		UserID:    userID,
		Name:      strings.TrimSpace(req.Name),
		Key:       plain,
		KeyHash:   hash,
		ExpiresAt: expiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := database.DB.Create(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create API key: "+err.Error()))
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse(keyToResponse(&key), "API KEY 创建成功"))
}

// RevokeApiKey soft-deletes one of the authenticated user's API keys,
// making it invalid immediately.
// DELETE /api/v1/dev/keys/:id
func (ctrl *DevController) RevokeApiKey(c *gin.Context) {
	userID := currentUserID(c)

	id, err := parseUserIDParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid api key id"))
		return
	}

	var key models.ApiKey
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&key).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "API KEY not found or not owned by you"))
		return
	}

	if err := database.DB.Delete(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to revoke API key: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(gin.H{"id": key.ID}, "API KEY 已吊销，立即失效"))
}