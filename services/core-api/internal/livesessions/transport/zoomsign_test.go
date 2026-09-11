// Unit tests — Zoom webhook signature (Blueprint 18: Zoom event normalization).
package transport

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
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
	if verifyZoomSignature("", "v0=abc", "123", []byte("x")) {
		t.Fatal("empty secret must fail closed")
	}
}

func TestZoomTimestampFresh(t *testing.T) {
	now := time.Now()
	fresh := strconv.FormatInt(now.Add(-2*time.Minute).Unix(), 10)
	stale := strconv.FormatInt(now.Add(-10*time.Minute).Unix(), 10)
	future := strconv.FormatInt(now.Add(10*time.Minute).Unix(), 10)
	if !zoomTimestampFresh(fresh, now) {
		t.Fatal("recent timestamp must be accepted")
	}
	if zoomTimestampFresh(stale, now) || zoomTimestampFresh(future, now) {
		t.Fatal("stale or far-future timestamp must be rejected")
	}
	if zoomTimestampFresh("not-a-timestamp", now) {
		t.Fatal("invalid timestamp must be rejected")
	}
}

func TestSessionListNeverLeaksZoomJoinURL(t *testing.T) {
	items := sessionList([]lsdom.LiveSession{{
		ID: "session-1", Title: "Protected class", ZoomJoinURL: "https://zoom.us/j/secret",
	}})
	if _, found := items[0]["joinUrl"]; found {
		t.Fatal("list endpoint must not expose a Zoom join URL before the join-window authorization")
	}
}

func TestZoomValidationToken(t *testing.T) {
	const secret = "test-secret"
	const plain = "plain-token"
	want := "7f606b7088e916bad379ba31e4b24b66e45532cb60602fdd5c5538a4ddd7eec2"
	if got := zoomValidationToken(secret, plain); got != want {
		t.Fatalf("validation token = %q, want %q", got, want)
	}
}

func TestZoomEventIDUsesPayloadHashWithoutUUID(t *testing.T) {
	first := zoomEventID("meeting.started", "", []byte(`{"id":1,"event_ts":1}`))
	same := zoomEventID("meeting.started", "", []byte(`{"id":1,"event_ts":1}`))
	second := zoomEventID("meeting.started", "", []byte(`{"id":1,"event_ts":2}`))
	if first != same {
		t.Fatal("identical unsigned event identity fallback must be stable")
	}
	if first == second {
		t.Fatal("distinct same-second events must not collide")
	}
	if got := zoomEventID("meeting.started", "zoom-uuid", []byte("other")); got != "zoom-uuid" {
		t.Fatalf("provided Zoom event ID must win, got %q", got)
	}
}

func TestZoomWebhookFailsClosedWithoutSecret(t *testing.T) {
	t.Setenv("ZOOM_WEBHOOK_SECRET", "")
	req := httptest.NewRequest(http.MethodPost, "/v1/webhooks/zoom", bytes.NewReader([]byte(`{}`)))
	res := httptest.NewRecorder()
	(&LiveSessionsHandler{}).zoomWebhook(res, req)
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("unsigned unconfigured webhook = %d, want %d", res.Code, http.StatusServiceUnavailable)
	}
}

func TestZoomWebhookAnswersSignedURLValidation(t *testing.T) {
	const secret = "test-secret"
	t.Setenv("ZOOM_WEBHOOK_SECRET", secret)
	body := []byte(`{"event":"endpoint.url_validation","payload":{"plainToken":"plain-token"}}`)
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(body)
	req := httptest.NewRequest(http.MethodPost, "/v1/webhooks/zoom", bytes.NewReader(body))
	req.Header.Set("x-zm-request-timestamp", ts)
	req.Header.Set("x-zm-signature", "v0="+hex.EncodeToString(mac.Sum(nil)))
	res := httptest.NewRecorder()
	(&LiveSessionsHandler{}).zoomWebhook(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("url validation status = %d, want %d", res.Code, http.StatusOK)
	}
	var response map[string]string
	if err := json.Unmarshal(res.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response["plainToken"] != "plain-token" || response["encryptedToken"] != zoomValidationToken(secret, "plain-token") {
		t.Fatalf("unexpected validation response: %#v", response)
	}
}
