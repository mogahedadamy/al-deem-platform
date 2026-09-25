// Transport — HTTP للاختبارات والشهادات.
package transport

import (
	"encoding/json"
	"net/http"
	"strconv"

	asmapp "github.com/al-deem/platform/core-api/internal/assessment/application"
	asmdom "github.com/al-deem/platform/core-api/internal/assessment/domain"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
	"github.com/al-deem/platform/core-api/internal/platform/middleware"
)

type AssessmentHandler struct {
	svc      *asmapp.AssessmentService
	resolver idports.ActorResolver
}

func NewAssessmentHandler(svc *asmapp.AssessmentService, resolver idports.ActorResolver) *AssessmentHandler {
	return &AssessmentHandler{svc: svc, resolver: resolver}
}

type asmKey struct{}

func (h *AssessmentHandler) Register(mux *http.ServeMux) {
	// عام — التحقق من شهادة (صفحة تحقق في www)
	mux.HandleFunc("GET /v1/public/certificates/{serial}", h.verify)
	// عام — هل للاختبار وجود لهذه الدورة؟ (meta فقط — الأسئلة بمصادقة)
	mux.HandleFunc("GET /v1/public/courses/{slug}/quiz", h.quizMetaBySlug)

	// student
	mux.HandleFunc("GET /v1/quizzes/{id}", h.auth(h.getQuiz))
	mux.HandleFunc("POST /v1/quizzes/{id}/attempts", h.auth(h.submitAttempt))
	mux.HandleFunc("GET /v1/me/certificates", h.auth(h.myCertificates))
	mux.HandleFunc("POST /v1/me/paper-requests", h.auth(h.requestPaper))
	mux.HandleFunc("GET /v1/me/paper-requests", h.auth(h.myPaperRequests))

	// instructor authoring
	mux.HandleFunc("POST /v1/quizzes", h.auth(h.createQuiz))
	// content review
	mux.HandleFunc("GET /v1/review/courses/{courseId}/quiz", h.auth(h.reviewQuiz))

	// erp: النسخ الورقية
	mux.HandleFunc("GET /v1/erp/paper-requests", h.auth(h.listPapers))
	mux.HandleFunc("POST /v1/erp/paper-requests/{id}/advance", h.auth(h.advancePaper))
}

func (h *AssessmentHandler) auth(next func(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := h.resolver.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			asmErr(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r.WithContext(middleware.ContextWith(r.Context(), asmKey{}, actor)), actor)
	}
}

// ===== عام =====

func (h *AssessmentHandler) verify(w http.ResponseWriter, r *http.Request) {
	c, err := h.svc.VerifyCertificate(r.Context(), r.PathValue("serial"))
	if err != nil {
		asmDomain(w, err)
		return
	}
	asmJSON(w, http.StatusOK, map[string]any{
		"serialNumber": c.SerialNumber,
		"studentName":  c.StudentName,
		"courseTitle":  c.CourseTitle,
		"finalScore":   c.FinalScore,
		"issuedAt":     c.IssuedAt,
		"valid":        true,
	})
}

// quizMetaBySlug — بيانات وصفية فقط: يوجد اختبار؟ عنوانه ودرجة النجاح.
func (h *AssessmentHandler) quizMetaBySlug(w http.ResponseWriter, r *http.Request) {
	quiz, questions, err := h.svc.GetQuizMetaByCourseSlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		asmDomain(w, err)
		return
	}
	asmJSON(w, http.StatusOK, map[string]any{
		"id": quiz.ID, "title": quiz.Title, "passScore": quiz.PassScore,
		"questionCount": len(questions),
	})
}

// ===== student =====

func (h *AssessmentHandler) getQuiz(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	quiz, questions, err := h.svc.GetQuizForStudent(r.Context(), r.PathValue("id"))
	if err != nil {
		asmDomain(w, err)
		return
	}
	// DTO آمن — لا حقل correct أصلًا في الـpayload (cannot leak what doesn't exist)
	type optOut struct {
		Key  string `json:"key"`
		Text string `json:"text"`
	}
	type qOut struct {
		ID       string   `json:"id"`
		Question string   `json:"question"`
		Options  []optOut `json:"options"`
	}
	qs := make([]qOut, len(questions))
	for i, q := range questions {
		opts := make([]optOut, len(q.Options))
		for j, o := range q.Options {
			opts[j] = optOut{Key: o.Key, Text: o.Text}
		}
		qs[i] = qOut{ID: q.ID, Question: q.Question, Options: opts}
	}
	asmJSON(w, http.StatusOK, map[string]any{
		"id": quiz.ID, "title": quiz.Title, "passScore": quiz.PassScore, "questions": qs,
	})
}

func (h *AssessmentHandler) submitAttempt(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		EnrollmentID string            `json:"enrollmentId"`
		Answers      map[string]string `json:"answers"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<18)).Decode(&in); err != nil || in.EnrollmentID == "" {
		asmErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	a, err := h.svc.SubmitAttempt(r.Context(), actor, r.PathValue("id"), in.EnrollmentID, in.Answers)
	if err != nil {
		asmDomain(w, err)
		return
	}
	asmJSON(w, http.StatusCreated, map[string]any{
		"id": a.ID, "score": a.Score, "passed": a.Passed, "certIssued": a.CertIssued,
	})
}

func (h *AssessmentHandler) myCertificates(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.MyCertificates(r.Context(), actor)
	if err != nil {
		asmDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		out = append(out, map[string]any{
			"id": c.ID, "serialNumber": c.SerialNumber, "courseTitle": c.CourseTitle,
			"finalScore": c.FinalScore, "issuedAt": c.IssuedAt,
		})
	}
	asmJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *AssessmentHandler) requestPaper(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		CertificateID string `json:"certificateId"`
		Address       string `json:"deliveryAddress"`
		Phone         string `json:"deliveryPhone"`
		Notes         string `json:"notes"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		asmErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	req, err := h.svc.RequestPaper(r.Context(), actor, in.CertificateID, in.Address, in.Phone, in.Notes)
	if err != nil {
		asmDomain(w, err)
		return
	}
	asmJSON(w, http.StatusCreated, map[string]any{
		"id": req.ID, "status": req.Status, "deliveryAddress": req.DeliveryAddress,
	})
}

func (h *AssessmentHandler) myPaperRequests(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.MyPaperRequests(r.Context(), actor)
	if err != nil {
		asmDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, p := range items {
		out = append(out, map[string]any{"id": p.ID, "status": p.Status, "createdAt": p.CreatedAt})
	}
	asmJSON(w, http.StatusOK, map[string]any{"items": out})
}

// ===== instructor =====

func (h *AssessmentHandler) createQuiz(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in asmapp.QuizInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in); err != nil {
		asmErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	quiz, err := h.svc.CreateQuiz(r.Context(), actor, in)
	if err != nil {
		asmDomain(w, err)
		return
	}
	asmJSON(w, http.StatusCreated, map[string]any{
		"id": quiz.ID, "lessonId": quiz.LessonID, "title": quiz.Title, "passScore": quiz.PassScore,
	})
}

func (h *AssessmentHandler) reviewQuiz(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	quiz, questions, err := h.svc.GetQuizForReview(r.Context(), actor, r.PathValue("courseId"))
	if err != nil {
		asmDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(questions))
	for _, question := range questions {
		options := make([]map[string]any, 0, len(question.Options))
		for _, option := range question.Options {
			options = append(options, map[string]any{"key": option.Key, "text": option.Text, "correct": option.Correct})
		}
		out = append(out, map[string]any{"id": question.ID, "question": question.Question, "position": question.Position, "points": question.Points, "options": options})
	}
	asmJSON(w, http.StatusOK, map[string]any{"id": quiz.ID, "title": quiz.Title, "passScore": quiz.PassScore, "questions": out})
}

// ===== erp =====

func (h *AssessmentHandler) listPapers(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("pageSize"))
	status := asmdom.PaperRequestStatus(q.Get("status"))
	if status == "" {
		status = asmdom.PaperPending
	}
	items, total, err := h.svc.ListPaperRequests(r.Context(), actor, status, page, size)
	if err != nil {
		asmDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, p := range items {
		out = append(out, map[string]any{
			"id": p.ID, "certificateId": p.CertificateID, "status": p.Status,
			"deliveryAddress": p.DeliveryAddress, "deliveryPhone": p.DeliveryPhone,
			"createdAt": p.CreatedAt,
		})
	}
	asmJSON(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *AssessmentHandler) advancePaper(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&in); err != nil || in.Status == "" {
		asmErr(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.AdvancePaper(r.Context(), actor, r.PathValue("id"), asmdom.PaperRequestStatus(in.Status)); err != nil {
		asmDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===== helpers =====

func asmJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func asmErr(w http.ResponseWriter, de *platform.DomainError, status int) {
	asmJSON(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func asmDomain(w http.ResponseWriter, err error) {
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
		asmErr(w, de, status)
		return
	}
	asmJSON(w, http.StatusInternalServerError, map[string]string{"error": "INTERNAL"})
}
