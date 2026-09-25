// Application — حالات استخدام الاستفسارات.
package application

import (
	"context"
	"net/mail"
	"strings"

	iddomain "github.com/al-deem/platform/core-api/internal/identity/domain"
	idports "github.com/al-deem/platform/core-api/internal/identity/ports"
	ldom "github.com/al-deem/platform/core-api/internal/leads/domain"
	"github.com/al-deem/platform/core-api/internal/leads/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type LeadsService struct {
	repo  ports.LeadRepository
	audit idports.AuditLogger
}

func NewLeadsService(r ports.LeadRepository, audit idports.AuditLogger) *LeadsService {
	return &LeadsService{repo: r, audit: audit}
}

// Submit — استقبال استفسار عام من الموقع (بلا جلسة — endpoint عام).
func (s *LeadsService) Submit(ctx context.Context, in SubmitInput) (*ldom.Lead, error) {
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.TrimSpace(in.Email)
	in.Message = strings.TrimSpace(in.Message)
	if in.Name == "" || len(in.Name) > 200 {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "الاسم مطلوب"}
	}
	if _, err := mail.ParseAddress(in.Email); err != nil {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "بريد إلكتروني غير صالح"}
	}
	if in.Message == "" || len(in.Message) > 4000 {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "الرسالة مطلوبة (4000 حرف كحد أقصى)"}
	}
	if in.Subject == "" {
		in.Subject = "استفسار عام"
	}
	if in.Source == "" {
		in.Source = "website"
	}
	l := &ldom.Lead{
		Name: in.Name, Email: in.Email, Phone: strings.TrimSpace(in.Phone),
		Subject: in.Subject, Message: in.Message, Source: in.Source,
		Status: ldom.LeadNew,
	}
	if err := s.repo.Create(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

// List — لفريق المبيعات/الإدارة (erp): فلتر بالحالة + pagination.
func (s *LeadsService) List(ctx context.Context, actor *iddomain.Actor, status string, limit, offset int) ([]ldom.Lead, int, error) {
	if !actor.HasRole(iddomain.RoleSystemAdmin) && !actor.HasRole(iddomain.RoleSupportAgent) {
		return nil, 0, platform.ErrForbidden
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if status != "" && !ldom.LeadStatus(status).Valid() {
		return nil, 0, &platform.DomainError{Code: "VALIDATION", Msg: "حالة غير صالحة"}
	}
	return s.repo.List(ctx, status, limit, offset)
}

// Advance — تقدم الاستفسار مع ملاحظة (state machine صارم).
func (s *LeadsService) Advance(ctx context.Context, actor *iddomain.Actor, id string, to ldom.LeadStatus, notes string) (*ldom.Lead, error) {
	if !actor.HasRole(iddomain.RoleSystemAdmin) && !actor.HasRole(iddomain.RoleSupportAgent) {
		return nil, platform.ErrForbidden
	}
	if !to.Valid() {
		return nil, &platform.DomainError{Code: "VALIDATION", Msg: "حالة غير صالحة"}
	}
	l, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if l.Status != to && !ldom.CanAdvance(l.Status, to) {
		return nil, &platform.DomainError{Code: "CONFLICT", Msg: "لا يمكن الانتقال من " + string(l.Status) + " إلى " + string(to)}
	}
	if err := s.repo.Update(ctx, id, to, notes); err != nil {
		return nil, err
	}
	_ = s.audit.Log(ctx, actor.ID, "lead."+string(to), "lead", id,
		map[string]string{"status": string(l.Status)}, map[string]string{"status": string(to)})
	l.Status = to
	return l, nil
}

// ===== Inputs =====

type SubmitInput struct {
	Name    string
	Email   string
	Phone   string
	Subject string
	Message string
	Source  string
}
