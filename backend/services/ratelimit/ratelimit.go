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

// dualWindowScript atomically enforces two sliding windows (QPS + RPM) with
// all-or-nothing semantics: a request is admitted only when BOTH constraints
// pass, and only then is it recorded into both windows — so requests rejected
// by one constraint never consume quota of the other.
//
// KEYS[1] -> QPS sorted set (request timestamps, member = unique request id)
// KEYS[2] -> RPM sorted set
// ARGV[1] -> current time in milliseconds
// ARGV[2] -> QPS window size in milliseconds (1s for per-second limiting)
// ARGV[3] -> QPS limit (>0 enables the check, <=0 skips this dimension)
// ARGV[4] -> RPM window size in milliseconds (60s for per-minute limiting)
// ARGV[5] -> RPM limit (>0 enables the check, <=0 skips this dimension)
// ARGV[6] -> unique member id for this request
//
// Returns {allowed(0|1), qpsCount, rpmCount, bindFlag(0 none|1 qps|2 rpm|3 both), retryAfterMs}
var dualWindowScript = redis.NewScript(`
local now       = tonumber(ARGV[1])
local qpsWindow = tonumber(ARGV[2])
local qpsLimit  = tonumber(ARGV[3])
local rpmWindow = tonumber(ARGV[4])
local rpmLimit  = tonumber(ARGV[5])
local member    = ARGV[6]

local qpsActive = qpsLimit > 0
local rpmActive = rpmLimit > 0

-- Evict entries that fell out of their sliding windows
if qpsActive then
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - qpsWindow)
end
if rpmActive then
    redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - rpmWindow)
end

local qpsCount = 0
if qpsActive then
    qpsCount = redis.call('ZCARD', KEYS[1])
end
local rpmCount = 0
if rpmActive then
    rpmCount = redis.call('ZCARD', KEYS[2])
end

local qpsOK = (not qpsActive) or (qpsCount < qpsLimit)
local rpmOK = (not rpmActive) or (rpmCount < rpmLimit)

if qpsOK and rpmOK then
    if qpsActive then
        redis.call('ZADD', KEYS[1], now, member)
        redis.call('PEXPIRE', KEYS[1], qpsWindow)
    end
    if rpmActive then
        redis.call('ZADD', KEYS[2], now, member)
        redis.call('PEXPIRE', KEYS[2], rpmWindow)
    end
    return {1, qpsCount + 1, rpmCount + 1, 0, 0}
end

-- Rejected: estimate retry-after as the moment when ALL violated constraints clear
local bindFlag = 0
local retryAfter = 0
if not qpsOK then
    bindFlag = 1
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    local d = qpsWindow
    if #oldest >= 2 then
        d = tonumber(oldest[2]) + qpsWindow - now
        if d < 0 then d = 0 end
    end
    if d > retryAfter then retryAfter = d end
end
if not rpmOK then
    bindFlag = bindFlag + 2
    local oldest = redis.call('ZRANGE', KEYS[2], 0, 0, 'WITHSCORES')
    local d = rpmWindow
    if #oldest >= 2 then
        d = tonumber(oldest[2]) + rpmWindow - now
        if d < 0 then d = 0 end
    end
    if d > retryAfter then retryAfter = d end
end
return {0, qpsCount, rpmCount, bindFlag, math.ceil(retryAfter)}
`)

// BindingConstraint reports which window rejected a request
type BindingConstraint string

const (
	BindNone BindingConstraint = ""
	BindQPS  BindingConstraint = "qps"
	BindRPM  BindingConstraint = "rpm"
	BindBoth BindingConstraint = "qps+rpm"
)

// Result describes the outcome of a rate limit decision across both windows
type Result struct {
	Allowed      bool              // whether the request may proceed
	QPSCount     int64             // requests admitted in the QPS window (incl. this one)
	RPMCount     int64             // requests admitted in the RPM window (incl. this one)
	Constraint   BindingConstraint // which window rejected ("" when allowed)
	RetryAfter   time.Duration     // suggested wait before retrying when rejected
}

// ErrRedisUnavailable is returned when Redis cannot be reached. The upload
// limiter is fail-closed, so callers must reject the request on this error.
var ErrRedisUnavailable = errors.New("ratelimit: redis unavailable")

// Limiter enforces sliding-window QPS/RPM limits on top of Redis
type Limiter struct {
	client *redis.Client
	prefix string
}

// NewLimiter builds a Limiter bound to the given Redis client
func NewLimiter(client *redis.Client) *Limiter {
	return &Limiter{client: client, prefix: "wanpic:rl:upload"}
}

// BuildKeys returns the (QPS, RPM) Redis keys for a limiting dimension and
// identity, e.g. wanpic:rl:upload:user:42:sec / wanpic:rl:upload:user:42:min
func (l *Limiter) BuildKeys(dimension, identity string) (qpsKey, rpmKey string) {
	base := fmt.Sprintf("%s:%s:%s", l.prefix, dimension, identity)
	return base + ":sec", base + ":min"
}

// Allow checks a single sliding window (limit<=0 means unlimited).
// Kept for single-dimension use cases and tests.
func (l *Limiter) Allow(ctx context.Context, key string, limit int64, window time.Duration) (Result, error) {
	return l.AllowBoth(ctx, key, "", limit, 0, window, 0)
}

// AllowBoth records one request only if it stays below BOTH limits.
// A limit <= 0 disables that dimension entirely (unlimited), without
// touching its Redis key.
func (l *Limiter) AllowBoth(ctx context.Context, qpsKey, rpmKey string, qpsLimit int64, rpmLimit int64, qpsWindow time.Duration, rpmWindow time.Duration) (Result, error) {
	if qpsLimit <= 0 && rpmLimit <= 0 {
		return Result{Allowed: true}, nil
	}

	now := time.Now().UnixMilli()
	member := uniqueMember()

	keys := []string{qpsKey}
	if rpmKey == "" && rpmLimit > 0 {
		return Result{}, errors.New("ratelimit: rpm limit set but rpm key missing")
	}
	keys = append(keys, rpmKey)

	res, err := dualWindowScript.Run(ctx, l.client, keys,
		now, qpsWindow.Milliseconds(), qpsLimit,
		rpmWindow.Milliseconds(), rpmLimit, member).Int64Slice()
	if err != nil {
		return Result{}, fmt.Errorf("%w: %v", ErrRedisUnavailable, err)
	}

	result := Result{
		QPSCount: res[1],
		RPMCount: res[2],
	}
	switch res[3] {
	case 1:
		result.Constraint = BindQPS
	case 2:
		result.Constraint = BindRPM
	case 3:
		result.Constraint = BindBoth
	}
	result.Allowed = res[0] == 1
	if !result.Allowed && res[4] > 0 {
		result.RetryAfter = time.Duration(res[4]) * time.Millisecond
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
