package models

import "time"

// UploadLog records each upload attempt for quota tracking and audit
type UploadLog struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint      `gorm:"type:bigint;index;default:0" json:"user_id"` // 0 for anonymous/guest
	IPAddress string    `gorm:"type:varchar(64);index" json:"ip_address"`
	ImageID   uint      `gorm:"index" json:"image_id"`
	FileHash  string    `gorm:"type:varchar(64);index" json:"file_hash"`
	Size      int64     `gorm:"type:bigint" json:"size"`
	IsInstant bool      `gorm:"type:boolean;default:false" json:"is_instant"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

// TableName overrides default table name
func (UploadLog) TableName() string {
	return "upload_logs"
}
