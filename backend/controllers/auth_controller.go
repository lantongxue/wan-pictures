package controllers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
	"wanpictures-backend/utils"
)

type AuthController struct{}

func NewAuthController() *AuthController {
	return &AuthController{}
}

// Register handles new user registration
// POST /api/v1/auth/register
func (ctrl *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid request payload: "+err.Error()))
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check if username already exists
	var existingUser models.User
	if err := database.DB.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse(http.StatusConflict, "Username is already taken"))
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Database error: "+err.Error()))
		return
	}

	// Check if email already exists
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse(http.StatusConflict, "Email is already registered"))
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Database error: "+err.Error()))
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to hash password"))
		return
	}

	nickname := req.Nickname
	if nickname == "" {
		nickname = req.Username
	}

	avatar := req.Avatar
	if avatar == "" {
		// Default avatar with UI Avatars
		avatar = "https://api.dicebear.com/7.x/identicon/svg?seed=" + req.Username
	}

	newUser := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Nickname: nickname,
		Avatar:   avatar,
		Role:     "user",
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to create user: "+err.Error()))
		return
	}

	// Generate JWT Token
	token, expiresIn, err := utils.GenerateToken(&newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to generate token"))
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse(models.AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: expiresIn,
		User:      models.ToUserResponse(&newUser),
	}, "User registered successfully"))
}

// Login handles user authentication via username or email
// POST /api/v1/auth/login
func (ctrl *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid request payload: "+err.Error()))
		return
	}

	account := strings.TrimSpace(req.Account)

	var user models.User
	// Search by username OR email
	err := database.DB.Where("username = ? OR email = ?", account, strings.ToLower(account)).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "Invalid account or password"))
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Database error: "+err.Error()))
		return
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "Invalid account or password"))
		return
	}

	// Generate JWT Token
	token, expiresIn, err := utils.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to generate token"))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(models.AuthResponse{
		Token:     token,
		TokenType: "Bearer",
		ExpiresIn: expiresIn,
		User:      models.ToUserResponse(&user),
	}, "Login successful"))
}

// GetMe returns the profile of the currently authenticated user
// GET /api/v1/auth/me
func (ctrl *AuthController) GetMe(c *gin.Context) {
	val, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}

	user, ok := val.(models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Invalid user context"))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(models.ToUserResponse(&user)))
}

// UpdateProfile updates the current user's profile information
// PUT /api/v1/auth/profile
func (ctrl *AuthController) UpdateProfile(c *gin.Context) {
	val, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}

	currentUser, ok := val.(models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Invalid user context"))
		return
	}

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid request payload: "+err.Error()))
		return
	}

	updates := make(map[string]interface{})
	if req.Nickname != "" {
		updates["nickname"] = strings.TrimSpace(req.Nickname)
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Bio != "" {
		updates["bio"] = strings.TrimSpace(req.Bio)
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&currentUser).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to update profile: "+err.Error()))
			return
		}
		// Refresh user
		database.DB.First(&currentUser, currentUser.ID)
	}

	c.JSON(http.StatusOK, models.SuccessResponse(models.ToUserResponse(&currentUser), "Profile updated successfully"))
}

// ChangePassword changes the user's password
// POST /api/v1/auth/password
func (ctrl *AuthController) ChangePassword(c *gin.Context) {
	val, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse(http.StatusUnauthorized, "Unauthorized"))
		return
	}

	currentUser, ok := val.(models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Invalid user context"))
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Invalid request payload: "+err.Error()))
		return
	}

	// Verify old password
	if !utils.CheckPasswordHash(req.OldPassword, currentUser.Password) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse(http.StatusBadRequest, "Current password is incorrect"))
		return
	}

	// Hash new password
	newHashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to hash new password"))
		return
	}

	if err := database.DB.Model(&currentUser).Update("password", newHashedPassword).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse(http.StatusInternalServerError, "Failed to update password"))
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse(nil, "Password changed successfully"))
}
