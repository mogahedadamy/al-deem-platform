// Application — Use Cases للكتالوج والتأليف: كل انتقال حالة بAuthorization + Audit.
package application

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	catalogdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
	"github.com/al-deem/platform/core-api/internal/catalog/ports"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type CatalogService struct {
	courses   ports.CourseRepository
	sections  ports.SectionRepository
	lessons   ports.LessonRepository
	categories ports.CategoryRepository
	audit     idports.AuditLogger
}

func NewCatalogService(c ports.CourseRepository, s ports.SectionRepository, l ports.LessonRepository, cat ports.CategoryRepository, a idports.AuditLogger) *CatalogService {
	return &CatalogService{courses: c, sections: s, lessons: l, categories: cat, audit: a}
}

// ===== Public (زائر) =====

// ListPublishedCourses — الزائر يرى المنشور فقط (مصدر واحد: DB).
func (s *CatalogService) ListPublishedCourses(ctx context.Context, categorySlug, level, query string, page, pageSize int) ([]catalogdom.Course, int, error) {
	var categoryID *string
	if categorySlug != "" {
		cats, err := s.categories.List(ctx)
		if err != nil {
			return nil, 0, err
		}
		for _, c := range cats {
			if c.Slug == categorySlug {
				categoryID = &c.ID
				break
			}
		}
	}
	var lvl *string
	if level != "" {
		lvl = &level
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 12
	}
	return s.courses.ListPublished(ctx, categoryID, lvl, query, page, pageSize)
}

// GetPublishedCourse — تفاصيل دورة منشورة بالـslug.
func (s *CatalogService) GetPublishedCourse(ctx context.Context, slug string) (*catalogdom.Course, error) {
	c, err := s.courses.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if c.Status != catalogdom.CoursePublished {
		return nil, platform.ErrNotFound
	}
	return c, nil
}

// GetCourseOutline — الأقسام والدروس لدورة منشورة (المحتوى الكامل يُحمى بالـentitlement في R2).
func (s *CatalogService) GetCourseOutline(ctx context.Context, slug string) ([]catalogdom.Section, map[string][]catalogdom.Lesson, error) {
	c, err := s.courses.GetBySlug(ctx, slug)
	if err != nil {
		return nil, nil, err
	}
	if c.Status != catalogdom.CoursePublished {
		return nil, nil, platform.ErrNotFound
	}
	secs, err := s.sections.ListByCourse(ctx, c.ID)
	if err != nil {
		return nil, nil, err
	}
	out := make(map[string][]catalogdom.Lesson)
	for _, sec := range secs {
		ls, err := s.lessons.ListBySection(ctx, sec.ID)
		if err != nil {
			return nil, nil, err
		}
		out[sec.ID] = ls
	}
	return secs, out, nil
}

// ListCategories — الفئات للفلاتر.
func (s *CatalogService) ListCategories(ctx context.Context) ([]catalogdom.Category, error) {
	return s.categories.List(ctx)
}

// ===== Instructor authoring =====

// CreateCourse — مدرب معتمد فقط ينشئ مسودة.
func (s *CatalogService) CreateCourse(ctx context.Context, actor *iddomain.Actor, in CreateCourseInput) (*catalogdom.Course, error) {
	if !actor.HasRole(iddomain.RoleInstructor) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	if in.Title == "" || len(in.Title) < 4 {
		return nil, platform.ErrValidation
	}
	slug, err := uniqueSlug(in.Slug, in.Title)
	if err != nil {
		return nil, err
	}
	c := &catalogdom.Course{
		Slug:            slug,
		Title:           in.Title,
		Summary:         in.Summary,
		Description:     in.Description,
		InstructorID:    actor.ID, // المالك = المنشئ
		Status:          catalogdom.CourseDraft,
		Level:           normalizeLevel(in.Level),
		PriceAmount:     in.PriceAmount,
		Currency:        normalizeCurrency(in.Currency),
		DurationHours:   in.DurationHours,
		CoverImageURL:   in.CoverImageURL,
		HasLiveSessions: in.HasLiveSessions,
	}
	if in.CategoryID != "" {
		c.CategoryID = &in.CategoryID
	}
	if err := s.courses.Create(ctx, c); err != nil {
		return nil, fmt.Errorf("create course: %w", err)
	}
	_ = s.audit.Log(ctx, actor.ID, "course.created", "course", c.ID, nil, map[string]any{"slug": c.Slug, "title": c.Title})
	return c, nil
}

// UpdateCourse — المدرب يعدل مسودته فقط (لا يغير status من هنا).
func (s *CatalogService) UpdateCourse(ctx context.Context, actor *iddomain.Actor, courseID string, in UpdateCourseInput) (*catalogdom.Course, error) {
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return nil, err
	}
	if !actor.HasRole(iddomain.RoleSystemAdmin) {
		if !catalogdom.CanModifyCourse(actor.ID, c.InstructorID) {
			return nil, platform.ErrForbidden
		}
	}
	if c.Status == catalogdom.CoursePublished || c.Status == catalogdom.CourseArchived {
		return nil, platform.ErrConflict // المنشور لا يُعدل مباشرة — يُنسخ كمسودة جديدة لاحقًا
	}
	if in.Title != nil {
		c.Title = *in.Title
	}
	if in.Summary != nil {
		c.Summary = *in.Summary
	}
	if in.Description != nil {
		c.Description = *in.Description
	}
	if in.Level != nil {
		c.Level = normalizeLevel(*in.Level)
	}
	if in.PriceAmount != nil {
		c.PriceAmount = *in.PriceAmount
	}
	if in.DurationHours != nil {
		c.DurationHours = *in.DurationHours
	}
	if in.HasLiveSessions != nil {
		c.HasLiveSessions = *in.HasLiveSessions
	}
	if in.CoverImageURL != nil {
		c.CoverImageURL = in.CoverImageURL
	}
	if err := s.courses.Update(ctx, c); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "course.updated", "course", c.ID, nil, in)
	return c, nil
}

// DeleteCourse — المدرب يحذف مسودته فقط (المسودة فقط).
func (s *CatalogService) DeleteCourse(ctx context.Context, actor *iddomain.Actor, courseID string) error {
	c, err := s.authorizeOwner(ctx, actor, courseID)
	if err != nil {
		return err
	}
	if c.Status != catalogdom.CourseDraft {
		return platform.ErrConflict
	}
	if err := s.courses.Delete(ctx, courseID); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "course.deleted", "course", courseID, map[string]any{"slug": c.Slug}, nil)
}

// SubmitForReview — draft → pending_review.
func (s *CatalogService) SubmitForReview(ctx context.Context, actor *iddomain.Actor, courseID string) error {
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return err
	}
	if !actor.HasRole(iddomain.RoleSystemAdmin) && !catalogdom.CanModifyCourse(actor.ID, c.InstructorID) {
		return platform.ErrForbidden
	}
	if n, _ := s.lessons.CountByCourse(ctx, courseID); n == 0 {
		return &platform.DomainError{Code: "VALIDATION", Msg: "course must have at least one lesson before review"}
	}
	now := time.Now()
	if err := c.SubmitForReview(now); err != nil {
		return err
	}
	if err := s.courses.UpdateStatus(ctx, c.ID, c.Status, nil, nil, nil); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "course.submitted_review", "course", c.ID, nil, map[string]any{"status": c.Status})
}

// ===== Content review (erp) =====

// ListPendingReview — لمشرف المحتوى.
func (s *CatalogService) ListPendingReview(ctx context.Context, actor *iddomain.Actor, page, pageSize int) ([]catalogdom.Course, int, error) {
	if !actor.Can(iddomain.PermPublishCourse) {
		return nil, 0, platform.ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.courses.ListPendingReview(ctx, page, pageSize)
}

// PublishCourse — content_reviewer/system_admin فقط.
func (s *CatalogService) PublishCourse(ctx context.Context, actor *iddomain.Actor, courseID string) error {
	if !actor.Can(iddomain.PermPublishCourse) {
		return platform.ErrForbidden
	}
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return err
	}
	now := time.Now()
	if err := c.Publish(actor.ID, now); err != nil {
		return err
	}
	publishedAt := now.Format(time.RFC3339)
	if err := s.courses.UpdateStatus(ctx, c.ID, c.Status, nil, &actor.ID, &publishedAt); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "course.published", "course", c.ID, map[string]any{"status": "pending_review"}, map[string]any{"status": "published"})
}

// RejectCourse — pending_review → draft + ملاحظات إلزامية.
func (s *CatalogService) RejectCourse(ctx context.Context, actor *iddomain.Actor, courseID, notes string) error {
	if !actor.Can(iddomain.PermPublishCourse) {
		return platform.ErrForbidden
	}
	if notes == "" {
		return platform.ErrValidation
	}
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return err
	}
	now := time.Now()
	if err := c.Reject(actor.ID, notes, now); err != nil {
		return err
	}
	if err := s.courses.UpdateStatus(ctx, c.ID, c.Status, &notes, &actor.ID, nil); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "course.rejected", "course", c.ID, map[string]any{"status": "pending_review"}, map[string]any{"status": "draft", "notes": notes})
}

// ArchiveCourse — content_reviewer/system_admin.
func (s *CatalogService) ArchiveCourse(ctx context.Context, actor *iddomain.Actor, courseID string) error {
	if !actor.Can(iddomain.PermPublishCourse) {
		return platform.ErrForbidden
	}
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return err
	}
	now := time.Now()
	if err := c.Archive(now); err != nil {
		return err
	}
	if err := s.courses.UpdateStatus(ctx, c.ID, c.Status, nil, nil, nil); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "course.archived", "course", c.ID, map[string]any{"status": "published"}, map[string]any{"status": "archived"})
}

// ===== Instructor: my courses + sections/lessons =====

// MyCourses — دورات المدرب نفسه فقط.
func (s *CatalogService) MyCourses(ctx context.Context, actor *iddomain.Actor) ([]catalogdom.Course, error) {
	if !actor.HasRole(iddomain.RoleInstructor) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	return s.courses.ListByInstructor(ctx, actor.ID)
}

// AddSection — للدورة المسودة المملوكة فقط.
func (s *CatalogService) AddSection(ctx context.Context, actor *iddomain.Actor, courseID, title string, position int) (*catalogdom.Section, error) {
	c, err := s.authorizeOwner(ctx, actor, courseID)
	if err != nil {
		return nil, err
	}
	if c.Status != catalogdom.CourseDraft {
		return nil, platform.ErrConflict
	}
	if title == "" {
		return nil, platform.ErrValidation
	}
	sec := &catalogdom.Section{CourseID: courseID, Title: title, Position: position}
	if err := s.sections.Create(ctx, sec); err != nil {
		return nil, err
	}
	return sec, nil
}

// AddLesson — فيديو/نص/اختبار ضمن قسم (الدورة صريحة في الـinput).
func (s *CatalogService) AddLesson(ctx context.Context, actor *iddomain.Actor, sectionID string, in LessonInput) (*catalogdom.Lesson, error) {
	if in.CourseID == "" {
		return nil, platform.ErrValidation
	}
	c, err := s.authorizeOwner(ctx, actor, in.CourseID)
	if err != nil {
		return nil, err
	}
	if c.Status != catalogdom.CourseDraft {
		return nil, platform.ErrConflict
	}
	l := &catalogdom.Lesson{
		SectionID: sectionID,
		CourseID:  in.CourseID,
		Type:      normalizeLessonType(in.Type),
		Title:     in.Title,
		Content:   in.Content,
		VideoURL:  in.VideoURL,
		Position:  in.Position,
		IsFreePreview: in.IsFreePreview,
	}
	if l.Title == "" {
		return nil, platform.ErrValidation
	}
	if l.Type == "video" && (l.VideoURL == nil || *l.VideoURL == "") {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "video lesson requires videoUrl"}
	}
	if err := s.lessons.Create(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

func (s *CatalogService) authorizeOwner(ctx context.Context, actor *iddomain.Actor, courseID string) (*catalogdom.Course, error) {
	c, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		return nil, err
	}
	if !actor.HasRole(iddomain.RoleSystemAdmin) && !catalogdom.CanModifyCourse(actor.ID, c.InstructorID) {
		return nil, platform.ErrForbidden
	}
	return c, nil
}

// ===== Inputs =====

type CreateCourseInput struct {
	Slug            string
	Title           string
	Summary         string
	Description     string
	CategoryID      string
	Level           string
	PriceAmount     float64
	Currency        string
	DurationHours   int
	CoverImageURL   *string
	HasLiveSessions bool
}

type UpdateCourseInput struct {
	Title           *string
	Summary         *string
	Description     *string
	Level           *string
	PriceAmount     *float64
	DurationHours   *int
	CoverImageURL   *string
	HasLiveSessions *bool
}

type LessonInput struct {
	CourseID      string
	Type          string
	Title         string
	Content       *string
	VideoURL      *string
	Position      int
	IsFreePreview bool
}

// ===== helpers =====

func uniqueSlug(slug, title string) (string, error) {
	s := slug
	if s == "" {
		s = title
	}
	// normalize to url-safe (لاتيني فقط — العربية لا تُشفر URL-safe بسهولة)
	out := make([]rune, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			out = append(out, r)
		case r >= 'A' && r <= 'Z':
			out = append(out, r+32)
		case r == ' ', r == '-', r == '_':
			out = append(out, '-')
		}
	}
	if len(out) >= 3 {
		return string(out), nil
	}
	// عنوان عربي (أو قصير جدًا) → slug فريد ثابت للعنوان نفسه
	if fallback, ok := slugFromArabic(title); ok {
		return fallback, nil
	}
	return "", platform.ErrValidation
}

// slugFromArabic — hash ثابت للعنوان: نفس العنوان = نفس الـslug.
func slugFromArabic(title string) (string, bool) {
	if len(title) < 3 {
		return "", false
	}
	sum := sha256.Sum256([]byte(title))
	return "crs-" + hex.EncodeToString(sum[:8]), true
}

func normalizeLevel(l string) catalogdom.CourseLevel {
	switch l {
	case "intermediate":
		return catalogdom.LevelIntermediate
	case "advanced":
		return catalogdom.LevelAdvanced
	default:
		return catalogdom.LevelBeginner
	}
}

func normalizeCurrency(c string) string {
	if len(c) == 3 {
		return c
	}
	return "SDG"
}

func normalizeLessonType(t string) string {
	switch t {
	case "text", "quiz", "assignment":
		return t
	default:
		return "video"
	}
}
