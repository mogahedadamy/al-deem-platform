// Transport — HTTP للتسجيل والدفع (طالب + موظف مالي).
package transport

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	enapp "github.com/al-deem/platform/core-api/internal/enrollment/application"
	endom "github.com/al-deem/platform/core-api/internal/enrollment/domain"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
	"github.com/al-deem/platform/core-api/internal/platform/middleware"
)

type EnrollmentHandler struct {
	svc      *enapp.EnrollmentService
	resolver idports.ActorResolver
	// lessonLookup — يقرأ بيانات الدرس من catalog module (course_id, type, title, content, video_url)
	lessonLookup func(ctx context.Context, lessonID string) (string, string, string, string, string, error)
}

func NewEnrollmentHandler(svc *enapp.EnrollmentService, resolver idports.ActorResolver,
	lessonLookup func(ctx context.Context, lessonID string) (string, string, string, string, string, error)) *EnrollmentHandler {
	return &EnrollmentHandler{svc: svc, resolver: resolver, lessonLookup: lessonLookup}
}

type enCtxKey struct{}

func (h *EnrollmentHandler) Register(mux *http.ServeMux) {
	// student
	mux.HandleFunc("POST /v1/enrollments", h.auth(h.enroll))
	mux.HandleFunc("GET /v1/me/enrollments", h.auth(h.myEnrollments))
	mux.HandleFunc("GET /v1/me/payments", h.auth(h.myPayments))
	mux.HandleFunc("POST /v1/enrollments/{id}/payment", h.auth(h.submitPayment))
	mux.HandleFunc("POST /v1/me/receipts", h.auth(h.uploadReceipt))

	// erp stats (التقارير الأولية)
	mux.HandleFunc("GET /v1/erp/stats", h.auth(h.stats))

	// lesson viewing (entitlement)
	mux.HandleFunc("GET /v1/me/enrollments/{id}/lessons", h.auth(h.courseLessons))
	mux.HandleFunc("GET /v1/me/enrollments/{id}/lessons/{lessonId}", h.auth(h.viewLesson))
	mux.HandleFunc("POST /v1/me/enrollments/{id}/lessons/{lessonId}/complete", h.auth(h.completeLesson))

	// finance officer (قرار #6)
	mux.HandleFunc("GET /v1/finance/payments", h.auth(h.listForReview))
	mux.HandleFunc("GET /v1/finance/receipts/{id}", h.auth(h.downloadReceipt))
	mux.HandleFunc("POST /v1/finance/payments/{id}/approve", h.auth(h.approve))
	mux.HandleFunc("POST /v1/finance/payments/{id}/reject", h.auth(h.reject))
}

func (h *EnrollmentHandler) auth(next func(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := h.resolver.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			enWriteError(w, platform.ErrUnauthorized, http.StatusUnauthorized)
			return
		}
		next(w, r.WithContext(middleware.ContextWith(r.Context(), enCtxKey{}, actor)), actor)
	}
}

// ===== student =====

func enrollmentOut(e endom.Enrollment) map[string]any {
	return map[string]any{
		"id": e.ID, "courseId": e.CourseID, "status": e.Status,
		"priceAmount": e.PriceAmount, "currency": e.Currency,
		"progressPct": e.ProgressPct, "startedAt": e.StartedAt, "completedAt": e.CompletedAt,
		"courseTitle": e.CourseTitle, "courseSlug": e.CourseSlug,
		"createdAt": e.CreatedAt,
	}
}

func (h *EnrollmentHandler) enroll(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		CourseID string `json:"courseId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&in); err != nil || in.CourseID == "" {
		enWriteError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	e, err := h.svc.Enroll(r.Context(), actor, in.CourseID)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	writeEn(w, http.StatusCreated, enrollmentOut(*e))
}

func (h *EnrollmentHandler) myEnrollments(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.MyEnrollments(r.Context(), actor)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, e := range items {
		out = append(out, enrollmentOut(e))
	}
	writeEn(w, http.StatusOK, map[string]any{"items": out})
}

func (h *EnrollmentHandler) myPayments(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	items, err := h.svc.MyPayments(r.Context(), actor)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, p := range items {
		out = append(out, paymentOut(p))
	}
	writeEn(w, http.StatusOK, map[string]any{"items": out})
}

func paymentOut(p endom.PaymentRequest) map[string]any {
	return map[string]any{
		"id": p.ID, "enrollmentId": p.EnrollmentID, "method": p.Method,
		"amount": p.Amount, "currency": p.Currency, "status": p.Status,
		"receiptUrl": p.ReceiptURL, "bankReference": p.BankReference,
		"rejectionReason": p.RejectionReason, "createdAt": p.CreatedAt,
	}
}

func (h *EnrollmentHandler) submitPayment(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		ReceiptURL string `json:"receiptUrl"`
		BankRef    string `json:"bankReference"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil {
		enWriteError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	p, err := h.svc.SubmitPayment(r.Context(), actor, r.PathValue("id"), in.ReceiptURL, in.BankRef)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	writeEn(w, http.StatusCreated, paymentOut(*p))
}

const maxReceiptSize = 5 << 20

func receiptStorageDir() string {
	if dir := os.Getenv("PRIVATE_STORAGE_DIR"); dir != "" {
		return filepath.Join(dir, "receipts")
	}
	return "/var/lib/deem/private/receipts"
}

func (h *EnrollmentHandler) uploadReceipt(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	r.Body = http.MaxBytesReader(w, r.Body, maxReceiptSize+(1<<20))
	file, _, err := r.FormFile("receipt")
	if err != nil {
		enWriteError(w, &platform.DomainError{Code: "VALIDATION", Msg: "ملف الإيصال مطلوب"}, http.StatusBadRequest)
		return
	}
	defer func() { _ = file.Close() }()
	data, err := io.ReadAll(io.LimitReader(file, maxReceiptSize+1))
	if err != nil || len(data) == 0 || len(data) > maxReceiptSize {
		enWriteError(w, &platform.DomainError{Code: "VALIDATION", Msg: "حجم الإيصال يجب ألا يتجاوز 5MB"}, http.StatusBadRequest)
		return
	}
	mimeType := http.DetectContentType(data)
	extensions := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "application/pdf": ".pdf"}
	extension, allowed := extensions[mimeType]
	if !allowed {
		enWriteError(w, &platform.DomainError{Code: "VALIDATION", Msg: "الصيغ المسموحة PNG وJPG وPDF"}, http.StatusBadRequest)
		return
	}
	random := make([]byte, 24)
	if _, err := rand.Read(random); err != nil {
		enWriteDomain(w, err)
		return
	}
	id := hex.EncodeToString(random) + extension
	dir := receiptStorageDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		enWriteDomain(w, err)
		return
	}
	if err := os.WriteFile(filepath.Join(dir, id), data, 0600); err != nil {
		enWriteDomain(w, err)
		return
	}
	_ = h.svc.AuditReceiptUploaded(r.Context(), actor, id, len(data), mimeType)
	writeEn(w, http.StatusCreated, map[string]any{"receiptRef": "receipt://" + id})
}

func (h *EnrollmentHandler) downloadReceipt(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if !actor.Can(iddomain.PermReviewPayment) && !actor.Can(iddomain.PermApprovePayment) && !actor.Can(iddomain.PermViewErpFinance) {
		enWriteError(w, platform.ErrForbidden, http.StatusForbidden)
		return
	}
	id := r.PathValue("id")
	if id == "" || id != filepath.Base(id) || strings.ContainsAny(id, `/\\`) {
		enWriteError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	path := filepath.Join(receiptStorageDir(), id)
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		enWriteError(w, platform.ErrNotFound, http.StatusNotFound)
		return
	}
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	defer func() { _ = file.Close() }()
	w.Header().Set("Content-Disposition", `inline; filename="receipt"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, "receipt", time.Time{}, file)
}

// ===== finance officer =====

func (h *EnrollmentHandler) listForReview(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("pageSize"))
	items, total, err := h.svc.ListPaymentsForReview(r.Context(), actor, page, size)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, p := range items {
		out = append(out, paymentOut(p))
	}
	writeEn(w, http.StatusOK, map[string]any{"items": out, "total": total})
}

func (h *EnrollmentHandler) approve(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if err := h.svc.ApprovePayment(r.Context(), actor, r.PathValue("id")); err != nil {
		enWriteDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *EnrollmentHandler) reject(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	var in struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192)).Decode(&in); err != nil || in.Reason == "" {
		enWriteError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	if err := h.svc.RejectPayment(r.Context(), actor, r.PathValue("id"), in.Reason); err != nil {
		enWriteDomain(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// stats — أرقام حية للإدارة (erp_staff/manager + system_admin).
func (h *EnrollmentHandler) stats(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	if !actor.HasRole(iddomain.RoleErpStaff) && !actor.HasRole(iddomain.RoleErpManager) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		enWriteError(w, platform.ErrForbidden, http.StatusForbidden)
		return
	}
	s, err := h.svc.GetStats(r.Context())
	if err != nil {
		slog.Error("stats failed", "err", err)
		enWriteDomain(w, err)
		return
	}
	writeEn(w, http.StatusOK, s)
}

// ===== lesson viewing (طالب نشط فقط) =====

func (h *EnrollmentHandler) courseLessons(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	enrollmentID := r.PathValue("id")
	courseID := r.URL.Query().Get("courseId")
	if courseID == "" {
		enWriteError(w, platform.ErrValidation, http.StatusBadRequest)
		return
	}
	items, err := h.svc.GetCourseContent(r.Context(), actor, enrollmentID, courseID)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, lp := range items {
		out = append(out, map[string]any{
			"lessonId": lp.LessonID, "title": lp.LessonTitle,
			"type": lp.LessonType, "viewed": lp.Viewed,
		})
	}
	writeEn(w, http.StatusOK, map[string]any{"lessons": out})
}

func (h *EnrollmentHandler) viewLesson(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	lp, content, videoURL, _, err := h.svc.GetLessonContent(
		r.Context(), actor, r.PathValue("id"), r.PathValue("lessonId"), h.lessonLookup)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	writeEn(w, http.StatusOK, map[string]any{
		"lessonId": lp.LessonID, "title": lp.LessonTitle, "type": lp.LessonType,
		"content": content, "videoUrl": videoURL,
	})
}

func (h *EnrollmentHandler) completeLesson(w http.ResponseWriter, r *http.Request, actor *iddomain.Actor) {
	pct, err := h.svc.CompleteLesson(
		r.Context(), actor, r.PathValue("id"), r.PathValue("lessonId"), h.lessonLookup)
	if err != nil {
		enWriteDomain(w, err)
		return
	}
	writeEn(w, http.StatusOK, map[string]any{"progressPct": pct})
}

// ===== helpers =====

func writeEn(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func enWriteError(w http.ResponseWriter, de *platform.DomainError, status int) {
	writeEn(w, status, map[string]string{"error": de.Code, "message": de.Msg})
}

func enWriteDomain(w http.ResponseWriter, err error) {
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
		enWriteError(w, de, status)
		return
	}
	writeEn(w, http.StatusInternalServerError, map[string]string{"error": "INTERNAL"})
}
