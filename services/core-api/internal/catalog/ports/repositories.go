// Ports — interfaces الكتالوج (DIP: Use Cases لا تعرف PostgreSQL).
package ports

import (
	"context"

	catalogdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
)

type CourseRepository interface {
	Create(ctx context.Context, c *catalogdom.Course) error
	GetByID(ctx context.Context, id string) (*catalogdom.Course, error)
	GetBySlug(ctx context.Context, slug string) (*catalogdom.Course, error)
	Update(ctx context.Context, c *catalogdom.Course) error
	UpdateStatus(ctx context.Context, id string, status catalogdom.CourseStatus, reviewNotes *string, reviewedBy *string, publishedAt *string) error
	Delete(ctx context.Context, id string) error
	ListPublished(ctx context.Context, categoryID *string, level *string, query string, page, pageSize int) ([]catalogdom.Course, int, error)
	ListByInstructor(ctx context.Context, instructorID string) ([]catalogdom.Course, error)
	ListPendingReview(ctx context.Context, page, pageSize int) ([]catalogdom.Course, int, error)
}

type SectionRepository interface {
	Create(ctx context.Context, s *catalogdom.Section) error
	ListByCourse(ctx context.Context, courseID string) ([]catalogdom.Section, error)
	Update(ctx context.Context, s *catalogdom.Section) error
	Delete(ctx context.Context, id string) error
}

type LessonRepository interface {
	Create(ctx context.Context, l *catalogdom.Lesson) error
	GetByID(ctx context.Context, id string) (*catalogdom.Lesson, error)
	Update(ctx context.Context, l *catalogdom.Lesson) error
	Delete(ctx context.Context, id string) error
	ListBySection(ctx context.Context, sectionID string) ([]catalogdom.Lesson, error)
	CountByCourse(ctx context.Context, courseID string) (int, error)
}

type CategoryRepository interface {
	List(ctx context.Context) ([]catalogdom.Category, error)
	Upsert(ctx context.Context, c catalogdom.Category) error
}
