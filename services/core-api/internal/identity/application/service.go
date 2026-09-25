// Application — Use Cases: كل قرار حساس يمر هنا (Authorization + Transaction + Audit).
package application

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type IdentityService struct {
	profiles    ports.ProfileRepository
	roles       ports.RoleRepository
	audit       ports.AuditLogger
	inviter     ports.StaffInviteGateway
	auditReader ports.AuditRepository
}

func NewIdentityService(p ports.ProfileRepository, r ports.RoleRepository, a ports.AuditLogger) *IdentityService {
	return &IdentityService{profiles: p, roles: r, audit: a}
}

func (s *IdentityService) SetStaffInviter(inviter ports.StaffInviteGateway) { s.inviter = inviter }
func (s *IdentityService) SetAuditReader(reader ports.AuditRepository)      { s.auditReader = reader }

// GetMe — الملف + الأدوار للمستخدم الحالي.
func (s *IdentityService) GetMe(ctx context.Context, actor *domain.Actor) (*domain.Actor, error) {
	return actor, nil
}

// UpdateOwnProfile — المستخدم يعدل ملفه فقط (لا أدوار ولا حالة).
func (s *IdentityService) UpdateOwnProfile(ctx context.Context, actor *domain.Actor, in UpdateProfileInput) (*domain.Profile, error) {
	if in.FullName != nil && len(*in.FullName) < 2 {
		return nil, platform.ErrValidation
	}
	old, _ := s.profiles.GetByID(ctx, actor.ID)
	if err := s.profiles.UpdateOwn(ctx, actor.ID, deref(in.FullName), in.Phone, in.Bio); err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	if err := s.audit.Log(ctx, actor.ID, "profile.updated", "profile", actor.ID, old, in); err != nil {
		return nil, fmt.Errorf("audit: %w", err)
	}
	return s.profiles.GetByID(ctx, actor.ID)
}

// GetUserRoles — أدوار مستخدم (للإدارة).
func (s *IdentityService) GetUserRoles(ctx context.Context, actor *domain.Actor, userID string) ([]domain.RoleKey, error) {
	if !actor.Can(domain.PermManageRoles) {
		return nil, platform.ErrForbidden
	}
	return s.roles.GetUserRoles(ctx, userID)
}

// AssignRole — system_admin فقط، مع Audit. Idempotent.
func (s *IdentityService) AssignRole(ctx context.Context, actor *domain.Actor, userID string, role domain.RoleKey) error {
	if !actor.Can(domain.PermManageRoles) {
		return platform.ErrForbidden
	}
	if !domain.ValidRole(role) {
		return platform.ErrValidation
	}
	if err := s.roles.Assign(ctx, userID, role, actor.ID); err != nil {
		return fmt.Errorf("assign role: %w", err)
	}
	return s.audit.Log(ctx, actor.ID, "role.assigned", "user_role", userID+": "+string(role), nil, map[string]any{"role": role})
}

// RemoveRole — system_admin فقط؛ يرفض إزالة دور لا يملكه المستخدم (idempotent-safe).
func (s *IdentityService) RemoveRole(ctx context.Context, actor *domain.Actor, userID string, role domain.RoleKey) error {
	if !actor.Can(domain.PermManageRoles) {
		return platform.ErrForbidden
	}
	current, err := s.roles.GetUserRoles(ctx, userID)
	if err != nil {
		return fmt.Errorf("load roles: %w", err)
	}
	has := false
	for _, r := range current {
		if r == role {
			has = true
			break
		}
	}
	if !has {
		return errors.New("role not assigned to user")
	}
	if err := s.roles.Remove(ctx, userID, role, actor.ID); err != nil {
		return fmt.Errorf("remove role: %w", err)
	}
	return s.audit.Log(ctx, actor.ID, "role.removed", "user_role", userID+": "+string(role), map[string]any{"role": role}, nil)
}

// InviteStaff ينشئ حساباً بدعوة آمنة ويمنحه دوراً واحداً أولياً. لا يمكن دعوة
// طالب من هذا المسار لأن التسجيل الذاتي مخصص للطلاب.
func (s *IdentityService) InviteStaff(ctx context.Context, actor *domain.Actor, in InviteStaffInput) (string, error) {
	if !actor.Can(domain.PermManageRoles) {
		return "", platform.ErrForbidden
	}
	if s.inviter == nil {
		return "", &platform.DomainError{Code: "UNAVAILABLE", Msg: "خدمة دعوات الموظفين غير مهيأة"}
	}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	if len(in.FullName) < 2 || !domain.ValidRole(in.Role) || in.Role == domain.RoleStudent {
		return "", platform.ErrValidation
	}
	if _, err := mail.ParseAddress(in.Email); err != nil {
		return "", platform.ErrValidation
	}
	userID, err := s.inviter.Invite(ctx, in.FullName, in.Email)
	if err != nil {
		return "", err
	}
	if err := s.roles.Assign(ctx, userID, in.Role, actor.ID); err != nil {
		return "", fmt.Errorf("assign invited role: %w", err)
	}
	if err := s.audit.Log(ctx, actor.ID, "staff.invited", "profile", userID, nil, map[string]any{"email": in.Email, "role": in.Role}); err != nil {
		return "", err
	}
	return userID, nil
}

// ListUsers — لإدارة ERP (system_admin).
func (s *IdentityService) ListUsers(ctx context.Context, actor *domain.Actor, page, pageSize int, query string) ([]domain.Profile, int, error) {
	if !actor.Can(domain.PermManageRoles) {
		return nil, 0, platform.ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.profiles.List(ctx, page, pageSize, query)
}

func (s *IdentityService) ListAudit(ctx context.Context, actor *domain.Actor, page, pageSize int) ([]domain.AuditLog, int, error) {
	if !actor.Can(domain.PermManageSettings) {
		return nil, 0, platform.ErrForbidden
	}
	if s.auditReader == nil {
		return nil, 0, &platform.DomainError{Code: "UNAVAILABLE", Msg: "سجل التدقيق غير مهيأ"}
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 25
	}
	return s.auditReader.ListAudit(ctx, pageSize, (page-1)*pageSize)
}

type InviteStaffInput struct {
	FullName string
	Email    string
	Role     domain.RoleKey
}

type UpdateProfileInput struct {
	FullName *string
	Phone    *string
	Bio      *string
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
