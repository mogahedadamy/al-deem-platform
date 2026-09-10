// Unit tests — Assessment domain (Blueprint 18: certificate eligibility + grade).
package domain

import "testing"

// ===== Grade — التصحيح الخادمي =====

func TestGrade_AllCorrect(t *testing.T) {
	qs := []Question{q("q1", 10), q("q2", 10)}
	score, passed := Grade(qs, map[string]string{"q1": "b", "q2": "b"})
	if score != 100 || !passed {
		t.Fatalf("all correct: score=%d passed=%v, want 100/true", score, passed)
	}
}

func TestGrade_PartialBelowThreshold(t *testing.T) {
	// قرار #4: 70% للنجاح
	qs := []Question{q("q1", 30), q("q2", 30), q("q3", 40)}
	// q1 صحيح فقط = 30 نقطة من 100 = 30% → لا نجاح
	score, passed := Grade(qs, map[string]string{"q1": "b"})
	if score != 30 || passed {
		t.Fatalf("30%%: score=%d passed=%v, want 30/false", score, passed)
	}
	// q1+q2 = 60% → لا نجاح (لا 70%)
	score, passed = Grade(qs, map[string]string{"q1": "b", "q2": "b"})
	if score != 60 || passed {
		t.Fatalf("60%%: score=%d passed=%v, want 60/false", score, passed)
	}
	// q1+q3 = 70% → نجاح (الحد الأدنى حرفيًا — قرار #4: ≥70%)
	score, passed = Grade(qs, map[string]string{"q1": "b", "q3": "b"})
	if score != 70 || !passed {
		t.Fatalf("70%% exactly: score=%d passed=%v, want 70/true (≥70 rule)", score, passed)
	}
}

func TestGrade_WrongAndMissing(t *testing.T) {
	qs := []Question{q("q1", 10)}
	score, passed := Grade(qs, map[string]string{"q1": "a"}) // إجابة خاطئة
	if score != 0 || passed {
		t.Fatal("wrong answer must score 0")
	}
	score, _ = Grade(qs, map[string]string{}) // لا إجابة
	if score != 0 {
		t.Fatal("missing answer must score 0")
	}
}

func TestGrade_EmptyQuiz(t *testing.T) {
	if _, passed := Grade(nil, nil); passed {
		t.Fatal("empty quiz must not pass")
	}
}

// ===== Certificate eligibility (قرار #4: ≥70% + إكمال) =====

func TestMinCertifyScore(t *testing.T) {
	if MinCertifyScore != 70 {
		t.Fatalf("MinCertifyScore = %d, want 70 (decision #4)", MinCertifyScore)
	}
}

// ===== GenerateSerial — شكل الرقم الخارجي =====

func TestGenerateSerial(t *testing.T) {
	s1, err := GenerateSerial(2026)
	if err != nil {
		t.Fatal(err)
	}
	if len(s1) != len("ALD-2026-XXXXXXXX") {
		t.Fatalf("serial format: %s", s1)
	}
	s2, _ := GenerateSerial(2026)
	if s1 == s2 {
		t.Fatal("serials must be unique")
	}
}

// ===== Paper request state machine (طلب النسخة الورقية — قرار #4) =====

func TestCanTransitionPaper(t *testing.T) {
	valid := [][2]PaperRequestStatus{
		{PaperPending, PaperApproved},
		{PaperApproved, PaperPrinted},
		{PaperPrinted, PaperDelivered},
	}
	for _, tr := range valid {
		if !CanTransitionPaper(tr[0], tr[1]) {
			t.Errorf("valid transition %s→%s rejected", tr[0], tr[1])
		}
	}
	invalid := [][2]PaperRequestStatus{
		{PaperPending, PaperPrinted},  // قفز فوق الاعتماد
		{PaperPending, PaperDelivered},
		{PaperDelivered, PaperPending}, // لا رجوع بعد التسليم
		{PaperDelivered, PaperPrinted},
	}
	for _, tr := range invalid {
		if CanTransitionPaper(tr[0], tr[1]) {
			t.Errorf("invalid transition %s→%s allowed", tr[0], tr[1])
		}
	}
}

// helper — يبني سؤالًا بإجابة صحيحة "b"
func q(id string, points int) Question {
	return Question{
		ID:     id,
		Points: points,
		Options: []Option{
			{Key: "a", Text: "أ"},
			{Key: "b", Text: "ب", Correct: true},
			{Key: "c", Text: "ج"},
		},
	}
}
