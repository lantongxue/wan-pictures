package controllers

import (
	"fmt"

	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

const gb = 1024 * 1024 * 1024

// ResolveStorageQuota computes the effective total storage quota for a user.
//
// Precedence: per-account override (User.StorageQuotaBytes, same semantics as
// UploadQPS/UploadRPM) first, then the role default from system settings:
// admin -> unlimited, vip -> VIPStorageQuotaGB (default 20), user ->
// FreeStorageQuotaGB (default 5). Anonymous callers are handled by the
// upload pipeline and never reach quota enforcement, but resolve to unlimited
// for safety.
func ResolveStorageQuota(user *models.User) (quotaBytes int64, unlimited bool) {
	quotas := GetSystemQuotaSettings()

	if user != nil && user.StorageQuotaBytes != nil {
		if *user.StorageQuotaBytes == 0 {
			return 0, true
		}
		if *user.StorageQuotaBytes > 0 {
			return *user.StorageQuotaBytes, false
		}
	}

	role := ""
	if user != nil {
		role = user.Role
	}
	switch role {
	case "admin":
		return 0, true
	case "vip":
		return quotas.EffectiveVIPStorageQuotaBytes(), false
	case "user":
		return quotas.EffectiveFreeStorageQuotaBytes(), false
	default:
		return 0, true
	}
}

// GetUserUsedSpaceBytes sums the size of a user's live (non-deleted) images.
// Soft-deleted rows are excluded by GORM's default scope, so deleting an image
// automatically releases its quota; instant-upload copies count in full per
// user, matching the logical per-account view used elsewhere in the app.
func GetUserUsedSpaceBytes(userID uint) int64 {
	if userID == 0 {
		return 0
	}
	var used int64
	database.DB.Model(&models.Image{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(size), 0)").
		Scan(&used)
	return used
}

// CheckUserStorageQuota rejects the upload when incomingBytes would exceed the
// user's effective total storage quota.
func CheckUserStorageQuota(user *models.User, incomingBytes int64) error {
	quotaBytes, unlimited := ResolveStorageQuota(user)
	if unlimited {
		return nil
	}

	used := GetUserUsedSpaceBytes(user.ID)
	if used+incomingBytes <= quotaBytes {
		return nil
	}

	return fmt.Errorf(
		"存储空间不足：已用 %s / 额度 %s，本文件 %s，请删除部分图片或联系管理员调整额度",
		formatBytes(used), formatBytes(quotaBytes), formatBytes(incomingBytes),
	)
}

func formatBytes(n int64) string {
	switch {
	case n >= gb:
		return fmt.Sprintf("%.2f GB", float64(n)/gb)
	case n >= 1024*1024:
		return fmt.Sprintf("%.2f MB", float64(n)/(1024*1024))
	case n >= 1024:
		return fmt.Sprintf("%.2f KB", float64(n)/1024)
	default:
		return fmt.Sprintf("%d B", n)
	}
}
