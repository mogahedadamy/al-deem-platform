// Infrastructure — PostgreSQL implementations للكتالوج.
// كل Repository في struct مستقل (Go لا يدعم method overloading) — كلها تشارك *sql.DB.
package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	catalogdom "github.com/al-deem/platform/core-api/internal/catalog/domain"
	"github.com/al-deem/platform/core-api/internal/catalog/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

// ===== CourseStore — CourseRepository =====

type CourseStore struct{ db *sql.DB }

func NewCourseStore(db *sql.DB) *CourseStore { return &CourseStore{db: db} }

const courseCols = `id, slug, title, summary, description, category_id, instructor_id, status,
	level, language, price_amount, currency, duration_hours, cover_image_url,
	has_live_sessions, review_notes, reviewed_by, published_at, created_at, updated_at`

func (s *CourseStore) Create(ctx context.Context, c *catalogdom.Course) error {
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO courses (slug, title, summary, description, category_id, instructor_id, status,
			level, price_amount, currency, duration_hours, cover_image_url, has_live_sessions)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, created_at, updated_at`,
		c.Slug, c.Title, c.Summary, c.Description, c.CategoryID, c.InstructorID, string(c.Status),
		string(c.Level), c.PriceAmount, c.Currency, c.DurationHours, c.CoverImageURL, c.HasLiveSessions,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return platform.ErrConflict
		}
		return fmt.Errorf("insert course: %w", err)
	}
	return nil
}

func (s *CourseStore) GetByID(ctx context.Context, id string) (*catalogdom.Course, error) {
	return scanCourse(s.db.QueryRowContext(ctx, `SELECT `+courseCols+` FROM courses WHERE id = $1`, id))
}

func (s *CourseStore) GetBySlug(ctx context.Context, slug string) (*catalogdom.Course, error) {
	return scanCourse(s.db.QueryRowContext(ctx, `SELECT `+courseCols+` FROM courses WHERE slug = $1`, slug))
}

func (s *CourseStore) Update(ctx context.Context, c *catalogdom.Course) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE courses SET title=$2, summary=$3, description=$4, level=$5,
			price_amount=$6, duration_hours=$7, cover_image_url=$8, has_live_sessions=$9, updated_at=now()
		WHERE id = $1`,
		c.ID, c.Title, c.Summary, c.Description, string(c.Level),
		c.PriceAmount, c.DurationHours, c.CoverImageURL, c.HasLiveSessions)
	if err != nil {
		return fmt.Errorf("update course: %w", err)
	}
	return nil
}

func (s *CourseStore) UpdateStatus(ctx context.Context, id string, status catalogdom.CourseStatus, reviewNotes, reviewedBy, publishedAt *string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE courses SET
			status = $2,
			review_notes = COALESCE($3, review_notes),
			reviewed_by  = COALESCE($4, reviewed_by),
			published_at = COALESCE($5::timestamptz, published_at),
			updated_at = now()
		WHERE id = $1`,
		id, string(status), reviewNotes, reviewedBy, publishedAt)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}
	return nil
}

func (s *CourseStore) Delete(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM courses WHERE id = $1 AND status = 'draft'`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrConflict // ليست مسودة أو غير موجودة
	}
	return nil
}

func (s *CourseStore) ListPublished(ctx context.Context, categoryID, level *string, query string, page, pageSize int) ([]catalogdom.Course, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, `
		SELECT count(*) FROM courses
		WHERE status='published'
		  AND ($1::uuid IS NULL OR category_id = $1)
		  AND ($2::text IS NULL OR level = $2)
		  AND ($3 = '' OR title ILIKE '%'||$3||'%' OR summary ILIKE '%'||$3||'%')`,
		categoryID, level, query).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT `+courseCols+` FROM courses
		WHERE status='published'
		  AND ($1::uuid IS NULL OR category_id = $1)
		  AND ($2::text IS NULL OR level = $2)
		  AND ($3 = '' OR title ILIKE '%'||$3||'%' OR summary ILIKE '%'||$3||'%')
		ORDER BY published_at DESC NULLS LAST
		LIMIT $4 OFFSET $5`,
		categoryID, level, query, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Course
	for rows.Next() {
		c, err := scanCourseRow(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *c)
	}
	return out, total, rows.Err()
}

func (s *CourseStore) ListByInstructor(ctx context.Context, instructorID string) ([]catalogdom.Course, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+courseCols+` FROM courses WHERE instructor_id = $1 ORDER BY updated_at DESC`, instructorID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Course
	for rows.Next() {
		c, err := scanCourseRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (s *CourseStore) ListPendingReview(ctx context.Context, page, pageSize int) ([]catalogdom.Course, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM courses WHERE status='pending_review'`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT `+courseCols+` FROM courses WHERE status='pending_review'
		ORDER BY updated_at ASC LIMIT $1 OFFSET $2`, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Course
	for rows.Next() {
		c, err := scanCourseRow(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *c)
	}
	return out, total, rows.Err()
}

// ===== SectionStore — SectionRepository =====

type SectionStore struct{ db *sql.DB }

func NewSectionStore(db *sql.DB) *SectionStore { return &SectionStore{db: db} }

func (s *SectionStore) Create(ctx context.Context, sec *catalogdom.Section) error {
	return s.db.QueryRowContext(ctx, `
		INSERT INTO course_sections (course_id, title, position)
		VALUES ($1, $2, $3) RETURNING id`,
		sec.CourseID, sec.Title, sec.Position).Scan(&sec.ID)
}

func (s *SectionStore) ListByCourse(ctx context.Context, courseID string) ([]catalogdom.Section, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, course_id, title, position FROM course_sections WHERE course_id = $1 ORDER BY position`, courseID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Section
	for rows.Next() {
		var sec catalogdom.Section
		if err := rows.Scan(&sec.ID, &sec.CourseID, &sec.Title, &sec.Position); err != nil {
			return nil, err
		}
		out = append(out, sec)
	}
	return out, rows.Err()
}

func (s *SectionStore) Update(ctx context.Context, sec *catalogdom.Section) error {
	res, err := s.db.ExecContext(ctx, `UPDATE course_sections SET title=$2, position=$3 WHERE id=$1`, sec.ID, sec.Title, sec.Position)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrNotFound
	}
	return nil
}

func (s *SectionStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM course_sections WHERE id = $1`, id)
	return err
}

// ===== LessonStore — LessonRepository =====

type LessonStore struct{ db *sql.DB }

func NewLessonStore(db *sql.DB) *LessonStore { return &LessonStore{db: db} }

func (s *LessonStore) Create(ctx context.Context, l *catalogdom.Lesson) error {
	return s.db.QueryRowContext(ctx, `
		INSERT INTO lessons (section_id, course_id, type, title, content, video_url, position, is_free_preview)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		l.SectionID, l.CourseID, l.Type, l.Title, l.Content, l.VideoURL, l.Position, l.IsFreePreview).Scan(&l.ID)
}

func (s *LessonStore) Update(ctx context.Context, l *catalogdom.Lesson) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE lessons SET type=$2, title=$3, content=$4, video_url=$5, position=$6, is_free_preview=$7
		WHERE id=$1`, l.ID, l.Type, l.Title, l.Content, l.VideoURL, l.Position, l.IsFreePreview)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrNotFound
	}
	return nil
}

func (s *LessonStore) Delete(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM lessons WHERE id = $1`, id)
	return err
}

func (s *LessonStore) ListBySection(ctx context.Context, sectionID string) ([]catalogdom.Lesson, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, section_id, course_id, type, title, content, video_url, position, is_free_preview
		FROM lessons WHERE section_id = $1 ORDER BY position`, sectionID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Lesson
	for rows.Next() {
		l := catalogdom.Lesson{}
		if err := rows.Scan(&l.ID, &l.SectionID, &l.CourseID, &l.Type, &l.Title, &l.Content, &l.VideoURL, &l.Position, &l.IsFreePreview); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (s *LessonStore) GetByID(ctx context.Context, id string) (*catalogdom.Lesson, error) {
	l := &catalogdom.Lesson{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, section_id, course_id, type, title, content, video_url, position, is_free_preview
		FROM lessons WHERE id = $1`, id,
	).Scan(&l.ID, &l.SectionID, &l.CourseID, &l.Type, &l.Title, &l.Content, &l.VideoURL, &l.Position, &l.IsFreePreview)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return l, nil
}

func (s *LessonStore) CountByCourse(ctx context.Context, courseID string) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM lessons WHERE course_id = $1`, courseID).Scan(&n)
	return n, err
}

// ===== CategoryStore — CategoryRepository =====

type CategoryStore struct{ db *sql.DB }

func NewCategoryStore(db *sql.DB) *CategoryStore { return &CategoryStore{db: db} }

func (s *CategoryStore) List(ctx context.Context) ([]catalogdom.Category, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, slug, name_ar, description, position FROM categories ORDER BY position`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []catalogdom.Category
	for rows.Next() {
		c := catalogdom.Category{}
		if err := rows.Scan(&c.ID, &c.Slug, &c.NameAr, &c.Description, &c.Position); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *CategoryStore) Upsert(ctx context.Context, c catalogdom.Category) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO categories (slug, name_ar, description, position)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (slug) DO UPDATE SET name_ar=$2, description=$3, position=$4`,
		c.Slug, c.NameAr, c.Description, c.Position)
	return err
}

// ===== helpers =====

func scanCourse(row *sql.Row) (*catalogdom.Course, error) {
	c := &catalogdom.Course{}
	var status string
	err := row.Scan(&c.ID, &c.Slug, &c.Title, &c.Summary, &c.Description, &c.CategoryID, &c.InstructorID, &status,
		&c.Level, &c.Language, &c.PriceAmount, &c.Currency, &c.DurationHours, &c.CoverImageURL,
		&c.HasLiveSessions, &c.ReviewNotes, &c.ReviewedBy, &c.PublishedAt, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c.Status = catalogdom.CourseStatus(status)
	return c, nil
}

func scanCourseRow(rows *sql.Rows) (*catalogdom.Course, error) {
	c := &catalogdom.Course{}
	var status string
	err := rows.Scan(&c.ID, &c.Slug, &c.Title, &c.Summary, &c.Description, &c.CategoryID, &c.InstructorID, &status,
		&c.Level, &c.Language, &c.PriceAmount, &c.Currency, &c.DurationHours, &c.CoverImageURL,
		&c.HasLiveSessions, &c.ReviewNotes, &c.ReviewedBy, &c.PublishedAt, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Status = catalogdom.CourseStatus(status)
	return c, nil
}

// compile-time interface conformance
var (
	_ ports.CourseRepository   = (*CourseStore)(nil)
	_ ports.SectionRepository  = (*SectionStore)(nil)
	_ ports.LessonRepository   = (*LessonStore)(nil)
	_ ports.CategoryRepository = (*CategoryStore)(nil)
)
