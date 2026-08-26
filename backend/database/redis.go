package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"wanpictures-backend/config"
)

// Rdb is the shared Redis client used by rate limiter and other services
var Rdb *redis.Client

// InitRedis connects to Redis according to config and verifies connectivity.
// Rate limiting is fail-closed, so a startup failure aborts the server.
func InitRedis() error {
	cfg := config.AppConfig

	Rdb = redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
		PoolSize:     50,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := Rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect redis (%s): %w", cfg.RedisAddr, err)
	}

	log.Printf("[Redis] Connected successfully to %s (DB: %d)", cfg.RedisAddr, cfg.RedisDB)
	return nil
}

// CloseRedis closes the Redis connection gracefully on shutdown
func CloseRedis() {
	if Rdb != nil {
		if err := Rdb.Close(); err != nil {
			log.Printf("[Redis] Close error: %v", err)
			return
		}
		log.Println("[Redis] Connection closed")
	}
}
