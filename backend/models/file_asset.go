package models

import (
	"time"

	"gorm.io/gorm"
)

// FileAsset represents a physical file stored on a storage driver, deduplicated by SHA-256 hash.
type FileAsset struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	FileHash      string         `gorm:"type:varchar(64);uniqueIndex;not null" json:"file_hash"` // SHA-256 hash
	MD5Hash       string         `gorm:"type:varchar(32);index" json:"md5_hash"`
	Size          int64          `gorm:"type:bigint;not null" json:"size"`
	MimeType      string         `gorm:"type:varchar(64)" json:"mime_type"`
	Extension     string         `gorm:"type:varchar(32)" json:"extension"`
	Width         int            `gorm:"type:int" json:"width"`
	Height        int            `gorm:"type:int" json:"height"`
	AspectRatio   float64        `gorm:"type:decimal(6,3)" json:"aspect_ratio"`
	StorageDriver string         `gorm:"type:varchar(32);not null;index" json:"storage_driver"` // 'local', 's3', 'webdav'
	StorageKey    string         `gorm:"type:varchar(512);not null" json:"storage_key"`         // Relative path or S3 object key
	URL           string         `gorm:"type:varchar(1024);not null" json:"url"`                // Public accessible URL
	RefCount      int            `gorm:"type:int;default:1;not null" json:"ref_count"`          // Number of logical Image records referencing this file
	ColorPalette  string         `gorm:"type:text" json:"color_palette"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides default table name
func (FileAsset) TableName() string {
	return "file_assets"
}
