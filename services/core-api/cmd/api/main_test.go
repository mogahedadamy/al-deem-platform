package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCheckOIDCDiscovery(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/.well-known/openid-configuration" {
			t.Fatalf("unexpected discovery path %q", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := checkOIDC(ctx, server.URL); err != nil {
		t.Fatalf("expected healthy discovery, got %v", err)
	}
}

func TestCheckOIDCRejectsUnavailableDiscovery(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	if err := checkOIDC(context.Background(), server.URL); err == nil {
		t.Fatal("unavailable discovery must fail readiness")
	}
}

func TestCheckRedisRequiresConfiguredURL(t *testing.T) {
	if err := checkRedis(context.Background(), ""); err == nil {
		t.Fatal("missing Redis URL must fail readiness")
	}
}
