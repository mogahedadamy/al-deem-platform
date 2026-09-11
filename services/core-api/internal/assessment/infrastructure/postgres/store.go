// Infrastructure — PostgreSQL للاختبارات والشهادات.
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	asmdom "github.com/al-deem/platform/core-api/internal/assessment/domain"
	"github.com/al-deem/platform/core-api/internal/assessment/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

// ===== QuizStore =====

type QuizStore struct{ db *sql.DB }

func NewQuizStore(db *sql.DB) *QuizStore { return &QuizStore{db: db} }

func (s *QuizStore) Create(ctx context.Context, q *asmdom.Quiz, questions []asmdom.Question) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	err = tx.QueryRowContext(ctx, `
		INSERT INTO quizzes (lesson_id, course_id, title, pass_score)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		q.LessonID, q.CourseID, q.Title, q.PassScore).Scan(&q.ID)
	if err != nil {
		return fmt.Errorf("insert quiz: %w", err)
	}
	for i, qq := range questions {
		opts, _ := json.Marshal(qq.Options)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO quiz_questions (quiz_id, question, options, position, points)
			VALUES ($1, $2, $3, $4, $5)`,
			q.ID, qq.Question, opts, i, qq.Points)
		if err != nil {
			return fmt.Errorf("insert question %d: %w", i, err)
		}
	}
	return tx.Commit()
}

func (s *QuizStore) GetByID(ctx context.Context, id string) (*asmdom.Quiz, error) {
	q := &asmdom.Quiz{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, lesson_id, course_id, title, pass_score, time_limit_minutes
		FROM quizzes WHERE id = $1`, id,
	).Scan(&q.ID, &q.LessonID, &q.CourseID, &q.Title, &q.PassScore, &q.TimeLimitMinutes)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	return q, err
}

func (s *QuizStore) GetByLesson(ctx context.Context, lessonID string) (*asmdom.Quiz, error) {
	q := &asmdom.Quiz{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, lesson_id, course_id, title, pass_score, time_limit_minutes
		FROM quizzes WHERE lesson_id = $1`, lessonID,
	).Scan(&q.ID, &q.LessonID, &q.CourseID, &q.Title, &q.PassScore, &q.TimeLimitMinutes)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	return q, err
}

func (s *QuizStore) GetByCourse(ctx context.Context, courseID string) (*asmdom.Quiz, error) {
	q := &asmdom.Quiz{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, lesson_id, course_id, title, pass_score, time_limit_minutes
		FROM quizzes WHERE course_id = $1
		ORDER BY created_at DESC LIMIT 1`, courseID,
	).Scan(&q.ID, &q.LessonID, &q.CourseID, &q.Title, &q.PassScore, &q.TimeLimitMinutes)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	return q, err
}

func (s *QuizStore) ListQuestions(ctx context.Context, quizID string) ([]asmdom.Question, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, quiz_id, question, options, position, points
		FROM quiz_questions WHERE quiz_id = $1 ORDER BY position`, quizID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []asmdom.Question
	for rows.Next() {
		q := asmdom.Question{}
		var optsJSON []byte
		if err := rows.Scan(&q.ID, &q.QuizID, &q.Question, &optsJSON, &q.Position, &q.Points); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(optsJSON, &q.Options); err != nil {
			return nil, fmt.Errorf("question options: %w", err)
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// ===== AttemptStore =====

type AttemptStore struct{ db *sql.DB }

func NewAttemptStore(db *sql.DB) *AttemptStore { return &AttemptStore{db: db} }

func (s *AttemptStore) Create(ctx context.Context, a *asmdom.Attempt, score int, passed bool) error {
	answers, _ := json.Marshal(a.Answers)
	return s.db.QueryRowContext(ctx, `
		INSERT INTO quiz_attempts (quiz_id, course_id, student_id, enrollment_id, answers, score, passed)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, started_at, finished_at`,
		a.QuizID, a.CourseID, a.StudentID, a.EnrollmentID, answers, score, passed,
	).Scan(&a.ID, &a.FinishedAt, &a.FinishedAt)
}

func (s *AttemptStore) BestScore(ctx context.Context, quizID, studentID string) (int, error) {
	var best int
	err := s.db.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(score), 0) FROM quiz_attempts
		WHERE quiz_id = $1 AND student_id = $2`, quizID, studentID).Scan(&best)
	return best, err
}

func (s *AttemptStore) CountSince(ctx context.Context, quizID, studentID string, since time.Time) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT count(*) FROM quiz_attempts
		WHERE quiz_id = $1 AND student_id = $2 AND finished_at >= $3`,
		quizID, studentID, since).Scan(&count)
	return count, err
}

func (s *AttemptStore) ListByStudent(ctx context.Context, studentID string) ([]asmdom.Attempt, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, quiz_id, course_id, student_id, enrollment_id, answers, score, passed, finished_at
		FROM quiz_attempts WHERE student_id = $1 ORDER BY finished_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []asmdom.Attempt
	for rows.Next() {
		a := asmdom.Attempt{}
		var answersJSON []byte
		if err := rows.Scan(&a.ID, &a.QuizID, &a.CourseID, &a.StudentID, &a.EnrollmentID, &answersJSON, &a.Score, &a.Passed, &a.FinishedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(answersJSON, &a.Answers)
		out = append(out, a)
	}
	return out, rows.Err()
}

// ===== CertificateStore =====

type CertificateStore struct{ db *sql.DB }

func NewCertificateStore(db *sql.DB) *CertificateStore { return &CertificateStore{db: db} }

// IssueIfEligible — idempotent: شهادة نفس التسجيل تُرجع فورًا.
func (s *CertificateStore) IssueIfEligible(ctx context.Context, c *asmdom.Certificate) (*asmdom.Certificate, error) {
	// موجودة أصلًا؟
	existing := &asmdom.Certificate{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, serial_number, student_id, course_id, enrollment_id, student_name, course_title, final_score, issued_at
		FROM certificates WHERE enrollment_id = $1`, c.EnrollmentID,
	).Scan(&existing.ID, &existing.SerialNumber, &existing.StudentID, &existing.CourseID,
		&existing.EnrollmentID, &existing.StudentName, &existing.CourseTitle, &existing.FinalScore, &existing.IssuedAt)
	if err == nil {
		return existing, nil // idempotent
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO certificates (serial_number, student_id, course_id, enrollment_id, student_name, course_title, final_score)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, issued_at`,
		c.SerialNumber, c.StudentID, c.CourseID, c.EnrollmentID, c.StudentName, c.CourseTitle, c.FinalScore,
	).Scan(&c.ID, &c.IssuedAt)
	if err != nil {
		return nil, fmt.Errorf("issue certificate: %w", err)
	}
	return c, nil
}

func (s *CertificateStore) GetBySerial(ctx context.Context, serial string) (*asmdom.Certificate, error) {
	c := &asmdom.Certificate{}
	err := s.db.QueryRowContext(ctx, `
		SELECT id, serial_number, student_id, course_id, enrollment_id, student_name, course_title, final_score, issued_at
		FROM certificates WHERE serial_number = $1`, serial,
	).Scan(&c.ID, &c.SerialNumber, &c.StudentID, &c.CourseID, &c.EnrollmentID,
		&c.StudentName, &c.CourseTitle, &c.FinalScore, &c.IssuedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	return c, err
}

func (s *CertificateStore) ListByStudent(ctx context.Context, studentID string) ([]asmdom.Certificate, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, serial_number, student_id, course_id, enrollment_id, student_name, course_title, final_score, issued_at
		FROM certificates WHERE student_id = $1 ORDER BY issued_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []asmdom.Certificate
	for rows.Next() {
		c := asmdom.Certificate{}
		if err := rows.Scan(&c.ID, &c.SerialNumber, &c.StudentID, &c.CourseID, &c.EnrollmentID,
			&c.StudentName, &c.CourseTitle, &c.FinalScore, &c.IssuedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// ===== PaperRequestStore =====

type PaperRequestStore struct{ db *sql.DB }

func NewPaperRequestStore(db *sql.DB) *PaperRequestStore { return &PaperRequestStore{db: db} }

func (s *PaperRequestStore) Create(ctx context.Context, r *asmdom.PaperRequest) error {
	return s.db.QueryRowContext(ctx, `
		INSERT INTO paper_certificate_requests (certificate_id, student_id, status, delivery_address, delivery_phone, notes)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
		r.CertificateID, r.StudentID, string(r.Status), r.DeliveryAddress, r.DeliveryPhone, r.Notes,
	).Scan(&r.ID, &r.CreatedAt)
}

func (s *PaperRequestStore) ListByStatus(ctx context.Context, status asmdom.PaperRequestStatus, page, pageSize int) ([]asmdom.PaperRequest, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx,
		`SELECT count(*) FROM paper_certificate_requests WHERE status = $1`, string(status)).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, certificate_id, student_id, status, delivery_address, delivery_phone, notes, handled_by, handled_at, created_at
		FROM paper_certificate_requests WHERE status = $1
		ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		string(status), pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	return scanPapers(rows), total, rows.Err()
}

func (s *PaperRequestStore) ListByStudent(ctx context.Context, studentID string) ([]asmdom.PaperRequest, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, certificate_id, student_id, status, delivery_address, delivery_phone, notes, handled_by, handled_at, created_at
		FROM paper_certificate_requests WHERE student_id = $1 ORDER BY created_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return scanPapers(rows), rows.Err()
}

func (s *PaperRequestStore) UpdateStatus(ctx context.Context, id string, status asmdom.PaperRequestStatus, handledBy string) error {
	// state machine في domain — نتحقق هنا أيضًا (دفاع مزدوج)
	row := s.db.QueryRowContext(ctx, `SELECT status FROM paper_certificate_requests WHERE id = $1 FOR UPDATE`, id)
	var current string
	if err := row.Scan(&current); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return platform.ErrNotFound
		}
		return err
	}
	if !asmdom.CanTransitionPaper(asmdom.PaperRequestStatus(current), status) {
		return platform.ErrConflict
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE paper_certificate_requests
		SET status = $2, handled_by = $3, handled_at = now(), updated_at = now()
		WHERE id = $1`, id, string(status), handledBy)
	return err
}

func scanPapers(rows *sql.Rows) []asmdom.PaperRequest {
	var out []asmdom.PaperRequest
	for rows.Next() {
		r := asmdom.PaperRequest{}
		var status string
		if err := rows.Scan(&r.ID, &r.CertificateID, &r.StudentID, &status,
			&r.DeliveryAddress, &r.DeliveryPhone, &r.Notes, &r.HandledBy, &r.HandledAt, &r.CreatedAt); err != nil {
			continue
		}
		r.Status = asmdom.PaperRequestStatus(status)
		out = append(out, r)
	}
	return out
}

// compile-time conformance
var (
	_ ports.QuizRepository         = (*QuizStore)(nil)
	_ ports.AttemptRepository      = (*AttemptStore)(nil)
	_ ports.CertificateRepository  = (*CertificateStore)(nil)
	_ ports.PaperRequestRepository = (*PaperRequestStore)(nil)
)
