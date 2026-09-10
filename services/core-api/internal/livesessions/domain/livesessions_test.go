// Unit tests — LiveSessions domain (Blueprint 18: Zoom + 11.5).
package domain

import (
	"testing"
	"time"
)

var base = time.Date(2026, 9, 10, 15, 0, 0, 0, time.UTC)

func session() *LiveSession {
	return &LiveSession{
		ID:            "s1",
		CourseID:      "c1",
		InstructorID:  "i1",
		Status:        StatusJoinOpen,
		StartsAt:      base,
		JoinWindowMin: 10, // تفتح 14:50
		DurationMin:   60, // تنتهي 16:00
	}
}

// ===== نافذة الانضمام (خادمية — 11.4) =====

func TestCanJoin_InsideWindow(t *testing.T) {
	s := session()
	if err := s.CanJoin(base.Add(-5 * time.Minute)); err != nil {
		t.Fatalf("14:55 (within 10min window) must join: %v", err)
	}
	if err := s.CanJoin(base); err != nil {
		t.Fatalf("at start time must join: %v", err)
	}
}

func TestCanJoin_BeforeWindow(t *testing.T) {
	s := session()
	err := s.CanJoin(base.Add(-30 * time.Minute))
	if err == nil {
		t.Fatal("14:30 must be rejected — window opens 14:50")
	}
	if _, ok := err.(*JoinWindowError); !ok {
		t.Fatalf("must be JoinWindowError, got %T", err)
	}
}

func TestCanJoin_AfterEnd(t *testing.T) {
	s := session()
	err := s.CanJoin(base.Add(2 * time.Hour))
	if _, ok := err.(*EndedError); !ok {
		t.Fatalf("long after end must be EndedError, got %T", err)
	}
}

func TestCanJoin_EdgeAtWindowOpen(t *testing.T) {
	s := session()
	// بالضبط عند فتح النافذة 14:50 — مسموح
	if err := s.CanJoin(base.Add(-10 * time.Minute)); err != nil {
		t.Fatalf("exactly at window open must join: %v", err)
	}
	// بالضبط عند النهاية 16:00 — مسموح (الحد الأقصى)
	if err := s.CanJoin(base.Add(60 * time.Minute)); err != nil {
		t.Fatalf("exactly at end must join: %v", err)
	}
}

// ===== state machine (11.2) =====

func TestValidTransition(t *testing.T) {
	valid := [][2]Status{
		{StatusScheduled, StatusJoinOpen},
		{StatusJoinOpen, StatusLive},
		{StatusLive, StatusEnded},
		{StatusEnded, StatusRecordingProcessing},
		{StatusRecordingProcessing, StatusArchived},
		// الإلغاء من المراحل المبكرة
		{StatusScheduled, StatusCancelled},
		{StatusJoinOpen, StatusCancelled},
	}
	for _, tr := range valid {
		if !ValidTransition(tr[0], tr[1]) {
			t.Errorf("valid transition %s→%s rejected", tr[0], tr[1])
		}
	}
	invalid := [][2]Status{
		{StatusScheduled, StatusLive},              // قفز فوق join_open
		{StatusScheduled, StatusEnded},
		{StatusJoinOpen, StatusEnded},               // قفز فوق live
		{StatusLive, StatusJoinOpen},                // لا رجوع
		{StatusEnded, StatusLive},                  // انتهت لا تعود
		{StatusArchived, StatusScheduled},           // مؤرشفة نهائيًا
		{StatusCancelled, StatusLive},              // ملغاة نهائيًا
		{StatusRecordingProcessing, StatusEnded},    // لا رجوع
	}
	for _, tr := range invalid {
		if ValidTransition(tr[0], tr[1]) {
			t.Errorf("invalid transition %s→%s allowed", tr[0], tr[1])
		}
	}
}

func TestIsActivePhase(t *testing.T) {
	if !(StatusJoinOpen).IsActivePhase() || !(StatusLive).IsActivePhase() {
		t.Fatal("join_open and live must be active phase")
	}
	if (StatusScheduled).IsActivePhase() || (StatusEnded).IsActivePhase() {
		t.Fatal("scheduled/ended must not be active phase")
	}
}
