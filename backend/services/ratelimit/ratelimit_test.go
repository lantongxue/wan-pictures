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
	qpsKey, _ := limiter.BuildKeys("test:sliding", time.Now().Format("150405.000000000"))

	const limit = 3
	window := time.Second

	for i := 0; i < limit; i++ {
		res, err := limiter.Allow(ctx, qpsKey, limit, window)
		if err != nil {
			t.Fatalf("request %d unexpected error: %v", i+1, err)
		}
		if !res.Allowed {
			t.Fatalf("request %d within limit should be allowed", i+1)
		}
	}

	rejected, err := limiter.Allow(ctx, qpsKey, limit, window)
	if err != nil || rejected.Allowed {
		t.Fatalf("request beyond limit must be rejected (allowed=%v, err=%v)", rejected.Allowed, err)
	}
	if rejected.Constraint != BindQPS {
		t.Fatalf("binding constraint = %q, want %q", rejected.Constraint, BindQPS)
	}
	if rejected.RetryAfter <= 0 || rejected.RetryAfter > window {
		t.Fatalf("retryAfter out of range: %v", rejected.RetryAfter)
	}
}

// TestSlidingWindowRecovery verifies entries expire as the window slides forward
func TestSlidingWindowRecovery(t *testing.T) {
	limiter := newTestLimiter(t)
	ctx := context.Background()
	qpsKey, _ := limiter.BuildKeys("test:recovery", time.Now().Format("150405.000000000"))

	const limit = 2
	window := 500 * time.Millisecond

	if res, _ := limiter.Allow(ctx, qpsKey, limit, window); !res.Allowed {
		t.Fatal("first request should pass")
	}
	time.Sleep(300 * time.Millisecond)
	if res, _ := limiter.Allow(ctx, qpsKey, limit, window); !res.Allowed {
		t.Fatal("second request should pass")
	}
	time.Sleep(100 * time.Millisecond)
	if res, _ := limiter.Allow(ctx, qpsKey, limit, window); res.Allowed {
		t.Fatal("third request at t=400ms inside window must be rejected")
	}
	// At t=800ms both original entries are outside the 500ms window
	time.Sleep(400 * time.Millisecond)
	res, err := limiter.Allow(ctx, qpsKey, limit, window)
	if err != nil || !res.Allowed {
		t.Fatal("after sliding past the window, request should be allowed again")
	}
}

// TestDualWindowAllOrNothing verifies that a request rejected by RPM does not
// consume QPS quota (atomic all-or-nothing recording)
func TestDualWindowAllOrNothing(t *testing.T) {
	limiter := newTestLimiter(t)
	ctx := context.Background()
	id := "dual:" + time.Now().Format("150405.000000000")
	qpsKey, rpmKey := limiter.BuildKeys("test:"+id, "x")

	const qpsLimit = 100 // effectively unlimited within test duration
	const rpmLimit = 3
	qpsWindow := time.Second
	rpmWindow := time.Minute

	var admitted Result
	for i := 0; i < rpmLimit; i++ {
		res, err := limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit, qpsWindow, rpmWindow)
		if err != nil || !res.Allowed {
			t.Fatalf("request %d should pass both windows (err=%v)", i+1, err)
		}
		admitted = res
	}
	if admitted.QPSCount != rpmLimit || admitted.RPMCount != rpmLimit {
		t.Fatalf("counts mismatch: qps=%d rpm=%d", admitted.QPSCount, admitted.RPMCount)
	}

	// 4th request hits the RPM ceiling
	rejected, err := limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit, qpsWindow, rpmWindow)
	if err != nil || rejected.Allowed {
		t.Fatalf("4th request must be rejected by RPM (allowed=%v, err=%v)", rejected.Allowed, err)
	}
	if rejected.Constraint != BindRPM {
		t.Fatalf("constraint = %q, want %q", rejected.Constraint, BindRPM)
	}
	// RPM window spans a minute -> retry-after should be minute-scale here
	if rejected.RetryAfter <= qpsWindow || rejected.RetryAfter > rpmWindow {
		t.Fatalf("retryAfter not minute-scale: %v", rejected.RetryAfter)
	}

	// All-or-nothing: the rejected request must NOT have consumed QPS quota.
	// Raise the RPM ceiling and confirm the next requests still fill the QPS
	// window from where it stopped (i.e., only 3 entries exist in it).
	res, err := limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit+10, qpsWindow, rpmWindow)
	if err != nil || !res.Allowed {
		t.Fatalf("request with raised RPM must pass (err=%v)", err)
	}
	if res.RPMCount != rpmLimit+1 {
		t.Fatalf("rpm count after raise = %d, want %d", res.RPMCount, rpmLimit+1)
	}
	if res.QPSCount != rpmLimit+1 {
		t.Fatalf("rejected-by-RPM requests leaked into QPS window: qpsCount=%d, want %d", res.QPSCount, rpmLimit+1)
	}
}

// TestDualWindowQPSBindsFirst verifies the tighter per-second constraint reports itself
func TestDualWindowQPSBindsFirst(t *testing.T) {
	limiter := newTestLimiter(t)
	ctx := context.Background()
	id := "qpsfirst:" + time.Now().Format("150405.000000000")
	qpsKey, rpmKey := limiter.BuildKeys("test:"+id, "x")

	const qpsLimit = 2
	const rpmLimit = 500
	res, err := limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit, time.Second, time.Minute)
	if err != nil || !res.Allowed {
		t.Fatalf("first request should pass (err=%v)", err)
	}

	for i := 0; i < qpsLimit-1; i++ {
		limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit, time.Second, time.Minute)
	}
	rejected, err := limiter.AllowBoth(ctx, qpsKey, rpmKey, qpsLimit, rpmLimit, time.Second, time.Minute)
	if err != nil || rejected.Allowed {
		t.Fatal("burst beyond QPS must be rejected")
	}
	if rejected.Constraint == BindRPM {
		t.Fatalf("constraint = %q, want QPS-bound", rejected.Constraint)
	}
	if rejected.RetryAfter > time.Second {
		t.Fatalf("qps-bound retryAfter should be second-scale, got %v", rejected.RetryAfter)
	}
}

// TestZeroLimitsBypassesRedis verifies both limits<=0 is unlimited and never touches Redis
func TestZeroLimitsBypassesRedis(t *testing.T) {
	client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"}) // nothing listens here
	defer func() { _ = client.Close() }()
	limiter := NewLimiter(client)

	res, err := limiter.AllowBoth(context.Background(), "k1", "k2", 0, 0, time.Second, time.Minute)
	if err != nil {
		t.Fatalf("zero limits must not touch redis: %v", err)
	}
	if !res.Allowed {
		t.Fatal("zero limits must be unlimited")
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

	_, err := limiter.AllowBoth(context.Background(), "wanpic:test:outage:sec", "wanpic:test:outage:min",
		10, 100, time.Second, time.Minute)
	if !errors.Is(err, ErrRedisUnavailable) {
		t.Fatalf("expected ErrRedisUnavailable, got: %v", err)
	}
}
