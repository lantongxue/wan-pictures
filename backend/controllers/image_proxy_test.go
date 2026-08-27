package controllers_test

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"wanpictures-backend/controllers"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/utils/sqids"
)

// setupProxyTestEnv builds an isolated in-memory DB + real local storage dir
// with one image backed by an actual file on disk.
func setupProxyTestEnv(t *testing.T) (*models.Image, *models.FileAsset, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.FileAsset{}, &models.Image{}, &models.StorageConfig{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	database.DB = db

	storagePath := t.TempDir()
	if err := database.DB.Create(&models.StorageConfig{
		Driver:     models.StorageDriverLocal,
		Name:       "Local",
		IsEnabled:  true,
		IsActive:   true,
		ConfigJSON: fmt.Sprintf(`{"storage_path":%q,"public_url_prefix":"/uploads/"}`, storagePath),
	}).Error; err != nil {
		t.Fatalf("failed to seed storage config: %v", err)
	}

	storageKey := "uploads/2026/08/27/hello.png"
	// LocalEngine strips the "uploads/" prefix from keys: physical files live
	// directly under the storage path.
	relKey := strings.TrimPrefix(storageKey, "uploads/")
	fullPath := filepath.Join(storagePath, filepath.FromSlash(relKey))
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		t.Fatalf("failed to create dirs: %v", err)
	}
	original := []byte("fake-png-bytes")
	if err := os.WriteFile(fullPath, original, 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	thumbKey := "uploads/thumbs/2026/08/27/hello_thumb.png"
	thumbFull := filepath.Join(storagePath, filepath.FromSlash(strings.TrimPrefix(thumbKey, "uploads/")))
	if err := os.MkdirAll(filepath.Dir(thumbFull), 0755); err != nil {
		t.Fatalf("failed to create thumb dirs: %v", err)
	}
	thumbBytes := []byte("fake-thumb-bytes")
	if err := os.WriteFile(thumbFull, thumbBytes, 0644); err != nil {
		t.Fatalf("failed to write thumb: %v", err)
	}

	asset := models.FileAsset{
		FileHash:      "hash1",
		Size:          int64(len(original)),
		MimeType:      "image/png",
		Extension:     "png",
		StorageDriver: string(models.StorageDriverLocal),
		StorageKey:    storageKey,
		URL:           "/uploads/" + strings.TrimPrefix(storageKey, "uploads/"),
		ThumbUrl:      "/uploads/" + strings.TrimPrefix(thumbKey, "uploads/"),
		RefCount:      1,
	}
	if err := database.DB.Create(&asset).Error; err != nil {
		t.Fatalf("failed to create asset: %v", err)
	}

	img := models.Image{
		Name:          "hello",
		Extension:     "png",
		Type:          "image/png",
		Size:          int64(len(original)),
		Url:           asset.URL,
		ThumbUrl:      asset.ThumbUrl,
		StorageDriver: string(models.StorageDriverLocal),
		FileAssetID:   asset.ID,
		FileHash:      asset.FileHash,
		AlbumID:       models.DefaultAlbumID,
		UserID:        1,
	}
	if err := database.DB.Create(&img).Error; err != nil {
		t.Fatalf("failed to create image: %v", err)
	}

	return &img, &asset, thumbKey
}

func newProxyRouter() *gin.Engine {
	r := gin.New()
	ctrl := controllers.NewImageController()
	r.GET("/image/:file", ctrl.GetImageFile)
	r.GET("/image/thumb/:file", ctrl.GetImageThumb)
	return r
}

func doGet(r *gin.Engine, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	r.ServeHTTP(w, req)
	return w
}

func TestImageFileProxyStreamsOriginal(t *testing.T) {
	img, asset, _ := setupProxyTestEnv(t)
	r := newProxyRouter()

	enc, err := sqids.EncodeImageID(uint64(img.ID))
	if err != nil {
		t.Fatalf("encode failed: %v", err)
	}

	w := doGet(r, "/image/"+enc+".png")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	if !bytes.Equal(w.Body.Bytes(), []byte("fake-png-bytes")) {
		t.Errorf("body mismatch: %q", w.Body.Bytes())
	}
	if ct := w.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("content-type = %q, want image/png", ct)
	}
	if w.Header().Get("Cache-Control") == "" {
		t.Error("expected Cache-Control header for view counting")
	}
	if got := w.Header().Get("Content-Length"); got != fmt.Sprintf("%d", asset.Size) {
		t.Errorf("content-length = %q, want %d", got, asset.Size)
	}
}

func TestImageThumbProxyStreamsThumbnail(t *testing.T) {
	img, _, _ := setupProxyTestEnv(t)
	r := newProxyRouter()

	enc, err := sqids.EncodeImageID(uint64(img.ID))
	if err != nil {
		t.Fatalf("encode failed: %v", err)
	}

	w := doGet(r, "/image/thumb/"+enc+".png")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	if !bytes.Equal(w.Body.Bytes(), []byte("fake-thumb-bytes")) {
		t.Errorf("body mismatch: %q", w.Body.Bytes())
	}
}

func TestImageProxyRejectsInvalidTokens(t *testing.T) {
	img, _, _ := setupProxyTestEnv(t)
	r := newProxyRouter()

	enc, err := sqids.EncodeImageID(uint64(img.ID))
	if err != nil {
		t.Fatalf("encode failed: %v", err)
	}

	cases := []string{
		"/image/abc.png",           // garbage token
		"/image/" + enc + ".jpg",   // extension mismatch
		"/image/" + enc,            // missing extension
		"/image/.png",              // empty token
		"/image/thumb/" + enc + ".jpg", // thumb extension mismatch
	}
	for _, p := range cases {
		w := doGet(r, p)
		if w.Code == http.StatusOK {
			t.Errorf("expected non-200 for %s, got %d", p, w.Code)
		}
	}

	// Query strings are irrelevant and must keep working.
	if w := doGet(r, "/image/"+enc+".png?x=1"); w.Code != http.StatusOK {
		t.Errorf("expected 200 with query string, got %d", w.Code)
	}
}

func TestImagePublicCopyUsesProxyURLs(t *testing.T) {
	img, _, _ := setupProxyTestEnv(t)
	img.ViewCount = 42

	pub := img.PublicCopy()
	if pub.ID != img.ID || pub.ViewCount != 42 {
		t.Errorf("PublicCopy lost fields: %+v", pub)
	}
	if pub.Url == img.Url || !strings.HasPrefix(pub.Url, "/image/") {
		t.Errorf("url not rewritten to proxy: %q", pub.Url)
	}
	if !strings.HasPrefix(pub.ThumbUrl, "/image/thumb/") {
		t.Errorf("thumb_url not rewritten to proxy: %q", pub.ThumbUrl)
	}
	if pub.Url == "" || !strings.HasSuffix(pub.Url, ".png") {
		t.Errorf("proxy url missing extension: %q", pub.Url)
	}

	// Round-trip: the proxy URL must resolve back to the same image id.
	base := strings.TrimPrefix(pub.Url, "/image/")
	idx := strings.LastIndex(base, ".")
	decoded, ok := sqids.DecodeImageID(base[:idx])
	if !ok || decoded != uint64(img.ID) {
		t.Errorf("proxy url id does not round-trip: %q -> %d (ok=%v)", pub.Url, decoded, ok)
	}
}