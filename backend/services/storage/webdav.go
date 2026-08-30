package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"wanpictures-backend/models"
)

type WebDAVEngine struct {
	Config models.WebDAVConfig
	client *http.Client
}

func NewWebDAVEngine(cfg models.WebDAVConfig) *WebDAVEngine {
	return &WebDAVEngine{
		Config: cfg,
		// Generous overall timeout: the same client streams large originals,
		// and a short timeout aborts mid-upload on slow uplinks.
		client: &http.Client{Timeout: 300 * time.Second},
	}
}

// escapeSegments URL-escapes each path segment so keys containing spaces,
// '#', '%' or non-ASCII characters (possible under the "original" naming
// rule) still address the right resource on the WebDAV server.
func escapeSegments(segments []string) string {
	escaped := make([]string, len(segments))
	for i, seg := range segments {
		escaped[i] = url.PathEscape(seg)
	}
	return strings.Join(escaped, "/")
}

func (w *WebDAVEngine) buildTargetURL(storageKey string) string {
	baseURL := strings.TrimSuffix(w.Config.ServerURL, "/")
	rootPath := strings.TrimPrefix(strings.TrimSuffix(w.Config.RootPath, "/"), "/")
	cleanKey := strings.TrimPrefix(storageKey, "/")

	segments := make([]string, 0, 2)
	if rootPath != "" {
		segments = append(segments, strings.Split(rootPath, "/")...)
	}
	segments = append(segments, strings.Split(cleanKey, "/")...)
	return baseURL + "/" + escapeSegments(segments)
}

func (w *WebDAVEngine) publicURL(storageKey string) string {
	cleanKey := strings.TrimPrefix(storageKey, "/")
	if w.Config.PublicProxy != "" {
		proxy := strings.TrimSuffix(w.Config.PublicProxy, "/")
		return proxy + "/" + escapeSegments(strings.Split(cleanKey, "/"))
	}
	return w.buildTargetURL(storageKey)
}

func (w *WebDAVEngine) setAuth(req *http.Request) {
	if w.Config.Username != "" || w.Config.Password != "" {
		req.SetBasicAuth(w.Config.Username, w.Config.Password)
	}
}

// ensureParentDirs recursively ensures parent directories exist via MKCOL
func (w *WebDAVEngine) ensureParentDirs(ctx context.Context, targetURL string) {
	u, err := url.Parse(targetURL)
	if err != nil {
		return
	}
	dirPath := path.Dir(u.Path)
	if dirPath == "/" || dirPath == "." || dirPath == "" {
		return
	}

	parts := strings.Split(strings.Trim(dirPath, "/"), "/")
	current := fmt.Sprintf("%s://%s", u.Scheme, u.Host)
	for _, part := range parts {
		current += "/" + url.PathEscape(part)
		req, _ := http.NewRequestWithContext(ctx, "MKCOL", current, nil)
		if req != nil {
			w.setAuth(req)
			resp, err := w.client.Do(req)
			if err == nil {
				resp.Body.Close()
			}
		}
	}
}

func (w *WebDAVEngine) Save(ctx context.Context, storageKey string, reader io.Reader, size int64, contentType string) (string, error) {
	targetURL := w.buildTargetURL(storageKey)
	w.ensureParentDirs(ctx, targetURL)

	var bodyReader io.Reader = reader
	if reader == nil {
		bodyReader = bytes.NewReader([]byte{})
	}

	req, err := http.NewRequestWithContext(ctx, "PUT", targetURL, bodyReader)
	if err != nil {
		return "", err
	}

	w.setAuth(req)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if size > 0 {
		req.Header.Set("Content-Length", fmt.Sprintf("%d", size))
	}

	resp, err := w.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("WebDAV upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusNoContent {
		return w.publicURL(storageKey), nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return "", fmt.Errorf("WebDAV returned HTTP %d: %s", resp.StatusCode, string(respBody))
}

func (w *WebDAVEngine) Delete(ctx context.Context, storageKey string) error {
	targetURL := w.buildTargetURL(storageKey)
	req, err := http.NewRequestWithContext(ctx, "DELETE", targetURL, nil)
	if err != nil {
		return err
	}

	w.setAuth(req)
	resp, err := w.client.Do(req)
	if err != nil {
		return fmt.Errorf("WebDAV delete failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusNotFound {
		return nil
	}
	return fmt.Errorf("WebDAV delete returned HTTP %d", resp.StatusCode)
}

func (w *WebDAVEngine) Exists(ctx context.Context, storageKey string) (bool, error) {
	targetURL := w.buildTargetURL(storageKey)
	req, err := http.NewRequestWithContext(ctx, "PROPFIND", targetURL, nil)
	if err != nil {
		return false, err
	}

	w.setAuth(req)
	req.Header.Set("Depth", "0")

	resp, err := w.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusMultiStatus || resp.StatusCode == http.StatusOK {
		return true, nil
	}
	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}
	return false, fmt.Errorf("WebDAV PROPFIND returned HTTP %d", resp.StatusCode)
}

func (w *WebDAVEngine) Read(ctx context.Context, storageKey string) (io.ReadCloser, error) {
	targetURL := w.buildTargetURL(storageKey)
	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		return nil, err
	}

	w.setAuth(req)

	resp, err := w.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("WebDAV read failed: %w", err)
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return resp.Body, nil
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return nil, fmt.Errorf("WebDAV read returned HTTP %d: %s", resp.StatusCode, string(body))
}

func (w *WebDAVEngine) TestConnection(ctx context.Context) error {
	if w.Config.ServerURL == "" {
		return fmt.Errorf("WebDAV server URL is required")
	}

	req, err := http.NewRequestWithContext(ctx, "PROPFIND", w.Config.ServerURL, nil)
	if err != nil {
		return err
	}

	w.setAuth(req)
	req.Header.Set("Depth", "0")

	resp, err := w.client.Do(req)
	if err != nil {
		return fmt.Errorf("WebDAV connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("WebDAV authentication failed (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		return nil
	}
	return fmt.Errorf("WebDAV server responded with HTTP %d", resp.StatusCode)
}
