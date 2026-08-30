package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"wanpictures-backend/models"
)

// Regression: legacy admin-UI saves stored camelCase keys alongside the
// backend's snake_case seed keys with conflicting values. camelCase must win
// because those are the values the operator last entered in the form.
func TestNormalizeConfigJSONMixedKeys(t *testing.T) {
	raw := `{"serverUrl":"https://example.com/dav","username":"wan-pictures","password":"secret","rootPath":"/","publicProxy":"","server_url":"https://dav.jianguoyun.com/dav/","root_path":"/wanpictures/uploads/","public_proxy":""}`

	var dav models.WebDAVConfig
	if err := json.Unmarshal([]byte(NormalizeConfigJSON(raw)), &dav); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if dav.ServerURL != "https://example.com/dav" {
		t.Errorf("ServerURL = %q, want the user-entered camelCase value", dav.ServerURL)
	}
	if dav.RootPath != "/" {
		t.Errorf("RootPath = %q, want \"/\" from rootPath", dav.RootPath)
	}
	if dav.Username != "wan-pictures" || dav.Password != "secret" {
		t.Errorf("credentials lost: %q / %q", dav.Username, dav.Password)
	}
}

func TestNormalizeConfigJSONSnakeCaseUnchanged(t *testing.T) {
	raw := `{"server_url":"https://dav.example.com/dav/","username":"u","password":"p","root_path":"/docs","public_proxy":""}`
	var dav models.WebDAVConfig
	if err := json.Unmarshal([]byte(NormalizeConfigJSON(raw)), &dav); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if dav.ServerURL != "https://dav.example.com/dav/" || dav.RootPath != "/docs" {
		t.Errorf("snake_case config altered: %+v", dav)
	}
}

func TestCreateEngineFromConfigLegacyMixedRow(t *testing.T) {
	cfg := models.StorageConfig{
		Driver: models.StorageDriverWebDAV,
		ConfigJSON: `{"serverUrl":"https://example.com/dav","username":"wan-pictures","password":"secret","rootPath":"/","publicProxy":"","server_url":"https://dav.jianguoyun.com/dav/","root_path":"/wanpictures/uploads/","public_proxy":""}`,
	}
	engine, err := GetManager().CreateEngineFromConfig(cfg)
	if err != nil {
		t.Fatalf("CreateEngineFromConfig: %v", err)
	}
	dav, ok := engine.(*WebDAVEngine)
	if !ok {
		t.Fatalf("engine type = %T, want *WebDAVEngine", engine)
	}
	if dav.Config.ServerURL != "https://example.com/dav" {
		t.Errorf("engine ServerURL = %q, want https://example.com/dav", dav.Config.ServerURL)
	}

	got := dav.buildTargetURL("uploads/2026/08/30/我的 图片.png")
	want := "https://example.com/dav/uploads/2026/08/30/%E6%88%91%E7%9A%84%20%E5%9B%BE%E7%89%87.png"
	if got != want {
		t.Errorf("buildTargetURL = %q, want %q", got, want)
	}
}

func TestWebDAVBuildTargetURLEscaping(t *testing.T) {
	w := NewWebDAVEngine(models.WebDAVConfig{
		ServerURL: "https://dav.example.com/dav/",
		RootPath:  "/wan pictures/",
	})
	got := w.buildTargetURL("uploads/2026/08/30/a#b c.png")
	want := "https://dav.example.com/dav/wan%20pictures/uploads/2026/08/30/a%23b%20c.png"
	if got != want {
		t.Errorf("buildTargetURL = %q, want %q", got, want)
	}
}

// Sanity: Save against an HTTP server that accepts PUT succeeds, proving the
// target URL construction works end-to-end once the config parses.
func TestWebDAVSaveEndToEnd(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusCreated)
	}))
	defer srv.Close()

	w := NewWebDAVEngine(models.WebDAVConfig{ServerURL: srv.URL, RootPath: "/dav"})
	url, err := w.Save(context.Background(), "uploads/2026/08/30/pic file.png", bytes.NewReader([]byte("x")), 1, "image/png")
	if err != nil {
		t.Fatalf("Save: %v", err)
	}
	if gotPath != "/dav/uploads/2026/08/30/pic file.png" {
		t.Errorf("server saw path %q", gotPath)
	}
	if url == "" {
		t.Error("Save returned empty public URL")
	}
}
