// Application — Use Cases الاختبارات والشهادات.
// القرار المالي/التعليمي (إصدار شهادة) خادمي ذري مع audit.
package application

import (
	"context"
	"fmt"
	"time"

	asmdom "github.com/al-deem/platform/core-api/internal/assessment/domain"
	"github.com/al-deem/platform/core-api/internal/assessment/ports"
	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type AssessmentService struct {
	quizzes       ports.QuizRepository
	attempts      ports.AttemptRepository
	certificates  ports.CertificateRepository
	papers        ports.PaperRequestRepository
	audit         idports.AuditLogger
	// lookups عبر modules أخرى (بدون استيراد دوّار)
	enrollmentActive func(ctx context.Context, enrollmentID, studentID string) (active bool, courseID string, err error)
	studentName      func(ctx context.Context, studentID string) (string, error)
	courseTitle      func(ctx context.Context, courseID string) (string, error)
	courseIDBySlug   func(ctx context.Context, slug string) (string, error)
}

func NewAssessmentService(
	q ports.QuizRepository,
	a ports.AttemptRepository,
	c ports.CertificateRepository,
	p ports.PaperRequestRepository,
	audit idports.AuditLogger,
	enrollmentActive func(ctx context.Context, enrollmentID, studentID string) (bool, string, error),
	studentName func(ctx context.Context, studentID string) (string, error),
	courseTitle func(ctx context.Context, courseID string) (string, error),
	courseIDBySlug func(ctx context.Context, slug string) (string, error),
) *AssessmentService {
	return &AssessmentService{quizzes: q, attempts: a, certificates: c, papers: p,
		audit: audit, enrollmentActive: enrollmentActive, studentName: studentName,
		courseTitle: courseTitle, courseIDBySlug: courseIDBySlug}
}

// ===== Instructor: quiz authoring =====

// CreateQuiz — مدرب الدورة ينشئ اختبارًا (مع أسئلته). الصحيح خادمي.
func (s *AssessmentService) CreateQuiz(ctx context.Context, actor *iddomain.Actor, in QuizInput) (*asmdom.Quiz, error) {
	if !actor.HasRole(iddomain.RoleInstructor) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, platform.ErrForbidden
	}
	if in.Title == "" || len(in.Questions) < 1 {
		return nil, platform.ErrValidation
	}
	// كل سؤال: خياران+، إجابة صحيحة واحدة على الأقل
	for i, q := range in.Questions {
		if q.Question == "" || len(q.Options) < 2 {
			return nil, &platform.DomainError{Code: "VALIDATION", Msg: fmt.Sprintf("question %d: needs text and ≥2 options", i+1)}
		}
		hasCorrect := false
		for _, o := range q.Options {
			if o.Correct {
				hasCorrect = true
				break
			}
		}
		if !hasCorrect {
			return nil, &platform.DomainError{Code: "VALIDATION", Msg: fmt.Sprintf("question %d: needs at least one correct option", i+1)}
		}
	}
	quiz := &asmdom.Quiz{
		LessonID:  in.LessonID,
		CourseID:  in.CourseID,
		Title:     in.Title,
		PassScore: asmdom.MinCertifyScore,
	}
	if err := s.quizzes.Create(ctx, quiz, in.Questions); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "quiz.created", "quiz", quiz.ID, nil,
		map[string]any{"title": in.Title, "questions": len(in.Questions)})
	return quiz, nil
}

// GetQuizMetaByCourseSlug — وصف الاختبار بالدورة (عام — لا أسئلة).
func (s *AssessmentService) GetQuizMetaByCourseSlug(ctx context.Context, slug string) (*asmdom.Quiz, []asmdom.Question, error) {
	courseID, err := s.courseIDBySlug(ctx, slug)
	if err != nil {
		return nil, nil, err
	}
	quiz, err := s.quizzes.GetByCourse(ctx, courseID)
	if err != nil {
		return nil, nil, err
	}
	questions, err := s.quizzes.ListQuestions(ctx, quiz.ID)
	if err != nil {
		return nil, nil, err
	}
	return quiz, questions, nil
}

// GetQuizForStudent — الأسئلة بدون الإجابات الصحيحة.
func (s *AssessmentService) GetQuizForStudent(ctx context.Context, quizID string) (*asmdom.Quiz, []asmdom.Question, error) {
	q, err := s.quizzes.GetByID(ctx, quizID)
	if err != nil {
		return nil, nil, err
	}
	questions, err := s.quizzes.ListQuestions(ctx, quizID)
	if err != nil {
		return nil, nil, err
	}
	// strip correct flags — العميل يرى key/text فقط
	safe := make([]asmdom.Question, len(questions))
	for i, qq := range questions {
		opts := make([]asmdom.Option, len(qq.Options))
		for j, o := range qq.Options {
			opts[j] = asmdom.Option{Key: o.Key, Text: o.Text}
		}
		safe[i] = asmdom.Question{ID: qq.ID, Question: qq.Question, Options: opts, Position: qq.Position}
	}
	return q, safe, nil
}

// ===== Student: attempt =====

// SubmitAttempt — طالب نشط فقط يقدم إجاباته؛ التصحيح خادمي.
// عند النجاح ≥70%: تُصدر الشهادة الرقمية تلقائيًا (قرار #4).
func (s *AssessmentService) SubmitAttempt(ctx context.Context, actor *iddomain.Actor, quizID, enrollmentID string, answers map[string]string) (*asmdom.Attempt, error) {
	quiz, err := s.quizzes.GetByID(ctx, quizID)
	if err != nil {
		return nil, err
	}
	// تسجيل نشط لصاحبه فقط
	active, courseID, err := s.enrollmentActive(ctx, enrollmentID, actor.ID)
	if err != nil {
		return nil, err
	}
	if !active {
		return nil, platform.ErrForbidden // لا اختبار بدون تسجيل فعّال
	}
	if quiz.CourseID != courseID {
		return nil, platform.ErrConflict // الاختبار لدورة أخرى
	}
	questions, err := s.quizzes.ListQuestions(ctx, quizID)
	if err != nil {
		return nil, err
	}
	// التصحيح الخادمي
	score, passed := asmdom.Grade(questions, answers)
	attempt := &asmdom.Attempt{
		QuizID: quizID, CourseID: courseID, StudentID: actor.ID,
		EnrollmentID: enrollmentID, Answers: answers, Score: score, Passed: passed,
		FinishedAt: time.Now(),
	}
	if err := s.attempts.Create(ctx, attempt, score, passed); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "quiz.attempted", "quiz", quizID, nil,
		map[string]any{"score": score, "passed": passed})

	// قرار #4: شهادة رقمية تلقائية عند ≥70%
	var cert *asmdom.Certificate
	if passed {
		cert, err = s.issueCertificate(ctx, actor, enrollmentID, courseID, score)
		if err != nil {
			// المحاولة نجحت — فشل الشهادة يُسجَّل لكن لا يفشل الرد
			_ = s.audit.Log(ctx, actor.ID, "certificate.issue_failed", "enrollment", enrollmentID, nil, map[string]any{"err": err.Error()})
		}
		attempt.CertIssued = cert != nil
	}
	return attempt, nil
}

// issueCertificate — idempotent (شهادة واحدة للتسجيل).
func (s *AssessmentService) issueCertificate(ctx context.Context, actor *iddomain.Actor, enrollmentID, courseID string, score int) (*asmdom.Certificate, error) {
	name, err := s.studentName(ctx, actor.ID)
	if err != nil {
		return nil, err
	}
	title, err := s.courseTitle(ctx, courseID)
	if err != nil {
		return nil, err
	}
	serial, err := asmdom.GenerateSerial(time.Now().Year())
	if err != nil {
		return nil, err
	}
	c := &asmdom.Certificate{
		SerialNumber: serial, StudentID: actor.ID, CourseID: courseID,
		EnrollmentID: enrollmentID, StudentName: name, CourseTitle: title,
		FinalScore: score, IssuedAt: time.Now(),
	}
	issued, err := s.certificates.IssueIfEligible(ctx, c)
	if err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "certificate.issued", "certificate", issued.ID, nil,
		map[string]any{"serial": issued.SerialNumber, "score": score})
	return issued, nil
}

// MyCertificates — شهادات الطالب.
func (s *AssessmentService) MyCertificates(ctx context.Context, actor *iddomain.Actor) ([]asmdom.Certificate, error) {
	return s.certificates.ListByStudent(ctx, actor.ID)
}

// VerifyCertificate — عام: التحقق بالرقم التسلسلي (صفحة عامة للـwww).
func (s *AssessmentService) VerifyCertificate(ctx context.Context, serial string) (*asmdom.Certificate, error) {
	c, err := s.certificates.GetBySerial(ctx, serial)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// ===== Paper certificates (قرار #4: نسخة ورقية بطلب) =====

// RequestPaper — الطالب يطلب نسخة ورقية لشهادته (تسليم بعنوان).
func (s *AssessmentService) RequestPaper(ctx context.Context, actor *iddomain.Actor, certificateID, address, phone, notes string) (*asmdom.PaperRequest, error) {
	// الشهادة تخص الطالب نفسه
	certs, err := s.certificates.ListByStudent(ctx, actor.ID)
	if err != nil {
		return nil, err
	}
	owned := false
	for _, c := range certs {
		if c.ID == certificateID {
			owned = true
			break
		}
	}
	if !owned {
		return nil, platform.ErrForbidden
	}
	if address == "" || phone == "" {
		return nil, platform.ErrValidation
	}
	r := &asmdom.PaperRequest{
		CertificateID: certificateID, StudentID: actor.ID,
		Status: asmdom.PaperPending, DeliveryAddress: address, DeliveryPhone: phone,
	}
	if notes != "" {
		r.Notes = &notes
	}
	if err := s.papers.Create(ctx, r); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "paper_certificate.requested", "paper_request", r.ID, nil,
		map[string]any{"certificateId": certificateID})
	return r, nil
}

// MyPaperRequests — طلبات النسخ الورقية للطالب نفسه.
func (s *AssessmentService) MyPaperRequests(ctx context.Context, actor *iddomain.Actor) ([]asmdom.PaperRequest, error) {
	return s.papers.ListByStudent(ctx, actor.ID)
}

// AdvancePaper — erp_staff/manager: pending → approved → printed → delivered.
func (s *AssessmentService) AdvancePaper(ctx context.Context, actor *iddomain.Actor, requestID string, to asmdom.PaperRequestStatus) error {
	if !actor.HasRole(iddomain.RoleErpStaff) && !actor.HasRole(iddomain.RoleErpManager) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return platform.ErrForbidden
	}
	// state machine يتحقق في domain — الـrepo يرفض غير الصالح
	if err := s.papers.UpdateStatus(ctx, requestID, to, actor.ID); err != nil {
		return err
	}
	return s.audit.Log(ctx, actor.ID, "paper_certificate."+string(to), "paper_request", requestID, nil, nil)
}

// ListPaperRequests — للموظف الإداري.
func (s *AssessmentService) ListPaperRequests(ctx context.Context, actor *iddomain.Actor, status asmdom.PaperRequestStatus, page, pageSize int) ([]asmdom.PaperRequest, int, error) {
	if !actor.HasRole(iddomain.RoleErpStaff) && !actor.HasRole(iddomain.RoleErpManager) && !actor.HasRole(iddomain.RoleSystemAdmin) {
		return nil, 0, platform.ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.papers.ListByStatus(ctx, status, page, pageSize)
}

// ===== Inputs =====

type QuizInput struct {
	LessonID  string
	CourseID  string
	Title     string
	Questions []asmdom.Question
}
