package zoom

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/al-deem/platform/core-api/internal/livesessions/ports"
)

type Client struct {
	accountID    string
	clientID     string
	clientSecret string
	httpClient   *http.Client
}

func NewFromEnv() *Client {
	accountID := os.Getenv("ZOOM_ACCOUNT_ID")
	clientID := os.Getenv("ZOOM_CLIENT_ID")
	secret := os.Getenv("ZOOM_CLIENT_SECRET")
	if accountID == "" || clientID == "" || secret == "" {
		return nil
	}
	return &Client{accountID: accountID, clientID: clientID, clientSecret: secret, httpClient: &http.Client{Timeout: 12 * time.Second}}
}

func (c *Client) CreateMeeting(ctx context.Context, request ports.MeetingRequest) (*ports.Meeting, error) {
	token, err := c.accessToken(ctx)
	if err != nil {
		return nil, err
	}
	payload := map[string]any{
		"topic":      request.Topic,
		"type":       2,
		"start_time": request.StartsAt.UTC().Format(time.RFC3339),
		"duration":   request.DurationMin,
		"timezone":   request.Timezone,
		"settings":   map[string]any{"join_before_host": false, "waiting_room": true},
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.zoom.us/v2/users/me/meetings", strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	response, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("zoom create meeting: http %d", response.StatusCode)
	}
	var result struct {
		ID      json.Number `json:"id"`
		JoinURL string      `json:"join_url"`
	}
	decoder := json.NewDecoder(response.Body)
	decoder.UseNumber()
	if err := decoder.Decode(&result); err != nil {
		return nil, err
	}
	if result.ID == "" || result.JoinURL == "" {
		return nil, fmt.Errorf("zoom create meeting: incomplete response")
	}
	return &ports.Meeting{ID: string(result.ID), JoinURL: result.JoinURL}, nil
}

func (c *Client) accessToken(ctx context.Context) (string, error) {
	endpoint := "https://zoom.us/oauth/token?" + url.Values{
		"grant_type": {"account_credentials"},
		"account_id": {c.accountID},
	}.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(c.clientID, c.clientSecret)
	response, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("zoom token: http %d", response.StatusCode)
	}
	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("zoom token: empty access token, expires=%s", strconv.Itoa(result.ExpiresIn))
	}
	return result.AccessToken, nil
}

var _ ports.MeetingProvider = (*Client)(nil)
