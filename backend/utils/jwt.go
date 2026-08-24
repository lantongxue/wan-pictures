package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"wanpictures-backend/config"
	"wanpictures-backend/models"
)

// CustomClaims defines custom JWT claims including user ID and role
type CustomClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT token for a given user
func GenerateToken(user *models.User) (string, int64, error) {
	cfg := config.AppConfig
	expireDuration := time.Duration(cfg.JWTExpireHours) * time.Hour
	expiresAt := time.Now().Add(expireDuration)

	claims := CustomClaims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "wanpictures-backend",
			Subject:   user.Username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, int64(expireDuration.Seconds()), nil
}

// ParseToken parses and validates a JWT token string
func ParseToken(tokenString string) (*CustomClaims, error) {
	cfg := config.AppConfig

	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}
