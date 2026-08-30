package models

import "time"

// SystemSetting stores key-value pairs for system-wide configuration
type SystemSetting struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Key       string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName overrides default table name
func (SystemSetting) TableName() string {
	return "system_settings"
}

// UploadQuotaSettings holds system-level upload restriction parameters and naming rules
type UploadQuotaSettings struct {
	AllowAnonymous      bool `json:"allow_anonymous"`
	AnonymousDailyLimit int  `json:"anonymous_daily_limit"` // e.g. 20
	AnonymousMaxSizeMB  int  `json:"anonymous_max_size_mb"` // e.g. 5
	FreeUserDailyLimit  int  `json:"free_user_daily_limit"` // e.g. 50
	FreeUserMaxSizeMB   int  `json:"free_user_max_size_mb"` // e.g. 10
	VIPDailyLimit       int  `json:"vip_daily_limit"`       // e.g. 500
	VIPMaxSizeMB        int  `json:"vip_max_size_mb"`       // e.g. 50

	// Upload rate limiting (Redis sliding window; QPS = requests/second, RPM = requests/minute)
	// Pointer fields: nil (= key absent in legacy JSON) falls back to defaults,
	// explicit 0 disables limiting, >0 overrides.
	AnonymousUploadQPS *int `json:"anonymous_upload_qps,omitempty"` // global QPS for anonymous (IP-based)
	UserUploadQPS      *int `json:"user_upload_qps,omitempty"`      // global QPS for logged-in users
	AnonymousUploadRPM *int `json:"anonymous_upload_rpm,omitempty"` // global RPM for anonymous (IP-based)
	UserUploadRPM      *int `json:"user_upload_rpm,omitempty"`      // global RPM for logged-in users

	// Default total storage quota per role, in GB. Pointer fields: nil (= key absent
	// in legacy JSON) falls back to defaults; admins are always unlimited unless a
	// per-account override says otherwise.
	FreeStorageQuotaGB *int `json:"free_storage_quota_gb,omitempty"` // default storage quota GB for role 'user'
	VIPStorageQuotaGB  *int `json:"vip_storage_quota_gb,omitempty"`  // default storage quota GB for role 'vip'

	NamingRule      string `json:"naming_rule"`   // 'uuid', 'original'
	CustomPrefix    string `json:"custom_prefix"` // legacy, kept for compat (unused by uuid naming)
	AutoCompress    bool   `json:"auto_compress"`
	CompressQuality int    `json:"compress_quality"`
	ConvertToWebP   bool   `json:"convert_to_webp"`
}

// DefaultUploadQuotaSettings returns default quota and policy values
func DefaultUploadQuotaSettings() UploadQuotaSettings {
	return UploadQuotaSettings{
		AllowAnonymous:      true,
		AnonymousDailyLimit: 20,
		AnonymousMaxSizeMB:  5,
		FreeUserDailyLimit:  50,
		FreeUserMaxSizeMB:   10,
		VIPDailyLimit:       500,
		VIPMaxSizeMB:        50,
		AnonymousUploadQPS:  intPtr(2),
		UserUploadQPS:       intPtr(10),
		AnonymousUploadRPM:  intPtr(30),
		UserUploadRPM:       intPtr(200),
		FreeStorageQuotaGB:  intPtr(5),
		VIPStorageQuotaGB:   intPtr(20),
		NamingRule:          "uuid",
		CustomPrefix:        "pic_",
		AutoCompress:        false,
		CompressQuality:     85,
		ConvertToWebP:       false,
	}
}

// EffectiveAnonymousUploadQPS returns the configured anonymous QPS or the default (2)
func (s UploadQuotaSettings) EffectiveAnonymousUploadQPS() int {
	if s.AnonymousUploadQPS != nil {
		return *s.AnonymousUploadQPS
	}
	return 2
}

// EffectiveUserUploadQPS returns the configured user QPS or the default (10)
func (s UploadQuotaSettings) EffectiveUserUploadQPS() int {
	if s.UserUploadQPS != nil {
		return *s.UserUploadQPS
	}
	return 10
}

// EffectiveAnonymousUploadRPM returns the configured anonymous RPM or the default (30)
func (s UploadQuotaSettings) EffectiveAnonymousUploadRPM() int {
	if s.AnonymousUploadRPM != nil {
		return *s.AnonymousUploadRPM
	}
	return 30
}

// EffectiveUserUploadRPM returns the configured user RPM or the default (200)
func (s UploadQuotaSettings) EffectiveUserUploadRPM() int {
	if s.UserUploadRPM != nil {
		return *s.UserUploadRPM
	}
	return 200
}

// EffectiveFreeStorageQuotaBytes returns the default storage quota in bytes for
// role 'user', or the default 5GB when unset or non-positive.
func (s UploadQuotaSettings) EffectiveFreeStorageQuotaBytes() int64 {
	if s.FreeStorageQuotaGB != nil && *s.FreeStorageQuotaGB > 0 {
		return int64(*s.FreeStorageQuotaGB) * 1024 * 1024 * 1024
	}
	return 5 * 1024 * 1024 * 1024
}

// EffectiveVIPStorageQuotaBytes returns the default storage quota in bytes for
// role 'vip', or the default 20GB when unset or non-positive.
func (s UploadQuotaSettings) EffectiveVIPStorageQuotaBytes() int64 {
	if s.VIPStorageQuotaGB != nil && *s.VIPStorageQuotaGB > 0 {
		return int64(*s.VIPStorageQuotaGB) * 1024 * 1024 * 1024
	}
	return 20 * 1024 * 1024 * 1024
}

func intPtr(v int) *int {
	return &v
}
