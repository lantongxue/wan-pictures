package controllers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"wanpictures-backend/models"

	"github.com/gin-gonic/gin"
)

// toAbsoluteURL converts a possibly-relative proxy path (e.g. /image/xxx.png)
// into a fully-qualified external URL (e.g. https://example.com/image/xxx.png)
// using the incoming request's scheme/host so the caller can access it directly
// without knowledge of the server's domain. Already-absolute URLs are returned as-is.
func toAbsoluteURL(c *gin.Context, p string) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s%s", scheme, c.Request.Host, p)
}

// OpenApiController handles the dedicated open API surface (/openapi/v1)
// authenticated exclusively by developer API keys (Bearer wpk_...).
type OpenApiController struct{}

func NewOpenApiController() *OpenApiController {
	return &OpenApiController{}
}

// ApiUpload is the dedicated open upload endpoint authenticated exclusively by
// developer API keys (Bearer wpk_...). It reuses the full shared upload
// pipeline (instant deduplication, quota enforcement, thumbnails, persistence)
// and additionally accepts an optional 'tags' field (max 10 tags).
// Response data only exposes url, thumb_url and created_at as absolute URLs.
// POST /openapi/v1/upload
func (ctrl *OpenApiController) ApiUpload(c *gin.Context) {
	// Strictly require API-key authentication — JWT is never accepted here
	if _, exists := c.Get("apiKey"); !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "this endpoint requires a valid API key"))
		c.Abort()
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "No file uploaded: "+err.Error()))
		return
	}

	// Optional tags field: comma/semicolon separated, max 10 tags
	var tags []string
	if raw := c.PostForm("tags"); strings.TrimSpace(raw) != "" {
		tags, err = parseUploadTags(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, err.Error()))
			return
		}
	}

	// Reuse the shared upload pipeline of the UploadController (same package)
	uploader := NewUploadController()
	role, userID, clientIP := uploader.getUserContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "invalid api key identity"))
		return
	}

	status, payload, message, err := uploader.processUpload(c, role, userID, clientIP, fileHeader, tags)
	if err != nil {
		c.JSON(status, models.ErrorResponse(status, err.Error()))
		return
	}
	// Only expose url, thumb_url and created_at to external callers
	// url/thumb_url are converted to absolute external URLs so callers
	// can access them directly without concatenating the host themselves.
	var url, thumbURL string
	var createdAt time.Time
	if v, ok := payload["image"]; ok {
		switch img := v.(type) {
		case *models.Image:
			url = toAbsoluteURL(c, img.Url)
			thumbURL = toAbsoluteURL(c, img.ThumbUrl)
			createdAt = img.CreatedAt
		case models.Image:
			url = toAbsoluteURL(c, img.Url)
			thumbURL = toAbsoluteURL(c, img.ThumbUrl)
			createdAt = img.CreatedAt
		}
	}
	data := gin.H{
		"url":        url,
		"thumb_url":  thumbURL,
		"created_at": createdAt,
	}
	c.JSON(status, models.SuccessResponse(data, message))
}
