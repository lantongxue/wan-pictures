package storage

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

var (
	managerInstance *Manager
	once            sync.Once

	camelKeyRe = regexp.MustCompile(`([a-z0-9])([A-Z])`)
)

// NormalizeConfigJSON rewrites camelCase JSON object keys (e.g. "serverUrl")
// to the snake_case names used by the storage config structs (e.g.
// "server_url"). Older builds of the admin UI persisted camelCase config_json
// and also merged the backend's snake_case response into the same form object,
// so stored rows can carry BOTH spellings with conflicting values. Keys are
// normalized in two passes: snake_case keys first, then camelCase keys —
// camelCase wins collisions because the admin form only renders camelCase
// fields, so those hold the values the operator last entered, while a
// coexisting snake_case twin is stale seed data.
func NormalizeConfigJSON(raw string) string {
	var obj map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &obj); err != nil {
		return raw
	}

	normalized := make(map[string]interface{}, len(obj))
	for k, v := range obj {
		if !camelKeyRe.MatchString(k) {
			normalized[strings.ToLower(k)] = v
		}
	}
	for k, v := range obj {
		if camelKeyRe.MatchString(k) {
			normalized[strings.ToLower(camelKeyRe.ReplaceAllString(k, "${1}_${2}"))] = v
		}
	}

	out, err := json.Marshal(normalized)
	if err != nil {
		return raw
	}
	return string(out)
}

type Manager struct {
	mu sync.RWMutex
}

func GetManager() *Manager {
	once.Do(func() {
		managerInstance = &Manager{}
	})
	return managerInstance
}

// GetActiveEngine returns the currently active and enabled StorageEngine instance
func (m *Manager) GetActiveEngine() (StorageEngine, models.StorageDriver, error) {
	var activeConfig models.StorageConfig
	err := database.DB.Where("is_active = ? AND is_enabled = ?", true, true).First(&activeConfig).Error
	if err != nil {
		// Fallback: check if local storage is enabled
		var localConfig models.StorageConfig
		if errLocal := database.DB.Where("driver = ? AND is_enabled = ?", models.StorageDriverLocal, true).First(&localConfig).Error; errLocal == nil {
			engine, err := m.CreateEngineFromConfig(localConfig)
			return engine, models.StorageDriverLocal, err
		}
		// If nothing found, default to local filesystem
		return NewLocalEngine("./uploads", "/uploads/"), models.StorageDriverLocal, nil
	}

	engine, err := m.CreateEngineFromConfig(activeConfig)
	if err != nil {
		return nil, activeConfig.Driver, err
	}
	return engine, activeConfig.Driver, nil
}

// GetEngineByDriver returns a StorageEngine for a specific driver
func (m *Manager) GetEngineByDriver(driver models.StorageDriver) (StorageEngine, error) {
	var cfg models.StorageConfig
	if err := database.DB.Where("driver = ?", driver).First(&cfg).Error; err != nil {
		if driver == models.StorageDriverLocal {
			return NewLocalEngine("./uploads", "/uploads/"), nil
		}
		return nil, fmt.Errorf("storage driver configuration not found: %s", driver)
	}

	if !cfg.IsEnabled {
		return nil, fmt.Errorf("storage driver '%s' is currently disabled", driver)
	}

	return m.CreateEngineFromConfig(cfg)
}

// CreateEngineFromConfig parses StorageConfig JSON and instantiates the proper engine
func (m *Manager) CreateEngineFromConfig(cfg models.StorageConfig) (StorageEngine, error) {
	configJSON := NormalizeConfigJSON(cfg.ConfigJSON)
	switch cfg.Driver {
	case models.StorageDriverLocal:
		var localParams struct {
			StoragePath     string `json:"storage_path"`
			PublicURLPrefix string `json:"public_url_prefix"`
		}
		if configJSON != "" {
			_ = json.Unmarshal([]byte(configJSON), &localParams)
		}
		return NewLocalEngine(localParams.StoragePath, localParams.PublicURLPrefix), nil

	case models.StorageDriverS3:
		var s3 models.S3Config
		if err := json.Unmarshal([]byte(configJSON), &s3); err != nil {
			return nil, fmt.Errorf("invalid S3 config JSON: %w", err)
		}
		return NewS3Engine(s3), nil

	case models.StorageDriverWebDAV:
		var dav models.WebDAVConfig
		if err := json.Unmarshal([]byte(configJSON), &dav); err != nil {
			return nil, fmt.Errorf("invalid WebDAV config JSON: %w", err)
		}
		return NewWebDAVEngine(dav), nil

	default:
		return nil, fmt.Errorf("unsupported storage driver: %s", cfg.Driver)
	}
}
