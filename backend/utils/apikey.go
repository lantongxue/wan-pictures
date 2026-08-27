package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
)

// API key constants
const (
	ApiKeyPrefix     = "wpk_"
	ApiKeyRandomBits = 256 // 32 random bytes
)

// GenerateApiKey creates a new API key and returns the plaintext key plus
// its SHA-256 hex hash for storage. The plaintext is persisted so the owner
// can review the key at any time; the hash enables fast auth lookups.
func GenerateApiKey() (plain, hash string, err error) {
	raw := make([]byte, ApiKeyRandomBits/8)
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("failed to generate api key: %w", err)
	}

	encoded := base64.RawURLEncoding.EncodeToString(raw)
	plain = ApiKeyPrefix + encoded
	return plain, HashApiKey(plain), nil
}

// HashApiKey returns the SHA-256 hex digest of a plaintext API key
func HashApiKey(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}

// IsApiKeyToken reports whether a Bearer token looks like an API key
// (starts with the wpk_ prefix) as opposed to a JWT.
func IsApiKeyToken(token string) bool {
	return strings.HasPrefix(token, ApiKeyPrefix)
}
