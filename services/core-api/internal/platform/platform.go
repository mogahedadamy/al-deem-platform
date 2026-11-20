// Package platform — مشتركات كل Modules: config, logging, errors, middleware.
package platform

import (
	"errors"
	"log/slog"
	"os"
)

// Config — إعداد الخدمة من environment (يُتحقق منه عند startup).
type Config struct {
	APIAddr           string
	DatabaseURL       string
	RedisURL          string
	OIDCIssuer        string
	OIDCClientID      string
	ZitadelOrgID      string
	ZitadelAdminToken string
}

func LoadConfig() Config {
	c := Config{
		APIAddr:           envOr("API_ADDR", ":4001"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		RedisURL:          envOr("REDIS_URL", "redis://localhost:6391/0"),
		OIDCIssuer:        envOr("OIDC_ISSUER", "http://localhost:8091"),
		OIDCClientID:      envOr("OIDC_CLIENT_ID", "core-api"),
		ZitadelOrgID:      os.Getenv("ZITADEL_ORG_ID"),
		ZitadelAdminToken: os.Getenv("ZITADEL_ADMIN_TOKEN"),
	}
	if c.DatabaseURL == "" {
		slog.Warn("DATABASE_URL not set — DB-dependent endpoints will fail")
	}
	return c
}

// DomainError — خطأ أعمال موحد (لا any ولا أخطاء عامة عند الحدود).
type DomainError struct {
	Code string
	Msg  string
}

func (e *DomainError) Error() string { return e.Code + ": " + e.Msg }

var (
	ErrUnauthorized = &DomainError{Code: "UNAUTHORIZED", Msg: "missing or invalid credentials"}
	ErrForbidden    = &DomainError{Code: "FORBIDDEN", Msg: "not permitted for this action"}
	ErrNotFound     = &DomainError{Code: "NOT_FOUND", Msg: "resource not found"}
	ErrConflict     = &DomainError{Code: "CONFLICT", Msg: "conflicts with current state"}
	ErrValidation   = &DomainError{Code: "VALIDATION", Msg: "invalid input"}
)

// IsDomainError يساعد في تحويل الأخطاء إلى استجابات HTTP موحدة.
func IsDomainError(err error) (*DomainError, bool) {
	var de *DomainError
	if errors.As(err, &de) {
		return de, true
	}
	return nil, false
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
