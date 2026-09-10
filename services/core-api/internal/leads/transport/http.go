// Transport — HTTP للاستفسارات.
package transport

import (
	"encoding/json"
	"net/http"

	ldapp "github.com/al-deem/platform/core-api/internal/leads/application"
	lddom "github.com/al-deem/platform/core-api/internal/leads/domain"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type LeadsHandler struct {
	svc      *ldapp.LeadsService
	resolver idports.ActorResolver
}

func NewLeadsHandler(svc *ldapp.LeadsService, resolver idports.ActorResolver) *LeadsHandler {
	return &LeadsHandler{svc: svc, resolver: resolver}
}

func (h *LeadsHandler) Register(mux *http.ServeMux) {
	// عام (www/contact) — بلا جلسة
	mux.HandleFunc("POST /v1/public/leads", h.submit)
	// إدارة (erp)
	mux.HandleFunc("GET /v1/erp/leads", h.auth(h.list))
	mux.HandleFunc("POST /v1/erp/leads/{id}/advance", h.auth(h.advance))
}

func (h *LeadsHandler) auth(next func(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := h.resolver.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			ldWrite(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r, actor)
	}
}

func (h *LeadsHandler) submit(w http.ResponseWriter, r *http.Request) {
	var in ldapp.SubmitInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		ldWrite(w, &platform.DomainError{Code: "VALIDATION", Msg: "طلب غير صالح"}, http.StatusBadRequest)
		return
	}
	l, err := h.svc.Submit(r.Context(), in)
	if err != nil {
		ldDomain(w, err)
		return
	}
	ldJSON(w, http.StatusCreated, map[string]any{"id": l.ID, "status": l.Status})
}

func (h *LeadsHandler) list(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	q := r.URL.Query()
	limit := atoiDefault(q.Get("limit"), 20)
	offset := atoiDefault(q.Get("offset"), 0)
	items, total, err := h.svc.List(r.Context(), actor, q.Get("status"), limit, offset)
	if err != nil {
		ldDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, l := range items {
		out = append(out, leadOut(l))
	}
	ldJSON(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *LeadsHandler) advance(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&in); err != nil || in.Status == "" {
		ldWrite(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	l, err := h.svc.Advance(r.Context(), actor, r.PathValue("id"), lddom.LeadStatus(in.Status), in.Notes)
	if err != nil {
		ldDomain(w, err)
		return
	}
	ldJSON(w, http.StatusOK, leadOut(*l))
}

func leadOut(l lddom.Lead) map[string]any {
	return map[string]any{
		"id": l.ID, "name": l.Name, "email": l.Email, "phone": l.Phone,
		"subject": l.Subject, "message": l.Message, "source": l.Source,
		"status": l.Status, "notes": l.Notes, "createdAt": l.CreatedAt,
	}
}

func atoiDefault(s string, d int) int {
	if s == "" {
		return d
	}
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
	return n
}

func ldJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func ldWrite(w http.ResponseWriter, de *platform.DomainError, status int) {
	ldJSON(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func ldDomain(w http.ResponseWriter, err error) {
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
		ldWrite(w, de, status)
		return
	}
	ldJSON(w, http.StatusInternalServerError, map[string]string{"error": "INTERNAL"})
}
