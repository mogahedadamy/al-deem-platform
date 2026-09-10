package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	app "github.com/al-deem/platform/core-api/internal/identity/application"
	"github.com/al-deem/platform/core-api/internal/identity/infrastructure/auth"
	"github.com/al-deem/platform/core-api/internal/identity/infrastructure/postgres"
	"github.com/al-deem/platform/core-api/internal/identity/transport"
	catapp "github.com/al-deem/platform/core-api/internal/catalog/application"
catdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
	catpg "github.com/al-deem/platform/core-api/internal/catalog/infrastructure/postgres"
	cattransport "github.com/al-deem/platform/core-api/internal/catalog/transport"
	enapp "github.com/al-deem/platform/core-api/internal/enrollment/application"
	enpg "github.com/al-deem/platform/core-api/internal/enrollment/infrastructure/postgres"
	entransport "github.com/al-deem/platform/core-api/internal/enrollment/transport"
	asmapp "github.com/al-deem/platform/core-api/internal/assessment/application"
	asmpg "github.com/al-deem/platform/core-api/internal/assessment/infrastructure/postgres"
	asmtransport "github.com/al-deem/platform/core-api/internal/assessment/transport"
	ldapp "github.com/al-deem/platform/core-api/internal/leads/application"
	ldpg "github.com/al-deem/platform/core-api/internal/leads/infrastructure/postgres"
	ldtransport "github.com/al-deem/platform/core-api/internal/leads/transport"
	lsapp "github.com/al-deem/platform/core-api/internal/livesessions/application"
	lspg "github.com/al-deem/platform/core-api/internal/livesessions/infrastructure/postgres"
	lstransport "github.com/al-deem/platform/core-api/internal/livesessions/transport"
	"github.com/al-deem/platform/core-api/internal/platform"
	"github.com/al-deem/platform/core-api/internal/platform/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := platform.LoadConfig()
	addr := cfg.APIAddr

	// ===== infrastructure =====
	var store *postgres.Store
	if cfg.DatabaseURL != "" {
		var err error
		store, err = postgres.NewStore(cfg.DatabaseURL)
		if err != nil {
			slog.Error("database unavailable — starting without DB-backed endpoints", "err", err)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	if store != nil {
		// ===== identity module (R0) =====
		svc := app.NewIdentityService(store, store, store)
		resolver := auth.New(cfg.KeycloakURL, cfg.KeycloakRealm, cfg.KeycloakClientID, store, store)
		idh := transport.NewHandler(svc, resolver)
		idh.Register(mux)

		// ===== catalog module (R1) — يشارك نفس الـDB pool =====
		db := store.DB()
		courses := catpg.NewCourseStore(db)
		sections := catpg.NewSectionStore(db)
		lessons := catpg.NewLessonStore(db)
		categories := catpg.NewCategoryStore(db)
		catSvc := catapp.NewCatalogService(courses, sections, lessons, categories, store /* AuditLogger */)
		cath := cattransport.NewCatalogHandler(catSvc, resolver)
		cath.Register(mux)

		// ===== enrollment module (R2) — التسجيل والدفع =====
		enrollments := enpg.NewEnrollmentStore(db)
		payments := enpg.NewPaymentStore(db)
		enSvc := enapp.NewEnrollmentService(
			enrollments, payments, store /* AuditLogger */,
			// coursePublished closure — يقرأ حالة الدورة دون استيراد catalog service كامل
			func(ctx context.Context, courseID string) (bool, float64, string, error) {
				c, err := courses.GetByID(ctx, courseID)
				if err != nil {
					return false, 0, "", err
				}
				return c.Status == catdom.CoursePublished, c.PriceAmount, c.Currency, nil
			},
		)
		enh := entransport.NewEnrollmentHandler(enSvc, resolver,
			// lessonLookup — بيانات الدرس من catalog stores مباشرة (بدون استيراد دوّار)
			func(ctx context.Context, lessonID string) (courseID, ltype, title, content, videoURL string, err error) {
				l, err := lessons.GetByID(ctx, lessonID)
				if err != nil {
					return "", "", "", "", "", err
				}
				cid, t, tl, cn, vu := l.CourseID, l.Type, l.Title, "", ""
				if l.Content != nil {
					cn = *l.Content
				}
				if l.VideoURL != nil {
					vu = *l.VideoURL
				}
				return cid, t, tl, cn, vu, nil
			})
		enh.Register(mux)

		// ===== assessment module (R3) — الاختبارات والشهادات =====
		quizzes := asmpg.NewQuizStore(db)
		attempts := asmpg.NewAttemptStore(db)
		certs := asmpg.NewCertificateStore(db)
		papers := asmpg.NewPaperRequestStore(db)
		asmSvc := asmapp.NewAssessmentService(
			quizzes, attempts, certs, papers, store,
			func(ctx context.Context, enrollmentID, studentID string) (bool, string, error) {
				e, err := enrollments.GetByID(ctx, enrollmentID)
				if err != nil {
					return false, "", err
				}
				// قرار #4: الاختبار متاح للطالب الفعّال والمكتمل
				// (اكتمال الدروس → completed — ثم يختبر لإصدار الشهادة)
				owned := e.StudentID == studentID
				ok := owned && (e.Status == "active" || e.Status == "completed")
				return ok, e.CourseID, nil
			},
			func(ctx context.Context, studentID string) (string, error) {
				p, err := store.GetByID(ctx, studentID)
				if err != nil {
					return "", err
				}
				return p.FullName, nil
			},
			func(ctx context.Context, courseID string) (string, error) {
				c, err := courses.GetByID(ctx, courseID)
				if err != nil {
					return "", err
				}
				return c.Title, nil
			},
			func(ctx context.Context, slug string) (string, error) {
				c, err := courses.GetBySlug(ctx, slug)
				if err != nil {
					return "", err
				}
				return c.ID, nil
			},
		)
		asmh := asmtransport.NewAssessmentHandler(asmSvc, resolver)
		asmh.Register(mux)

		// ===== livesessions module (R3-B) — الحصص المباشرة (قرار #5) =====
		lsSessions := lspg.NewSessionStore(db)
		lsAttendees := lspg.NewAttendeeStore(db)
		lsWebhooks := lspg.NewWebhookStore(db)
		lsSvc := lsapp.NewLiveSessionsService(
			lsSessions, lsAttendees, lsWebhooks, store,
			func(ctx context.Context, courseID string) (bool, string, error) {
				c, err := courses.GetByID(ctx, courseID)
				if err != nil {
					return false, "", err
				}
				return c.HasLiveSessions, c.InstructorID, nil
			},
			func(ctx context.Context, courseID, studentID string) (bool, error) {
				return enrollments.HasActiveByCourseAndStudent(ctx, courseID, studentID)
			},
			func(ctx context.Context, courseID, userID string) (bool, error) {
				c, err := courses.GetByID(ctx, courseID)
				if err != nil {
					return false, err
				}
				return c.InstructorID == userID, nil
			},
		)
		lsh := lstransport.NewLiveSessionsHandler(lsSvc, resolver)
		lsh.Register(mux)

		// ===== leads module (R4-B) — الاستفسارات =====
		ldStore := ldpg.NewLeadStore(db)
		ldSvc := ldapp.NewLeadsService(ldStore, store)
		ldh := ldtransport.NewLeadsHandler(ldSvc, resolver)
		ldh.Register(mux)

		slog.Info("modules wired", "identity", true, "catalog", true, "enrollment", true, "assessment", true, "livesessions", true, "leads", true,
			"keycloak", cfg.KeycloakURL, "realm", cfg.KeycloakRealm)
	}

	// ===== Redis rate limiting (Blueprint 6.3) =====
	// fail-open: إن لم يتصل Redis تعمل الخدمة بلا حدود (مع سجل واضح)
	var limiter *middleware.RateLimiter
	if cfg.RedisURL != "" {
		if rl, err := middleware.NewRateLimiter(cfg.RedisURL, "deem:rl"); err != nil {
			slog.Warn("redis unavailable — rate limiting disabled (fail-open)", "err", err)
		} else {
			limiter = rl
			slog.Info("redis rate limiter active", "url", cfg.RedisURL)
		}
	}

	handler := middleware.RequestID(middleware.Logging(middleware.Recover(mux)))
	if limiter != nil {
		// 120 طلب/دقيقة لكل IP على كل الـAPI
		handler = limiter.Middleware(120, time.Minute)(handler)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("core-api listening", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("shutting down gracefully")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	_ = platform.ErrNotFound // keep import for future use
}
