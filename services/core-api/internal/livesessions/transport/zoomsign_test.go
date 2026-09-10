// Unit tests — Zoom webhook signature (Blueprint 18: Zoom event normalization).
package transport

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestVerifyZoomSignature_Valid(t *testing.T) {
	secret := "test-secret"
	body := []byte(`{"event":"meeting.started","payload":{"object":{"id":"123"}}}`)
	ts := "1789027858"
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	sig := "v0=" + hex.EncodeToString(mac.Sum(nil))
	if !verifyZoomSignature(secret, sig, ts, body) {
		t.Fatal("valid signature must verify")
	}
}

func TestVerifyZoomSignature_BadSecret(t *testing.T) {
	body := []byte(`{"event":"x"}`)
	ts := "1789027858"
	mac := hmac.New(sha256.New, []byte("wrong-secret"))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	sig := "v0=" + hex.EncodeToString(mac.Sum(nil))
	if verifyZoomSignature("right-secret", sig, ts, body) {
		t.Fatal("signature from wrong secret must fail")
	}
}

func TestVerifyZoomSignature_TamperedBody(t *testing.T) {
	secret := "s"
	body := []byte(`{"a":1}`)
	ts := "123"
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	sig := "v0=" + hex.EncodeToString(mac.Sum(nil))
	if verifyZoomSignature(secret, sig, ts, []byte(`{"a":2}`)) {
		t.Fatal("tampered body must fail")
	}
}

func TestVerifyZoomSignature_Missing(t *testing.T) {
	if verifyZoomSignature("s", "", "123", []byte("x")) {
		t.Fatal("empty signature must fail")
	}
	if verifyZoomSignature("s", "v0=abc", "", []byte("x")) {
		t.Fatal("empty timestamp must fail")
	}
}
