package zoom

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/al-deem/platform/core-api/internal/livesessions/ports"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestCreateMeetingUsesS2SAndSafeMeetingSettings(t *testing.T) {
	var sawToken, sawMeeting bool
	client := &Client{
		accountID: "account-id", clientID: "client-id", clientSecret: "client-secret",
		httpClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			switch req.URL.Host {
			case "zoom.us":
				sawToken = true
				if req.URL.Path != "/oauth/token" || req.Method != http.MethodPost {
					t.Fatalf("unexpected token request %s %s", req.Method, req.URL)
				}
				if req.URL.Query().Get("grant_type") != "account_credentials" || req.URL.Query().Get("account_id") != "account-id" {
					t.Fatalf("unexpected token query %s", req.URL.RawQuery)
				}
				user, password, ok := req.BasicAuth()
				if !ok || user != "client-id" || password != "client-secret" {
					t.Fatal("S2S client credentials missing from token request")
				}
				return jsonResponse(http.StatusOK, `{"access_token":"s2s-token","expires_in":3600}`), nil
			case "api.zoom.us":
				sawMeeting = true
				if req.URL.Path != "/v2/users/me/meetings" || req.Header.Get("Authorization") != "Bearer s2s-token" {
					t.Fatalf("unexpected meeting request %s authorization=%q", req.URL, req.Header.Get("Authorization"))
				}
				body, err := io.ReadAll(req.Body)
				if err != nil {
					t.Fatal(err)
				}
				for _, expected := range [][]byte{[]byte(`"waiting_room":true`), []byte(`"join_before_host":false`), []byte(`"duration":45`)} {
					if !bytes.Contains(body, expected) {
						t.Fatalf("meeting payload missing %s: %s", expected, body)
					}
				}
				return jsonResponse(http.StatusCreated, `{"id":123456,"join_url":"https://zoom.us/j/123456"}`), nil
			default:
				t.Fatalf("unexpected Zoom host %q", req.URL.Host)
				return nil, nil
			}
		})},
	}

	meeting, err := client.CreateMeeting(context.Background(), ports.MeetingRequest{
		Topic: "Secure course", StartsAt: time.Date(2026, 9, 12, 10, 0, 0, 0, time.UTC), DurationMin: 45, Timezone: "Africa/Khartoum",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !sawToken || !sawMeeting || meeting.ID != "123456" || meeting.JoinURL != "https://zoom.us/j/123456" {
		t.Fatalf("unexpected meeting %#v token=%v meeting=%v", meeting, sawToken, sawMeeting)
	}
}

func TestCreateMeetingRejectsZoomFailures(t *testing.T) {
	client := &Client{
		accountID: "account", clientID: "id", clientSecret: "secret",
		httpClient: &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return jsonResponse(http.StatusUnauthorized, `{"reason":"invalid"}`), nil
		})},
	}
	if _, err := client.CreateMeeting(context.Background(), ports.MeetingRequest{Topic: "x", StartsAt: time.Now(), DurationMin: 30}); err == nil {
		t.Fatal("failed Zoom token request must fail meeting creation")
	}
}
