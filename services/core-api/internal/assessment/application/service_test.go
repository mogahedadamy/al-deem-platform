package application

import (
	"context"
	"testing"
	"time"

	asmdom "github.com/al-deem/platform/core-api/internal/assessment/domain"
	iddom "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type fakeQuizRepo struct{}

func (fakeQuizRepo) Create(context.Context, *asmdom.Quiz, []asmdom.Question) error { return nil }
func (fakeQuizRepo) GetByID(context.Context, string) (*asmdom.Quiz, error) {
	return &asmdom.Quiz{ID: "quiz", CourseID: "course", PassScore: 70}, nil
}
func (fakeQuizRepo) GetByLesson(context.Context, string) (*asmdom.Quiz, error) {
	return nil, platform.ErrNotFound
}
func (fakeQuizRepo) GetByCourse(context.Context, string) (*asmdom.Quiz, error) {
	return nil, platform.ErrNotFound
}
func (fakeQuizRepo) ListQuestions(context.Context, string) ([]asmdom.Question, error) {
	return []asmdom.Question{{ID: "q1", Points: 1, Options: []asmdom.Option{{Key: "a", Correct: true}, {Key: "b"}}}}, nil
}

type fakeAttemptRepo struct {
	count   int
	created int
}

func (f *fakeAttemptRepo) Create(_ context.Context, a *asmdom.Attempt, score int, passed bool) error {
	f.created++
	a.ID = "attempt"
	return nil
}
func (f *fakeAttemptRepo) BestScore(context.Context, string, string) (int, error) { return 0, nil }
func (f *fakeAttemptRepo) CountSince(context.Context, string, string, time.Time) (int, error) {
	return f.count, nil
}
func (f *fakeAttemptRepo) ListByStudent(context.Context, string) ([]asmdom.Attempt, error) {
	return nil, nil
}

type fakeCertRepo struct{ issued int }

func (f *fakeCertRepo) IssueIfEligible(_ context.Context, c *asmdom.Certificate) (*asmdom.Certificate, error) {
	f.issued++
	c.ID = "cert"
	return c, nil
}
func (f *fakeCertRepo) GetBySerial(context.Context, string) (*asmdom.Certificate, error) {
	return nil, platform.ErrNotFound
}
func (f *fakeCertRepo) ListByStudent(context.Context, string) ([]asmdom.Certificate, error) {
	return nil, nil
}

type fakePaperRepo struct{}

func (fakePaperRepo) Create(context.Context, *asmdom.PaperRequest) error { return nil }
func (fakePaperRepo) ListByStatus(context.Context, asmdom.PaperRequestStatus, int, int) ([]asmdom.PaperRequest, int, error) {
	return nil, 0, nil
}
func (fakePaperRepo) ListByStudent(context.Context, string) ([]asmdom.PaperRequest, error) {
	return nil, nil
}
func (fakePaperRepo) UpdateStatus(context.Context, string, asmdom.PaperRequestStatus, string) error {
	return nil
}

type fakeAssessmentAudit struct{}

func (fakeAssessmentAudit) Log(context.Context, string, string, string, string, any, any) error {
	return nil
}

func assessmentActor() *iddom.Actor {
	return &iddom.Actor{Profile: iddom.Profile{ID: "student", FullName: "Student", Status: iddom.ProfileActive}, Roles: []iddom.RoleKey{iddom.RoleStudent}}
}

func newAssessment(attempts *fakeAttemptRepo, certs *fakeCertRepo, eligible bool) *AssessmentService {
	return NewAssessmentService(fakeQuizRepo{}, attempts, certs, fakePaperRepo{}, fakeAssessmentAudit{},
		func(context.Context, string, string) (bool, string, error) { return eligible, "course", nil },
		func(context.Context, string) (string, error) { return "Student", nil },
		func(context.Context, string) (string, error) { return "Course", nil },
		func(context.Context, string) (string, error) { return "course", nil },
		func(context.Context, string) (string, error) { return "instructor", nil })
}

func TestSubmitAttemptRequiresCompletedEnrollment(t *testing.T) {
	a, c := &fakeAttemptRepo{}, &fakeCertRepo{}
	svc := newAssessment(a, c, false)
	_, err := svc.SubmitAttempt(context.Background(), assessmentActor(), "quiz", "enrollment", map[string]string{"q1": "a"})
	if de, ok := platform.IsDomainError(err); !ok || de.Code != "FORBIDDEN" {
		t.Fatalf("expected forbidden, got %v", err)
	}
	if a.created != 0 || c.issued != 0 {
		t.Fatal("attempt and certificate must not be created")
	}
}

func TestSubmitAttemptEnforcesDailyLimit(t *testing.T) {
	a, c := &fakeAttemptRepo{count: 3}, &fakeCertRepo{}
	svc := newAssessment(a, c, true)
	_, err := svc.SubmitAttempt(context.Background(), assessmentActor(), "quiz", "enrollment", map[string]string{"q1": "a"})
	if de, ok := platform.IsDomainError(err); !ok || de.Code != "CONFLICT" {
		t.Fatalf("expected conflict, got %v", err)
	}
}

func TestCompletedStudentPassesAndGetsCertificate(t *testing.T) {
	a, c := &fakeAttemptRepo{}, &fakeCertRepo{}
	svc := newAssessment(a, c, true)
	attempt, err := svc.SubmitAttempt(context.Background(), assessmentActor(), "quiz", "enrollment", map[string]string{"q1": "a"})
	if err != nil {
		t.Fatal(err)
	}
	if !attempt.Passed || attempt.Score != 100 || !attempt.CertIssued || c.issued != 1 {
		t.Fatalf("unexpected attempt %#v", attempt)
	}
}

func TestCreateQuizRequiresCourseOwnership(t *testing.T) {
	svc := newAssessment(&fakeAttemptRepo{}, &fakeCertRepo{}, true)
	actor := &iddom.Actor{Profile: iddom.Profile{ID: "other-instructor", Status: iddom.ProfileActive}, Roles: []iddom.RoleKey{iddom.RoleInstructor}}
	_, err := svc.CreateQuiz(context.Background(), actor, QuizInput{CourseID: "course", LessonID: "lesson", Title: "اختبار", Questions: []asmdom.Question{{Question: "سؤال", Options: []asmdom.Option{{Key: "a", Text: "أ", Correct: true}, {Key: "b", Text: "ب"}}}}})
	if de, ok := platform.IsDomainError(err); !ok || de.Code != "FORBIDDEN" {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestCourseOwnerCanCreateQuiz(t *testing.T) {
	svc := newAssessment(&fakeAttemptRepo{}, &fakeCertRepo{}, true)
	actor := &iddom.Actor{Profile: iddom.Profile{ID: "instructor", Status: iddom.ProfileActive}, Roles: []iddom.RoleKey{iddom.RoleInstructor}}
	quiz, err := svc.CreateQuiz(context.Background(), actor, QuizInput{CourseID: "course", LessonID: "lesson", Title: "اختبار", Questions: []asmdom.Question{{Question: "سؤال", Options: []asmdom.Option{{Key: "a", Text: "أ", Correct: true}, {Key: "b", Text: "ب"}}}}})
	if err != nil || quiz == nil {
		t.Fatalf("expected quiz creation, got quiz=%#v err=%v", quiz, err)
	}
}
