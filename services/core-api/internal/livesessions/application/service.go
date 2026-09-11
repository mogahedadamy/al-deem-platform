// Application — Use Cases الحصص المباشرة (قرار #5).
package application

import (
	"context"
	"fmt"
	"time"

	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
	"github.com/al-deem/platform/core-api/internal/livesessions/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type LiveSessionsService struct {
	sessions  ports.SessionRepository
	attendees ports.AttendeeRepository
	webhooks  ports.WebhookRepository
	meetings  ports.MeetingProvider
	audit     idports.AuditLogger

	// lookups عبر modules أخرى (closures — لا استيراد دوّار)
	courseHasLive func(ctx context.Context, courseID string) (bool, string, error) // has_live, instructorID
	studentActive func(ctx context.Context, courseID, studentID string) (bool, error)
	isInstructor  func(ctx context.Context, courseID, userID string) (bool, error)
}

func NewLiveSessionsService(
	s ports.SessionRepository,
	a ports.AttendeeRepository,
	w ports.WebhookRepository,
	meetings ports.MeetingProvider,
	audit idports.AuditLogger,
	courseHasLive func(ctx context.Context, courseID string) (bool, string, error),
	studentActive func(ctx context.Context, courseID, studentID string) (bool, error),
	isInstructor func(ctx context.Context, courseID, userID string) (bool, error),
) *LiveSessionsService {
	return &LiveSessionsService{sessions: s, attendees: a, webhooks: w, meetings: meetings, audit: audit,
		courseHasLive: courseHasLive, studentActive: studentActive, isInstructor: isInstructor}
}

// Schedule — مدرب الدورة ينشئ حصة (الدورة يجب has_live_sessions=true — قرار #5).
func (s *LiveSessionsService) Schedule(ctx context.Context, actor *iddomain.Actor, in ScheduleInput) (*lsdom.LiveSession, error) {
	if !actor.HasRole(iddomain.RoleInstructor) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	if in.Title == "" || in.CourseID == "" || in.StartsAt.IsZero() {
		return nil, platform.ErrValidation
	}
	hasLive, courseInstructor, err := s.courseHasLive(ctx, in.CourseID)
	if err != nil {
		return nil, err
	}
	if !hasLive {
		// قرار #5: الحصص فقط للدورات المفعّلة
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "الدورة غير مفعّلة للحصص المباشرة — فعّل has_live_sessions أولًا"}
	}
	// مدرب الدورة نفسه فقط (أو system_admin)
	if actor.ID != courseInstructor && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	if in.DurationMin < 5 || in.DurationMin > 480 {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "مدة الحصة بين 5 و480 دقيقة"}
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Khartoum"
	}
	if in.JoinWindowMin == 0 {
		in.JoinWindowMin = 10
	}
	if s.meetings == nil {
		return nil, &platform.DomainError{Code: "UNAVAILABLE", Msg: "خدمة الاجتماعات المباشرة غير مهيأة"}
	}
	ses := &lsdom.LiveSession{
		CourseID:      in.CourseID,
		SectionID:     in.SectionID,
		InstructorID:  actor.ID,
		Title:         in.Title,
		Status:        lsdom.StatusScheduled,
		StartsAt:      in.StartsAt,
		JoinWindowMin: in.JoinWindowMin,
		DurationMin:   in.DurationMin,
		Timezone:      in.Timezone,
		Notes:         in.Notes,
	}
	if err := s.sessions.Create(ctx, ses); err != nil {
		return nil, err // قيد التعارض يرفض تداخل مواعيد المدرب
	}
	meeting, err := s.meetings.CreateMeeting(ctx, ports.MeetingRequest{
		Topic: in.Title, StartsAt: in.StartsAt, DurationMin: in.DurationMin, Timezone: in.Timezone,
	})
	if err != nil {
		_ = s.sessions.UpdateStatus(ctx, ses.ID, lsdom.StatusCancelled)
		return nil, &platform.DomainError{Code: "UNAVAILABLE", Msg: "تعذر إنشاء اجتماع Zoom"}
	}
	if err := s.sessions.SetZoomMeeting(ctx, ses.ID, meeting.ID, meeting.JoinURL); err != nil {
		_ = s.sessions.UpdateStatus(ctx, ses.ID, lsdom.StatusCancelled)
		return nil, err
	}
	ses.ZoomMeetingID, ses.ZoomJoinURL = meeting.ID, meeting.JoinURL
	_ = s.audit.Log(ctx, actor.ID, "live_session.scheduled", "live_session", ses.ID, nil,
		map[string]any{"courseId": in.CourseID, "startsAt": in.StartsAt, "zoomMeetingId": meeting.ID})
	return ses, nil
}

// ListForStudent — حصص الدورة للطالب المسجّل النشط (مع حالة انضمامه).
func (s *LiveSessionsService) ListForStudent(ctx context.Context, actor *iddomain.Actor, courseID string) ([]lsdom.LiveSession, error) {
	active, err := s.studentActive(ctx, courseID, actor.ID)
	if err != nil {
		return nil, err
	}
	if !active {
		return nil, platform.ErrForbidden
	}
	return s.sessions.ListByCourse(ctx, courseID)
}

// ListForInstructor — حصص المدرب القادمة.
func (s *LiveSessionsService) ListForInstructor(ctx context.Context, actor *iddomain.Actor) ([]lsdom.LiveSession, error) {
	if !actor.HasRole(iddomain.RoleInstructor) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	return s.sessions.ListUpcomingByInstructor(ctx, actor.ID)
}

// Join — الطالب الانضمام: نافذة الانضمام + enrollment + تسجيل حضور idempotent.
// يعيد رابط الانضمام (Zoom URL إن رُبطت الحصة باجتماع، أو تأكيد الحضور فقط).
func (s *LiveSessionsService) Join(ctx context.Context, actor *iddomain.Actor, sessionID string) (*lsdom.LiveSession, error) {
	ses, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	// enrollment نشط في دورة الحصة
	active, err := s.studentActive(ctx, ses.CourseID, actor.ID)
	if err != nil {
		return nil, err
	}
	if !active {
		return nil, platform.ErrForbidden
	}
	// نافذة الانضمام
	if err := ses.CanJoin(time.Now()); err != nil {
		if _, ok := err.(*lsdom.JoinWindowError); ok {
			return nil, &platform.DomainError{Code: "CONFLICT", Msg: "نافذة الانضمام لم تُفتح بعد"}
		}
		return nil, &platform.DomainError{Code: "CONFLICT", Msg: "الحصة انتهت"}
	}
	// حضور idempotent
	joinURL := ses.ZoomJoinURL
	if err := s.attendees.RecordJoin(ctx, sessionID, actor.ID, joinURL); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "live_session.joined", "live_session", sessionID, nil, nil)
	return ses, nil
}

// AdvanceStatus — تحول حالة (مدرب أو نظام): scheduled→join_open→live→ended→…
func (s *LiveSessionsService) AdvanceStatus(ctx context.Context, actor *iddomain.Actor, sessionID string, to lsdom.Status) error {
	ses, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if ses.InstructorID != actor.ID && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return platform.ErrForbidden
	}
	if !lsdom.ValidTransition(ses.Status, to) {
		return platform.ErrConflict
	}
	if err := s.sessions.UpdateStatus(ctx, sessionID, to); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "live_session."+string(to), "live_session", sessionID, nil, nil)
}

// HandleWebhook — استقبال حدث Zoom (idempotent بـevent id).
// التحقق من التوقيع في transport (transport-level) — هنا المعالجة فقط.
func (s *LiveSessionsService) HandleWebhook(ctx context.Context, e *lsdom.WebhookEvent) error {
	already, err := s.webhooks.StoreIfNew(ctx, e)
	if err != nil {
		return err
	}
	if already {
		return nil // idempotent — سبق معالجته
	}
	// معالجة فورية حسب نوع الحدث (الرئيسي)؛ الأحداث الثقيلة للworker لاحقًا
	switch e.EventType {
	case "meeting.started":
		// تحديث الحصة إلى live عبر meeting_id
		if e.MeetingID != "" {
			// نجلب الحصة بـzoom_meeting_id (نتجاهل الخطأ — قد تكون غير مرتبطة)
			_ = s.advanceByMeeting(ctx, e.MeetingID, lsdom.StatusLive)
		}
	case "meeting.ended":
		if e.MeetingID != "" {
			_ = s.advanceByMeeting(ctx, e.MeetingID, lsdom.StatusEnded)
		}
	case "recording.completed":
		// payload يحمل download_url — يحفظه worker لاحقًا (هنا نكتفي بالتخزين)
	}
	return nil
}

// advanceByMeeting — تحديث حالة الحصة المرتبطة باجتماع Zoom.
func (s *LiveSessionsService) advanceByMeeting(ctx context.Context, zoomMeetingID string, to lsdom.Status) error {
	ses, err := s.sessions.GetByID(ctx, zoomMeetingID)
	if err != nil {
		return fmt.Errorf("session by meeting: %w", err)
	}
	if lsdom.ValidTransition(ses.Status, to) {
		return s.sessions.UpdateStatus(ctx, ses.ID, to)
	}
	return nil
}

// ===== Inputs =====

type ScheduleInput struct {
	CourseID      string
	SectionID     string
	Title         string
	StartsAt      time.Time
	DurationMin   int
	JoinWindowMin int
	Timezone      string
	Notes         string
}
