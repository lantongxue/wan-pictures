package controllers

import (
	"fmt"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

// setupRefCountTestDB initializes an isolated in-memory SQLite database
func setupRefCountTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.FileAsset{}, &models.Image{}, &models.StorageConfig{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	database.DB = db

	// Seed the local storage config so purge paths resolve through the real
	// engine; the storage path points at a temp dir so NewLocalEngine's
	// MkdirAll never leaves a stray ./uploads in the package directory.
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
}

// seedAssetWithImages creates a FileAsset plus n logical Image references to it
func seedAssetWithImages(t *testing.T, hash string, n int) (*models.FileAsset, []models.Image) {
	t.Helper()
	asset := models.FileAsset{
		FileHash:      hash,
		Size:          1234,
		MimeType:      "image/png",
		Extension:     "png",
		StorageDriver: "local",
		StorageKey:    "uploads/2026/01/01/" + hash[:12] + ".png",
		URL:           "/uploads/" + hash[:12] + ".png",
		RefCount:      n,
	}
	if err := database.DB.Create(&asset).Error; err != nil {
		t.Fatalf("failed to seed asset: %v", err)
	}
	images := make([]models.Image, 0, n)
	for i := 0; i < n; i++ {
		img := models.Image{
			Name:        "test.png",
			FileAssetID: asset.ID,
			FileHash:    asset.FileHash,
			AlbumID:     models.DefaultAlbumID,
			UserID:      1,
		}
		if err := database.DB.Create(&img).Error; err != nil {
			t.Fatalf("failed to seed image: %v", err)
		}
		images = append(images, img)
	}
	return &asset, images
}

// TestDeleteThenReUploadSameHash reproduces the original bug: after deleting the
// only image of a file, uploading identical content again must NOT hit the
// unique index on file_assets.file_hash.
func TestDeleteThenReUploadSameHash(t *testing.T) {
	setupRefCountTestDB(t)

	asset, images := seedAssetWithImages(t, "aaaa1111bbbb2222cccc3333dddd4444", 1)

	// User deletes their copy -> last reference gone
	if err := DeleteImageWithRefCount(images[0].ID); err != nil {
		t.Fatalf("delete failed: %v", err)
	}

	// Image record must be soft-deleted only (recoverable logical state)
	var softCount int64
	database.DB.Unscoped().Model(&models.Image{}).Where("id = ?", images[0].ID).Count(&softCount)
	if softCount != 1 {
		t.Fatalf("image should still exist as soft-deleted row, got %d", softCount)
	}

	// Asset row must be HARD-deleted to release the unique hash slot
	var assetRows int64
	database.DB.Unscoped().Model(&models.FileAsset{}).Where("id = ?", asset.ID).Count(&assetRows)
	if assetRows != 0 {
		t.Fatalf("file asset must be purged after last reference was deleted")
	}

	// Re-upload identical content: inserting a fresh FileAsset with same hash must succeed
	reuploaded := models.FileAsset{
		FileHash:      "aaaa1111bbbb2222cccc3333dddd4444",
		Size:          1234,
		MimeType:      "image/png",
		Extension:     "png",
		StorageDriver: "local",
		StorageKey:    "uploads/2026/01/02/re.png",
		URL:           "/uploads/re.png",
		RefCount:      1,
	}
	if err := database.DB.Create(&reuploaded).Error; err != nil {
		t.Fatalf("re-upload of same hash hit constraint: %v", err)
	}
}

// TestSharedAssetDeleteKeepsFileUntilLastRef covers instant-upload semantics:
// two Image records share one physical asset (pid). Deleting one copy must keep
// the file; deleting the final copy must purge the asset.
func TestSharedAssetDeleteKeepsFileUntilLastRef(t *testing.T) {
	setupRefCountTestDB(t)

	asset, images := seedAssetWithImages(t, "eeee5555ffff6666aaaa7777bbbb8888", 2)

	// First owner deletes -> other reference remains, asset must survive
	if err := DeleteImageWithRefCount(images[0].ID); err != nil {
		t.Fatalf("first delete failed: %v", err)
	}

	var kept models.FileAsset
	if err := database.DB.First(&kept, asset.ID).Error; err != nil {
		t.Fatalf("asset must survive while other references exist: %v", err)
	}
	if kept.RefCount != 1 {
		t.Fatalf("ref_count should be repaired to live count 1, got %d", kept.RefCount)
	}

	// Second owner deletes -> last reference gone, asset must be purged
	if err := DeleteImageWithRefCount(images[1].ID); err != nil {
		t.Fatalf("second delete failed: %v", err)
	}
	var rows int64
	database.DB.Unscoped().Model(&models.FileAsset{}).Where("id = ?", asset.ID).Count(&rows)
	if rows != 0 {
		t.Fatalf("asset must be purged after final reference deleted")
	}
}

// TestPurgeOrphanSoftDeletedAssets verifies the startup repair routine: stale
// soft-deleted asset rows without active references are removed, referenced
// ones survive.
func TestPurgeOrphanSoftDeletedAssets(t *testing.T) {
	setupRefCountTestDB(t)

	orphan := models.FileAsset{FileHash: "hash_orphan", StorageDriver: "local", StorageKey: "k1", URL: "u1", RefCount: 0}
	referenced := models.FileAsset{FileHash: "hash_referenced", StorageDriver: "local", StorageKey: "k2", URL: "u2", RefCount: 1}
	database.DB.Create(&orphan)
	database.DB.Create(&referenced)
	// Active image still pointing at the second asset (pid reference)
	activeRef := models.Image{Name: "keep.png", FileAssetID: referenced.ID, FileHash: referenced.FileHash, AlbumID: models.DefaultAlbumID, UserID: 1}
	database.DB.Create(&activeRef)
	database.DB.Delete(&orphan)  // simulate legacy soft-delete
	database.DB.Delete(&referenced)

	database.PurgeOrphanSoftDeletedAssets(database.DB)

	var orphanRows, referencedRows int64
	database.DB.Unscoped().Model(&models.FileAsset{}).Where("id = ?", orphan.ID).Count(&orphanRows)
	database.DB.Unscoped().Model(&models.FileAsset{}).Where("id = ?", referenced.ID).Count(&referencedRows)
	if orphanRows != 0 {
		t.Fatalf("orphan soft-deleted asset should be purged")
	}
	if referencedRows != 1 {
		t.Fatalf("soft-deleted asset still referenced by active image must survive")
	}
}
