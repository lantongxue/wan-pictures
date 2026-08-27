package controllers

import (
	"io"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/services/storage"
	"wanpictures-backend/services/thumbnail"
	"wanpictures-backend/services/viewcount"
	"wanpictures-backend/utils/sqids"
)

// ImageController serves image bytes through the Go backend so every request
// is counted as a view. The real storage URLs are never exposed to clients:
// tokens are Sqids-obfuscated ids plus the image extension.
type ImageController struct{}

// NewImageController creates the image proxy controller
func NewImageController() *ImageController {
	return &ImageController{}
}

// publicImages rewrites a slice of images to their proxy URLs for client responses
func publicImages(images []models.Image) []models.Image {
	out := make([]models.Image, len(images))
	for i := range images {
		out[i] = *images[i].PublicCopy()
	}
	return out
}

// parseImageToken decodes "/image/{enc}.{ext}" style tokens into an image id
// and lowercased extension. Returns false for malformed or undecodable tokens.
func parseImageToken(token string) (uint, string, bool) {
	idx := strings.LastIndex(token, ".")
	if idx <= 0 || idx == len(token)-1 {
		return 0, "", false
	}
	enc, ext := token[:idx], strings.ToLower(token[idx+1:])
	id, ok := sqids.DecodeImageID(enc)
	if !ok || id == 0 {
		return 0, "", false
	}
	return uint(id), ext, true
}

// loadImageByToken resolves the image referenced by a proxy token and
// validates that the token extension matches the stored one, rejecting
// fabricated or mismatched tokens.
func loadImageByToken(token string) (*models.Image, bool) {
	id, ext, ok := parseImageToken(token)
	if !ok {
		return nil, false
	}
	var img models.Image
	if err := database.DB.First(&img, id).Error; err != nil {
		return nil, false
	}
	if !strings.EqualFold(strings.TrimPrefix(img.Extension, "."), ext) {
		return nil, false
	}
	return &img, true
}

// GetImageFile streams the full-resolution original image and records a view.
// GET /image/{enc(id)}.{ext}
func (ctrl *ImageController) GetImageFile(c *gin.Context) {
	img, ok := loadImageByToken(c.Param("file"))
	if !ok {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
		return
	}

	viewcount.Enqueue(img.ID)
	ctrl.stream(c, img, false)
}

// GetImageThumb streams the downscaled thumbnail and records a view.
// GET /image/thumb/{enc(id)}.{ext}
func (ctrl *ImageController) GetImageThumb(c *gin.Context) {
	img, ok := loadImageByToken(c.Param("file"))
	if !ok {
		c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
		return
	}

	viewcount.Enqueue(img.ID)
	ctrl.stream(c, img, true)
}

// stream serves the requested variant (original or thumbnail) of an image:
//  1. deduplicated assets are streamed through their storage engine
//  2. otherwise the stored public URL is reverse-proxied (manual imports)
//  3. otherwise 404
func (ctrl *ImageController) stream(c *gin.Context, img *models.Image, isThumb bool) {
	if img.FileAssetID > 0 {
		var asset models.FileAsset
		if err := database.DB.First(&asset, img.FileAssetID).Error; err == nil {
			engine, err := storage.GetManager().GetEngineByDriver(models.StorageDriver(asset.StorageDriver))
			if err == nil {
				key := asset.StorageKey
				contentType := asset.MimeType
				var contentLength int64 = asset.Size
				if isThumb {
					key = thumbnail.ThumbKey(asset.StorageKey)
					contentType = thumbMimeFromURL(img.ThumbUrl, asset.MimeType)
					contentLength = 0 // unknown; streamed with chunked encoding
				}

				rc, err := engine.Read(c.Request.Context(), key)
				if err == nil {
					defer rc.Close()
					streamReader(c, rc, contentType, contentLength)
					return
				}
			}
		}
	}

	if target := imageTargetURL(img, isThumb); target != "" {
		ctrl.proxyURL(c, target)
		return
	}

	c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
}

// imageTargetURL returns the stored public URL to fall back to for an image
// without a deduplicated FileAsset (admin-created records), or "" if none.
func imageTargetURL(img *models.Image, isThumb bool) string {
	url := img.Url
	if isThumb {
		url = img.ThumbUrl
	}
	return strings.TrimSpace(url)
}

// proxyURL reverse-proxies an absolute or legacy /uploads/... URL:
// absolute URLs are fetched over HTTP; relative URLs are read from the local
// storage engine (whose Read tolerates the /uploads/ prefix).
func (ctrl *ImageController) proxyURL(c *gin.Context, target string) {
	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") {
		client := &http.Client{Timeout: 30 * time.Second}
		req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, target, nil)
		if err != nil {
			c.JSON(http.StatusBadGateway, models.ErrorResponse(http.StatusBadGateway, "Proxy target invalid"))
			return
		}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, models.ErrorResponse(http.StatusBadGateway, "Failed to fetch image source"))
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			c.Status(resp.StatusCode)
			return
		}
		c.Header("Content-Type", resp.Header.Get("Content-Type"))
		streamReader(c, resp.Body, resp.Header.Get("Content-Type"), resp.ContentLength)
		return
	}

	if strings.HasPrefix(target, "/") {
		engine, err := storage.GetManager().GetEngineByDriver(models.StorageDriverLocal)
		if err == nil {
			rc, err := engine.Read(c.Request.Context(), target)
			if err == nil {
				defer rc.Close()
				streamReader(c, rc, thumbMimeFromURL(target, "application/octet-stream"), 0)
				return
			}
		}
	}

	c.JSON(http.StatusNotFound, models.ErrorResponse(http.StatusNotFound, "Image not found"))
}

// streamReader writes headers and copies the reader to the response. The
// no-cache directive forces browsers to re-request on every view so counts
// stay accurate (the whole point of routing images through the proxy).
func streamReader(c *gin.Context, rc io.Reader, contentType string, contentLength int64) {
	c.Header("Cache-Control", "private, no-cache, must-revalidate")
	c.Header("X-Content-Type-Options", "nosniff")
	if contentType != "" {
		c.Header("Content-Type", contentType)
	}
	if contentLength > 0 {
		c.Header("Content-Length", strconv.FormatInt(contentLength, 10))
	}
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, rc)
}

// thumbMimeFromURL guesses the thumbnail's mime type from its stored URL
// extension, falling back to the original asset mime type.
func thumbMimeFromURL(thumbURL, fallback string) string {
	ext := strings.ToLower(path.Ext(thumbURL))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".avif":
		return "image/avif"
	case ".bmp":
		return "image/bmp"
	case ".ico":
		return "image/x-icon"
	default:
		if fallback != "" {
			return fallback
		}
		return "application/octet-stream"
	}
}
