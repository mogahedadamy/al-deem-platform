// Ports — interfaces الاختبارات والشهادات.
package ports

import (
	"context"

	asmdom "github.com/al-deem/platform/core-api/internal/assessment/domain"
)

type QuizRepository interface {
	Create(ctx context.Context, q *asmdom.Quiz, questions []asmdom.Question) error
	GetByID(ctx context.Context, id string) (*asmdom.Quiz, error)
	GetByLesson(ctx context.Context, lessonID string) (*asmdom.Quiz, error)
	GetByCourse(ctx context.Context, courseID string) (*asmdom.Quiz, error)
	// QuestionsForStudent — بدون correct flags (خادمي فقط يراها)
	ListQuestions(ctx context.Context, quizID string) ([]asmdom.Question, error)
}

type AttemptRepository interface {
	Create(ctx context.Context, a *asmdom.Attempt, score int, passed bool) error
	BestScore(ctx context.Context, quizID, studentID string) (int, error)
	ListByStudent(ctx context.Context, studentID string) ([]asmdom.Attempt, error)
}

type CertificateRepository interface {
	// IssueIfEligible — idempotent: شهادة موجودة لنفس enrollment تُرجع كما هي
	IssueIfEligible(ctx context.Context, c *asmdom.Certificate) (*asmdom.Certificate, error)
	GetBySerial(ctx context.Context, serial string) (*asmdom.Certificate, error)
	ListByStudent(ctx context.Context, studentID string) ([]asmdom.Certificate, error)
}

type PaperRequestRepository interface {
	Create(ctx context.Context, r *asmdom.PaperRequest) error
	ListByStatus(ctx context.Context, status asmdom.PaperRequestStatus, page, pageSize int) ([]asmdom.PaperRequest, int, error)
	ListByStudent(ctx context.Context, studentID string) ([]asmdom.PaperRequest, error)
	UpdateStatus(ctx context.Context, id string, status asmdom.PaperRequestStatus, handledBy string) error
}
