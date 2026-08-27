package sqids

import (
	"crypto/sha256"
	"log"
	"math/rand"
	"sync"

	"github.com/sqids/sqids-go"
	"wanpictures-backend/config"
)

const (
	// sqidsAlphabet is the default alphanumeric alphabet that gets
	// deterministically shuffled using the JWT secret, so every deployment
	// ends up with its own token space.
	sqidsAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	// sqidsMinLength forces every encoded token to be at least this long,
	// preventing trivially short enumerable ids like "a", "b", "c"...
	sqidsMinLength = 8
)

var (
	sqidsOnce    sync.Once
	sqidsEncoder *sqids.Sqids
	sqidsErr     error
)

// initSqids builds the process-wide Sqids encoder once. The alphabet is the
// default alphanumeric set deterministically shuffled from JWT_SECRET, so the
// token space is deployment-specific and opaque without knowing the secret.
func initSqids() {
	sqidsOnce.Do(func() {
		if config.AppConfig == nil {
			config.LoadConfig() // defensive for unit tests without main()
		}
		seed := sha256.Sum256([]byte(config.AppConfig.JWTSecret))
		var seedBytes [8]byte
		copy(seedBytes[:], seed[:8])
		rng := rand.New(rand.NewSource(int64(seedBytes[0])<<56 | int64(seedBytes[1])<<48 |
			int64(seedBytes[2])<<40 | int64(seedBytes[3])<<32 |
			int64(seedBytes[4])<<24 | int64(seedBytes[5])<<16 |
			int64(seedBytes[6])<<8 | int64(seedBytes[7])))

		alphabet := []byte(sqidsAlphabet)
		rng.Shuffle(len(alphabet), func(i, j int) {
			alphabet[i], alphabet[j] = alphabet[j], alphabet[i]
		})

		sqidsEncoder, sqidsErr = sqids.New(sqids.Options{
			Alphabet:  string(alphabet),
			MinLength: sqidsMinLength,
		})
		if sqidsErr != nil {
			log.Printf("[Sqids] initialization failed: %v", sqidsErr)
		}
	})
}

// EncodeImageID obfuscates a numeric image id into a Sqids token.
// The result is URL-safe and reversible via DecodeImageID.
func EncodeImageID(id uint64) (string, error) {
	initSqids()
	if sqidsErr != nil {
		return "", sqidsErr
	}
	return sqidsEncoder.Encode([]uint64{id})
}

// DecodeImageID reverses a Sqids token back into its numeric image id.
// Returns false for tokens that do not decode to exactly one id, or that do
// not round-trip: sqids decodes leniently (any alphabet character string maps
// to a number), so a token is only accepted when re-encoding yields the exact
// same string, which filters out fabricated or truncated tokens.
func DecodeImageID(token string) (uint64, bool) {
	initSqids()
	if sqidsErr != nil {
		return 0, false
	}
	if token == "" {
		return 0, false
	}
	nums := sqidsEncoder.Decode(token)
	if len(nums) != 1 {
		return 0, false
	}
	reencoded, err := sqidsEncoder.Encode(nums)
	if err != nil || reencoded != token {
		return 0, false
	}
	return nums[0], true
}