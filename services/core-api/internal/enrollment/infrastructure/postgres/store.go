// Infrastructure — PostgreSQL للتسجيل والدفع.
// الميزة الحرجة: ActivateWithPaymentApproval معاملة ذرية واحدة.
package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	endom "github.com/al-deem/platform/core-api/internal/enrollment/domain"
	"github.com/al-deem/platform/core-api/internal/enrollment/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

// ===== EnrollmentStore =====

type EnrollmentStore struct{ db *sql.DB }

func NewEnrollmentStore(db *sql.DB) *EnrollmentStore { return &EnrollmentStore{db: db} }

func (s *EnrollmentStore) Create(ctx context.Context, e *endom.Enrollment) error {
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO enrollments (student_id, course_id, status, price_amount, currency)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`,
		e.StudentID, e.CourseID, string(e.Status), e.PriceAmount, e.Currency,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return platform.ErrConflict
		}
		return fmt.Errorf("insert enrollment: %w", err)
	}
	return nil
}

func (s *EnrollmentStore) GetByID(ctx context.Context, id string) (*endom.Enrollment, error) {
	return scanEnrollment(s.db.QueryRowContext(ctx, `SELECT id, student_id, course_id, status, price_amount, currency,
		progress_pct, started_at, completed_at, created_at, updated_at FROM enrollments WHERE id = $1`, id))
}

func (s *EnrollmentStore) FindByStudentCourse(ctx context.Context, studentID, courseID string) (*endom.Enrollment, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, student_id, course_id, status, price_amount, currency,
		progress_pct, started_at, completed_at, created_at, updated_at
		FROM enrollments
		WHERE student_id = $1 AND course_id = $2
		  AND status IN ('pending_payment', 'active')
		ORDER BY created_at DESC LIMIT 1`, studentID, courseID)
	e, err := scanEnrollment(row)
	if errors.Is(err, platform.ErrNotFound) {
		return nil, nil // لا تسجيل نشط — ليست خطأ
	}
	return e, err
}

func (s *EnrollmentStore) ListByStudent(ctx context.Context, studentID string) ([]endom.Enrollment, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT e.id, e.student_id, e.course_id, e.status, e.price_amount, e.currency,
		e.progress_pct, e.started_at, e.completed_at, e.created_at, e.updated_at,
		c.title, c.slug
		FROM enrollments e JOIN courses c ON c.id = e.course_id
		WHERE e.student_id = $1 ORDER BY e.created_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return collectEnrollments(rows)
}

// ActivateWithPaymentApproval — معاملة ذرية: تسجيل نشط + دفع معتمد معًا أو لا شيء.
func (s *EnrollmentStore) ActivateWithPaymentApproval(ctx context.Context, enrollmentID, paymentID, reviewerID string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	res, err := tx.ExecContext(ctx, `
		UPDATE enrollments SET status = 'active', started_at = now(), updated_at = now()
		WHERE id = $1 AND status = 'pending_payment'`, enrollmentID)
	if err != nil {
		return fmt.Errorf("activate enrollment: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrConflict // ليست بانتظار الدفع (سبق تفعيلها/إلغاؤها)
	}
	res, err = tx.ExecContext(ctx, `
		UPDATE payment_requests SET status = 'approved', reviewer_id = $2, reviewed_at = now(), updated_at = now()
		WHERE id = $1 AND status IN ('submitted', 'under_review')`, paymentID, reviewerID)
	if err != nil {
		return fmt.Errorf("approve payment: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrConflict
	}
	return tx.Commit()
}

// ===== PaymentStore =====

type PaymentStore struct{ db *sql.DB }

func NewPaymentStore(db *sql.DB) *PaymentStore { return &PaymentStore{db: db} }

func (s *PaymentStore) Create(ctx context.Context, p *endom.PaymentRequest) error {
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO payment_requests (enrollment_id, student_id, method, amount, currency, status, receipt_url, bank_reference)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, created_at, updated_at`,
		p.EnrollmentID, p.StudentID, p.Method, p.Amount, p.Currency, string(p.Status), p.ReceiptURL, p.BankReference,
	).Scan(&p.ID, &p.CreatedAt, &p.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert payment: %w", err)
	}
	return nil
}

func (s *PaymentStore) GetByID(ctx context.Context, id string) (*endom.PaymentRequest, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, enrollment_id, student_id, method, amount, currency, status,
		receipt_url, bank_reference, reviewer_id, reviewed_at, rejection_reason, created_at
		FROM payment_requests WHERE id = $1`, id)
	p := &endom.PaymentRequest{}
	var status string
	err := row.Scan(&p.ID, &p.EnrollmentID, &p.StudentID, &p.Method, &p.Amount, &p.Currency, &status,
		&p.ReceiptURL, &p.BankReference, &p.ReviewerID, &p.ReviewedAt, &p.RejectionReason, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.Status = endom.PaymentStatus(status)
	return p, nil
}

func (s *PaymentStore) ListByStatus(ctx context.Context, status endom.PaymentStatus, page, pageSize int) ([]endom.PaymentRequest, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx,
		`SELECT count(*) FROM payment_requests WHERE status = $1`, string(status)).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, enrollment_id, student_id, method, amount, currency, status,
		receipt_url, bank_reference, reviewer_id, reviewed_at, rejection_reason, created_at
		FROM payment_requests WHERE status = $1
		ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		string(status), pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	var out []endom.PaymentRequest
	for rows.Next() {
		p := endom.PaymentRequest{}
		var st string
		if err := rows.Scan(&p.ID, &p.EnrollmentID, &p.StudentID, &p.Method, &p.Amount, &p.Currency, &st,
			&p.ReceiptURL, &p.BankReference, &p.ReviewerID, &p.ReviewedAt, &p.RejectionReason, &p.CreatedAt); err != nil {
			return nil, 0, err
		}
		p.Status = endom.PaymentStatus(st)
		out = append(out, p)
	}
	return out, total, rows.Err()
}

func (s *PaymentStore) ListByStudent(ctx context.Context, studentID string) ([]endom.PaymentRequest, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, enrollment_id, student_id, method, amount, currency, status,
		receipt_url, bank_reference, reviewer_id, reviewed_at, rejection_reason, created_at
		FROM payment_requests WHERE student_id = $1 ORDER BY created_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []endom.PaymentRequest
	for rows.Next() {
		p := endom.PaymentRequest{}
		var st string
		if err := rows.Scan(&p.ID, &p.EnrollmentID, &p.StudentID, &p.Method, &p.Amount, &p.Currency, &st,
			&p.ReceiptURL, &p.BankReference, &p.ReviewerID, &p.ReviewedAt, &p.RejectionReason, &p.CreatedAt); err != nil {
			return nil, err
		}
		p.Status = endom.PaymentStatus(st)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *PaymentStore) UpdateStatusReviewed(ctx context.Context, id string, status endom.PaymentStatus, reviewerID, rejectionReason *string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE payment_requests SET status = $2, reviewer_id = $3, reviewed_at = now(),
			rejection_reason = $4, updated_at = now()
		WHERE id = $1`, id, string(status), reviewerID, rejectionReason)
	return err
}

// ===== helpers =====

func scanEnrollment(row *sql.Row) (*endom.Enrollment, error) {
	e := &endom.Enrollment{}
	var status string
	err := row.Scan(&e.ID, &e.StudentID, &e.CourseID, &status, &e.PriceAmount, &e.Currency,
		&e.ProgressPct, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	e.Status = endom.EnrollmentStatus(status)
	return e, nil
}

func collectEnrollments(rows *sql.Rows) ([]endom.Enrollment, error) {
	var out []endom.Enrollment
	for rows.Next() {
		e := endom.Enrollment{}
		var status string
		if err := rows.Scan(&e.ID, &e.StudentID, &e.CourseID, &status, &e.PriceAmount, &e.Currency,
			&e.ProgressPct, &e.StartedAt, &e.CompletedAt, &e.CreatedAt, &e.UpdatedAt,
			&e.CourseTitle, &e.CourseSlug); err != nil {
			return nil, err
		}
		e.Status = endom.EnrollmentStatus(status)
		out = append(out, e)
	}
	return out, rows.Err()
}

// MarkLessonViewed — مشاهدة درس (idempotent) + إعادة حساب progress_pct ذريًا.
func (s *EnrollmentStore) MarkLessonViewed(ctx context.Context, enrollmentID, lessonID, studentID, courseID string) (int, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	// idempotent insert
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO lesson_views (enrollment_id, lesson_id, student_id)
		VALUES ($1,$2,$3) ON CONFLICT (enrollment_id, lesson_id) DO NOTHING`,
		enrollmentID, lessonID, studentID); err != nil {
		return 0, err
	}
	// إعادة حساب التقدم في نفس المعاملة
	var total, viewed int
	if err = tx.QueryRowContext(ctx, `
		SELECT
			(SELECT count(*) FROM lessons WHERE course_id = $1),
			(SELECT count(*) FROM lesson_views WHERE enrollment_id = $2)`,
		courseID, enrollmentID).Scan(&total, &viewed); err != nil {
		return 0, err
	}
	pct := endom.RecomputeProgressPct(total, viewed)
	// تحديث التسجيل + إكمال تلقائي عند 100%
	if pct >= 100 {
		_, err = tx.ExecContext(ctx, `
			UPDATE enrollments SET progress_pct = $2, status = 'completed', completed_at = now(), updated_at = now()
			WHERE id = $1`, enrollmentID, pct)
	} else {
		_, err = tx.ExecContext(ctx, `
			UPDATE enrollments SET progress_pct = $2, updated_at = now()
			WHERE id = $1`, enrollmentID, pct)
	}
	if err != nil {
		return 0, err
	}
	return pct, tx.Commit()
}

// ListCourseProgress — دروس الدورة مع حالة مشاهدتها لهذا التسجيل.
func (s *EnrollmentStore) ListCourseProgress(ctx context.Context, enrollmentID, courseID string) ([]endom.LessonProgress, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT l.id, l.title, l.type,
			EXISTS(SELECT 1 FROM lesson_views lv WHERE lv.lesson_id = l.id AND lv.enrollment_id = $1)
		FROM lessons l
		JOIN course_sections cs ON cs.id = l.section_id
		WHERE l.course_id = $2
		ORDER BY cs.position, l.position`,
		enrollmentID, courseID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []endom.LessonProgress
	for rows.Next() {
		lp := endom.LessonProgress{}
		if err := rows.Scan(&lp.LessonID, &lp.LessonTitle, &lp.LessonType, &lp.Viewed); err != nil {
			return nil, err
		}
		out = append(out, lp)
	}
	return out, rows.Err()
}

// HasActiveByCourseAndStudent — هل للطالب تسجيل فعّال/مكتمل في الدورة؟
func (s *EnrollmentStore) HasActiveByCourseAndStudent(ctx context.Context, courseID, studentID string) (bool, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `
		SELECT count(*) FROM enrollments
		WHERE course_id = $1 AND student_id = $2 AND status IN ('active','completed')`,
		courseID, studentID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// GetStats — تجميعات حية للتقارير.
func (s *EnrollmentStore) GetStats(ctx context.Context) (map[string]any, error) {
	out := map[string]any{}
	// التسجيلات بالحالة
	rows, err := s.db.QueryContext(ctx, `SELECT status, count(*) FROM enrollments GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	byStatus := map[string]int{}
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			return nil, err
		}
		byStatus[st] = n
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out["enrollments"] = byStatus

	// الدفعات المعتمدة + إجمالي المبالغ (numeric → float64)
	var approvedCount, pendingCount int
	var approvedSum float64
	if err := s.db.QueryRowContext(ctx, `
		SELECT count(*), COALESCE(sum(amount),0) FROM payment_requests WHERE status = 'approved'`).Scan(&approvedCount, &approvedSum); err != nil {
		return nil, err
	}
	if err := s.db.QueryRowContext(ctx, `
		SELECT count(*) FROM payment_requests WHERE status = 'submitted'`).Scan(&pendingCount); err != nil {
		return nil, err
	}
	out["paymentsApprovedCount"] = approvedCount
	out["paymentsApprovedSum"] = approvedSum
	out["paymentsPendingCount"] = pendingCount

	// الشهادات
	var certsIssued int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM certificates`).Scan(&certsIssued); err != nil {
		return nil, err
	}
	out["certificatesIssued"] = certsIssued

	// الطلبات الورقية بالحالة
	prows, err := s.db.QueryContext(ctx, `SELECT status, count(*) FROM paper_certificate_requests GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = prows.Close() }()
	papers := map[string]int{}
	for prows.Next() {
		var st string
		var n int
		if err := prows.Scan(&st, &n); err != nil {
			return nil, err
		}
		papers[st] = n
	}
	out["paperRequests"] = papers

	// الدورات بالحالة
	crows, err := s.db.QueryContext(ctx, `SELECT status, count(*) FROM courses GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = crows.Close() }()
	coursesByStatus := map[string]int{}
	for crows.Next() {
		var st string
		var n int
		if err := crows.Scan(&st, &n); err != nil {
			return nil, err
		}
		coursesByStatus[st] = n
	}
	out["courses"] = coursesByStatus

	return out, nil
}

// compile-time conformance
var (
	_ ports.EnrollmentRepository = (*EnrollmentStore)(nil)
	_ ports.PaymentRepository    = (*PaymentStore)(nil)
)
