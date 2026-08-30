package controllers

import (
	"encoding/json"
	"testing"

	"wanpictures-backend/models"
)

// The Save handler must keep the stored credential when the client echoes the
// masked placeholder back, otherwise re-saving the form destroys it and every
// subsequent WebDAV upload fails with HTTP 401.
func TestPreserveMaskedSecrets(t *testing.T) {
	stored := `{"server_url":"https://example.com/dav","username":"u","password":"real-secret","root_path":"/"}`
	next := `{"server_url":"https://example.com/dav","username":"u","password":"********","root_path":"/docs"}`

	got := preserveMaskedSecrets(models.StorageDriverWebDAV, next, stored)
	var dav models.WebDAVConfig
	if err := json.Unmarshal([]byte(got), &dav); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if dav.Password != "real-secret" {
		t.Errorf("Password = %q, want stored real-secret kept", dav.Password)
	}
	if dav.RootPath != "/docs" {
		t.Errorf("RootPath = %q, want updated \"/docs\"", dav.RootPath)
	}

	// A genuinely new password must not be replaced.
	nextNew := `{"server_url":"https://example.com/dav","username":"u","password":"new-secret","root_path":"/"}`
	got = preserveMaskedSecrets(models.StorageDriverWebDAV, nextNew, stored)
	if err := json.Unmarshal([]byte(got), &dav); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if dav.Password != "new-secret" {
		t.Errorf("Password = %q, want new-secret", dav.Password)
	}
}

func TestIsMaskedS3Secret(t *testing.T) {
	if !isMaskedS3Secret("AK********XY") {
		t.Error("mask shape not detected")
	}
	if isMaskedS3Secret("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY") {
		t.Error("real key flagged as mask")
	}
	if isMaskedS3Secret("") {
		t.Error("empty key flagged as mask")
	}
}
