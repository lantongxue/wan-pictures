package storage

import (
	"encoding/json"
	"fmt"
	"sync"

	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

var (
	managerInstance *Manager
	once            sync.Once
)

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
	switch cfg.Driver {
	case models.StorageDriverLocal:
		var localParams struct {
			StoragePath     string `json:"storage_path"`
			PublicURLPrefix string `json:"public_url_prefix"`
		}
		if cfg.ConfigJSON != "" {
			_ = json.Unmarshal([]byte(cfg.ConfigJSON), &localParams)
		}
		return NewLocalEngine(localParams.StoragePath, localParams.PublicURLPrefix), nil

	case models.StorageDriverS3:
		var s3 models.S3Config
		if err := json.Unmarshal([]byte(cfg.ConfigJSON), &s3); err != nil {
			return nil, fmt.Errorf("invalid S3 config JSON: %w", err)
		}
		return NewS3Engine(s3), nil

	case models.StorageDriverWebDAV:
		var dav models.WebDAVConfig
		if err := json.Unmarshal([]byte(cfg.ConfigJSON), &dav); err != nil {
			return nil, fmt.Errorf("invalid WebDAV config JSON: %w", err)
		}
		return NewWebDAVEngine(dav), nil

	default:
		return nil, fmt.Errorf("unsupported storage driver: %s", cfg.Driver)
	}
}
