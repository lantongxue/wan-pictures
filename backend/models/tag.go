package models

import (
	"time"

	"gorm.io/gorm"
)

// Tag represents a categorization label for images
type Tag struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string         `gorm:"type:varchar(64);uniqueIndex;not null" json:"name"`
	Color       string         `gorm:"type:varchar(32);default:'#3B82F6'" json:"color"`
	Description string         `gorm:"type:varchar(255)" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Dynamic field calculated at query time
	ImageCount int64 `gorm:"-" json:"image_count"`
}

// TableName overrides default table name
func (Tag) TableName() string {
	return "tags"
}
