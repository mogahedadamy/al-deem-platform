package application

import (
	"context"
	"testing"

	lsdom "github.com/al-deem/platform/core-api/internal/livesessions/domain"
)

type workerSessions struct {
	session   *lsdom.LiveSession
	updates   []lsdom.Status
	recording string
}

func (f *workerSessions) Create(context.Context, *lsdom.LiveSession) error { return nil }
func (f *workerSessions) GetByID(_ context.Context, _ string) (*lsdom.LiveSession, error) {
	return f.session, nil
}
func (f *workerSessions) ListByCourse(context.Context, string) ([]lsdom.LiveSession, error) {
	return nil, nil
}
func (f *workerSessions) ListUpcomingByInstructor(context.Context, string) ([]lsdom.LiveSession, error) {
	return nil, nil
}
func (f *workerSessions) UpdateStatus(_ context.Context, _ string, to lsdom.Status) error {
	f.updates = append(f.updates, to)
	f.session.Status = to
	return nil
}
func (f *workerSessions) SetZoomMeeting(context.Context, string, string, string) error { return nil }
func (f *workerSessions) SetRecording(_ context.Context, _ string, url string) error {
	f.recording = url
	return nil
}

type workerWebhooks struct {
	events []lsdom.WebhookEvent
	marked []string
}

func (f *workerWebhooks) StoreIfNew(context.Context, *lsdom.WebhookEvent) (bool, error) {
	return false, nil
}
func (f *workerWebhooks) ListUnprocessed(context.Context, int) ([]lsdom.WebhookEvent, error) {
	return f.events, nil
}
func (f *workerWebhooks) MarkProcessed(_ context.Context, id string) error {
	f.marked = append(f.marked, id)
	return nil
}

func TestWorkerBridgesMissingZoomLifecycleEvents(t *testing.T) {
	sessions := &workerSessions{session: &lsdom.LiveSession{ID: "session", Status: lsdom.StatusScheduled}}
	webhooks := &workerWebhooks{events: []lsdom.WebhookEvent{{
		ID: "event", EventType: "meeting.ended", MeetingID: "zoom-meeting",
	}}}
	worker := NewWorkerService(sessions, webhooks)

	processed, err := worker.ProcessPendingZoomEvents(context.Background())
	if err != nil || processed != 1 {
		t.Fatalf("processed=%d err=%v", processed, err)
	}
	want := []lsdom.Status{lsdom.StatusJoinOpen, lsdom.StatusLive, lsdom.StatusEnded}
	if len(sessions.updates) != len(want) {
		t.Fatalf("updates=%v, want=%v", sessions.updates, want)
	}
	for i := range want {
		if sessions.updates[i] != want[i] {
			t.Fatalf("updates=%v, want=%v", sessions.updates, want)
		}
	}
	if len(webhooks.marked) != 1 || webhooks.marked[0] != "event" {
		t.Fatalf("event was not marked processed: %v", webhooks.marked)
	}
}

func TestWorkerArchivesRecordingAfterEndedSession(t *testing.T) {
	sessions := &workerSessions{session: &lsdom.LiveSession{ID: "session", Status: lsdom.StatusEnded}}
	webhooks := &workerWebhooks{events: []lsdom.WebhookEvent{{
		ID: "recording", EventType: "recording.completed", MeetingID: "zoom-meeting",
		Payload: []byte(`{"payload":{"object":{"id":"zoom-meeting","recording_files":[{"file_type":"MP4","download_url":"https://zoom.example/recording.mp4"}]}}}`),
	}}}
	worker := NewWorkerService(sessions, webhooks)

	processed, err := worker.ProcessPendingZoomEvents(context.Background())
	if err != nil || processed != 1 {
		t.Fatalf("processed=%d err=%v", processed, err)
	}
	if sessions.recording != "https://zoom.example/recording.mp4" {
		t.Fatalf("recording URL=%q", sessions.recording)
	}
	want := []lsdom.Status{lsdom.StatusRecordingProcessing, lsdom.StatusArchived}
	if len(sessions.updates) != len(want) || sessions.updates[0] != want[0] || sessions.updates[1] != want[1] {
		t.Fatalf("updates=%v, want=%v", sessions.updates, want)
	}
}
