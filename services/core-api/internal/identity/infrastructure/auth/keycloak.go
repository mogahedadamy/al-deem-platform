// Authentication — يتحقق من Keycloak JWT محليًا عبر JWKS (issuer/expiry) ثم يبني Actor من DB.
// هذا هو النمط الصحيح للإنتاج: لا استدعاء شبكة لكل طلب.
package auth

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type keycloakAuth struct {
	baseURL  string
	realm    string
	clientID string
	profiles ports.ProfileRepository
	roles    ports.RoleRepository

	mu         sync.RWMutex
	cachedJWKS *jwksResponse
	fetchedAt  time.Time
}

// New — ActorResolver عبر Keycloak (JWKS verification).
func New(baseURL, realm, clientID string, profiles ports.ProfileRepository, roles ports.RoleRepository) ports.ActorResolver {
	return &keycloakAuth{
		baseURL:  strings.TrimRight(baseURL, "/"),
		realm:    realm,
		clientID: clientID,
		profiles: profiles,
		roles:    roles,
	}
}

type jwksResponse struct {
	Keys []jwksKey `json:"keys"`
}

type jwksKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
	Use string `json:"use"`
}

type tokenClaims struct {
	Sub               string          `json:"sub"`
	Email             string          `json:"email"`
	Name              string          `json:"name"`
	PreferredUsername string          `json:"preferred_username"`
	Exp               int64           `json:"exp"`
	Iss               string          `json:"iss"`
	Azp               string          `json:"azp"`
	Aud               json.RawMessage `json:"aud"`
	RealmAccess       struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
}

func (a *keycloakAuth) issuer() string {
	return a.baseURL + "/realms/" + a.realm
}

// Resolve — Bearer token → Actor (JWKS signature verify + claims + DB roles sync).
func (a *keycloakAuth) Resolve(ctx context.Context, bearerToken string) (*domain.Actor, error) {
	token := strings.TrimPrefix(bearerToken, "Bearer ")
	if token == "" || token == bearerToken {
		return nil, platform.ErrUnauthorized
	}

	claims, err := a.verifyToken(ctx, token)
	if err != nil {
		slog.Debug("jwt verify failed", "err", err)
		return nil, platform.ErrUnauthorized
	}

	// sync profile from SSO claims (idempotent upsert)
	p := domain.Profile{
		ID:       claims.Sub,
		FullName: orDefault(claims.Name, claims.PreferredUsername),
		Email:    claims.Email,
		Locale:   "ar",
		Status:   domain.ProfileActive,
	}
	if err := a.profiles.UpsertFromSSO(ctx, p); err != nil {
		return nil, fmt.Errorf("sync profile: %w", err)
	}

	// roles من DB (مصدر الحقيقة)؛ أول دخول → student
	dbRoles, err := a.roles.GetUserRoles(ctx, claims.Sub)
	if err != nil {
		return nil, fmt.Errorf("load roles: %w", err)
	}
	if len(dbRoles) == 0 {
		for _, r := range claims.RealmAccess.Roles {
			if domain.ValidRole(domain.RoleKey(r)) {
				if err := a.roles.Assign(ctx, claims.Sub, domain.RoleKey(r), claims.Sub); err == nil {
					dbRoles = append(dbRoles, domain.RoleKey(r))
				}
			}
		}
		if len(dbRoles) == 0 {
			if err := a.roles.Assign(ctx, claims.Sub, domain.RoleStudent, claims.Sub); err == nil {
				dbRoles = append(dbRoles, domain.RoleStudent)
			}
		}
	}

	if full, err := a.profiles.GetByID(ctx, claims.Sub); err == nil {
		p = *full
	}
	if p.Status != domain.ProfileActive {
		return nil, platform.ErrForbidden
	}
	return &domain.Actor{Profile: p, Roles: dbRoles}, nil
}

// verifyToken — تفكيك JWT والتحقق من التوقيع بمفتاح JWKS + iss/exp.
func (a *keycloakAuth) verifyToken(ctx context.Context, token string) (*tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("bad token format")
	}
	var claims tokenClaims
	payload, err := decodeSegment(parts[1])
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, err
	}
	// Claims critical to authentication are mandatory. The public issuer can differ
	// from the internal JWKS endpoint used by the API process.
	expectedIssuer := strings.TrimRight(os.Getenv("KEYCLOAK_ISSUER"), "/")
	if expectedIssuer == "" {
		expectedIssuer = a.issuer()
	}
	if claims.Sub == "" || claims.Exp == 0 || time.Now().Unix() >= claims.Exp {
		return nil, fmt.Errorf("token missing subject/expiry or expired")
	}
	if claims.Iss != expectedIssuer {
		return nil, fmt.Errorf("issuer mismatch")
	}
	allowedClients := strings.Split(envOrDefault("KEYCLOAK_ALLOWED_CLIENTS", "learn,erp,www,core-api"), ",")
	clientAllowed := false
	for _, client := range allowedClients {
		if strings.TrimSpace(client) == claims.Azp {
			clientAllowed = true
			break
		}
	}
	if !clientAllowed {
		return nil, fmt.Errorf("authorized party %q is not allowed", claims.Azp)
	}
	// لا يكفي azp وحده: يجب أن يكون الـAPI جمهوره المقصود صراحةً.
	// KEYCLOAK_REQUIRED_AUDIENCE يسمح باسم جمهور مستقل إذا تغيّر client ID.
	requiredAudience := envOrDefault("KEYCLOAK_REQUIRED_AUDIENCE", a.clientID)
	if !hasAudience(claims.Aud, requiredAudience) {
		return nil, fmt.Errorf("required audience %q is missing", requiredAudience)
	}
	// signature (RS256)
	header, err := decodeSegment(parts[0])
	if err != nil {
		return nil, err
	}
	var h struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := json.Unmarshal(header, &h); err != nil {
		return nil, err
	}
	if h.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported alg %q", h.Alg)
	}
	pub, err := a.publicKey(ctx, h.Kid)
	if err != nil {
		return nil, err
	}
	sig, err := decodeSegment(parts[2])
	if err != nil {
		return nil, err
	}
	// RS256: PKCS1v15 over SHA-256 digest of "header.payload"
	signed := parts[0] + "." + parts[1]
	digest := sha256.Sum256([]byte(signed))
	if err := rsa.VerifyPKCS1v15(pub, crypto.SHA256, digest[:], sig); err != nil {
		return nil, fmt.Errorf("signature invalid: %w", err)
	}
	return &claims, nil
}

// publicKey — يجلب/يخزن JWKS (cache ساعة). عند دوران مفاتيح Keycloak
// (إعادة تشغيل/تدوير)، kid الجديد غير موجود في الكاش → إعادة جلب فورية.
// التوكِنات الموقّعة بمفاتيح قديمة مدفونة ستفشل بشكل صحيح (تنتهي صلاحيتها خلال دقائق).
func (a *keycloakAuth) publicKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	a.mu.RLock()
	cached := a.cachedJWKS
	fresh := a.cachedJWKS != nil && time.Since(a.fetchedAt) < time.Hour
	a.mu.RUnlock()
	if fresh && cached != nil {
		if k := findKey(cached, kid); k != nil {
			return rsaKey(k)
		}
		// kid جديد (دوران مفاتيح) — تجاوز الكاش
		slog.Info("jwks cache miss on kid — refreshing (key rotation?)", "kid", kid)
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.issuer()+"/protocol/openid-connect/certs", nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("jwks http %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var jwks jwksResponse
	if err := json.Unmarshal(body, &jwks); err != nil {
		return nil, err
	}
	a.cachedJWKS = &jwks
	a.fetchedAt = time.Now()
	k := findKey(&jwks, kid)
	if k == nil {
		return nil, fmt.Errorf("kid %q not found", kid)
	}
	return rsaKey(k)
}

func findKey(j *jwksResponse, kid string) *jwksKey {
	for i := range j.Keys {
		if j.Keys[i].Kid == kid {
			return &j.Keys[i]
		}
	}
	return nil
}

func rsaKey(k *jwksKey) (*rsa.PublicKey, error) {
	if k.Kty != "RSA" {
		return nil, fmt.Errorf("kty %q not RSA", k.Kty)
	}
	nb, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, err
	}
	eb, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, err
	}
	return &rsa.PublicKey{N: new(big.Int).SetBytes(nb), E: int(new(big.Int).SetBytes(eb).Int64())}, nil
}

// hasAudience accepts both JWT representations permitted by RFC 7519: a
// single string or an array of strings. Malformed/missing `aud` always fails.
func hasAudience(raw json.RawMessage, expected string) bool {
	if expected == "" || len(raw) == 0 {
		return false
	}
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		return single == expected
	}
	var many []string
	if err := json.Unmarshal(raw, &many); err != nil {
		return false
	}
	for _, audience := range many {
		if audience == expected {
			return true
		}
	}
	return false
}

func orDefault(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
