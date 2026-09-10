// Rate limiting بRedis — ثابت النافذة (fixed window) للطلبات العامة الحساسة.
// Blueprint 6.3: HTTP middleware rate limit + Redis (MULTI_PORTAL: rate limits).
package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimiter — يعتمد Redis (يُتخطى بسلام إن لم يتصل — الموقع يبقى يعمل).
type RateLimiter struct {
	rdb    *redis.Client
	prefix string
}

// NewRateLimiter — url مثل redis://localhost:6391/0.
func NewRateLimiter(redisURL, prefix string) (*RateLimiter, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("rate limiter: %w", err)
	}
	rdb := redis.NewClient(opt)
	// ping مع مهلة قصيرة — إن فشل نعطل الـlimiter (fail-open)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err // المتصل يقرر: fail-open بلا Redis
	}
	return &RateLimiter{rdb: rdb, prefix: prefix}, nil
}

// clientIP — خلف proxy: X-Forwarded-For أولًا.
func clientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		// أول IP في السلسلة
		for i := 0; i < len(fwd); i++ {
			if fwd[i] == ',' {
				return fwd[:i]
			}
		}
		return fwd
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// Allow — هل يسمح بالطلب؟ يرجع (allowed, retryAfter).
func (rl *RateLimiter) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, time.Duration) {
	if rl == nil || rl.rdb == nil {
		return true, 0 // fail-open
	}
	full := rl.prefix + ":" + key
	pipe := rl.rdb.TxPipeline()
	incr := pipe.Incr(ctx, full)
	expire := pipe.Expire(ctx, full, window)
	if _, err := pipe.Exec(ctx); err != nil {
		return true, 0 // fail-open: Redis تعطل لا يوقف الخدمة
	}
	n := incr.Val()
	if n == 1 {
		return true, 0
	}
	if n > int64(limit) {
		ttl := rl.rdb.TTL(ctx, full).Val()
		if ttl < 0 {
			ttl = window
		}
		_ = expire // تسجيل مبدئي
		return false, ttl
	}
	return true, 0
}

// Middleware — يحمي المسارات الحساسة: limit لكل IP في النافذة.
func (rl *RateLimiter) Middleware(limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if rl != nil && rl.rdb != nil {
				key := clientIP(r)
				allowed, retry := rl.Allow(r.Context(), key, limit, window)
				if !allowed {
					w.Header().Set("Retry-After", strconv.Itoa(int(retry.Seconds())+1))
					w.Header().Set("Content-Type", "application/json; charset=utf-8")
					w.WriteHeader(http.StatusTooManyRequests)
					_, _ = w.Write([]byte(`{"error":"RATE_LIMITED","message":"طلبات كثيرة — حاول بعد قليل"}`))
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
