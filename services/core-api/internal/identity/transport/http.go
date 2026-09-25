// Transport — HTTP handlers لعقد OpenAPI (identity).
package transport

import (
	"context"
	"encoding/json"
	"net/http"

	app "github.com/al-deem/platform/core-api/internal/identity/application"
	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
	"github.com/al-deem/platform/core-api/internal/platform/middleware"
)

type Handler struct {
	svc   *app.IdentityService
	ports ports.ActorResolver
}

func NewHandler(svc *app.IdentityService, resolver ports.ActorResolver) *Handler {
	return &Handler{svc: svc, ports: resolver}
}

// Register — يربط المسارات على mux (R0: /me, /me/profile, /admin/users, /admin/users/{id}/roles).
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /v1/me", h.requireActor(h.getMe))
	mux.HandleFunc("PATCH /v1/me/profile", h.requireActor(h.updateProfile))
	mux.HandleFunc("GET /v1/admin/users", h.requireActor(h.listUsers))
	mux.HandleFunc("GET /v1/admin/users/{id}/roles", h.requireActor(h.getUserRoles))
	mux.HandleFunc("POST /v1/admin/users/{id}/roles", h.requireActor(h.assignRole))
	mux.HandleFunc("DELETE /v1/admin/users/{id}/roles", h.requireActor(h.removeRole))
	mux.HandleFunc("POST /v1/admin/invitations", h.requireActor(h.inviteStaff))
	mux.HandleFunc("GET /v1/admin/audit-logs", h.requireActor(h.listAudit))
}

// ===== middleware: يجلب Actor من Bearer token =====

type actorKey struct{}

func (h *Handler) requireActor(next func(w http.ResponseWriter, r *http.Request, actor *domain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		actor, err := h.ports.Resolve(r.Context(), token)
		if err != nil {
			writeError(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r.WithContext(withActor(r, actor)), actor)
	}
}

func withActor(r *http.Request, a *domain.Actor) context.Context {
	return middleware.ContextWith(r.Context(), actorKey{}, a)
}

// ===== handlers =====

func (h *Handler) getMe(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	writeJSON(w, http.StatusOK, map[string]any{
		"id":        actor.ID,
		"fullName":  actor.FullName,
		"email":     actor.Email,
		"phone":     actor.Phone,
		"avatarUrl": actor.AvatarURL,
		"bio":       actor.Bio,
		"locale":    actor.Locale,
		"status":    actor.Status,
		"roles":     actor.Roles,
	})
}

func (h *Handler) updateProfile(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	var in struct {
		FullName *string `json:"fullName"`
		Phone    *string `json:"phone"`
		Bio      *string `json:"bio"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		writeError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	p, err := h.svc.UpdateOwnProfile(r.Context(), actor, app.UpdateProfileInput{
		FullName: in.FullName, Phone: in.Phone, Bio: in.Bio,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": p.ID, "fullName": p.FullName, "email": p.Email, "phone": p.Phone, "bio": p.Bio,
	})
}

func (h *Handler) inviteStaff(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	var in struct {
		FullName string `json:"fullName"`
		Email    string `json:"email"`
		RoleKey  string `json:"roleKey"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&in); err != nil {
		writeError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	id, err := h.svc.InviteStaff(r.Context(), actor, app.InviteStaffInput{FullName: in.FullName, Email: in.Email, Role: domain.RoleKey(in.RoleKey)})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "message": "أُرسلت دعوة تفعيل الحساب بنجاح"})
}

func (h *Handler) listAudit(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	page := atoiDefault(r.URL.Query().Get("page"), 1)
	size := atoiDefault(r.URL.Query().Get("pageSize"), 25)
	items, total, err := h.svc.ListAudit(r.Context(), actor, page, size)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{"id": item.ID, "actorId": item.ActorID, "actorName": item.ActorName, "action": item.Action, "resourceType": item.ResourceType, "resourceId": item.ResourceID, "createdAt": item.CreatedAt})
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out, "total": total, "page": page, "pageSize": size})
}

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	page := atoiDefault(r.URL.Query().Get("page"), 1)
	size := atoiDefault(r.URL.Query().Get("pageSize"), 20)
	q := r.URL.Query().Get("query")
	items, total, err := h.svc.ListUsers(r.Context(), actor, page, size, q)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	type userOut struct {
		ID       string `json:"id"`
		FullName string `json:"fullName"`
		Email    string `json:"email"`
		Status   string `json:"status"`
	}
	out := make([]userOut, 0, len(items))
	for _, p := range items {
		out = append(out, userOut{ID: p.ID, FullName: p.FullName, Email: p.Email, Status: string(p.Status)})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items": out, "page": page, "pageSize": size, "total": total,
	})
}

func (h *Handler) getUserRoles(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	if !actor.Can(domain.PermManageRoles) {
		writeError(w, platform.ErrForbidden, http.StatusForbidden)
		return
	}
	roles, err := h.svc.GetUserRoles(r.Context(), actor, r.PathValue("id"))
	if err != nil {
		writeDomainError(w, err)
		return
	}
	out := make([]string, 0, len(roles))
	for _, r := range roles {
		out = append(out, string(r))
	}
	writeJSON(w, http.StatusOK, map[string]any{"roles": out})
}

func (h *Handler) assignRole(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	var in struct {
		RoleKey string `json:"roleKey"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in); err != nil {
		writeError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.AssignRole(r.Context(), actor, r.PathValue("id"), domain.RoleKey(in.RoleKey)); err != nil {
		writeDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) removeRole(w http.ResponseWriter, r *http.Request, actor *domain.Actor) {
	role := r.URL.Query().Get("roleKey")
	if role == "" {
		writeError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.RemoveRole(r.Context(), actor, r.PathValue("id"), domain.RoleKey(role)); err != nil {
		writeDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== helpers =====

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, de *platform.DomainError, status int) {
	writeJSON(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func writeDomainError(w http.ResponseWriter, err error) {
	if de, ok := platform.IsDomainError(err); ok {
		status := http.StatusInternalServerError
		switch de.Code {
		case "UNAUTHORIZED":
			status = http.StatusUnauthorized
		case "FORBIDDEN":
			status = http.StatusForbidden
		case "NOT_FOUND":
			status = http.StatusNotFound
		case "VALIDATION":
			status = http.StatusBadRequest
		case "CONFLICT":
			status = http.StatusConflict
		}
		writeError(w, de, status)
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "INTERNAL"})
}

func atoiDefault(s string, d int) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return d
		}
		n = n*10 + int(c-'0')
		if n > 10000 {
			return d
		}
	}
	if s == "" {
		return d
	}
	return n
}
