package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"wanpictures-backend/config"
	"wanpictures-backend/database"
	"wanpictures-backend/routes"
)

func main() {
	// 1. Load configuration from environment variables
	cfg := config.LoadConfig()
	log.Printf("[Config] Loaded application config (Port: %s, Mode: %s, DB: %s)", cfg.Port, cfg.GinMode, cfg.DBDriver)

	// 2. Initialize Database & run migrations
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("[Database] Initialization failed: %v", err)
	}
	_ = db

	// 3. Initialize Redis (required by fail-closed upload rate limiter)
	if err := database.InitRedis(); err != nil {
		log.Fatalf("[Redis] Initialization failed: %v (upload rate limiting is fail-closed)", err)
	}

	// 4. Initialize Router
	router := routes.SetupRouter()

	// 5. Start HTTP Server with Graceful Shutdown
	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	srv := &http.Server{
		Addr:           addr,
		Handler:        router,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	go func() {
		log.Printf("🚀 [Wan Pictures Backend] Server running on http://%s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server listen error: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	database.CloseRedis()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
