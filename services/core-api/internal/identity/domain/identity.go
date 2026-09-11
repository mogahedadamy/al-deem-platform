// Package identity — الحسابات والأدوار والصلاحيات والتدقيق.
// Boundaries: يقرأ/يكتب profiles/roles/user_roles/audit_logs فقط.

// Domain types
package identity

type RoleKey string

const (
	RoleStudent         RoleKey = "student"
	RoleInstructor      RoleKey = "instructor"
	RoleContentReviewer RoleKey = "content_reviewer"
	RoleFinanceOfficer  RoleKey = "finance_officer"
	RoleSupportAgent    RoleKey = "support_agent"
	RoleErpStaff        RoleKey = "erp_staff"
	RoleErpManager      RoleKey = "erp_manager"
	RoleSystemAdmin     RoleKey = "system_admin"
)

var AllRoles = []RoleKey{
	RoleStudent, RoleInstructor, RoleContentReviewer, RoleFinanceOfficer,
	RoleSupportAgent, RoleErpStaff, RoleErpManager, RoleSystemAdmin,
}

func ValidRole(k RoleKey) bool {
	for _, r := range AllRoles {
		if r == k {
			return true
		}
	}
	return false
}

type ProfileStatus string

const (
	ProfileActive      ProfileStatus = "active"
	ProfileSuspended   ProfileStatus = "suspended"
	ProfileDeactivated ProfileStatus = "deactivated"
)

type Profile struct {
	ID        string
	FullName  string
	Email     string
	Phone     *string
	AvatarURL *string
	Bio       *string
	Locale    string
	Status    ProfileStatus
}

// Can — سياسات الصلاحيات (Policy object). UI يعرض فقط؛ القرار هنا.
type Permission string

const (
	PermManageRoles    Permission = "user.manage_roles"
	PermReviewPayment  Permission = "payment.review"
	PermApprovePayment Permission = "payment.approve"
	PermPublishCourse  Permission = "course.publish"
	PermIssueCert      Permission = "certificate.issue"
	PermViewErpFinance Permission = "erp.view_finance"
	PermManageSettings Permission = "system.manage_settings"
)

var rolePermissions = map[RoleKey][]Permission{
	RoleStudent:         {},
	RoleInstructor:      {},
	RoleContentReviewer: {PermPublishCourse, PermIssueCert},
	RoleFinanceOfficer:  {PermReviewPayment, PermApprovePayment, PermViewErpFinance},
	RoleSupportAgent:    {},
	RoleErpStaff:        {PermViewErpFinance},
	RoleErpManager:      {PermViewErpFinance},
	RoleSystemAdmin:     {PermManageRoles, PermReviewPayment, PermApprovePayment, PermPublishCourse, PermIssueCert, PermViewErpFinance, PermManageSettings},
}

// Actor — المستخدم المصادق عليه مع أدواره (يُبنى من JWT + DB).
type Actor struct {
	Profile
	Roles []RoleKey
}

func (a Actor) HasRole(r RoleKey) bool {
	for _, x := range a.Roles {
		if x == r {
			return true
		}
	}
	return false
}

func (a Actor) Can(p Permission) bool {
	for _, r := range a.Roles {
		for _, x := range rolePermissions[r] {
			if x == p {
				return true
			}
		}
	}
	return false
}
