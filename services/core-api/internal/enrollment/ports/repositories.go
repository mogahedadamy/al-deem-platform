// Ports — interfaces التسجيل والدفع.
package ports

import (
	"context"

	endom "github.com/al-deem/platform/core-api/internal/enrollment/domain"
)

type EnrollmentRepository interface {
	Create(ctx context.Context, e *endom.Enrollment) error
	GetByID(ctx context.Context, id string) (*endom.Enrollment, error)
	// GetByStudentCourse — لفحص التسجيل الموجود (منع التكرار)
	FindByStudentCourse(ctx context.Context, studentID, courseID string) (*endom.Enrollment, error)
	ListByStudent(ctx context.Context, studentID string) ([]endom.Enrollment, error)
	// ActivateInTx — تفعيل التسجيل + الموافقة على الدفع ذريًا (نفس المعاملة)
	ActivateWithPaymentApproval(ctx context.Context, enrollmentID, paymentID, reviewerID string) error
	// MarkLessonViewed — تسجيل مشاهدة درس (idempotent) + إعادة حساب التقدم
	MarkLessonViewed(ctx context.Context, enrollmentID, lessonID, studentID, courseID string) (newPct int, err error)
	// ListCourseProgress — دروس الدورة مع حالة المشاهدة للطالب
	ListCourseProgress(ctx context.Context, enrollmentID, courseID string) ([]endom.LessonProgress, error)
}

type PaymentRepository interface {
	Create(ctx context.Context, p *endom.PaymentRequest) error
	GetByID(ctx context.Context, id string) (*endom.PaymentRequest, error)
	// ListByStatus — لقائمة انتظار الموظف المالي
	ListByStatus(ctx context.Context, status endom.PaymentStatus, page, pageSize int) ([]endom.PaymentRequest, int, error)
	ListByStudent(ctx context.Context, studentID string) ([]endom.PaymentRequest, error)
	// UpdateStatus — تغيير حالة مع مراجعة (داخل معاملة ActivateWithPaymentApproval)
	UpdateStatusReviewed(ctx context.Context, id string, status endom.PaymentStatus, reviewerID, rejectionReason *string) error
}
