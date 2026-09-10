// Infrastructure — PostgreSQL للاستفسارات.
package postgres

import (
	"context"
	"database/sql"
	"errors"

	ldom "github.com/al-deem/platform/core-api/internal/leads/domain"
	"github.com/al-deem/platform/core-api/internal/leads/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type LeadStore struct{ db *sql.DB }

func NewLeadStore(db *sql.DB) *LeadStore { return &LeadStore{db: db} }

func (s *LeadStore) Create(ctx context.Context, l *ldom.Lead) error {
	return s.db.QueryRowContext(ctx, `
		INSERT INTO leads (name, email, phone, subject, message, source, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		RETURNING id, created_at`,
		l.Name, l.Email, nullIfEmpty(l.Phone), l.Subject, l.Message, l.Source, string(l.Status),
	).Scan(&l.ID, &l.CreatedAt)
}

func (s *LeadStore) GetByID(ctx context.Context, id string) (*ldom.Lead, error) {
	l := &ldom.Lead{}
	var status string
	var phone, profileID, courseID, notes sql.Null[string]
	err := s.db.QueryRowContext(ctx, `
		SELECT id, name, email, phone, subject, message, source, status,
		       profile_id, course_id, notes, created_at, updated_at
		FROM leads WHERE id = $1`, id,
	).Scan(&l.ID, &l.Name, &l.Email, &phone, &l.Subject, &l.Message, &l.Source, &status,
		&profileID, &courseID, &notes, &l.CreatedAt, &l.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	l.Status = ldom.LeadStatus(status)
	l.Phone, l.ProfileID, l.CourseID, l.Notes = phone.V, profileID.V, courseID.V, notes.V
	return l, nil
}

func (s *LeadStore) List(ctx context.Context, status string, limit, offset int) ([]ldom.Lead, int, error) {
	var total int
	where := ""
	args := []any{}
	if status != "" {
		where = " WHERE status = $1"
		args = append(args, status)
	}
	if err := s.db.QueryRowContext(ctx,
		`SELECT count(*) FROM leads`+where, args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := `SELECT id, name, email, phone, subject, message, source, status,
	             profile_id, course_id, notes, created_at, updated_at
	      FROM leads` + where + ` ORDER BY created_at DESC LIMIT ` +
		itoa(limit) + ` OFFSET ` + itoa(offset)
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	var out []ldom.Lead
	for rows.Next() {
		l := ldom.Lead{}
		var st string
		var phone, profileID, courseID, notes sql.Null[string]
		if err := rows.Scan(&l.ID, &l.Name, &l.Email, &phone, &l.Subject, &l.Message,
			&l.Source, &st, &profileID, &courseID, &notes, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, 0, err
		}
		l.Status = ldom.LeadStatus(st)
		l.Phone, l.ProfileID, l.CourseID, l.Notes = phone.V, profileID.V, courseID.V, notes.V
		out = append(out, l)
	}
	return out, total, rows.Err()
}

func (s *LeadStore) Update(ctx context.Context, id string, status ldom.LeadStatus, notes string) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE leads SET status = $2, notes = COALESCE(NULLIF($3, ''), notes), updated_at = now()
		WHERE id = $1`, id, string(status), notes)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrNotFound
	}
	return nil
}

func itoa(n int) string {
	if n < 0 {
		n = 0
	}
	b := [20]byte{}
	i := len(b)
	if n == 0 {
		return "0"
	}
	for n > 0 && i > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

var _ ports.LeadRepository = (*LeadStore)(nil)
