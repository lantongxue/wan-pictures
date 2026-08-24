package models

import "time"

// RegisterRequest defines the input payload for user registration
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=64"`
	Nickname string `json:"nickname" binding:"omitempty,max=32"`
	Avatar   string `json:"avatar" binding:"omitempty,url|startswith=data:image"`
}

// LoginRequest defines the input payload for user login
type LoginRequest struct {
	Account  string `json:"account" binding:"required"` // Can be username or email
	Password string `json:"password" binding:"required"`
}

// UpdateProfileRequest defines the input payload for profile modifications
type UpdateProfileRequest struct {
	Nickname string `json:"nickname" binding:"omitempty,max=32"`
	Avatar   string `json:"avatar" binding:"omitempty"`
	Bio      string `json:"bio" binding:"omitempty,max=255"`
}

// ChangePasswordRequest defines the payload for password changes
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=64"`
}

// UserResponse is the safe representation of a user without sensitive data
type UserResponse struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Nickname  string    `json:"nickname"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	Bio       string    `json:"bio"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToUserResponse converts a User model to a safe UserResponse DTO
func ToUserResponse(u *User) UserResponse {
	nickname := u.Nickname
	if nickname == "" {
		nickname = u.Username
	}
	return UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		Nickname:  nickname,
		Avatar:    u.Avatar,
		Role:      u.Role,
		Bio:       u.Bio,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// AuthResponse represents the payload returned after successful login/registration
type AuthResponse struct {
	Token     string       `json:"token"`
	TokenType string       `json:"token_type"`
	ExpiresIn int64        `json:"expires_in"` // seconds
	User      UserResponse `json:"user"`
}

// APIResponse is the standard unified JSON response wrapper
type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// SuccessResponse creates a successful response
func SuccessResponse(data interface{}, msg ...string) APIResponse {
	message := "success"
	if len(msg) > 0 && msg[0] != "" {
		message = msg[0]
	}
	return APIResponse{
		Code:    200,
		Message: message,
		Data:    data,
	}
}

// ErrorResponse creates a failure response
func ErrorResponse(code int, message string) APIResponse {
	return APIResponse{
		Code:    code,
		Message: message,
	}
}

// Admin Overview Stats DTO
type AdminOverviewStats struct {
	TotalImages    int64            `json:"total_images"`
	TotalAlbums    int64            `json:"total_albums"`
	TotalTags      int64            `json:"total_tags"`
	TotalUsers     int64            `json:"total_users"`
	TotalSize      int64            `json:"total_size"`
	ActiveStorage  StorageDriver    `json:"active_storage"`
	StorageUsage   map[string]int64 `json:"storage_usage"` // local: bytes, s3: bytes, webdav: bytes
	FormatStats    map[string]int64 `json:"format_stats"`  // png, jpg, webp, svg, gif...
	RecentActivity []Image          `json:"recent_activity"`
}

// Image CRUD Request DTOs
type SaveImageRequest struct {
	ID            string   `json:"id"`
	Name          string   `json:"name" binding:"required"`
	OriginalName  string   `json:"original_name"`
	Size          int64    `json:"size"`
	Type          string   `json:"type"`
	Extension     string   `json:"extension"`
	Width         int      `json:"width"`
	Height        int      `json:"height"`
	AspectRatio   float64  `json:"aspect_ratio"`
	DataUrl       string   `json:"data_url"`
	Url           string   `json:"url"`
	AlbumID       string   `json:"album_id"`
	Tags          []string `json:"tags"`
	Favorite      bool     `json:"favorite"`
	ColorPalette  []string `json:"color_palette"`
	StorageDriver string   `json:"storage_driver"`
	Compressed    bool     `json:"compressed"`
	OriginalSize  int64    `json:"original_size"`
}

type UpdateImageRequest struct {
	Name          *string   `json:"name"`
	AlbumID       *string   `json:"album_id"`
	Tags          *[]string `json:"tags"`
	Favorite      *bool     `json:"favorite"`
	StorageDriver *string   `json:"storage_driver"`
}

type BatchImageActionRequest struct {
	IDs      []string `json:"ids" binding:"required,min=1"`
	Action   string   `json:"action" binding:"required"` // "delete", "move", "tag"
	AlbumID  string   `json:"album_id"`
	TagToAdd string   `json:"tag_to_add"`
}

// Album CRUD Request DTOs
type SaveAlbumRequest struct {
	ID            string `json:"id"`
	Name          string `json:"name" binding:"required,min=1,max=128"`
	Description   string `json:"description" binding:"omitempty,max=512"`
	Color         string `json:"color" binding:"omitempty,max=32"`
	CoverImageUrl string `json:"cover_image_url"`
	CoverImageID  string `json:"cover_image_id"`
	IsDefault     bool   `json:"is_default"`
}

// Tag CRUD Request DTOs
type SaveTagRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=64"`
	Color       string `json:"color" binding:"omitempty,max=32"`
	Description string `json:"description" binding:"omitempty,max=255"`
}

type MergeTagsRequest struct {
	SourceTag string `json:"source_tag" binding:"required"`
	TargetTag string `json:"target_tag" binding:"required"`
}

// User Management Request & Response DTOs
type AdminCreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=32"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=64"`
	Nickname string `json:"nickname" binding:"omitempty,max=32"`
	Avatar   string `json:"avatar" binding:"omitempty"`
	Role     string `json:"role" binding:"omitempty,oneof=user admin"`
	Bio      string `json:"bio" binding:"omitempty,max=255"`
}

type AdminUpdateUserRequest struct {
	Email    *string `json:"email" binding:"omitempty,email"`
	Nickname *string `json:"nickname" binding:"omitempty,max=32"`
	Avatar   *string `json:"avatar"`
	Role     *string `json:"role" binding:"omitempty,oneof=user admin"`
	Bio      *string `json:"bio" binding:"omitempty,max=255"`
	Password *string `json:"password" binding:"omitempty,min=6,max=64"`
}

type AdminResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=6,max=64"`
}

type AdminUserItemResponse struct {
	ID         uint      `json:"id"`
	Username   string    `json:"username"`
	Email      string    `json:"email"`
	Nickname   string    `json:"nickname"`
	Avatar     string    `json:"avatar"`
	Role       string    `json:"role"`
	Bio        string    `json:"bio"`
	ImageCount int64     `json:"image_count"`
	AlbumCount int64     `json:"album_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Storage Config Request DTOs
type SaveStorageConfigRequest struct {
	Driver     StorageDriver `json:"driver" binding:"required"`
	Name       string        `json:"name" binding:"required"`
	IsActive   bool          `json:"is_active"`
	ConfigJSON string        `json:"config_json" binding:"required"`
}

type SetActiveStorageRequest struct {
	Driver StorageDriver `json:"driver" binding:"required"`
}

type TestStorageConnectionRequest struct {
	Driver     StorageDriver `json:"driver" binding:"required"`
	ConfigJSON string        `json:"config_json" binding:"required"`
}

