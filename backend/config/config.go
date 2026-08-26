package config

import (
        "log"
        "os"
        "path/filepath"
        "strconv"

        "github.com/joho/godotenv"
)

// Config holds all configuration parameters for the application
type Config struct {
        Host           string
        Port           string
        GinMode        string
        DBDriver       string // sqlite, mysql, postgres
        DBDSN          string
        JWTSecret      string
        JWTExpireHours int
        CorsOrigins    []string

        AdminUsername string
        AdminEmail    string
        AdminPassword string
}

var AppConfig *Config

// loadEnv loads .env file into environment variables.
// Existing environment variables take precedence over .env values.
func loadEnv() {
        candidates := []string{
                ".env",
                filepath.Join("..", ".env"),
                filepath.Join("..", "..", ".env"),
        }
        for _, path := range candidates {
                if _, err := os.Stat(path); err != nil {
                        continue
                }
                if err := godotenv.Load(path); err != nil {
                        log.Printf("[Config] Failed to load %s: %v", path, err)
                        return
                }
                log.Printf("[Config] Loaded env from %s", path)
                return
        }
        log.Println("[Config] No .env file found, using system environment variables")
}

// LoadConfig loads application configuration from environment variables with sensible defaults
func LoadConfig() *Config {
        loadEnv()
        host := getEnv("HOST", "")
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

        adminUsername := getEnv("ADMIN_USERNAME", "admin")
        adminEmail := getEnv("ADMIN_EMAIL", "admin@wanpictures.dev")
        adminPassword := getEnv("ADMIN_PASSWORD", "admin123456")

        AppConfig = &Config{
                Host:           host,
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
                AdminUsername: adminUsername,
                AdminEmail:    adminEmail,
                AdminPassword: adminPassword,
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