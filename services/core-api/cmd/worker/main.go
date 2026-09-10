package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/al-deem/platform/core-api/internal/livesessions/application"
	lspg "github.com/al-deem/platform/core-api/internal/livesessions/infrastructure/postgres"
	"github.com/al-deem/platform/core-api/internal/platform"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Worker — jobs غير متزامنة (Blueprint 6.3 + 11.3).
// المعالجة الحالية: أحداث Zoom المعلّقة (تسجيلات + حالات اجتماع).
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := platform.LoadConfig()

	// ===== DB =====
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("worker: db open failed", "err", err)
		os.Exit(1)
	}
	if err := db.Ping(); err != nil {
		slog.Error("worker: database unavailable", "err", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()

	sessions := lspg.NewSessionStore(db)
	webhooks := lspg.NewWebhookStore(db)
	// audit غير مطلوب للمعالجة الآلية
	svc := application.NewWorkerService(sessions, webhooks)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	slog.Info("worker starting", "poll_interval", "10s", "db", "ok")

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	// دورة فورية عند البدء ثم كل 10 ثوانٍ
	processBatch(ctx, svc)
	for {
		select {
		case <-stop:
			slog.Info("worker stopped")
			return
		case <-ticker.C:
			processBatch(ctx, svc)
		}
	}
}

func processBatch(ctx context.Context, svc *application.WorkerService) {
	n, err := svc.ProcessPendingZoomEvents(ctx)
	if err != nil {
		slog.Error("worker: batch failed", "err", err)
		return
	}
	if n > 0 {
		slog.Info("worker: processed zoom events", "count", n)
	}
}
