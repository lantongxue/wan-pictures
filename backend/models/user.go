package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user record in the database
type User struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Username  string         `gorm:"type:varchar(64);uniqueIndex;not null" json:"username"`
	Email     string         `gorm:"type:varchar(128);uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"type:varchar(255);not null" json:"-"` // never expose password in json
	Nickname  string         `gorm:"type:varchar(64)" json:"nickname"`
	Avatar    string         `gorm:"type:varchar(255)" json:"avatar"`
	Role      string         `gorm:"type:varchar(32);default:'user'" json:"role"` // 'user' or 'admin'
	Bio       string         `gorm:"type:varchar(255)" json:"bio"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides the default table name to 'users'
func (User) TableName() string {
	return "users"
}
