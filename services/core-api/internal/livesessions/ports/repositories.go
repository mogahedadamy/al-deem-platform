// Ports — مستودعات الحصص المباشرة.
package ports

import (
	"context"

	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
)

type SessionRepository interface {
	// Create — حصة جديدة (يدرس قيد عدم التعارض خادميًا في DB)
	Create(ctx context.Context, s *lsdom.LiveSession) error
	GetByID(ctx context.Context, id string) (*lsdom.LiveSession, error)
	// ListByCourse — حصص الدورة (للطالب المسجّل)
	ListByCourse(ctx context.Context, courseID string) ([]lsdom.LiveSession, error)
	// ListUpcoming — حصص المدرب القادمة
	ListUpcomingByInstructor(ctx context.Context, instructorID string) ([]lsdom.LiveSession, error)
	// UpdateStatus — تحول الحالة (state machine يتحقق في application)
	UpdateStatus(ctx context.Context, id string, to lsdom.Status) error
	// SetZoomMeeting — ربط اجتماع Zoom بالحصة (خادمي أو إداري)
	SetZoomMeeting(ctx context.Context, id, meetingID, joinURL string) error
	// SetRecording — رابط التسجيل بعد المعالجة
	SetRecording(ctx context.Context, id, url string) error
}

type AttendeeRepository interface {
	// RecordJoin — تسجيل حضور الطالب (idempotent: UNIQUE session+student)
	RecordJoin(ctx context.Context, liveSessionID, studentID, joinURL string) error
	ListBySession(ctx context.Context, liveSessionID string) ([]lsdom.Attendee, error)
}

type WebhookRepository interface {
	// StoreIfNew — idempotent بـevent id. يعود processed=true إن كان موجودًا سابقًا.
	StoreIfNew(ctx context.Context, e *lsdom.WebhookEvent) (alreadyProcessed bool, err error)
	// ListUnprocessed — للworker
	ListUnprocessed(ctx context.Context, limit int) ([]lsdom.WebhookEvent, error)
	MarkProcessed(ctx context.Context, id string) error
}
