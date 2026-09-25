// Ports — interfaces يفصلون المنطق عن التنفيذ (DIP).
package ports

import (
	"context"

	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
)

// ProfileRepository — الوصول لملفات المستخدمين.
type ProfileRepository interface {
	GetByID(ctx context.Context, id string) (*domain.Profile, error)
	UpsertFromSSO(ctx context.Context, p domain.Profile) error
	UpdateOwn(ctx context.Context, id string, fullName string, phone, bio *string) error
	List(ctx context.Context, page, pageSize int, query string) ([]domain.Profile, int, error)
}

// RoleRepository — إسناد/إزالة الأدوار (كل تغيير يسجل Audit).
type RoleRepository interface {
	GetUserRoles(ctx context.Context, userID string) ([]domain.RoleKey, error)
	Assign(ctx context.Context, userID string, role domain.RoleKey, assignedBy string) error
	Remove(ctx context.Context, userID string, role domain.RoleKey, removedBy string) error
}

// AuditLogger — سجل التدقيق: المنفذ + الفعل + الحالة قبل/بعد.
type AuditLogger interface {
	Log(ctx context.Context, actorID, action, resourceType, resourceID string, oldValues, newValues any) error
}

type AuditRepository interface {
	ListAudit(ctx context.Context, limit, offset int) ([]domain.AuditLog, int, error)
}

// StaffInviteGateway ينشئ حساب موظف في موفر الهوية ويرسل له رسالة تفعيل آمنة.
type StaffInviteGateway interface {
	Invite(ctx context.Context, fullName, email string) (userID string, err error)
}

// ActorResolver — يبني Actor من JWT: يتحقق من issuer/audience/expiry ثم يجلب الأدوار من DB.
type ActorResolver interface {
	Resolve(ctx context.Context, bearerToken string) (*domain.Actor, error)
}
