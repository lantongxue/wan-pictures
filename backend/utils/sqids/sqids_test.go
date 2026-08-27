package sqids

import (
	"testing"
)

func TestEncodeDecodeRoundTrip(t *testing.T) {
	cases := []uint64{1, 42, 1337, 1000000, 18446744073709551615}
	for _, id := range cases {
		token, err := EncodeImageID(id)
		if err != nil {
			t.Fatalf("encode %d: %v", id, err)
		}
		if len(token) < 8 {
			t.Errorf("token for %d too short: %q", id, token)
		}
		decoded, ok := DecodeImageID(token)
		if !ok || decoded != id {
			t.Errorf("round trip failed for %d: got %d (ok=%v)", id, decoded, ok)
		}
	}
}

func TestDecodeRejectsGarbage(t *testing.T) {
	bad := []string{"", "abc", "!!!!", "a.b", "xK8qP2mZ", "12345", "abcdefgh"}
	for _, s := range bad {
		if id, ok := DecodeImageID(s); ok {
			t.Errorf("expected decode failure for %q, got %d", s, id)
		}
	}
}

func TestTokensAreDeploymentSpecific(t *testing.T) {
	a, err := EncodeImageID(7)
	if err != nil {
		t.Fatalf("encode failed: %v", err)
	}
	b, err := EncodeImageID(7)
	if err != nil {
		t.Fatalf("encode failed: %v", err)
	}
	if a != b {
		t.Errorf("same id produced different tokens: %q vs %q", a, b)
	}
}