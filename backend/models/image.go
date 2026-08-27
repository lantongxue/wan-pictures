package models

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"wanpictures-backend/utils/sqids"
)

// Image represents an uploaded or imported image asset
type Image struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string         `gorm:"type:varchar(255);not null;index" json:"name"`
	OriginalName  string         `gorm:"type:varchar(255)" json:"original_name"`
	Size          int64          `gorm:"type:bigint" json:"size"`
	Type          string         `gorm:"type:varchar(64);index" json:"type"`
	Extension     string         `gorm:"type:varchar(32);index" json:"extension"`
	Width         int            `gorm:"type:int" json:"width"`
	Height        int            `gorm:"type:int" json:"height"`
	AspectRatio   float64        `gorm:"type:decimal(6,3)" json:"aspect_ratio"`
	Url           string         `gorm:"type:varchar(1024)" json:"url"`
	ThumbUrl      string         `gorm:"type:varchar(1024)" json:"thumb_url"` // downscaled thumbnail, generated at upload time
	AlbumID       uint           `gorm:"index;default:1" json:"album_id"`
	UserID        uint           `gorm:"type:bigint;index;default:1" json:"user_id"`
	Tags          []string       `gorm:"type:json;serializer:json" json:"tags"` // JSON array of strings: ["WALLPAPER","4K"]
	Favorite      bool           `gorm:"type:boolean;default:false;index" json:"favorite"`
	ViewCount     uint64         `gorm:"type:bigint;default:0;not null" json:"view_count"` // total views recorded via the /image proxy
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

// PublicCopy returns a shallow copy of the image whose url / thumb_url are
// rewritten to the Sqids-obfuscated Go proxy endpoints, so every image request
// flows through the backend and gets counted as a view. The stored DB URLs are
// never exposed to clients. An empty thumb_url stays empty (the frontend then
// falls back to the original proxy URL).
func (i *Image) PublicCopy() *Image {
	cp := *i
	enc, err := sqids.EncodeImageID(uint64(i.ID))
	if err != nil {
		return &cp // keep stored URLs on encode failure (should never happen)
	}
	ext := strings.TrimPrefix(i.Extension, ".")
	if ext == "" {
		ext = "img"
	}
	cp.Url = fmt.Sprintf("/image/%s.%s", enc, ext)
	if i.ThumbUrl != "" {
		cp.ThumbUrl = fmt.Sprintf("/image/thumb/%s.%s", enc, ext)
	}
	return &cp
}
