// Application — Use Cases التسجيل والدفع: قرارات مالية خادمية ذرية مع audit.
package application

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	endom "github.com/al-deem/platform/core-api/internal/enrollment/domain"
	"github.com/al-deem/platform/core-api/internal/enrollment/ports"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type EnrollmentService struct {
	enrollments ports.EnrollmentRepository
	payments    ports.PaymentRepository
	audit       idports.AuditLogger
	// courseGetter — نحتاج فقط قراءة الدورة (منع استيراد كامل catalog module)
	coursePublished func(ctx context.Context, courseID string) (published bool, ready bool, price float64, currency string, err error)
}

func NewEnrollmentService(
	e ports.EnrollmentRepository,
	p ports.PaymentRepository,
	a idports.AuditLogger,
	coursePublished func(ctx context.Context, courseID string) (bool, bool, float64, string, error),
) *EnrollmentService {
	return &EnrollmentService{enrollments: e, payments: p, audit: a, coursePublished: coursePublished}
}

func (s *EnrollmentService) AuditReceiptUploaded(ctx context.Context, actor *iddomain.Actor, receiptID string, size int, mimeType string) error {
	return s.audit.Log(ctx, actor.ID, "payment.receipt_uploaded", "receipt", receiptID, nil,
		map[string]any{"size": size, "mimeType": mimeType})
}

// ===== Student flow =====

// Enroll — طالب يسجل دورة منشورة (idempotent: لو مسجل بالفعل نرجع تسجيله).
func (s *EnrollmentService) Enroll(ctx context.Context, actor *iddomain.Actor, courseID string) (*endom.Enrollment, error) {
	published, ready, price, currency, err := s.coursePublished(ctx, courseID)
	if err != nil {
		return nil, err
	}
	if !published {
		return nil, platform.ErrNotFound // لا نكشف عن مسودات غيره
	}
	if !ready {
		return nil, &platform.DomainError{Code: "CONFLICT", Msg: "الدورة غير جاهزة للتسجيل بعد"}
	}
	// تسجيل موجود بالفعل؟
	if existing, err := s.enrollments.FindByStudentCourse(ctx, actor.ID, courseID); err == nil && existing != nil {
		if existing.Status == endom.EnrollmentActive || existing.Status == endom.EnrollmentPendingPayment {
			return existing, nil // idempotent
		}
	}
	status := endom.EnrollmentPendingPayment
	if price == 0 {
		status = endom.EnrollmentActive
	}
	e := &endom.Enrollment{
		StudentID:   actor.ID,
		CourseID:    courseID,
		Status:      status,
		PriceAmount: price, // snapshot وقت التسجيل
		Currency:    currency,
	}
	if err := s.enrollments.Create(ctx, e); err != nil {
		// قيد EXCLUDE: تسجيل نشط موجود → أرجعه (idempotent عبر DB constraint)
		if existing, err2 := s.enrollments.FindByStudentCourse(ctx, actor.ID, courseID); err2 == nil && existing != nil {
			return existing, nil
		}
		return nil, fmt.Errorf("enroll: %w", err)
	}
	_ = s.audit.Log(ctx, actor.ID, "enrollment.created", "enrollment", e.ID, nil,
		map[string]any{"courseId": courseID, "price": price, "currency": currency})
	return e, nil
}

// SubmitPayment — الطالب يرفع إيصال التحويل البنكي (قرار #9).
func (s *EnrollmentService) SubmitPayment(ctx context.Context, actor *iddomain.Actor, enrollmentID, receiptURL, bankRef string) (*endom.PaymentRequest, error) {
	e, err := s.enrollments.GetByID(ctx, enrollmentID)
	if err != nil {
		return nil, err
	}
	if e.StudentID != actor.ID {
		return nil, platform.ErrForbidden // لا تسجيل بدفع غير صاحبه (IDOR)
	}
	// Blueprint 8.4: الدفع فقط للتسجيل بانتظار الدفع — لا دفع على active/completed/cancelled
	if e.Status != endom.EnrollmentPendingPayment {
		return nil, &platform.DomainError{Code: "CONFLICT", Msg: "التسجيل ليس بانتظار الدفع"}
	}
	parsedReceipt, parseErr := url.ParseRequestURI(strings.TrimSpace(receiptURL))
	// الإيصالات ملفات خاصة تُرفع عبر POST /v1/me/receipts. لا نقبل URL
	// خارجيًا يختاره المستخدم حتى لا نُدخل رابطاً غير موثوق إلى واجهة المالية.
	validPrivate := parseErr == nil && parsedReceipt.Scheme == "receipt" && parsedReceipt.Host != "" && parsedReceipt.Path == ""
	if !validPrivate {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "ارفع الإيصال الخاص أولاً ثم استخدم مرجعه"}
	}
	// لا ننشئ أكثر من طلب مفتوح لنفس التسجيل؛ إعادة الإرسال idempotent.
	existingPayments, err := s.payments.ListByStudent(ctx, actor.ID)
	if err != nil {
		return nil, err
	}
	for i := range existingPayments {
		p := &existingPayments[i]
		if p.EnrollmentID == enrollmentID && (p.Status == endom.PaymentSubmitted || p.Status == endom.PaymentUnderReview) {
			return p, nil
		}
	}
	p := &endom.PaymentRequest{
		EnrollmentID: enrollmentID,
		StudentID:    actor.ID,
		Method:       "bank_transfer",
		Amount:       e.PriceAmount,
		Currency:     e.Currency,
		Status:       endom.PaymentSubmitted,
		ReceiptURL:   receiptURL,
	}
	if bankRef != "" {
		p.BankReference = &bankRef
	}
	if err := s.payments.Create(ctx, p); err != nil {
		// القيد الجزئي في DB هو الحماية النهائية من طلبي دفع متزامنين. إذا
		// سبق طلب آخر الفحص الأولي مباشرة، نعيد الطلب الفائز بصورة idempotent
		// بدلاً من تحويل سباق طبيعي إلى 500 للطالب.
		if payments, listErr := s.payments.ListByStudent(ctx, actor.ID); listErr == nil {
			for i := range payments {
				existing := &payments[i]
				if existing.EnrollmentID == enrollmentID && (existing.Status == endom.PaymentSubmitted || existing.Status == endom.PaymentUnderReview) {
					return existing, nil
				}
			}
		}
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "payment.submitted", "payment", p.ID, nil,
		map[string]any{"enrollmentId": enrollmentID, "amount": e.PriceAmount})
	return p, nil
}

// MyEnrollments — تسجيلات الطالب نفسه فقط.
func (s *EnrollmentService) MyEnrollments(ctx context.Context, actor *iddomain.Actor) ([]endom.Enrollment, error) {
	return s.enrollments.ListByStudent(ctx, actor.ID)
}

// MyPayments — دفعات الطالب.
func (s *EnrollmentService) MyPayments(ctx context.Context, actor *iddomain.Actor) ([]endom.PaymentRequest, error) {
	return s.payments.ListByStudent(ctx, actor.ID)
}

// ===== Finance officer flow (قرار #6: مخصص 24/7) =====

// ListPaymentsForReview — قائمة انتظار الموظف المالي (submitted فقط).
func (s *EnrollmentService) ListPaymentsForReview(ctx context.Context, actor *iddomain.Actor, page, pageSize int) ([]endom.PaymentRequest, int, error) {
	if !actor.Can(iddomain.PermReviewPayment) && !actor.Can(iddomain.PermApprovePayment) {
		return nil, 0, platform.ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.payments.ListByStatus(ctx, endom.PaymentSubmitted, page, pageSize)
}

// ApprovePayment — الاعتماد يفعّل التسجيل **ذريًا** مع تغيير حالة الدفع.
// (قرار مالي — لا يجوز فصل المعاملة: دفع معتمد بلا تسجيل مفعّل = كارثة)
func (s *EnrollmentService) ApprovePayment(ctx context.Context, actor *iddomain.Actor, paymentID string) error {
	if !actor.Can(iddomain.PermApprovePayment) {
		return platform.ErrForbidden
	}
	p, err := s.payments.GetByID(ctx, paymentID)
	if err != nil {
		return err
	}
	if p.Status != endom.PaymentSubmitted && p.Status != endom.PaymentUnderReview {
		return platform.ErrConflict
	}
	// معاملة ذرية: دفع approved + تسجيل active معًا
	if err := s.enrollments.ActivateWithPaymentApproval(ctx, p.EnrollmentID, paymentID, actor.ID); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "payment.approved", "payment", paymentID,
		map[string]any{"status": string(p.Status)},
		map[string]any{"status": "approved", "enrollmentId": p.EnrollmentID})
}

// RejectPayment — رفض مع سبب إلزامي — الطالب يعيد الرفع.
func (s *EnrollmentService) RejectPayment(ctx context.Context, actor *iddomain.Actor, paymentID, reason string) error {
	if !actor.Can(iddomain.PermApprovePayment) {
		return platform.ErrForbidden
	}
	if reason == "" {
		return platform.ErrValidation
	}
	p, err := s.payments.GetByID(ctx, paymentID)
	if err != nil {
		return err
	}
	if p.Status != endom.PaymentSubmitted && p.Status != endom.PaymentUnderReview {
		return platform.ErrConflict
	}
	if err := s.payments.UpdateStatusReviewed(ctx, paymentID, endom.PaymentRejected, &actor.ID, &reason); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "payment.rejected", "payment", paymentID,
		map[string]any{"status": string(p.Status)},
		map[string]any{"status": "rejected", "reason": reason})
}

// GetStats — أرقام حية للتقارير.
func (s *EnrollmentService) GetStats(ctx context.Context) (map[string]any, error) {
	return s.enrollments.GetStats(ctx)
}

// ===== Lesson viewing (entitlement خادمي) =====

// lessonContent — يقرأ محتوى الدرس (عبر closure من catalog module)
// lessonContent func(ctx, lessonID) (courseID, type, title, content, videoURL, err)

// GetCourseContent — طالب نشط فقط: دروس الدورة كاملة (فيديو/نص) + حالة المشاهدة.
func (s *EnrollmentService) GetCourseContent(ctx context.Context, actor *iddomain.Actor, enrollmentID, courseID string) ([]endom.LessonProgress, error) {
	e, err := s.enrollments.GetByID(ctx, enrollmentID)
	if err != nil {
		return nil, err
	}
	if e.StudentID != actor.ID || e.CourseID != courseID {
		return nil, platform.ErrForbidden
	}
	if e.Status != endom.EnrollmentActive && e.Status != endom.EnrollmentCompleted {
		return nil, platform.ErrForbidden // entitlement: مدفوع ومفعّل فقط
	}
	return s.enrollments.ListCourseProgress(ctx, enrollmentID, courseID)
}

// GetLessonContent — محتوى درس واحد للطالب النشط. القراءة وحدها لا تعني إكمال الدرس.
func (s *EnrollmentService) GetLessonContent(ctx context.Context, actor *iddomain.Actor, enrollmentID, lessonID string, lessonLookup func(ctx context.Context, lessonID string) (courseID string, ltype, title, content, videoURL string, err error)) (*endom.LessonProgress, string, string, string, error) {
	e, err := s.authorizeLesson(ctx, actor, enrollmentID)
	if err != nil {
		return nil, "", "", "", err
	}
	courseID, ltype, title, content, videoURL, err := lessonLookup(ctx, lessonID)
	if err != nil {
		return nil, "", "", "", err
	}
	if courseID != e.CourseID {
		return nil, "", "", "", platform.ErrForbidden
	}
	lp := &endom.LessonProgress{LessonID: lessonID, LessonTitle: title, LessonType: ltype}
	return lp, content, videoURL, "", nil
}

// CompleteLesson — يسجل الإكمال صراحة بعد انتهاء الفيديو أو تأكيد قراءة النص.
func (s *EnrollmentService) CompleteLesson(ctx context.Context, actor *iddomain.Actor, enrollmentID, lessonID string, lessonLookup func(ctx context.Context, lessonID string) (courseID string, ltype, title, content, videoURL string, err error)) (int, error) {
	e, err := s.authorizeLesson(ctx, actor, enrollmentID)
	if err != nil {
		return 0, err
	}
	courseID, _, _, _, _, err := lessonLookup(ctx, lessonID)
	if err != nil {
		return 0, err
	}
	if courseID != e.CourseID {
		return 0, platform.ErrForbidden
	}
	newPct, err := s.enrollments.MarkLessonViewed(ctx, enrollmentID, lessonID, actor.ID, e.CourseID)
	if err != nil {
		return 0, err
	}
	_ = s.audit.Log(ctx, actor.ID, "lesson.completed", "lesson", lessonID, nil,
		map[string]any{"enrollmentId": enrollmentID, "progressPct": newPct})
	return newPct, nil
}

func (s *EnrollmentService) authorizeLesson(ctx context.Context, actor *iddomain.Actor, enrollmentID string) (*endom.Enrollment, error) {
	e, err := s.enrollments.GetByID(ctx, enrollmentID)
	if err != nil {
		return nil, err
	}
	if e.StudentID != actor.ID {
		return nil, platform.ErrForbidden
	}
	if e.Status != endom.EnrollmentActive && e.Status != endom.EnrollmentCompleted {
		return nil, platform.ErrForbidden
	}
	return e, nil
}

// ===== helpers =====

var _ = time.Now // زمني للاستخدام لاحقًا عند التفعيل التلقائي
