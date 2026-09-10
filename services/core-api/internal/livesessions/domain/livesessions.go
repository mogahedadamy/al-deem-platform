// Domain — الحصص المباشرة (قرار الإدارة #5: Zoom مركزي اختياري حسب الدورة).
package domain

import (
	"fmt"
	"time"
)

// Status — دورة حياة الحصة (Blueprint 11.2)
type Status string

const (
	StatusScheduled          Status = "scheduled"
	StatusJoinOpen           Status = "join_open"
	StatusLive               Status = "live"
	StatusEnded              Status = "ended"
	StatusRecordingProcessing Status = "recording_processing"
	StatusArchived           Status = "archived"
	StatusCancelled          Status = "cancelled"
)

// LiveSession — حصة مباشرة مرتبطة بدورة has_live_sessions=true.
type LiveSession struct {
	ID            string
	CourseID      string
	SectionID     string // nullable
	InstructorID  string
	Title         string
	Status        Status
	StartsAt      time.Time
	JoinWindowMin int
	DurationMin   int
	Timezone      string
	ZoomMeetingID string // nullable — يُنشأ خادميًا أو يُدخل
	ZoomJoinURL   string // nullable
	RecordingURL  string // nullable
	Notes         string // nullable
	CreatedAt     time.Time
}

// Attendee — حضور الطالب الحصة.
type Attendee struct {
	ID            string
	LiveSessionID string
	StudentID     string
	ZoomJoinURL   string // nullable
	JoinedAt      *time.Time
	LeftAt        *time.Time
	DurationMin   *int
	CreatedAt     time.Time
}

// WebhookEvent — حدث Zoom (idempotent بـZoomEventID).
type WebhookEvent struct {
	ID          string
	ZoomEventID string
	EventType   string
	MeetingID   string
	Payload     []byte
	ProcessedAt *time.Time
	CreatedAt   time.Time
}

// CanJoin — نافذة الانضمام: تفتح قبل الموعد بـJoinWindowMin وتغلق عند النهاية.
// الطالب النشط في الدورة فقط (يُتحقق في application).
func (s *LiveSession) CanJoin(now time.Time) error {
	open := s.StartsAt.Add(-time.Duration(s.JoinWindowMin) * time.Minute)
	end := s.StartsAt.Add(time.Duration(s.DurationMin) * time.Minute)
	if now.Before(open) {
		return &JoinWindowError{OpensAt: open}
	}
	if now.After(end) {
		return &EndedError{}
	}
	return nil
}

// JoinWindowError — النافذة لم تُفتح بعد.
type JoinWindowError struct{ OpensAt time.Time }

func (e *JoinWindowError) Error() string {
	return fmt.Sprintf("join window opens at %s", e.OpensAt.Format(time.RFC3339))
}

// EndedError — الحصة انتهت.
type EndedError struct{}

func (e *EndedError) Error() string { return "session already ended" }

// ValidTransition — تحولات الحالة المسموحة.
func ValidTransition(from, to Status) bool {
	switch from {
	case StatusScheduled:
		return to == StatusJoinOpen || to == StatusCancelled
	case StatusJoinOpen:
		return to == StatusLive || to == StatusCancelled
	case StatusLive:
		return to == StatusEnded
	case StatusEnded:
		return to == StatusRecordingProcessing
	case StatusRecordingProcessing:
		return to == StatusArchived
	}
	return false
}

// IsActivePhase — المراحل التي يمنع فيها حذف/تعديل الجدولة.
func (s Status) IsActivePhase() bool {
	return s == StatusJoinOpen || s == StatusLive
}
