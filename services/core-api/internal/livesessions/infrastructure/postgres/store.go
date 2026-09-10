// Infrastructure — PostgreSQL للحصص المباشرة.
package postgres

import (
	"context"
	"database/sql"
	"time"
	"errors"
	"fmt"

	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
	"github.com/al-deem/platform/core-api/internal/livesessions/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

// ===== SessionStore =====

type SessionStore struct{ db *sql.DB }

func NewSessionStore(db *sql.DB) *SessionStore { return &SessionStore{db: db} }

func (s *SessionStore) Create(ctx context.Context, v *lsdom.LiveSession) error {
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO live_sessions
			(course_id, section_id, instructor_id, title, status, starts_at,
			 join_window_min, duration_min, timezone, starts_at_utc, ends_at_utc, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at`,
		v.CourseID, nilIfEmpty(v.SectionID), v.InstructorID, v.Title, string(v.Status),
		v.StartsAt, v.JoinWindowMin, v.DurationMin, v.Timezone,
		// UTC bounds للقيد (TIMESTAMP بلا منطقة)
		v.StartsAt.UTC(), v.StartsAt.UTC().Add(time.Duration(v.DurationMin)*time.Minute),
		nilIfEmpty(v.Notes),
	).Scan(&v.ID, &v.CreatedAt)
	if err != nil {
		// 23P01 exclusion_violation: تعارض مواعيد المدرب
		var pgErr interface{ SQLState() string }
		if errors.As(err, &pgErr) && pgErr.SQLState() == "23P01" {
			return &platform.DomainError{Code: "CONFLICT", Msg: "المدرب لديه حصة أخرى في هذا التوقيت"}
		}
		return err
	}
	return nil
}

func (s *SessionStore) GetByID(ctx context.Context, id string) (*lsdom.LiveSession, error) {
	// يدعم الحلق بالـID أو بـzoom_meeting_id (لأحداث webhook)
	v := &lsdom.LiveSession{}
	var status string
	var sectionID, zoomMeetingID, zoomJoinURL, recordingURL, notes sql.Null[string]
	err := s.db.QueryRowContext(ctx, `
		SELECT id, course_id, section_id, instructor_id, title, status, starts_at,
		       join_window_min, duration_min, timezone, zoom_meeting_id, zoom_join_url,
		       recording_url, notes, created_at
		FROM live_sessions
		WHERE id::text = $1 OR zoom_meeting_id = $1 LIMIT 1`, id,
	).Scan(&v.ID, &v.CourseID, &sectionID, &v.InstructorID, &v.Title, &status, &v.StartsAt,
		&v.JoinWindowMin, &v.DurationMin, &v.Timezone, &zoomMeetingID, &zoomJoinURL,
		&recordingURL, &notes, &v.CreatedAt)
	if err == nil {
		v.SectionID, v.ZoomMeetingID, v.ZoomJoinURL = sectionID.V, zoomMeetingID.V, zoomJoinURL.V
		v.RecordingURL, v.Notes = recordingURL.V, notes.V
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	v.Status = lsdom.Status(status)
	return v, nil
}

func (s *SessionStore) ListByCourse(ctx context.Context, courseID string) ([]lsdom.LiveSession, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, course_id, section_id, instructor_id, title, status, starts_at,
		       join_window_min, duration_min, timezone, zoom_meeting_id, zoom_join_url,
		       recording_url, notes, created_at
		FROM live_sessions WHERE course_id = $1 AND status <> 'cancelled'
		ORDER BY starts_at ASC`, courseID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return scanSessions(rows)
}

func (s *SessionStore) ListUpcomingByInstructor(ctx context.Context, instructorID string) ([]lsdom.LiveSession, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, course_id, section_id, instructor_id, title, status, starts_at,
		       join_window_min, duration_min, timezone, zoom_meeting_id, zoom_join_url,
		       recording_url, notes, created_at
		FROM live_sessions
		WHERE instructor_id = $1 AND status IN ('scheduled','join_open','live')
		ORDER BY starts_at ASC`, instructorID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	return scanSessions(rows)
}

func (s *SessionStore) UpdateStatus(ctx context.Context, id string, to lsdom.Status) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE live_sessions SET status = $2, updated_at = now() WHERE id = $1`,
		id, string(to))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return platform.ErrNotFound
	}
	return nil
}

func (s *SessionStore) SetZoomMeeting(ctx context.Context, id, meetingID, joinURL string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE live_sessions
		SET zoom_meeting_id = $2, zoom_join_url = $3, updated_at = now()
		WHERE id = $1`, id, meetingID, joinURL)
	return err
}

func (s *SessionStore) SetRecording(ctx context.Context, id, url string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE live_sessions SET recording_url = $2, updated_at = now() WHERE id = $1`,
		id, url)
	return err
}

// ===== AttendeeStore =====

type AttendeeStore struct{ db *sql.DB }

func NewAttendeeStore(db *sql.DB) *AttendeeStore { return &AttendeeStore{db: db} }

// RecordJoin — idempotent (UNIQUE session+student).
func (s *AttendeeStore) RecordJoin(ctx context.Context, liveSessionID, studentID, joinURL string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO live_session_attendees (live_session_id, student_id, zoom_join_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (live_session_id, student_id) DO NOTHING`,
		liveSessionID, studentID, nilIfEmpty(joinURL))
	return err
}

func (s *AttendeeStore) ListBySession(ctx context.Context, liveSessionID string) ([]lsdom.Attendee, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, live_session_id, student_id, zoom_join_url, joined_at, left_at, duration_min, created_at
		FROM live_session_attendees WHERE live_session_id = $1 ORDER BY created_at`,
		liveSessionID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []lsdom.Attendee
	for rows.Next() {
		a := lsdom.Attendee{}
		if err := rows.Scan(&a.ID, &a.LiveSessionID, &a.StudentID, &a.ZoomJoinURL,
			&a.JoinedAt, &a.LeftAt, &a.DurationMin, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// ===== WebhookStore =====

type WebhookStore struct{ db *sql.DB }

func NewWebhookStore(db *sql.DB) *WebhookStore { return &WebhookStore{db: db} }

// StoreIfNew — idempotent بـevent id.
func (s *WebhookStore) StoreIfNew(ctx context.Context, e *lsdom.WebhookEvent) (bool, error) {
	var existing string
	err := s.db.QueryRowContext(ctx,
		`SELECT id FROM zoom_webhook_events WHERE zoom_event_id = $1`, e.ZoomEventID).Scan(&existing)
	if err == nil {
		return true, nil // سبق استقباله
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return false, err
	}
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO zoom_webhook_events (zoom_event_id, event_type, meeting_id, payload)
		VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		e.ZoomEventID, e.EventType, e.MeetingID, e.Payload,
	).Scan(&e.ID, &e.CreatedAt)
	if err != nil {
		return false, fmt.Errorf("store webhook: %w", err)
	}
	return false, nil
}

func (s *WebhookStore) ListUnprocessed(ctx context.Context, limit int) ([]lsdom.WebhookEvent, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, zoom_event_id, event_type, meeting_id, payload, processed_at, created_at
		FROM zoom_webhook_events WHERE processed_at IS NULL
		ORDER BY created_at LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []lsdom.WebhookEvent
	for rows.Next() {
		e := lsdom.WebhookEvent{}
		if err := rows.Scan(&e.ID, &e.ZoomEventID, &e.EventType, &e.MeetingID, &e.Payload,
			&e.ProcessedAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *WebhookStore) MarkProcessed(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE zoom_webhook_events SET processed_at = now() WHERE id = $1`, id)
	return err
}

// ===== helpers =====

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func scanSessions(rows *sql.Rows) ([]lsdom.LiveSession, error) {
	var out []lsdom.LiveSession
	for rows.Next() {
		v := lsdom.LiveSession{}
		var status string
		var sectionID, zoomMeetingID, zoomJoinURL, recordingURL, notes sql.Null[string]
		if err := rows.Scan(&v.ID, &v.CourseID, &sectionID, &v.InstructorID, &v.Title,
			&status, &v.StartsAt, &v.JoinWindowMin, &v.DurationMin, &v.Timezone,
			&zoomMeetingID, &zoomJoinURL, &recordingURL, &notes, &v.CreatedAt); err != nil {
			return nil, err
		}
		v.SectionID, v.ZoomMeetingID, v.ZoomJoinURL = sectionID.V, zoomMeetingID.V, zoomJoinURL.V
		v.RecordingURL, v.Notes = recordingURL.V, notes.V
		v.Status = lsdom.Status(status)
		out = append(out, v)
	}
	return out, rows.Err()
}

// compile-time conformance
var (
	_ ports.SessionRepository  = (*SessionStore)(nil)
	_ ports.AttendeeRepository  = (*AttendeeStore)(nil)
	_ ports.WebhookRepository   = (*WebhookStore)(nil)
)
