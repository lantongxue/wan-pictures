package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type LocalEngine struct {
	StoragePath     string
	PublicURLPrefix string
}

func NewLocalEngine(storagePath, publicURLPrefix string) *LocalEngine {
	if storagePath == "" {
		storagePath = "./uploads"
	}
	if publicURLPrefix == "" {
		publicURLPrefix = "/uploads/"
	}
	if !strings.HasSuffix(publicURLPrefix, "/") {
		publicURLPrefix += "/"
	}
	_ = os.MkdirAll(storagePath, 0755)
	return &LocalEngine{
		StoragePath:     storagePath,
		PublicURLPrefix: publicURLPrefix,
	}
}

func (l *LocalEngine) Save(ctx context.Context, storageKey string, reader io.Reader, size int64, contentType string) (string, error) {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	cleanKey = strings.TrimPrefix(cleanKey, "uploads/")
	fullPath := filepath.Join(l.StoragePath, cleanKey)

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	outFile, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create local file: %w", err)
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, reader); err != nil {
		_ = os.Remove(fullPath)
		return "", fmt.Errorf("failed to write local file: %w", err)
	}

	publicURL := l.PublicURLPrefix + cleanKey
	return publicURL, nil
}

func (l *LocalEngine) Delete(ctx context.Context, storageKey string) error {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	cleanKey = strings.TrimPrefix(cleanKey, "uploads/")
	fullPath := filepath.Join(l.StoragePath, cleanKey)

	if err := os.Remove(fullPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete local file: %w", err)
	}
	return nil
}

func (l *LocalEngine) Exists(ctx context.Context, storageKey string) (bool, error) {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	cleanKey = strings.TrimPrefix(cleanKey, "uploads/")
	fullPath := filepath.Join(l.StoragePath, cleanKey)

	_, err := os.Stat(fullPath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func (l *LocalEngine) TestConnection(ctx context.Context) error {
	if err := os.MkdirAll(l.StoragePath, 0755); err != nil {
		return err
	}
	testFile := filepath.Join(l.StoragePath, ".write_test")
	if err := os.WriteFile(testFile, []byte("ok"), 0644); err != nil {
		return err
	}
	_ = os.Remove(testFile)
	return nil
}
