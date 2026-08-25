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
	AllowAnonymous      bool   `json:"allow_anonymous"`
	AnonymousDailyLimit int    `json:"anonymous_daily_limit"` // e.g. 20
	AnonymousMaxSizeMB  int    `json:"anonymous_max_size_mb"`  // e.g. 5
	FreeUserDailyLimit  int    `json:"free_user_daily_limit"`  // e.g. 50
	FreeUserMaxSizeMB   int    `json:"free_user_max_size_mb"`   // e.g. 10
	VIPDailyLimit       int    `json:"vip_daily_limit"`        // e.g. 500
	VIPMaxSizeMB        int    `json:"vip_max_size_mb"`         // e.g. 50
	NamingRule          string `json:"naming_rule"`            // 'timestamp', 'random', 'original', 'custom'
	CustomPrefix        string `json:"custom_prefix"`          // 'pic_'
	AutoCompress        bool   `json:"auto_compress"`
	CompressQuality     int    `json:"compress_quality"`
	ConvertToWebP       bool   `json:"convert_to_webp"`
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
		NamingRule:          "timestamp",
		CustomPrefix:        "pic_",
		AutoCompress:        false,
		CompressQuality:     85,
		ConvertToWebP:       false,
	}
}
