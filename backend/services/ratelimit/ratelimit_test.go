package ratelimit

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

const testRedisAddr = "127.0.0.1:6379"

func newTestLimiter(t *testing.T) *Limiter {
	t.Helper()
	client := redis.NewClient(&redis.Options{Addr: testRedisAddr})
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skipf("local redis unavailable (%s): %v", testRedisAddr, err)
	}
	t.Cleanup(func() { _ = client.Close() })
	return NewLimiter(client)
}

// TestSlidingWindowLimit verifies burst rejection and recovery as the window slides
func TestSlidingWindowLimit(t *testing.T) {
	limiter := newTestLimiter(t)
	ctx := context.Background()
	key := "wanpic:test:sliding:" + time.Now().Format("150405.000000000")

	const limit = 3
	window := time.Second

	for i := 0; i < limit; i++ {
		res, err := limiter.Allow(ctx, key, limit, window)
		if err != nil {
			t.Fatalf("request %d unexpected error: %v", i+1, err)
		}
		if !res.Allowed {
			t.Fatalf("request %d within limit should be allowed", i+1)
		}
	}

	rejected, err := limiter.Allow(ctx, key, limit, window)
	if err != nil || rejected.Allowed {
		t.Fatalf("request beyond limit must be rejected (allowed=%v, err=%v)", rejected.Allowed, err)
	}
	if rejected.RetryAfter <= 0 || rejected.RetryAfter > window {
		t.Fatalf("retryAfter out of range: %v", rejected.RetryAfter)
	}
}

// TestSlidingWindowRecovery verifies entries expire as the window slides forward
func TestSlidingWindowRecovery(t *testing.T) {
	limiter := newTestLimiter(t)
	ctx := context.Background()
	key := "wanpic:test:recovery:" + time.Now().Format("150405.000000000")

	const limit = 2
	window := 500 * time.Millisecond

	if res, _ := limiter.Allow(ctx, key, limit, window); !res.Allowed {
		t.Fatal("first request should pass")
	}
	time.Sleep(300 * time.Millisecond)
	if res, _ := limiter.Allow(ctx, key, limit, window); !res.Allowed {
		t.Fatal("second request should pass")
	}
	time.Sleep(100 * time.Millisecond)
	if res, _ := limiter.Allow(ctx, key, limit, window); res.Allowed {
		t.Fatal("third request at t=400ms inside window must be rejected")
	}
	// At t=800ms both original entries are outside the 500ms window
	time.Sleep(400 * time.Millisecond)
	res, err := limiter.Allow(ctx, key, limit, window)
	if err != nil || !res.Allowed {
		t.Fatal("after sliding past the window, request should be allowed again")
	}
}

// TestZeroLimitBypassesRedis verifies limit<=0 is unlimited and never touches Redis
func TestZeroLimitBypassesRedis(t *testing.T) {
	client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"}) // nothing listens here
	defer func() { _ = client.Close() }()
	limiter := NewLimiter(client)

	res, err := limiter.Allow(context.Background(), "wanpic:test:bypass", 0, time.Second)
	if err != nil {
		t.Fatalf("zero limit must not touch redis: %v", err)
	}
	if !res.Allowed {
		t.Fatal("zero limit must be unlimited")
	}
}

// TestFailClosedOnRedisOutage verifies ErrRedisUnavailable is surfaced so callers reject
func TestFailClosedOnRedisOutage(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		DialTimeout: 300 * time.Millisecond,
		MaxRetries:  -1,
	})
	defer func() { _ = client.Close() }()
	limiter := NewLimiter(client)

	_, err := limiter.Allow(context.Background(), "wanpic:test:outage", 10, time.Second)
	if !errors.Is(err, ErrRedisUnavailable) {
		t.Fatalf("expected ErrRedisUnavailable, got: %v", err)
	}
}
