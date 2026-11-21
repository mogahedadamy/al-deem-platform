// Authentication verifies standard OIDC JWTs locally through JWKS.
// هذا هو النمط الصحيح للإنتاج: لا استدعاء شبكة لكل طلب.
package auth

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
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

type oidcAuth struct {
	issuer     string
	clientID   string
	profiles   ports.ProfileRepository
	identities ports.IdentityRepository
	roles      ports.RoleRepository

	mu         sync.RWMutex
	cachedJWKS *jwksResponse
	fetchedAt  time.Time
	jwksURI    string
}

// New builds a vendor-neutral OIDC actor resolver.
func New(issuer, clientID string, profiles ports.ProfileRepository, identities ports.IdentityRepository, roles ports.RoleRepository) ports.ActorResolver {
	return &oidcAuth{
		issuer:     strings.TrimRight(issuer, "/"),
		clientID:   clientID,
		profiles:   profiles,
		identities: identities,
		roles:      roles,
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
	ClientID          string          `json:"client_id"`
	Aud               json.RawMessage `json:"aud"`
}

// Resolve — Bearer token → Actor (JWKS signature verify + claims + DB roles sync).
func (a *oidcAuth) Resolve(ctx context.Context, bearerToken string) (*domain.Actor, error) {
	token := strings.TrimPrefix(bearerToken, "Bearer ")
	if token == "" || token == bearerToken {
		return nil, platform.ErrUnauthorized
	}

	claims, err := a.verifyToken(ctx, token)
	if err != nil {
		// سبب الرفض لا يحتوي token نفسه، لكنه ضروري لتشخيص issuer/audience
		// أو دوران مفاتيح مزود الهوية في الإنتاج.
		slog.Warn("jwt verification failed", "reason", err)
		return nil, platform.ErrUnauthorized
	}

	profileID, err := a.identities.ResolveIdentity(ctx, claims.Iss, claims.Sub)
	if errors.Is(err, platform.ErrNotFound) {
		if existing, profileErr := a.profiles.GetByID(ctx, claims.Sub); profileErr == nil {
			profileID = existing.ID
			err = a.identities.LinkIdentity(ctx, claims.Iss, claims.Sub, profileID)
		} else {
			profileID, err = a.identities.CreateIdentity(ctx, claims.Iss, claims.Sub, domain.Profile{
				FullName: orDefault(claims.Name, claims.PreferredUsername),
				Email:    claims.Email,
				Locale:   "ar",
				Status:   domain.ProfileActive,
			})
		}
	}
	if err != nil {
		return nil, fmt.Errorf("resolve external identity: %w", err)
	}

	p := domain.Profile{
		ID:       profileID,
		FullName: orDefault(claims.Name, claims.PreferredUsername),
		Email:    claims.Email,
		Locale:   "ar",
		Status:   domain.ProfileActive,
	}
	if err := a.profiles.UpsertFromSSO(ctx, p); err != nil {
		return nil, fmt.Errorf("sync profile: %w", err)
	}

	// roles من DB (مصدر الحقيقة)؛ أول دخول → student
	dbRoles, err := a.roles.GetUserRoles(ctx, profileID)
	if err != nil {
		return nil, fmt.Errorf("load roles: %w", err)
	}
	if len(dbRoles) == 0 {
		if err := a.roles.Assign(ctx, profileID, domain.RoleStudent, profileID); err == nil {
			dbRoles = append(dbRoles, domain.RoleStudent)
		}
	}

	if full, err := a.profiles.GetByID(ctx, profileID); err == nil {
		p = *full
	}
	if p.Status != domain.ProfileActive {
		return nil, platform.ErrForbidden
	}
	return &domain.Actor{Profile: p, Roles: dbRoles}, nil
}

// verifyToken — تفكيك JWT والتحقق من التوقيع بمفتاح JWKS + iss/exp.
func (a *oidcAuth) verifyToken(ctx context.Context, token string) (*tokenClaims, error) {
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
	expectedIssuer := a.issuer
	if claims.Sub == "" || claims.Exp == 0 || time.Now().Unix() >= claims.Exp {
		return nil, fmt.Errorf("token missing subject/expiry or expired")
	}
	if claims.Iss != expectedIssuer {
		return nil, fmt.Errorf("issuer mismatch")
	}
	if err := validateClient(os.Getenv("OIDC_ALLOWED_CLIENTS"), claims.Azp, claims.ClientID); err != nil {
		return nil, err
	}
	// لا يكفي azp وحده: يجب أن يكون الـAPI جمهوره المقصود صراحةً.
	// OIDC_REQUIRED_AUDIENCE يسمح باسم جمهور مستقل إذا تغيّر client ID.
	requiredAudience := envOrDefault("OIDC_REQUIRED_AUDIENCE", a.clientID)
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

// publicKey يجلب ويخزن JWKS لمدة ساعة ويجددها عند دوران مفاتيح المزوّد.
// (إعادة تشغيل/تدوير)، kid الجديد غير موجود في الكاش → إعادة جلب فورية.
// التوكِنات الموقّعة بمفاتيح قديمة مدفونة ستفشل بشكل صحيح (تنتهي صلاحيتها خلال دقائق).
func (a *oidcAuth) publicKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
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
	jwksURI, err := a.discoveryJWKS(ctx)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, jwksURI, nil)
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

func (a *oidcAuth) discoveryJWKS(ctx context.Context) (string, error) {
	if a.jwksURI != "" {
		return a.jwksURI, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.issuer+"/.well-known/openid-configuration", nil)
	if err != nil {
		return "", err
	}
	resp, err := (&http.Client{Timeout: 8 * time.Second}).Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("oidc discovery http %d", resp.StatusCode)
	}
	var metadata struct {
		Issuer  string `json:"issuer"`
		JWKSURI string `json:"jwks_uri"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&metadata); err != nil {
		return "", err
	}
	if strings.TrimRight(metadata.Issuer, "/") != a.issuer || metadata.JWKSURI == "" {
		return "", fmt.Errorf("invalid oidc discovery metadata")
	}
	a.jwksURI = metadata.JWKSURI
	return a.jwksURI, nil
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

// validateClient requires an explicit list of provider-issued OIDC client IDs.
func validateClient(configured, azp, clientID string) error {
	if azp != "" && clientID != "" && azp != clientID {
		return errors.New("conflicting OIDC client claims")
	}
	party := orDefault(azp, clientID)
	matched := false
	for _, entry := range strings.Split(configured, ",") {
		id := strings.TrimSpace(entry)
		if id == "" || strings.ContainsAny(id, "* \t\r\n") {
			return errors.New("invalid OIDC_ALLOWED_CLIENTS setting")
		}
		if party == id {
			matched = true
		}
	}
	if !matched {
		return errors.New("missing or unrecognized authorized party")
	}
	return nil
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
