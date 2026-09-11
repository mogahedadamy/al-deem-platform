// Transport — HTTP handlers للكتالوج (عام + تأليف + مراجعة).
package transport

import (
	"encoding/json"
	"net/http"
	"strconv"

	catapp "github.com/al-deem/platform/core-api/internal/catalog/application"
	catdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
	"github.com/al-deem/platform/core-api/internal/platform/middleware"
)

type CatalogHandler struct {
	svc      *catapp.CatalogService
	resolver idports.ActorResolver
}

func NewCatalogHandler(svc *catapp.CatalogService, resolver idports.ActorResolver) *CatalogHandler {
	return &CatalogHandler{svc: svc, resolver: resolver}
}

func (h *CatalogHandler) Register(mux *http.ServeMux) {
	// عام — لا auth
	mux.HandleFunc("GET /v1/public/courses", h.listPublic)
	mux.HandleFunc("GET /v1/public/courses/{slug}", h.getPublic)
	mux.HandleFunc("GET /v1/public/courses/{slug}/outline", h.getOutline)
	mux.HandleFunc("GET /v1/public/categories", h.listCategories)

	// instructor authoring
	mux.HandleFunc("POST /v1/courses", h.auth(h.createCourse))
	mux.HandleFunc("PATCH /v1/courses/{id}", h.auth(h.updateCourse))
	mux.HandleFunc("DELETE /v1/courses/{id}", h.auth(h.deleteCourse))
	mux.HandleFunc("GET /v1/me/courses", h.auth(h.myCourses))
	mux.HandleFunc("GET /v1/courses/{id}/outline", h.auth(h.authoringOutline))
	mux.HandleFunc("POST /v1/courses/{id}/submit", h.auth(h.submit))
	mux.HandleFunc("POST /v1/courses/{id}/sections", h.auth(h.addSection))
	mux.HandleFunc("POST /v1/sections/{sectionId}/lessons", h.auth(h.addLesson))

	// review (erp)
	mux.HandleFunc("GET /v1/review/courses", h.auth(h.listPending))
	mux.HandleFunc("POST /v1/review/courses/{id}/publish", h.auth(h.publish))
	mux.HandleFunc("POST /v1/review/courses/{id}/reject", h.auth(h.reject))
	mux.HandleFunc("POST /v1/review/courses/{id}/archive", h.auth(h.archive))
}

// ===== auth wrapper (نفس نمط identity transport — مكرر مؤقتًا حتى استخراج مشترك) =====

type ctxKey struct{}

func (h *CatalogHandler) auth(next func(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := h.resolver.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			writeCatError(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r.WithContext(middleware.ContextWith(r.Context(), ctxKey{}, actor)), actor)
	}
}

// ===== public =====

func courseOut(c catdom.Course) map[string]any {
	return map[string]any{
		"id": c.ID, "slug": c.Slug, "title": c.Title, "summary": c.Summary,
		"description": c.Description,
		"categoryId":  c.CategoryID, "instructorId": c.InstructorID,
		"status": c.Status, "level": c.Level, "language": c.Language,
		"priceAmount": c.PriceAmount, "currency": c.Currency,
		"durationHours": c.DurationHours, "coverImageUrl": c.CoverImageURL,
		"hasLiveSessions": c.HasLiveSessions, "publishedAt": c.PublishedAt,
	}
}

func (h *CatalogHandler) listPublic(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("pageSize"))
	items, total, err := h.svc.ListPublishedCourses(r.Context(), q.Get("category"), q.Get("level"), q.Get("q"), page, size)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		out = append(out, courseOut(c))
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *CatalogHandler) getPublic(w http.ResponseWriter, r *http.Request) {
	c, err := h.svc.GetPublishedCourse(r.Context(), r.PathValue("slug"))
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	writeCatJSON(w, http.StatusOK, courseOut(*c))
}

func (h *CatalogHandler) getOutline(w http.ResponseWriter, r *http.Request) {
	secs, lessons, err := h.svc.GetCourseOutline(r.Context(), r.PathValue("slug"))
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	type secOut struct {
		ID      string           `json:"id"`
		Title   string           `json:"title"`
		Lessons []map[string]any `json:"lessons"`
	}
	out := make([]secOut, 0, len(secs))
	for _, s := range secs {
		ls := lessons[s.ID]
		lout := make([]map[string]any, 0, len(ls))
		for _, l := range ls {
			lout = append(lout, map[string]any{
				"id": l.ID, "title": l.Title, "type": l.Type,
				"position": l.Position, "isFreePreview": l.IsFreePreview,
				// المحتوى الكامل يُحمى بالـentitlement في R2 — الظاهر هنا عنوان/نوع/مدة فقط
			})
		}
		out = append(out, secOut{ID: s.ID, Title: s.Title, Lessons: lout})
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"sections": out})
}

func (h *CatalogHandler) listCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.svc.ListCategories(r.Context())
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(cats))
	for _, c := range cats {
		out = append(out, map[string]any{"id": c.ID, "slug": c.Slug, "nameAr": c.NameAr, "description": c.Description})
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"items": out})
}

// ===== authoring =====

func (h *CatalogHandler) createCourse(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in catapp.CreateCourseInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<18)).Decode(&in); err != nil {
		writeCatError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	// JSON لا يميّز *string المرسل null — للحقول المطلوبة نفحص يدويًا
	c, err := h.svc.CreateCourse(r.Context(), actor, in)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	writeCatJSON(w, http.StatusCreated, courseOut(*c))
}

func (h *CatalogHandler) updateCourse(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in catapp.UpdateCourseInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<18)).Decode(&in); err != nil {
		writeCatError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	c, err := h.svc.UpdateCourse(r.Context(), actor, r.PathValue("id"), in)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	writeCatJSON(w, http.StatusOK, courseOut(*c))
}

func (h *CatalogHandler) deleteCourse(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if err := h.svc.DeleteCourse(r.Context(), actor, r.PathValue("id")); err != nil {
		writeCatDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CatalogHandler) myCourses(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.MyCourses(r.Context(), actor)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	// المدرب يرى ملاحظات المراجعة على مسوداته (حلقة التغذية الراجعة)
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		m := courseOut(c)
		m["reviewNotes"] = c.ReviewNotes
		out = append(out, m)
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *CatalogHandler) authoringOutline(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	sections, lessons, err := h.svc.GetAuthoringOutline(r.Context(), actor, r.PathValue("id"))
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(sections))
	for _, section := range sections {
		lessonItems := make([]map[string]any, 0, len(lessons[section.ID]))
		for _, lesson := range lessons[section.ID] {
			lessonItems = append(lessonItems, map[string]any{
				"id": lesson.ID, "title": lesson.Title, "type": lesson.Type,
				"position": lesson.Position, "isFreePreview": lesson.IsFreePreview,
			})
		}
		out = append(out, map[string]any{"id": section.ID, "title": section.Title, "position": section.Position, "lessons": lessonItems})
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"sections": out})
}

func (h *CatalogHandler) submit(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if err := h.svc.SubmitForReview(r.Context(), actor, r.PathValue("id")); err != nil {
		writeCatDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CatalogHandler) addSection(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Title    string `json:"title"`
		Position int    `json:"position"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384)).Decode(&in); err != nil || in.Title == "" {
		writeCatError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	sec, err := h.svc.AddSection(r.Context(), actor, r.PathValue("id"), in.Title, in.Position)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	writeCatJSON(w, http.StatusCreated, map[string]any{"id": sec.ID, "courseId": sec.CourseID, "title": sec.Title, "position": sec.Position})
}

func (h *CatalogHandler) addLesson(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in catapp.LessonInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<18)).Decode(&in); err != nil {
		writeCatError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	l, err := h.svc.AddLesson(r.Context(), actor, r.PathValue("sectionId"), in)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	writeCatJSON(w, http.StatusCreated, map[string]any{"id": l.ID, "sectionId": l.SectionID, "type": l.Type, "title": l.Title, "position": l.Position, "isFreePreview": l.IsFreePreview})
}

// ===== review =====

func (h *CatalogHandler) listPending(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("pageSize"))
	items, total, err := h.svc.ListPendingReview(r.Context(), actor, page, size)
	if err != nil {
		writeCatDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		m := courseOut(c)
		m["reviewNotes"] = c.ReviewNotes
		out = append(out, m)
	}
	writeCatJSON(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *CatalogHandler) publish(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if err := h.svc.PublishCourse(r.Context(), actor, r.PathValue("id")); err != nil {
		writeCatDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CatalogHandler) reject(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384)).Decode(&in); err != nil || in.Notes == "" {
		writeCatError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.RejectCourse(r.Context(), actor, r.PathValue("id"), in.Notes); err != nil {
		writeCatDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CatalogHandler) archive(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if err := h.svc.ArchiveCourse(r.Context(), actor, r.PathValue("id")); err != nil {
		writeCatDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== helpers (package-private مشتركة مع identity عبر اسم مختلف) =====

func writeCatJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeCatError(w http.ResponseWriter, de *platform.DomainError, status int) {
	writeCatJSON(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func writeCatDomain(w http.ResponseWriter, err error) {
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
		writeCatError(w, de, status)
		return
	}
	// TransitionError من domain → تعامل كـconflict (state machine)
	writeCatJSON(w, http.StatusConflict, map[string]string{"error": "CONFLICT", "message": err.Error()})
}
