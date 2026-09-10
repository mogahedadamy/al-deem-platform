// Package catalog — الكتالوج والتأليف: فئات ودورات وأقسام ودروس.
// Boundaries: يقرأ/يكتب categories/courses/course_sections/lessons/lesson_assets فقط.
package domain

import "time"

type CourseStatus string

const (
	CourseDraft          CourseStatus = "draft"
	CoursePendingReview  CourseStatus = "pending_review"
	CoursePublished      CourseStatus = "published"
	CourseArchived       CourseStatus = "archived"
)

type CourseLevel string

const (
	LevelBeginner     CourseLevel = "beginner"
	LevelIntermediate CourseLevel = "intermediate"
	LevelAdvanced     CourseLevel = "advanced"
)

// Course — كيان الدورة مع invariants الـstatus (state machine).
type Course struct {
	ID               string
	Slug             string
	Title            string
	Summary          string
	Description      string
	CategoryID       *string
	InstructorID     string
	Status           CourseStatus
	Level            CourseLevel
	Language         string
	PriceAmount      float64
	Currency         string
	DurationHours    int
	CoverImageURL    *string
	HasLiveSessions  bool
	ReviewNotes      *string
	ReviewedBy       *string
	PublishedAt      *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// SubmitForReview — draft → pending_review فقط. (invariant خادمي)
func (c *Course) SubmitForReview(now time.Time) error {
	if c.Status != CourseDraft {
		return &TransitionError{From: c.Status, To: CoursePendingReview, Reason: "only drafts can be submitted"}
	}
	c.Status = CoursePendingReview
	c.UpdatedAt = now
	return nil
}

// Publish — pending_review → published. content_reviewer/system_admin فقط (تُفحص في Use Case).
func (c *Course) Publish(actorID string, now time.Time) error {
	if c.Status != CoursePendingReview {
		return &TransitionError{From: c.Status, To: CoursePublished, Reason: "only pending_review can be published"}
	}
	c.Status = CoursePublished
	c.PublishedAt = &now
	c.ReviewedBy = &actorID
	c.UpdatedAt = now
	return nil
}

// Reject — pending_review → draft مع ملاحظات إلزامية.
func (c *Course) Reject(actorID string, notes string, now time.Time) error {
	if c.Status != CoursePendingReview {
		return &TransitionError{From: c.Status, To: CourseDraft, Reason: "only pending_review can be rejected"}
	}
	if notes == "" {
		return &TransitionError{From: c.Status, To: CourseDraft, Reason: "rejection requires notes"}
	}
	c.Status = CourseDraft
	c.ReviewNotes = &notes
	c.ReviewedBy = &actorID
	c.UpdatedAt = now
	return nil
}

// Archive — published → archived (لا حذف لدورة عليها تسجيلات لاحقًا).
func (c *Course) Archive(now time.Time) error {
	if c.Status != CoursePublished {
		return &TransitionError{From: c.Status, To: CourseArchived, Reason: "only published can be archived"}
	}
	c.Status = CourseArchived
	c.UpdatedAt = now
	return nil
}

type TransitionError struct {
	From    CourseStatus
	To      CourseStatus
	Reason  string
}

func (e *TransitionError) Error() string {
	return "invalid transition " + string(e.From) + " → " + string(e.To) + ": " + e.Reason
}

type Section struct {
	ID       string
	CourseID string
	Title    string
	Position int
}

type Lesson struct {
	ID            string
	SectionID     string
	CourseID      string
	Type          string // video | text | quiz | assignment
	Title         string
	Content       *string
	VideoURL      *string
	Position      int
	IsFreePreview bool
}

type Category struct {
	ID          string
	Slug        string
	NameAr      string
	Description *string
	Position    int
}

// CanModifyCourse — المدرب يملك دورته فقط. (Policy)
func CanModifyCourse(actorInstructorID, courseInstructorID string) bool {
	return actorInstructorID == courseInstructorID
}
