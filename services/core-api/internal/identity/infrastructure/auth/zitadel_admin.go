package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type zitadelStaffInviter struct {
	issuer     string
	orgID      string
	token      string
	httpClient *http.Client
}

func NewStaffInviter(issuer, orgID, token string) ports.StaffInviteGateway {
	if issuer == "" || orgID == "" || token == "" {
		return nil
	}
	return &zitadelStaffInviter{
		issuer:     strings.TrimRight(issuer, "/"),
		orgID:      orgID,
		token:      token,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (z *zitadelStaffInviter) Invite(ctx context.Context, fullName, email string) (string, error) {
	profileID, err := newUUID()
	if err != nil {
		return "", err
	}
	parts := strings.Fields(fullName)
	firstName, lastName := fullName, ""
	if len(parts) > 1 {
		firstName, lastName = parts[0], strings.Join(parts[1:], " ")
	}
	payload := map[string]any{
		"organizationId": z.orgID,
		"userId":         profileID,
		"username":       email,
		"human": map[string]any{
			"profile": map[string]any{
				"givenName":         firstName,
				"familyName":        lastName,
				"displayName":       fullName,
				"preferredLanguage": "ar",
			},
			"email": map[string]any{"email": email, "isVerified": false},
		},
	}
	var created struct {
		ID string `json:"id"`
	}
	status, err := z.request(ctx, http.MethodPost, "/v2/users/new", payload, &created)
	if err != nil {
		if status == http.StatusConflict {
			return "", &platform.DomainError{Code: "CONFLICT", Msg: "يوجد حساب مسجل بهذا البريد الإلكتروني"}
		}
		return "", err
	}
	if created.ID != profileID {
		return "", fmt.Errorf("zitadel returned an unexpected user id")
	}
	invite := map[string]any{"sendCode": map[string]any{"applicationName": "مركز العميد للتدريب"}}
	if _, err := z.request(ctx, http.MethodPost, "/v2/users/"+url.PathEscape(profileID)+"/invite_code", invite, nil); err != nil {
		_, _ = z.request(ctx, http.MethodDelete, "/v2/users/"+url.PathEscape(profileID), nil, nil)
		return "", fmt.Errorf("send zitadel invitation: %w", err)
	}
	return profileID, nil
}

func (z *zitadelStaffInviter) request(ctx context.Context, method, path string, payload any, output any) (int, error) {
	var body []byte
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return 0, err
		}
		body = encoded
	}
	req, err := http.NewRequestWithContext(ctx, method, z.issuer+path, bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+z.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := z.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp.StatusCode, fmt.Errorf("zitadel management API returned %s", resp.Status)
	}
	if output != nil {
		if err := json.NewDecoder(resp.Body).Decode(output); err != nil {
			return resp.StatusCode, err
		}
	}
	return resp.StatusCode, nil
}

func newUUID() (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", err
	}
	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	encoded := hex.EncodeToString(value[:])
	return encoded[0:8] + "-" + encoded[8:12] + "-" + encoded[12:16] + "-" + encoded[16:20] + "-" + encoded[20:32], nil
}
