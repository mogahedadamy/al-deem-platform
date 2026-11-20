package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestZitadelStaffInviteCreatesUserAndSendsInvite(t *testing.T) {
	var createdID string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer management-token" {
			t.Fatal("missing management token")
		}
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v2/users/new":
			var payload struct {
				OrganizationID string `json:"organizationId"`
				UserID         string `json:"userId"`
				Username       string `json:"username"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatal(err)
			}
			if payload.OrganizationID != "org-id" || payload.Username != "staff@example.test" {
				t.Fatalf("unexpected create payload: %+v", payload)
			}
			createdID = payload.UserID
			_ = json.NewEncoder(w).Encode(map[string]string{"id": createdID})
		case r.Method == http.MethodPost && r.URL.Path == "/v2/users/"+createdID+"/invite_code":
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	inviter := NewStaffInviter(server.URL, "org-id", "management-token")
	userID, err := inviter.Invite(context.Background(), "مدرب جديد", "staff@example.test")
	if err != nil {
		t.Fatal(err)
	}
	if userID != createdID || len(strings.Split(userID, "-")) != 5 {
		t.Fatalf("unexpected user id %q", userID)
	}
}

func TestZitadelStaffInviteDeletesPartialUserWhenEmailFails(t *testing.T) {
	deleted := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v2/users/new":
			var payload struct {
				UserID string `json:"userId"`
			}
			_ = json.NewDecoder(r.Body).Decode(&payload)
			_ = json.NewEncoder(w).Encode(map[string]string{"id": payload.UserID})
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/invite_code"):
			http.Error(w, "mail unavailable", http.StatusServiceUnavailable)
		case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/v2/users/"):
			deleted = true
			w.WriteHeader(http.StatusOK)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	inviter := NewStaffInviter(server.URL, "org-id", "management-token")
	if _, err := inviter.Invite(context.Background(), "مدرب جديد", "staff@example.test"); err == nil {
		t.Fatal("expected invitation failure")
	}
	if !deleted {
		t.Fatal("partial Zitadel user was not removed")
	}
}
