package models

import (
	"time"

	"gorm.io/gorm"
)

// ApiKey represents a developer API key used to authenticate requests
// against the dedicated open upload endpoints (/openapi/v1/*).
//
// The plaintext key is persisted (plus a SHA-256 hash for fast constant-time
// auth lookups) so owners can view it again at any time from the developer
// console.
type ApiKey struct {
	ID         uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint           `gorm:"index;not null" json:"user_id"`
	Name       string         `gorm:"type:varchar(64);not null" json:"name"`
	Key        string         `gorm:"type:varchar(128)" json:"key"`                   // plaintext key, viewable by the owner anytime
	KeyHash    string         `gorm:"type:varchar(64);uniqueIndex;not null" json:"-"` // SHA-256 hex of the plaintext key
	LastUsedAt *time.Time     `json:"last_used_at"`
	ExpiresAt  *time.Time     `json:"expires_at"` // nil = never expires
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"` // revoking soft-deletes the key
}

// TableName overrides the default table name to 'api_keys'
func (ApiKey) TableName() string {
	return "api_keys"
}

// IsExpired reports whether the key has passed its optional expiry time
func (k ApiKey) IsExpired(now time.Time) bool {
	return k.ExpiresAt != nil && now.After(*k.ExpiresAt)
}
