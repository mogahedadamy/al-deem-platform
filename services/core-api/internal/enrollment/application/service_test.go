package application

import (
	"context"
	"testing"

	endom "github.com/al-deem/platform/core-api/internal/enrollment/domain"
	iddom "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type fakeEnrollments struct{ created *endom.Enrollment }

func (f *fakeEnrollments) Create(_ context.Context, e *endom.Enrollment) error {
	e.ID = "enrollment"
	f.created = e
	return nil
}
func (f *fakeEnrollments) GetByID(_ context.Context, id string) (*endom.Enrollment, error) {
	if f.created != nil && f.created.ID == id {
		return f.created, nil
	}
	return nil, platform.ErrNotFound
}
func (f *fakeEnrollments) FindByStudentCourse(context.Context, string, string) (*endom.Enrollment, error) {
	return nil, nil
}
func (f *fakeEnrollments) ListByStudent(context.Context, string) ([]endom.Enrollment, error) {
	return nil, nil
}
func (f *fakeEnrollments) ActivateWithPaymentApproval(context.Context, string, string, string) error {
	return nil
}
func (f *fakeEnrollments) MarkLessonViewed(context.Context, string, string, string, string) (int, error) {
	return 100, nil
}
func (f *fakeEnrollments) ListCourseProgress(context.Context, string, string) ([]endom.LessonProgress, error) {
	return nil, nil
}
func (f *fakeEnrollments) GetStats(context.Context) (map[string]any, error) { return nil, nil }

type fakePayments struct {
	items     []endom.PaymentRequest
	creates   int
	createErr error
	onCreate  func(*fakePayments)
}

func (f *fakePayments) Create(_ context.Context, p *endom.PaymentRequest) error {
	f.creates++
	p.ID = "payment"
	if f.onCreate != nil {
		f.onCreate(f)
	}
	return f.createErr
}
func (f *fakePayments) GetByID(context.Context, string) (*endom.PaymentRequest, error) {
	return nil, platform.ErrNotFound
}
func (f *fakePayments) ListByStatus(context.Context, endom.PaymentStatus, int, int) ([]endom.PaymentRequest, int, error) {
	return nil, 0, nil
}
func (f *fakePayments) ListByStudent(context.Context, string) ([]endom.PaymentRequest, error) {
	return f.items, nil
}
func (f *fakePayments) UpdateStatusReviewed(context.Context, string, endom.PaymentStatus, *string, *string) error {
	return nil
}

type fakeAudit struct{}

func (fakeAudit) Log(context.Context, string, string, string, string, any, any) error { return nil }

func actor() *iddom.Actor {
	return &iddom.Actor{Profile: iddom.Profile{ID: "student", Status: iddom.ProfileActive}, Roles: []iddom.RoleKey{iddom.RoleStudent}}
}

func TestEnrollRejectsCourseWithoutLessons(t *testing.T) {
	e, p := &fakeEnrollments{}, &fakePayments{}
	svc := NewEnrollmentService(e, p, fakeAudit{}, func(context.Context, string) (bool, bool, float64, string, error) {
		return true, false, 100, "SDG", nil
	})
	_, err := svc.Enroll(context.Background(), actor(), "course")
	if de, ok := platform.IsDomainError(err); !ok || de.Code != "CONFLICT" {
		t.Fatalf("expected CONFLICT, got %v", err)
	}
}

func TestEnrollFreeCourseActivatesImmediately(t *testing.T) {
	e, p := &fakeEnrollments{}, &fakePayments{}
	svc := NewEnrollmentService(e, p, fakeAudit{}, func(context.Context, string) (bool, bool, float64, string, error) { return true, true, 0, "SDG", nil })
	got, err := svc.Enroll(context.Background(), actor(), "course")
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != endom.EnrollmentActive {
		t.Fatalf("status=%s", got.Status)
	}
}

func TestSubmitPaymentAcceptsOnlyPrivateReceiptAndIsIdempotent(t *testing.T) {
	e := &fakeEnrollments{created: &endom.Enrollment{ID: "enrollment", StudentID: "student", CourseID: "course", Status: endom.EnrollmentPendingPayment, PriceAmount: 10, Currency: "SDG"}}
	p := &fakePayments{}
	svc := NewEnrollmentService(e, p, fakeAudit{}, func(context.Context, string) (bool, bool, float64, string, error) { return true, true, 10, "SDG", nil })
	for _, receipt := range []string{"javascript:alert(1)", "https://files.example/receipt.png"} {
		if _, err := svc.SubmitPayment(context.Background(), actor(), "enrollment", receipt, ""); err == nil {
			t.Fatalf("untrusted receipt %q must fail", receipt)
		}
	}
	p.items = []endom.PaymentRequest{{ID: "existing", EnrollmentID: "enrollment", StudentID: "student", Status: endom.PaymentSubmitted}}
	got, err := svc.SubmitPayment(context.Background(), actor(), "enrollment", "receipt://existing.png", "")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "existing" || p.creates != 0 {
		t.Fatalf("expected idempotent existing payment, got %#v creates=%d", got, p.creates)
	}
	p.items = nil
	if _, err := svc.SubmitPayment(context.Background(), actor(), "enrollment", "receipt://abcdef123456.png", ""); err != nil {
		t.Fatalf("private receipt reference must be accepted: %v", err)
	}
	if p.creates != 1 {
		t.Fatalf("expected one private receipt payment creation, got %d", p.creates)
	}
}

func TestSubmitPaymentConcurrentDuplicateReturnsWinningRequest(t *testing.T) {
	e := &fakeEnrollments{created: &endom.Enrollment{ID: "enrollment", StudentID: "student", CourseID: "course", Status: endom.EnrollmentPendingPayment, PriceAmount: 10, Currency: "SDG"}}
	p := &fakePayments{createErr: platform.ErrConflict}
	p.onCreate = func(f *fakePayments) {
		f.items = []endom.PaymentRequest{{
			ID: "winner", EnrollmentID: "enrollment", StudentID: "student", Status: endom.PaymentSubmitted,
		}}
	}
	svc := NewEnrollmentService(e, p, fakeAudit{}, func(context.Context, string) (bool, bool, float64, string, error) { return true, true, 10, "SDG", nil })

	got, err := svc.SubmitPayment(context.Background(), actor(), "enrollment", "receipt://race-safe.png", "REF-1")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "winner" || p.creates != 1 {
		t.Fatalf("expected concurrent winning request, got %#v creates=%d", got, p.creates)
	}
}
