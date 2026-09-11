// WorkerService — المعالجة الآلية لأحداث Zoom المعلّقة (Blueprint 11.3).
package application

import (
	"context"
	"encoding/json"
	"fmt"

	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
	"github.com/al-deem/platform/core-api/internal/livesessions/ports"
)

type WorkerService struct {
	sessions ports.SessionRepository
	webhooks ports.WebhookRepository
}

func NewWorkerService(s ports.SessionRepository, w ports.WebhookRepository) *WorkerService {
	return &WorkerService{sessions: s, webhooks: w}
}

// ProcessPendingZoomEvents — يجلب الأحداث غير المعالجة وينفذها:
// meeting.started/ended → تقدم حالة الحصة
// recording.completed → حفظ رابط التسجيل في الحصة المرتبطة
// ثم يعلم كل حدث processed (idempotent بالبنية).
func (s *WorkerService) ProcessPendingZoomEvents(ctx context.Context) (int, error) {
	events, err := s.webhooks.ListUnprocessed(ctx, 50)
	if err != nil {
		return 0, err
	}
	processed := 0
	for _, e := range events {
		if err := s.processOne(ctx, e); err != nil {
			// لا نوقف الباقي — نعيد الخطأ للسجل ونكمل
			continue
		}
		if err := s.webhooks.MarkProcessed(ctx, e.ID); err == nil {
			processed++
		}
	}
	return processed, nil
}

func (s *WorkerService) processOne(ctx context.Context, e lsdom.WebhookEvent) error {
	switch e.EventType {
	case "meeting.started":
		return s.advanceByMeeting(ctx, e.MeetingID, lsdom.StatusLive)
	case "meeting.ended":
		return s.advanceByMeeting(ctx, e.MeetingID, lsdom.StatusEnded)
	case "recording.completed":
		return s.saveRecording(ctx, e)
	case "meeting.participant_joined", "meeting.participant_left":
		// حضور تفصيلي — يُستخدم لاحقًا لحساب مدد الحضور
		return nil
	default:
		return nil // أنواع غير معروفة: نعلمها معالجة بلا فعل
	}
}

// advanceByMeeting — يقدّم الحصة المرتبطة بالاجتماع (بلا خطأ إن لم توجد).
func (s *WorkerService) advanceByMeeting(ctx context.Context, zoomMeetingID string, to lsdom.Status) error {
	if zoomMeetingID == "" {
		return nil
	}
	ses, err := s.sessions.GetByID(ctx, zoomMeetingID)
	if err != nil {
		// لا حصة مرتبطة — ليس خطأ
		return nil
	}
	// Zoom قد يصل متأخراً أو يفوّت webhook فتح نافذة الانضمام. لا نتجاوز
	// state machine مباشرة؛ نمر بكل transition قانوني للوصول إلى الحالة
	// التي أكدها Zoom.
	for ses.Status != to {
		next, ok := zoomTransitionStep(ses.Status, to)
		if !ok {
			return nil
		}
		if err := s.sessions.UpdateStatus(ctx, ses.ID, next); err != nil {
			return err
		}
		ses.Status = next
	}
	return nil
}

func zoomTransitionStep(from, target lsdom.Status) (lsdom.Status, bool) {
	switch from {
	case lsdom.StatusScheduled:
		if target == lsdom.StatusLive || target == lsdom.StatusEnded {
			return lsdom.StatusJoinOpen, true
		}
	case lsdom.StatusJoinOpen:
		if target == lsdom.StatusLive || target == lsdom.StatusEnded {
			return lsdom.StatusLive, true
		}
	case lsdom.StatusLive:
		if target == lsdom.StatusEnded {
			return lsdom.StatusEnded, true
		}
	}
	return "", false
}

// saveRecording — يستخرج download_url من payload ويحفظه في الحصة.
func (s *WorkerService) saveRecording(ctx context.Context, e lsdom.WebhookEvent) error {
	// payload شكل Zoom: {"payload":{"object":{"recording_files":[{"download_url":"..."}]}}}
	var p struct {
		Payload struct {
			Object struct {
				ID             string `json:"id"`
				RecordingFiles []struct {
					DownloadURL string `json:"download_url"`
					FileType    string `json:"file_type"`
				} `json:"recording_files"`
			} `json:"object"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(e.Payload, &p); err != nil {
		return fmt.Errorf("recording payload: %w", err)
	}
	meetingID := e.MeetingID
	if meetingID == "" {
		meetingID = p.Payload.Object.ID
	}
	if meetingID == "" {
		return nil
	}
	// أول ملف MP4 (أو أول ملف إن لم يوجد)
	url := ""
	for _, f := range p.Payload.Object.RecordingFiles {
		if f.FileType == "MP4" && f.DownloadURL != "" {
			url = f.DownloadURL
			break
		}
		if url == "" && f.DownloadURL != "" {
			url = f.DownloadURL
		}
	}
	if url == "" {
		return nil
	}
	ses, err := s.sessions.GetByID(ctx, meetingID)
	if err != nil {
		return nil // لا حصة مرتبطة
	}
	if err := s.sessions.SetRecording(ctx, ses.ID, url); err != nil {
		return err
	}
	// recording.completed قد يصل مباشرة بعد meeting.ended؛ نطبّق المرحلتين
	// القانونيتين بدلاً من ترك الحصة في ended رغم توفر التسجيل.
	if ses.Status == lsdom.StatusEnded {
		if err := s.sessions.UpdateStatus(ctx, ses.ID, lsdom.StatusRecordingProcessing); err != nil {
			return err
		}
		ses.Status = lsdom.StatusRecordingProcessing
	}
	if ses.Status == lsdom.StatusRecordingProcessing {
		return s.sessions.UpdateStatus(ctx, ses.ID, lsdom.StatusArchived)
	}
	return nil
}
