package ratelimit

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// slidingWindowScript atomically performs the ZSET based sliding window check.
//
// KEYS[1] -> sorted set holding request timestamps (member = unique request id)
// ARGV[1] -> current time in milliseconds
// ARGV[2] -> window size in milliseconds
// ARGV[3] -> allowed request count within the window
// ARGV[4] -> unique member id for this request
//
// Returns {allowed(0|1), countInWindow, retryAfterMs}
var slidingWindowScript = redis.NewScript(`
local key     = KEYS[1]
local now     = tonumber(ARGV[1])
local window  = tonumber(ARGV[2])
local limit   = tonumber(ARGV[3])
local member  = ARGV[4]

-- Evict entries that fell out of the sliding window (scores <= now - window)
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, member)
    -- Keep the key only as long as the window; self-cleaning for idle keys
    redis.call('PEXPIRE', key, window)
    return {1, count + 1, 0}
end

-- Rejected: estimate when the oldest entry leaves the window
local retryAfter = window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if #oldest >= 2 then
    local delta = tonumber(oldest[2]) + window - now
    if delta > 0 and delta < retryAfter then
        retryAfter = delta
    end
end
return {0, count, math.ceil(retryAfter)}
`)

// Result describes the outcome of a rate limit decision
type Result struct {
	Allowed       bool          // whether the request may proceed
	Count         int64         // requests already admitted inside the window
	RetryAfter    time.Duration // suggested wait before retrying when rejected
	WindowMillis  int64         // window size used for the decision
	LimitPerWindow int64         // limit applied for the decision
}

// ErrRedisUnavailable is returned when Redis cannot be reached. The upload
// limiter is fail-closed, so callers must reject the request on this error.
var ErrRedisUnavailable = errors.New("ratelimit: redis unavailable")

// Limiter enforces sliding-window QPS limits on top of Redis
type Limiter struct {
	client *redis.Client
	prefix string
}

// NewLimiter builds a Limiter bound to the given Redis client
func NewLimiter(client *redis.Client) *Limiter {
	return &Limiter{client: client, prefix: "wanpic:rl:upload"}
}

// BuildKey assembles the Redis key for a limiting dimension and identity,
// e.g. wanpic:rl:upload:user:42 or wanpic:rl:upload:anon:1.2.3.4
func (l *Limiter) BuildKey(dimension, identity string) string {
	return fmt.Sprintf("%s:%s:%s", l.prefix, dimension, identity)
}

// Allow records one request into the sliding window if it stays below limit.
// limit <= 0 means unlimited and is always allowed without touching Redis.
func (l *Limiter) Allow(ctx context.Context, key string, limit int64, window time.Duration) (Result, error) {
	if limit <= 0 {
		return Result{Allowed: true, LimitPerWindow: limit, WindowMillis: window.Milliseconds()}, nil
	}

	now := time.Now().UnixMilli()
	member := uniqueMember()

	res, err := slidingWindowScript.Run(ctx, l.client, []string{key},
		now, window.Milliseconds(), limit, member).Int64Slice()
	if err != nil {
		return Result{}, fmt.Errorf("%w: %v", ErrRedisUnavailable, err)
	}

	result := Result{
		Allowed:       res[0] == 1,
		Count:         res[1],
		WindowMillis:  window.Milliseconds(),
		LimitPerWindow: limit,
	}
	if !result.Allowed && res[2] > 0 {
		result.RetryAfter = time.Duration(res[2]) * time.Millisecond
	}
	return result, nil
}

// Ping verifies Redis connectivity (used by health checks / startup)
func (l *Limiter) Ping(ctx context.Context) error {
	return l.client.Ping(ctx).Err()
}

// uniqueMember generates a collision-free member id for the ZSET entry
func uniqueMember() string {
	var buf [6]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%d-%s", time.Now().UnixNano(), hex.EncodeToString(buf[:]))
}
