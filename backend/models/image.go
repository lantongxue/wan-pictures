package models

import (
	"time"

	"gorm.io/gorm"
)

// Image represents an uploaded or imported image asset
type Image struct {
	ID            string         `gorm:"type:varchar(64);primaryKey" json:"id"`
	Name          string         `gorm:"type:varchar(255);not null;index" json:"name"`
	OriginalName  string         `gorm:"type:varchar(255)" json:"original_name"`
	Size          int64          `gorm:"type:bigint" json:"size"`
	Type          string         `gorm:"type:varchar(64);index" json:"type"`
	Extension     string         `gorm:"type:varchar(32);index" json:"extension"`
	Width         int            `gorm:"type:int" json:"width"`
	Height        int            `gorm:"type:int" json:"height"`
	AspectRatio   float64        `gorm:"type:decimal(6,3)" json:"aspect_ratio"`
	DataUrl       string         `gorm:"type:longtext" json:"data_url,omitempty"`
	Url           string         `gorm:"type:varchar(1024)" json:"url"`
	AlbumID       string         `gorm:"type:varchar(64);index;default:'default'" json:"album_id"`
	UserID        uint           `gorm:"type:bigint;index;default:1" json:"user_id"`
	Tags          string         `gorm:"type:text" json:"tags"` // JSON array or comma separated: ["WALLPAPER","4K"]
	Favorite      bool           `gorm:"type:boolean;default:false;index" json:"favorite"`
	ColorPalette  string         `gorm:"type:text" json:"color_palette"` // JSON array of hex colors
	StorageDriver string         `gorm:"type:varchar(32);default:'local';index" json:"storage_driver"` // 'local', 'webdav', 's3'
	FileAssetID   uint           `gorm:"type:bigint;index" json:"file_asset_id"`                       // Foreign key to FileAsset
	FileHash      string         `gorm:"type:varchar(64);index" json:"file_hash"`                      // SHA-256
	Compressed    bool           `gorm:"type:boolean;default:false" json:"compressed"`
	OriginalSize  int64          `gorm:"type:bigint" json:"original_size"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides default table name
func (Image) TableName() string {
	return "images"
}
