// Application — Use Cases التسجيل والدفع: قرارات مالية خادمية ذرية مع audit.
package application

import (
	"context"
	"fmt"
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
	coursePublished func(ctx context.Context, courseID string) (published bool, price float64, currency string, err error)
}

func NewEnrollmentService(
	e ports.EnrollmentRepository,
	p ports.PaymentRepository,
	a idports.AuditLogger,
	coursePublished func(ctx context.Context, courseID string) (bool, float64, string, error),
) *EnrollmentService {
	return &EnrollmentService{enrollments: e, payments: p, audit: a, coursePublished: coursePublished}
}

// ===== Student flow =====

// Enroll — طالب يسجل دورة منشورة (idempotent: لو مسجل بالفعل نرجع تسجيله).
func (s *EnrollmentService) Enroll(ctx context.Context, actor *iddomain.Actor, courseID string) (*endom.Enrollment, error) {
	published, price, currency, err := s.coursePublished(ctx, courseID)
	if err != nil {
		return nil, err
	}
	if !published {
		return nil, platform.ErrNotFound // لا نكشف عن مسودات غيره
	}
	// تسجيل موجود بالفعل؟
	if existing, err := s.enrollments.FindByStudentCourse(ctx, actor.ID, courseID); err == nil && existing != nil {
		if existing.Status == endom.EnrollmentActive || existing.Status == endom.EnrollmentPendingPayment {
			return existing, nil // idempotent
		}
	}
	e := &endom.Enrollment{
		StudentID:   actor.ID,
		CourseID:    courseID,
		Status:      endom.EnrollmentPendingPayment,
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
		return nil, platform.ErrForbidden // لا تسجيل بدفع غير صاحبه
	}
	if receiptURL == "" {
		return nil, platform.ErrValidation
	}
	p := &endom.PaymentRequest{
		EnrollmentID: enrollmentID,
		StudentID:    actor.ID,
		Method:       "bank_transfer",
		Amount:       e.PriceAmount,
		Currency:     e.Currency,
		Status:       endom.PaymentSubmitted,
		ReceiptURL:  receiptURL,
	}
	if bankRef != "" {
		p.BankReference = &bankRef
	}
	if err := s.payments.Create(ctx, p); err != nil {
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

// GetLessonContent — محتوى درس واحد (فيديو URL أو نص) للطالب النشط.
func (s *EnrollmentService) GetLessonContent(ctx context.Context, actor *iddomain.Actor, enrollmentID, lessonID string, lessonLookup func(ctx context.Context, lessonID string) (courseID string, ltype, title, content, videoURL string, err error)) (*endom.LessonProgress, string, string, string, error) {
	e, err := s.enrollments.GetByID(ctx, enrollmentID)
	if err != nil {
		return nil, "", "", "", err
	}
	if e.StudentID != actor.ID {
		return nil, "", "", "", platform.ErrForbidden
	}
	if e.Status != endom.EnrollmentActive && e.Status != endom.EnrollmentCompleted {
		return nil, "", "", "", platform.ErrForbidden
	}
	courseID, ltype, title, content, videoURL, err := lessonLookup(ctx, lessonID)
	if err != nil {
		return nil, "", "", "", err
	}
	if courseID != e.CourseID {
		return nil, "", "", "", platform.ErrForbidden // درس من دورة أخرى
	}
	// تسجيل المشاهدة + تحديث التقدم
	newPct, err := s.enrollments.MarkLessonViewed(ctx, enrollmentID, lessonID, actor.ID, e.CourseID)
	if err != nil {
		return nil, "", "", "", err
	}
	_ = s.audit.Log(ctx, actor.ID, "lesson.viewed", "lesson", lessonID, nil,
		map[string]any{"enrollmentId": enrollmentID, "progressPct": newPct})
	lp := &endom.LessonProgress{LessonID: lessonID, LessonTitle: title, LessonType: ltype, Viewed: true}
	return lp, content, videoURL, "", nil
}

// ===== helpers =====

var _ = time.Now // زمني للاستخدام لاحقًا عند التفعيل التلقائي
