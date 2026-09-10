// Transport — HTTP للحصص المباشرة.
package transport

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	lsapp "github.com/al-deem/platform/core-api/internal/livesessions/application"
	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type LiveSessionsHandler struct {
	svc      *lsapp.LiveSessionsService
	resolver idports.ActorResolver
}

func NewLiveSessionsHandler(svc *lsapp.LiveSessionsService, resolver idports.ActorResolver) *LiveSessionsHandler {
	return &LiveSessionsHandler{svc: svc, resolver: resolver}
}

func (h *LiveSessionsHandler) Register(mux *http.ServeMux) {
	// instructor
	mux.HandleFunc("POST /v1/live-sessions", h.auth(h.schedule))
	mux.HandleFunc("GET /v1/live-sessions/mine", h.auth(h.mySessions))
	mux.HandleFunc("POST /v1/live-sessions/{id}/advance", h.auth(h.advance))

	// student
	mux.HandleFunc("GET /v1/courses/{courseId}/live-sessions", h.auth(h.listForStudent))
	mux.HandleFunc("POST /v1/live-sessions/{id}/join", h.auth(h.join))

	// Zoom webhook — عام بلا جلسة (يتحقق بالتوقيع)
	mux.HandleFunc("POST /v1/webhooks/zoom", h.zoomWebhook)
}

func (h *LiveSessionsHandler) auth(next func(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := h.resolver.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			lsErr(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r, actor)
	}
}

// ===== instructor =====

func (h *LiveSessionsHandler) schedule(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in lsapp.ScheduleInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		lsErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	// startsAt ISO 8601
	if in.StartsAt.IsZero() {
		lsErr(w, &platform.DomainError{Code: "VALIDATION", Msg: "startsAt مطلوب (ISO 8601)"}, http.StatusBadRequest)
		return
	}
	ses, err := h.svc.Schedule(r.Context(), actor, in)
	if err != nil {
		lsDomain(w, err)
		return
	}
	lsJSON(w, http.StatusCreated, map[string]any{
		"id": ses.ID, "courseId": ses.CourseID, "title": ses.Title,
		"status": ses.Status, "startsAt": ses.StartsAt, "durationMin": ses.DurationMin,
		"timezone": ses.Timezone,
	})
}

func (h *LiveSessionsHandler) mySessions(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.ListForInstructor(r.Context(), actor)
	if err != nil {
		lsDomain(w, err)
		return
	}
	lsJSON(w, http.StatusOK, map[string]any{"items": sessionList(items)})
}

func (h *LiveSessionsHandler) advance(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&in); err != nil || in.Status == "" {
		lsErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.AdvanceStatus(r.Context(), actor, r.PathValue("id"), lsdom.Status(in.Status)); err != nil {
		lsDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== student =====

func (h *LiveSessionsHandler) listForStudent(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.ListForStudent(r.Context(), actor, r.PathValue("courseId"))
	if err != nil {
		lsDomain(w, err)
		return
	}
	lsJSON(w, http.StatusOK, map[string]any{"items": sessionList(items)})
}

func (h *LiveSessionsHandler) join(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	ses, err := h.svc.Join(r.Context(), actor, r.PathValue("id"))
	if err != nil {
		lsDomain(w, err)
		return
	}
	out := map[string]any{
		"sessionId": ses.ID, "title": ses.Title, "status": ses.Status,
		"joined": true,
	}
	if ses.ZoomJoinURL != "" {
		out["joinUrl"] = ses.ZoomJoinURL
	}
	lsJSON(w, http.StatusOK, out)
}

// ===== Zoom webhook =====

// zoomWebhook — يتلقى أحداث Zoom. التحقق: HMAC-SHA256 secret (ZOOM_WEBHOOK_SECRET).
// idempotent بـevent id (يُخزن قبل المعالجة).
func (h *LiveSessionsHandler) zoomWebhook(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("ZOOM_WEBHOOK_SECRET")
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if secret != "" {
		sig := r.Header.Get("x-zm-signature")
		ts := r.Header.Get("x-zm-request-timestamp")
		if !verifyZoomSignature(secret, sig, ts, body) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
	}
	var ev struct {
		Event string `json:"event"`
		Payload struct {
			MeetingID string `json:"id"`
			Object    struct {
				ID string `json:"id"`
			} `json:"object"`
		} `json:"payload"`
		UID string `json:"event_id"` // Zoom unique event id
	}
	if err := json.Unmarshal(body, &ev); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	meetingID := ev.Payload.MeetingID
	if meetingID == "" {
		meetingID = ev.Payload.Object.ID
	}
	eventID := ev.UID
	if eventID == "" {
		eventID = ev.Event + "-" + meetingID + "-" + time.Now().Format("150405")
	}
	e := &lsdom.WebhookEvent{
		ZoomEventID: eventID,
		EventType:   ev.Event,
		MeetingID:   meetingID,
		Payload:     body,
	}
	if err := h.svc.HandleWebhook(r.Context(), e); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// verifyZoomSignature — HMAC v2: hex(hmac_sha256(secret, timestamp + "." + body))
func verifyZoomSignature(secret, signature, timestamp string, body []byte) bool {
	if signature == "" || timestamp == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(body)
	expected := "v0=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// ===== helpers =====

func sessionList(items []lsdom.LiveSession) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, s := range items {
		m := map[string]any{
			"id": s.ID, "courseId": s.CourseID, "title": s.Title,
			"status": s.Status, "startsAt": s.StartsAt,
			"durationMin": s.DurationMin, "timezone": s.Timezone,
			"joinWindowMin": s.JoinWindowMin,
		}
		if s.ZoomJoinURL != "" {
			m["joinUrl"] = s.ZoomJoinURL
		}
		if s.RecordingURL != "" {
			m["recordingUrl"] = s.RecordingURL
		}
		out = append(out, m)
	}
	return out
}

func lsJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func lsErr(w http.ResponseWriter, de *platform.DomainError, status int) {
	lsJSON(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func lsDomain(w http.ResponseWriter, err error) {
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
		lsErr(w, de, status)
		return
	}
	lsJSON(w, http.StatusInternalServerError, map[string]string{"error": "INTERNAL"})
}
