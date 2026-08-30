package controllers

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

func setupQuotaTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "quota-test.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Image{}, &models.FileAsset{}, &models.UploadLog{}, &models.SystemSetting{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	database.DB = db
}

func seedQuotaUser(t *testing.T, role string, quotaBytes *int64) *models.User {
	t.Helper()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	u := models.User{
		Username:          "u_" + role + "_" + suffix,
		Email:             role + "_" + suffix + "@t.dev",
		Password:          "x",
		Role:              role,
		StorageQuotaBytes: quotaBytes,
	}
	if err := database.DB.Create(&u).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return &u
}

func seedImage(t *testing.T, userID uint, size int64) *models.Image {
	t.Helper()
	img := models.Image{Name: "img", Size: size, UserID: userID, AlbumID: models.DefaultAlbumID, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := database.DB.Create(&img).Error; err != nil {
		t.Fatalf("seed image: %v", err)
	}
	return &img
}

func writeQuotaSetting(t *testing.T, freeGB, vipGB int) {
	t.Helper()
	raw, _ := json.Marshal(map[string]int{"free_storage_quota_gb": freeGB, "vip_storage_quota_gb": vipGB})
	database.DB.Where("key = ?", "upload_quotas").Delete(&models.SystemSetting{})
	database.DB.Create(&models.SystemSetting{Key: "upload_quotas", Value: string(raw)})
}

const gb64 = 1024 * 1024 * 1024

func TestResolveStorageQuotaRoleDefaults(t *testing.T) {
	setupQuotaTestDB(t)

	cases := []struct {
		role      string
		wantQuota int64
		wantUnlim bool
	}{
		{"user", 5 * gb64, false},
		{"vip", 20 * gb64, false},
		{"admin", 0, true},
	}
	for _, tc := range cases {
		u := seedQuotaUser(t, tc.role, nil)
		quota, unlimited := ResolveStorageQuota(u)
		if unlimited != tc.wantUnlim || quota != tc.wantQuota {
			t.Errorf("role %s: got quota=%d unlimited=%v, want quota=%d unlimited=%v", tc.role, quota, unlimited, tc.wantQuota, tc.wantUnlim)
		}
	}
}

func TestResolveStorageQuotaOverrides(t *testing.T) {
	setupQuotaTestDB(t)

	unlim := int64(0)
	custom := int64(100 * gb64)

	u := seedQuotaUser(t, "user", &unlim)
	if _, unlimited := ResolveStorageQuota(u); !unlimited {
		t.Errorf("explicit 0 override should be unlimited")
	}

	u = seedQuotaUser(t, "user", &custom)
	quota, _ := ResolveStorageQuota(u)
	if quota != custom {
		t.Errorf("custom override: got %d want %d", quota, custom)
	}

	u = seedQuotaUser(t, "admin", &custom)
	quota, _ = ResolveStorageQuota(u)
	if quota != custom {
		t.Errorf("admin custom override: got %d want %d", quota, custom)
	}

	writeQuotaSetting(t, 2, 7)
	u = seedQuotaUser(t, "user", nil)
	if quota, _ := ResolveStorageQuota(u); quota != 2*gb64 {
		t.Errorf("configured free default: got %d want %d", quota, 2*gb64)
	}
	u = seedQuotaUser(t, "vip", nil)
	if quota, _ := ResolveStorageQuota(u); quota != 7*gb64 {
		t.Errorf("configured vip default: got %d want %d", quota, 7*gb64)
	}
}

func TestGetUserUsedSpaceBytesExcludesSoftDeleted(t *testing.T) {
	setupQuotaTestDB(t)
	u := seedQuotaUser(t, "user", nil)
	seedImage(t, u.ID, 100)
	img2 := seedImage(t, u.ID, 200)

	if got := GetUserUsedSpaceBytes(u.ID); got != 300 {
		t.Fatalf("used = %d, want 300", got)
	}

	database.DB.Delete(img2)
	if got := GetUserUsedSpaceBytes(u.ID); got != 100 {
		t.Fatalf("used after soft delete = %d, want 100", got)
	}
}

func TestCheckUploadQuotaStorageLimit(t *testing.T) {
	setupQuotaTestDB(t)
	quota := int64(300 * 1024)
	u := seedQuotaUser(t, "user", &quota)
	seedImage(t, u.ID, 200*1024)

	ctrl := &UploadController{}

	// 200KB used + 50KB incoming = 250KB <= 300KB: allowed
	if err := ctrl.checkUploadQuota("user", u.ID, "1.2.3.4", 50*1024); err != nil {
		t.Fatalf("within quota should pass, got: %v", err)
	}

	// 200KB used + 200KB incoming = 400KB > 300KB: rejected
	err := ctrl.checkUploadQuota("user", u.ID, "1.2.3.4", 200*1024)
	if err == nil {
		t.Fatal("exceeding quota should be rejected")
	}
	t.Logf("rejection message: %v", err)

	// Delete the image -> usage released -> same upload passes
	database.DB.Where("user_id = ?", u.ID).Delete(&models.Image{})
	if err := ctrl.checkUploadQuota("user", u.ID, "1.2.3.4", 200*1024); err != nil {
		t.Fatalf("after delete should pass, got: %v", err)
	}
}

func TestCheckUploadQuotaAdminUnlimited(t *testing.T) {
	setupQuotaTestDB(t)
	a := seedQuotaUser(t, "admin", nil)

	ctrl := &UploadController{}
	// Admin unlimited: far above the 100MB single-file path limit is capped earlier,
	// so use a size under it but large enough to prove no storage rejection.
	if err := ctrl.checkUploadQuota("admin", a.ID, "1.2.3.4", 90*1024*1024); err != nil {
		t.Fatalf("admin upload should pass: %v", err)
	}
}
