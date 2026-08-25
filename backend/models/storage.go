package models

import (
	"time"
)

// StorageDriver defines supported storage types
type StorageDriver string

const (
	StorageDriverLocal  StorageDriver = "local"
	StorageDriverWebDAV StorageDriver = "webdav"
	StorageDriverS3     StorageDriver = "s3"
)

// StorageConfig stores configuration parameters for a storage backend
type StorageConfig struct {
	ID         uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	Driver     StorageDriver `gorm:"type:varchar(32);uniqueIndex;not null" json:"driver"` // 'local', 'webdav', 's3'
	Name       string        `gorm:"type:varchar(64);not null" json:"name"`
	IsEnabled  bool          `gorm:"type:boolean;default:true;index" json:"is_enabled"`
	IsActive   bool          `gorm:"type:boolean;default:false;index" json:"is_active"`
	ConfigJSON string        `gorm:"type:text" json:"config_json"` // Serialized S3Config or WebDAVConfig
	CreatedAt  time.Time     `json:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at"`
}

// S3Config holds parameters for AWS S3 and S3-compatible cloud storage (R2, MinIO, OSS, COS)
type S3Config struct {
	Endpoint        string `json:"endpoint"`          // e.g. "https://s3.us-east-1.amazonaws.com" or "https://<account>.r2.cloudflarestorage.com"
	Region          string `json:"region"`            // e.g. "us-east-1", "auto", "cn-north-1"
	Bucket          string `json:"bucket"`            // e.g. "wanpictures-bucket"
	AccessKeyID     string `json:"access_key_id"`     // AK
	SecretAccessKey string `json:"secret_access_key"` // SK (masked when returned)
	CustomDomain    string `json:"custom_domain"`     // e.g. "https://cdn.wanpictures.dev"
	PathPrefix      string `json:"path_prefix"`       // e.g. "uploads/{year}/{month}/"
	ForcePathStyle  bool   `json:"force_path_style"`  // true for MinIO/custom S3
	ACL             string `json:"acl"`               // "public-read", "private", etc.
}

// WebDAVConfig holds parameters for WebDAV network storage (Nextcloud, OwnCloud, Alist, 坚果云, etc.)
type WebDAVConfig struct {
	ServerURL   string `json:"server_url"`   // e.g. "https://dav.jianguoyun.com/dav/"
	Username    string `json:"username"`     // WebDAV username
	Password    string `json:"password"`     // Password or App Token (masked when returned)
	RootPath    string `json:"root_path"`    // Storage base directory, e.g. "/wanpictures/uploads"
	PublicProxy string `json:"public_proxy"` // Optional public access proxy URL
}

// TableName overrides default table name
func (StorageConfig) TableName() string {
	return "storage_configs"
}
