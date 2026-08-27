package viewcount

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"wanpictures-backend/database"
	"wanpictures-backend/models"
)

const (
	// queueKey is the Redis list holding pending view events.
	// Format: JSON {"id": <image_id>, "c": <delta>}
	queueKey = "wanpictures:view_queue"
	// brpopTimeout is the blocking-pop wait before re-checking flush tick & context.
	brpopTimeout = time.Second
	// flushInterval caps how stale in-memory counters may become before they
	// are written to the database.
	flushInterval = time.Second
	// batchSize forces an early flush once this many events are buffered.
	batchSize = 100
)

// viewEvent is a single queue item. Count > 1 only appears when a failed
// database flush re-enqueues aggregated deltas so no views are lost.
type viewEvent struct {
	ID    uint64 `json:"id"`
	Count int    `json:"c"`
}

var (
	workerOnce  sync.Once
	stopFunc    context.CancelFunc
	workerWG    sync.WaitGroup
)

// Enqueue records one view for the given image by pushing it into the Redis
// queue. The actual database increment happens asynchronously in the worker.
// Best-effort: failures are logged and never block or fail image serving.
func Enqueue(imageID uint) {
	if imageID == 0 || database.Rdb == nil {
		return
	}
	payload, _ := json.Marshal(viewEvent{ID: uint64(imageID), Count: 1})
	if err := database.Rdb.RPush(context.Background(), queueKey, payload).Err(); err != nil {
		log.Printf("[ViewCount] enqueue failed for image %d: %v", imageID, err)
	}
}

// Start launches the background consumer worker. It is safe to call multiple
// times (only the first call starts the goroutine).
func Start() {
	workerOnce.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		stopFunc = cancel
		workerWG.Add(1)
		go func() {
			defer workerWG.Done()
			consume(ctx)
		}()
		log.Println("[ViewCount] async worker started")
	})
}

// Stop cancels the worker and waits for its final flush to complete.
// Call before closing Redis / shutting down the database.
func Stop() {
	if stopFunc != nil {
		stopFunc()
	}
	workerWG.Wait()
}

// consume drains the Redis queue, buffers deltas in memory and flushes them to
// the images table in batches (at most once per flushInterval or when
// batchSize events are pending).
func consume(ctx context.Context) {
	pending := make(map[uint64]int)
	lastFlush := time.Now()

	flush := func(reason string) {
		if len(pending) == 0 {
			return
		}
		deltas := pending
		pending = make(map[uint64]int)
		if err := applyDeltas(deltas); err != nil {
			log.Printf("[ViewCount] flush failed (%s): %v — re-enqueueing %d image(s)", reason, err, len(deltas))
			requeue(deltas)
			return
		}
		lastFlush = time.Now()
	}

	for {
		if ctx.Err() != nil {
			flush("shutdown")
			return
		}

		if database.Rdb == nil {
			time.Sleep(brpopTimeout)
			continue
		}

		res, err := database.Rdb.BRPop(ctx, brpopTimeout, queueKey).Result()
		if err == redis.Nil {
			// Timeout without a message: flush if the interval elapsed.
			if time.Since(lastFlush) >= flushInterval {
				flush("interval")
			}
			continue
		}
		if err != nil {
			if ctx.Err() != nil {
				flush("shutdown")
				return
			}
			log.Printf("[ViewCount] BRPOP failed: %v", err)
			time.Sleep(brpopTimeout)
			continue
		}

		var ev viewEvent
		if len(res) >= 2 && json.Unmarshal([]byte(res[1]), &ev) == nil && ev.ID > 0 {
			if ev.Count < 1 {
				ev.Count = 1
			}
			pending[ev.ID] += ev.Count
			if len(pending) >= batchSize {
				flush("batch")
			}
		}
	}
}

// applyDeltas writes accumulated view deltas to the images table atomically.
func applyDeltas(deltas map[uint64]int) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		for id, n := range deltas {
			if err := tx.Model(&models.Image{}).Where("id = ?", id).
				UpdateColumn("view_count", gorm.Expr("view_count + ?", n)).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// requeue pushes aggregated deltas back onto the queue so a failed flush does
// not lose view events.
func requeue(deltas map[uint64]int) {
	for id, n := range deltas {
		payload, _ := json.Marshal(viewEvent{ID: id, Count: n})
		if err := database.Rdb.RPush(context.Background(), queueKey, payload).Err(); err != nil {
			log.Printf("[ViewCount] requeue failed for image %d: %v", id, err)
		}
	}
}