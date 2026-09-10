// Package assessment — الاختبارات والشهادات (قرار الإدارة #4).
// CertificateEligibilityPolicy: enrollment مكتمل AND final_score ≥ 70%
package domain

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

const (
	// MinCertifyScore — قرار #4: شهادة بعد اجتياز اختبار بنسبة ≥70%
	MinCertifyScore = 70
)

type Quiz struct {
	ID               string
	LessonID         string
	CourseID         string
	Title            string
	PassScore        int
	TimeLimitMinutes *int
}

type Question struct {
	ID       string
	QuizID   string
	Question string
	Options  []Option // JSON من DB
	Position int
	Points   int
}

type Option struct {
	Key     string `json:"key"`
	Text    string `json:"text"`
	Correct bool   `json:"correct"` // تُخفى عن الطالب — للتصحيح الخادمي فقط
}

type Attempt struct {
	ID           string
	QuizID       string
	CourseID     string
	StudentID    string
	EnrollmentID string
	Answers      map[string]string // questionID → optionKey
	Score        int
	Passed       bool
	FinishedAt   time.Time
	CertIssued   bool // صدرت شهادة عند هذا التقدّم (قرار #4)
}

// Grade — تصحيح خادمي: الإجابات الصحيحة فقط من الخادم (لا correct flags للعميل).
func Grade(questions []Question, answers map[string]string) (score int, passed bool) {
	if len(questions) == 0 {
		return 0, false
	}
	totalPoints := 0
	earned := 0
	for _, q := range questions {
		totalPoints += q.Points
		selected, ok := answers[q.ID]
		if !ok {
			continue
		}
		for _, opt := range q.Options {
			if opt.Key == selected && opt.Correct {
				earned += q.Points
				break
			}
		}
	}
	if totalPoints == 0 {
		return 0, false
	}
	score = earned * 100 / totalPoints
	return score, score >= MinCertifyScore
}

type Certificate struct {
	ID           string
	SerialNumber string
	StudentID    string
	CourseID     string
	EnrollmentID string
	StudentName string
	CourseTitle  string
	FinalScore   int
	IssuedAt     time.Time
}

type PaperRequestStatus string

const (
	PaperPending   PaperRequestStatus = "pending"
	PaperApproved  PaperRequestStatus = "approved"
	PaperPrinted   PaperRequestStatus = "printed"
	PaperDelivered PaperRequestStatus = "delivered"
)

type PaperRequest struct {
	ID              string
	CertificateID   string
	StudentID       string
	Status          PaperRequestStatus
	DeliveryAddress string
	DeliveryPhone   string
	Notes           *string
	HandledBy       *string
	HandledAt       *time.Time
	CreatedAt       time.Time
}

// GenerateSerial — رقم شهادة فريد قابل للمشاركة: ALD-<YYYY>-<hex6>
// (UUID داخليًا + رقم خارجي legible — قاعدة البنية)
func GenerateSerial(year int) (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("ALD-%d-%s", year, hex.EncodeToString(b)), nil
}

// CanTransitionPaper — state machine لطلب النسخة الورقية.
func CanTransitionPaper(from, to PaperRequestStatus) bool {
	switch from {
	case PaperPending:
		return to == PaperApproved
	case PaperApproved:
		return to == PaperPrinted
	case PaperPrinted:
		return to == PaperDelivered
	default:
		return false
	}
}
