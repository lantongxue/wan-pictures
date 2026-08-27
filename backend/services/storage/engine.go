package storage

import (
	"context"
	"io"
)

// StorageEngine defines standard operations for physical file storage backends
type StorageEngine interface {
	// Save writes binary data to the destination key/path and returns the accessible public URL
	Save(ctx context.Context, storageKey string, reader io.Reader, size int64, contentType string) (publicURL string, err error)
	// Delete removes physical file from the storage backend
	Delete(ctx context.Context, storageKey string) error
	// Exists checks if the file exists on the backend
	Exists(ctx context.Context, storageKey string) (bool, error)
	// Read opens the stored file for reading (used by thumbnail backfill & similar jobs)
	Read(ctx context.Context, storageKey string) (io.ReadCloser, error)
	// TestConnection performs a lightweight connectivity / health check
	TestConnection(ctx context.Context) error
}
