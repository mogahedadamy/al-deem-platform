// Package enrollment — التسجيل والدفع.
// قرار #9: تحويل بنكي يدوي بمراجعة موظف مالي مخصص (#6).
// كل انتقال حالة ذري خادميًا مع audit log.
package domain

import (
	"time"
)

type EnrollmentStatus string

const (
	EnrollmentPendingPayment EnrollmentStatus = "pending_payment"
	EnrollmentActive         EnrollmentStatus = "active"
	EnrollmentCompleted      EnrollmentStatus = "completed"
	EnrollmentCancelled      EnrollmentStatus = "cancelled"
)

type PaymentStatus string

const (
	PaymentSubmitted   PaymentStatus = "submitted"
	PaymentUnderReview PaymentStatus = "under_review"
	PaymentApproved    PaymentStatus = "approved"
	PaymentRejected    PaymentStatus = "rejected"
)

type Enrollment struct {
	ID          string
	StudentID   string
	CourseID    string
	// معلومات الدورة للعرض (JOIN من catalog في نفس DB)
	CourseTitle string
	CourseSlug  string
	Status      EnrollmentStatus
	PriceAmount float64
	Currency    string
	ProgressPct int
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PaymentRequest struct {
	ID              string
	EnrollmentID    string
	StudentID       string
	Method          string
	Amount          float64
	Currency        string
	Status          PaymentStatus
	ReceiptURL      string
	BankReference   *string
	ReviewerID      *string
	ReviewedAt      *time.Time
	RejectionReason *string
	CreatedAt       time.Time
}

// Activate — يُستدعى ذريًا عند اعتماد الدفع (في نفس transaction).
func (e *Enrollment) Activate(now time.Time) {
	e.Status = EnrollmentActive
	e.StartedAt = &now
}

// EnrollInvariant — الطالب لا يسجل دورة غير منشورة ولا مسجلة بالفعل.
// (الاستثناء: تكرار التسجيل يمنعه قيد EXCLUDE في DB — دفاع مزدوج)
func CanEnroll(courseStatus string, enrollmentStatus string) bool {
	return courseStatus == "published" &&
		(enrollmentStatus == "" || enrollmentStatus == "cancelled" || enrollmentStatus == "completed")
}

// LessonProgress — درس + حالة مشاهدته للطالب.
type LessonProgress struct {
	LessonID    string
	LessonTitle string
	LessonType  string
	Viewed      bool
}

// RecomputeProgressPct — نسبة الدروس المشاهدة من الكل.
func RecomputeProgressPct(total, viewed int) int {
	if total <= 0 {
		return 0
	}
	pct := viewed * 100 / total
	if pct > 100 {
		return 100
	}
	return pct
}
