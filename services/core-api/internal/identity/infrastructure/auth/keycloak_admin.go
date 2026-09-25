package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

// KeycloakStaffInviter uses a confidential service account, never a browser
// token, to create a restricted staff identity and dispatch required actions.
type KeycloakStaffInviter struct {
	baseURL, realm, clientID, clientSecret string
	httpClient                             *http.Client
}

func NewStaffInviter(baseURL, realm, clientID, clientSecret string) ports.StaffInviteGateway {
	if strings.TrimSpace(clientSecret) == "" {
		return nil
	}
	return &KeycloakStaffInviter{baseURL: strings.TrimRight(baseURL, "/"), realm: realm, clientID: clientID, clientSecret: clientSecret, httpClient: &http.Client{Timeout: 10 * time.Second}}
}

func (k *KeycloakStaffInviter) adminToken(ctx context.Context) (string, error) {
	form := url.Values{"client_id": {k.clientID}, "client_secret": {k.clientSecret}, "grant_type": {"client_credentials"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.baseURL+"/realms/"+url.PathEscape(k.realm)+"/protocol/openid-connect/token", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := k.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("keycloak service-account authentication failed: %s", resp.Status)
	}
	var body struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil || body.AccessToken == "" {
		return "", fmt.Errorf("invalid keycloak service-account response")
	}
	return body.AccessToken, nil
}

func (k *KeycloakStaffInviter) Invite(ctx context.Context, fullName, email string) (string, error) {
	token, err := k.adminToken(ctx)
	if err != nil {
		return "", &platform.DomainError{Code: "UNAVAILABLE", Msg: "تعذر الاتصال بخدمة الحسابات"}
	}
	parts := strings.Fields(fullName)
	firstName := fullName
	lastName := ""
	if len(parts) > 1 {
		firstName, lastName = parts[0], strings.Join(parts[1:], " ")
	}
	payload, _ := json.Marshal(map[string]any{"username": email, "email": email, "firstName": firstName, "lastName": lastName, "enabled": true, "emailVerified": false, "requiredActions": []string{"VERIFY_EMAIL", "UPDATE_PASSWORD"}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.baseURL+"/admin/realms/"+url.PathEscape(k.realm)+"/users", strings.NewReader(string(payload)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := k.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusConflict {
		return "", &platform.DomainError{Code: "CONFLICT", Msg: "يوجد حساب مسجل بهذا البريد الإلكتروني"}
	}
	if resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("keycloak user creation failed: %s", resp.Status)
	}
	location := resp.Header.Get("Location")
	userID := location[strings.LastIndex(location, "/")+1:]
	if userID == "" {
		return "", fmt.Errorf("keycloak did not return invited user id")
	}
	body, _ := json.Marshal([]string{"VERIFY_EMAIL", "UPDATE_PASSWORD"})
	actionsURL := k.baseURL + "/admin/realms/" + url.PathEscape(k.realm) + "/users/" + url.PathEscape(userID) + "/execute-actions-email?client_id=erp"
	actionRequest, err := http.NewRequestWithContext(ctx, http.MethodPut, actionsURL, strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	actionRequest.Header.Set("Authorization", "Bearer "+token)
	actionRequest.Header.Set("Content-Type", "application/json")
	actionResponse, err := k.httpClient.Do(actionRequest)
	if err != nil {
		return "", err
	}
	defer actionResponse.Body.Close()
	if actionResponse.StatusCode != http.StatusNoContent {
		return "", fmt.Errorf("keycloak invitation email failed: %s", actionResponse.Status)
	}
	return userID, nil
}
