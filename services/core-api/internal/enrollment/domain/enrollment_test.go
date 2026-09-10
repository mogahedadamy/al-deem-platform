// Unit tests — Enrollment domain (Blueprint 18: entitlement + price snapshot policies).
package domain

import "testing"

// ===== CanEnroll — entitlement =====

func TestCanEnroll_PublishedCourse(t *testing.T) {
	if !CanEnroll("published", "") {
		t.Fatal("fresh student must enroll in published course")
	}
}

func TestCanEnroll_NonPublishedCourse(t *testing.T) {
	for _, st := range []string{"draft", "pending_review", "archived"} {
		if CanEnroll(st, "") {
			t.Fatalf("enrollment in %s course must be rejected", st)
		}
	}
}

func TestCanEnroll_AlreadyEnrolled(t *testing.T) {
	// active enrollment blocks re-enroll
	if CanEnroll("published", "active") {
		t.Fatal("active enrollment must block re-enroll")
	}
	// pending_payment blocks too
	if CanEnroll("published", "pending_payment") {
		t.Fatal("pending_payment enrollment must block re-enroll")
	}
}

func TestCanEnroll_ReEnrollAfterCompletionOrCancel(t *testing.T) {
	// completed → إعادة الدفع لدورة جديدة مسموحة (سياسة إعادة التسجيل)
	if !CanEnroll("published", "completed") {
		t.Fatal("re-enroll after completion must be allowed")
	}
	if !CanEnroll("published", "cancelled") {
		t.Fatal("re-enroll after cancel must be allowed")
	}
}

// ===== RecomputeProgressPct =====

func TestRecomputeProgressPct(t *testing.T) {
	cases := []struct {
		total, viewed, want int
	}{
		{10, 10, 100},
		{10, 5, 50},
		{4, 3, 75},   // 3*100/4 = 75 (تقريب لأسفل صحيح)
		{3, 1, 33},   // 33.33 → 33
		{0, 0, 0},    // لا دروس
		{10, 15, 100}, // viewed > total → 100 cap
	}
	for _, c := range cases {
		if got := RecomputeProgressPct(c.total, c.viewed); got != c.want {
			t.Errorf("RecomputeProgressPct(%d, %d) = %d, want %d", c.total, c.viewed, got, c.want)
		}
	}
}
