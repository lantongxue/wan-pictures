package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

// AdminApiKeyController handles the admin management surface for developer
// API keys: cross-account listing with owner info, and revoking any key.
// Routes are mounted under /api/v1/admin (JWT + RequireAdmin).
type AdminApiKeyController struct{}

func NewAdminApiKeyController() *AdminApiKeyController {
	return &AdminApiKeyController{}
}

// ListApiKeys returns a paginated list of all users' API keys with search
// (key name / username / email) and an optional owner or status filter.
// GET /api/v1/admin/api-keys
func (ctrl *AdminApiKeyController) ListApiKeys(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	status := strings.TrimSpace(c.Query("status")) // all | active | expired | revoked

	query := database.DB.Model(&models.ApiKey{})

	if q != "" {
		searchPattern := "%" + q + "%"
		// Match on the key's own name or the owner account fields. Subquery
		// keeps the main query on api_keys so soft-delete scoping applies.
		// Plain LIKE matches the codebase-wide search idiom (case-insensitive
		// on SQLite/MySQL default collations).
		query = query.Where(
			"name LIKE ? OR user_id IN (SELECT id FROM users WHERE username LIKE ? OR nickname LIKE ? OR email LIKE ?)",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	now := time.Now()
	switch status {
	case "revoked":
		query = query.Unscoped().Where("api_keys.deleted_at IS NOT NULL")
	case "expired":
		query = query.Where("expires_at IS NOT NULL AND expires_at < ?", now)
	case "active":
		query = query.Where("(expires_at IS NULL OR expires_at >= ?)", now)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to count API keys: "+err.Error()))
		return
	}

	page := 1
	pageSize := 20
	if p := c.Query("page"); p != "" {
		fmt.Sscanf(p, "%d", &page)
	}
	if ps := c.Query("page_size"); ps != "" {
		fmt.Sscanf(ps, "%d", &pageSize)
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 20
	}

	var keys []models.ApiKey
	if status == "revoked" {
		// Refetch including soft-deleted rows for the revoked view
		if err := query.Unscoped().Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&keys).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to fetch API keys: "+err.Error()))
			return
		}
	} else {
		if err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&keys).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to fetch API keys: "+err.Error()))
			return
		}
	}

	items := make([]models.AdminApiKeyResponse, 0, len(keys))
	for _, k := range keys {
		items = append(items, ctrl.toResponse(&k, now))
	}

	hasNext := int64(page*pageSize) < total
	c.JSON(http.StatusOK, models.SuccessResponse(gin.H{
		"items":     items,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
		"has_next":  hasNext,
	}))
}

// RevokeApiKey soft-deletes any user's API key by id, invalidating it
// immediately. Works for both active and expired keys.
// DELETE /api/v1/admin/api-keys/:id
func (ctrl *AdminApiKeyController) RevokeApiKey(c *gin.Context) {
	id, err := parseUintParam(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid api key id"))
		return
	}

	var key models.ApiKey
	if err := database.DB.First(&key, id).Error; err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "API KEY not found"))
		return
	}

	if err := database.DB.Delete(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to revoke API key: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(gin.H{"id": key.ID}, "API KEY 已吊销，立即失效"))
}

// toResponse maps a stored ApiKey plus its owner to the admin DTO.
func (ctrl *AdminApiKeyController) toResponse(key *models.ApiKey, now time.Time) models.AdminApiKeyResponse {
	resp := models.AdminApiKeyResponse{
		ID:         key.ID,
		UserID:     key.UserID,
		Name:       key.Name,
		Key:        key.Key,
		LastUsedAt: key.LastUsedAt,
		ExpiresAt:  key.ExpiresAt,
		IsExpired:  key.IsExpired(now),
		IsRevoked:  key.DeletedAt.Valid,
		CreatedAt:  key.CreatedAt,
	}

	// Owner display info; fall back gracefully when the account was hard-removed
	var owner models.User
	if err := database.DB.Select("username", "nickname", "email").
		Where("id = ?", key.UserID).First(&owner).Error; err == nil {
		resp.Username = owner.Username
		resp.Nickname = owner.Nickname
		resp.Email = owner.Email
	}

	return resp
}
