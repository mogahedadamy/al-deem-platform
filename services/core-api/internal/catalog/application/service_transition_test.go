package application

import (
	"context"
	"errors"
	"sync"
	"testing"

	catalogdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
	"github.com/al-deem/platform/core-api/internal/catalog/ports"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type transitionCourseRepository struct {
	ports.CourseRepository
	mu              sync.Mutex
	snapshot        catalogdom.Course
	persistedStatus catalogdom.CourseStatus
	transitions     []ports.CourseStatusTransition
}

func (r *transitionCourseRepository) GetByID(context.Context, string) (*catalogdom.Course, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	copy := r.snapshot
	return &copy, nil
}

func (r *transitionCourseRepository) TransitionStatus(_ context.Context, transition ports.CourseStatusTransition) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.persistedStatus != transition.ExpectedStatus {
		return platform.ErrConflict
	}
	r.persistedStatus = transition.NewStatus
	r.transitions = append(r.transitions, transition)
	return nil
}

type transitionLessonRepository struct {
	ports.LessonRepository
	count int
	err   error
}

func (r transitionLessonRepository) CountByCourse(context.Context, string) (int, error) {
	return r.count, r.err
}

type transitionSectionRepository struct{ ports.SectionRepository }
type transitionCategoryRepository struct{ ports.CategoryRepository }

type transitionAudit struct {
	calls int
	err   error
}

func (a *transitionAudit) Log(context.Context, string, string, string, string, any, any) error {
	a.calls++
	return a.err
}

func transitionActor(id string, roles ...iddomain.RoleKey) *iddomain.Actor {
	return &iddomain.Actor{Profile: iddomain.Profile{ID: id}, Roles: roles}
}

func transitionService(courses ports.CourseRepository, lessons ports.LessonRepository, audit *transitionAudit) *CatalogService {
	return NewCatalogService(courses, transitionSectionRepository{}, lessons, transitionCategoryRepository{}, audit)
}

func TestSubmitForReviewPropagatesLessonCountError(t *testing.T) {
	want := errors.New("database unavailable")
	courses := &transitionCourseRepository{
		snapshot:        catalogdom.Course{ID: "course", InstructorID: "instructor", Status: catalogdom.CourseDraft},
		persistedStatus: catalogdom.CourseDraft,
	}
	svc := transitionService(courses, transitionLessonRepository{err: want}, &transitionAudit{})

	err := svc.SubmitForReview(context.Background(), transitionActor("instructor", iddomain.RoleInstructor), "course")
	if !errors.Is(err, want) {
		t.Fatalf("SubmitForReview error = %v, want wrapped lesson count error", err)
	}
	if len(courses.transitions) != 0 {
		t.Fatal("course must not transition when lesson count fails")
	}
}

func TestCourseTransitionsCarryExpectedStateAndAtomicAudit(t *testing.T) {
	tests := []struct {
		name       string
		status     catalogdom.CourseStatus
		wantStatus catalogdom.CourseStatus
		wantAction string
		run        func(*CatalogService) error
	}{
		{
			name: "submit", status: catalogdom.CourseDraft, wantStatus: catalogdom.CoursePendingReview,
			wantAction: "course.submitted_review",
			run: func(s *CatalogService) error {
				return s.SubmitForReview(context.Background(), transitionActor("instructor", iddomain.RoleInstructor), "course")
			},
		},
		{
			name: "publish", status: catalogdom.CoursePendingReview, wantStatus: catalogdom.CoursePublished,
			wantAction: "course.published",
			run: func(s *CatalogService) error {
				return s.PublishCourse(context.Background(), transitionActor("reviewer", iddomain.RoleContentReviewer), "course")
			},
		},
		{
			name: "reject", status: catalogdom.CoursePendingReview, wantStatus: catalogdom.CourseDraft,
			wantAction: "course.rejected",
			run: func(s *CatalogService) error {
				return s.RejectCourse(context.Background(), transitionActor("reviewer", iddomain.RoleContentReviewer), "course", "أضف المصادر")
			},
		},
		{
			name: "archive", status: catalogdom.CoursePublished, wantStatus: catalogdom.CourseArchived,
			wantAction: "course.archived",
			run: func(s *CatalogService) error {
				return s.ArchiveCourse(context.Background(), transitionActor("reviewer", iddomain.RoleContentReviewer), "course")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			courses := &transitionCourseRepository{
				snapshot: catalogdom.Course{
					ID: "course", InstructorID: "instructor", Status: tt.status,
				},
				persistedStatus: tt.status,
			}
			audit := &transitionAudit{err: errors.New("separate audit must not be called")}
			svc := transitionService(courses, transitionLessonRepository{count: 1}, audit)

			if err := tt.run(svc); err != nil {
				t.Fatalf("transition failed: %v", err)
			}
			if len(courses.transitions) != 1 {
				t.Fatalf("transition calls = %d, want 1", len(courses.transitions))
			}
			got := courses.transitions[0]
			if got.ExpectedStatus != tt.status || got.NewStatus != tt.wantStatus || got.Action != tt.wantAction {
				t.Fatalf("transition = (%s → %s, %s), want (%s → %s, %s)",
					got.ExpectedStatus, got.NewStatus, got.Action, tt.status, tt.wantStatus, tt.wantAction)
			}
			if audit.calls != 0 {
				t.Fatalf("separate audit calls = %d, want 0", audit.calls)
			}
		})
	}
}

func TestConcurrentReviewDecisionsOnlyOneWins(t *testing.T) {
	courses := &transitionCourseRepository{
		snapshot: catalogdom.Course{
			ID: "course", InstructorID: "instructor", Status: catalogdom.CoursePendingReview,
		},
		persistedStatus: catalogdom.CoursePendingReview,
	}
	svc := transitionService(courses, transitionLessonRepository{count: 1}, &transitionAudit{})
	reviewer := transitionActor("reviewer", iddomain.RoleContentReviewer)

	start := make(chan struct{})
	results := make(chan error, 2)
	go func() {
		<-start
		results <- svc.PublishCourse(context.Background(), reviewer, "course")
	}()
	go func() {
		<-start
		results <- svc.RejectCourse(context.Background(), reviewer, "course", "يحتاج تعديلاً")
	}()
	close(start)

	var succeeded, conflicted int
	for range 2 {
		err := <-results
		switch {
		case err == nil:
			succeeded++
		case errors.Is(err, platform.ErrConflict):
			conflicted++
		default:
			t.Fatalf("unexpected concurrent decision error: %v", err)
		}
	}
	if succeeded != 1 || conflicted != 1 {
		t.Fatalf("concurrent decisions: succeeded=%d conflicted=%d, want 1 and 1", succeeded, conflicted)
	}
	if len(courses.transitions) != 1 {
		t.Fatalf("persisted transitions = %d, want 1", len(courses.transitions))
	}
}
