package models

import (
	"time"

	"gorm.io/gorm"
)

// DefaultAlbumID is the well-known auto-increment ID of the seeded default album
const DefaultAlbumID uint = 1

// Album represents a photo collection/space
type Album struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string         `gorm:"type:varchar(128);not null" json:"name"`
	Description   string         `gorm:"type:varchar(512)" json:"description"`
	Color         string         `gorm:"type:varchar(32);default:'#6366F1'" json:"color"`
	CoverImageID  uint           `json:"cover_image_id"`
	CoverImageUrl string         `gorm:"type:varchar(1024)" json:"cover_image_url"`
	IsDefault     bool           `gorm:"type:boolean;default:false" json:"is_default"`
	UserID        uint           `gorm:"type:bigint;index;default:1" json:"user_id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Dynamic stats (not persisted)
	ImageCount int64 `gorm:"-" json:"image_count,omitempty"`
	TotalSize  int64 `gorm:"-" json:"total_size,omitempty"`
}

// TableName overrides default table name
func (Album) TableName() string {
	return "albums"
}
