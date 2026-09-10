// Unit tests — rate limiter helpers.
package middleware

import (
	"net/http"
	"testing"
)

func TestAllowedOrigin(t *testing.T) {
	valid := []string{
		"https://alameedtraining.com",
		"https://www.alameedtraining.com",
		"https://learn.alameedtraining.com",
		"https://erp.alameedtraining.com",
		"http://localhost:3012",
	}
	for _, o := range valid {
		if !allowedOrigin(o) {
			t.Errorf("origin %s must be allowed", o)
		}
	}
	invalid := []string{
		"https://evil.example.com",
		"https://alameedtraining.com.evil.io", // suffix attack
		"http://alameedtraining.com",
		"",
	}
	for _, o := range invalid {
		if allowedOrigin(o) {
			t.Errorf("origin %q must be rejected", o)
		}
	}
}

func TestClientIP_XForwardedFor(t *testing.T) {
	r, _ := http.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	r.Header.Set("X-Forwarded-For", "203.0.113.5, 10.0.0.1")
	if got := clientIP(r); got != "203.0.113.5" {
		t.Fatalf("clientIP = %q, want first hop 203.0.113.5", got)
	}
}

func TestClientIP_Direct(t *testing.T) {
	r, _ := http.NewRequest("GET", "/", nil)
	r.RemoteAddr = "192.168.1.10:40000"
	if got := clientIP(r); got != "192.168.1.10" {
		t.Fatalf("direct clientIP = %q, want 192.168.1.10", got)
	}
}
