package application

import (
	"context"
	"testing"

	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/platform"
)

type inviteProfiles struct{}

func (inviteProfiles) GetByID(context.Context, string) (*domain.Profile, error) {
	return &domain.Profile{}, nil
}
func (inviteProfiles) UpsertFromSSO(context.Context, domain.Profile) error               { return nil }
func (inviteProfiles) UpdateOwn(context.Context, string, string, *string, *string) error { return nil }
func (inviteProfiles) List(context.Context, int, int, string) ([]domain.Profile, int, error) {
	return nil, 0, nil
}

type inviteRoles struct{ assigned []domain.RoleKey }

func (r *inviteRoles) GetUserRoles(context.Context, string) ([]domain.RoleKey, error) {
	return nil, nil
}
func (r *inviteRoles) Assign(_ context.Context, _ string, role domain.RoleKey, _ string) error {
	r.assigned = append(r.assigned, role)
	return nil
}
func (*inviteRoles) Remove(context.Context, string, domain.RoleKey, string) error { return nil }

type inviteAudit struct{ actions []string }

func (a *inviteAudit) Log(_ context.Context, _ string, action, _, _ string, _, _ any) error {
	a.actions = append(a.actions, action)
	return nil
}

type fakeStaffInviter struct {
	id    string
	calls int
}

func (f *fakeStaffInviter) Invite(context.Context, string, string) (string, error) {
	f.calls++
	return f.id, nil
}

func adminActor() *domain.Actor {
	return &domain.Actor{Profile: domain.Profile{ID: "admin", Status: domain.ProfileActive}, Roles: []domain.RoleKey{domain.RoleSystemAdmin}}
}

func TestInviteStaffCreatesIdentityAndAssignsInitialRole(t *testing.T) {
	roles, audit, inviter := &inviteRoles{}, &inviteAudit{}, &fakeStaffInviter{id: "staff-id"}
	svc := NewIdentityService(inviteProfiles{}, roles, audit)
	svc.SetStaffInviter(inviter)
	id, err := svc.InviteStaff(context.Background(), adminActor(), InviteStaffInput{FullName: "مدرب جديد", Email: "trainer@example.test", Role: domain.RoleInstructor})
	if err != nil || id != "staff-id" {
		t.Fatalf("invite failed: id=%q err=%v", id, err)
	}
	if inviter.calls != 1 || len(roles.assigned) != 1 || roles.assigned[0] != domain.RoleInstructor {
		t.Fatalf("unexpected invitation side effects: %#v", roles.assigned)
	}
	if len(audit.actions) != 1 || audit.actions[0] != "staff.invited" {
		t.Fatalf("missing audit event: %#v", audit.actions)
	}
}

func TestInviteStaffRejectsStudentRole(t *testing.T) {
	inviter := &fakeStaffInviter{id: "staff-id"}
	svc := NewIdentityService(inviteProfiles{}, &inviteRoles{}, &inviteAudit{})
	svc.SetStaffInviter(inviter)
	_, err := svc.InviteStaff(context.Background(), adminActor(), InviteStaffInput{FullName: "طالب", Email: "student@example.test", Role: domain.RoleStudent})
	if de, ok := platform.IsDomainError(err); !ok || de.Code != "VALIDATION" {
		t.Fatalf("expected validation, got %v", err)
	}
	if inviter.calls != 0 {
		t.Fatal("student invitation must not call the identity provider")
	}
}
