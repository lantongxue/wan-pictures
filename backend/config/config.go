package config

import (
	"os"
	"strconv"
)

// Config holds all configuration parameters for the application
type Config struct {
	Port           string
	GinMode        string
	DBDriver       string // sqlite, mysql, postgres
	DBDSN          string
	JWTSecret      string
	JWTExpireHours int
	CorsOrigins    []string
}

var AppConfig *Config

// LoadConfig loads application configuration from environment variables with sensible defaults
func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	ginMode := getEnv("GIN_MODE", "release")
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbDSN := getEnv("DB_DSN", "wanpictures.db")
	jwtSecret := getEnv("JWT_SECRET", "wanpictures_super_secret_jwt_key_2026_change_in_production")
	jwtExpireStr := getEnv("JWT_EXPIRE_HOURS", "72")

	expireHours, err := strconv.Atoi(jwtExpireStr)
	if err != nil || expireHours <= 0 {
		expireHours = 72
	}

	AppConfig = &Config{
		Port:           port,
		GinMode:        ginMode,
		DBDriver:       dbDriver,
		DBDSN:          dbDSN,
		JWTSecret:      jwtSecret,
		JWTExpireHours: expireHours,
		CorsOrigins: []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:5173",
			"*",
		},
	}

	return AppConfig
}

func getEnv(key, defaultValue string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}
	return val
}
