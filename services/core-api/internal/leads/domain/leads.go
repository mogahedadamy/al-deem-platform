// Domain — الاستفسارات (leads).
package domain

import "time"

// LeadStatus — new → contacted → qualified → converted | lost
type LeadStatus string

const (
	LeadNew       LeadStatus = "new"
	LeadContacted LeadStatus = "contacted"
	LeadQualified LeadStatus = "qualified"
	LeadConverted LeadStatus = "converted"
	LeadLost      LeadStatus = "lost"
)

func (s LeadStatus) Valid() bool {
	switch s {
	case LeadNew, LeadContacted, LeadQualified, LeadConverted, LeadLost:
		return true
	}
	return false
}

// CanAdvance — التحولات المسموحة للاستفسار.
func CanAdvance(from, to LeadStatus) bool {
	if to == LeadLost {
		return from == LeadNew || from == LeadContacted || from == LeadQualified
	}
	switch from {
	case LeadNew:
		return to == LeadContacted || to == LeadQualified
	case LeadContacted:
		return to == LeadQualified
	case LeadQualified:
		return to == LeadConverted
	}
	return false
}

// Lead — استفسار من الموقع أو أي مصدر.
type Lead struct {
	ID        string
	Name      string
	Email     string
	Phone     string
	Subject   string
	Message   string
	Source    string
	Status    LeadStatus
	ProfileID string // nullable — عند التحويل لطالب
	CourseID  string // nullable — الدورة المستفسَر عنها
	Notes     string // nullable
	CreatedAt time.Time
	UpdatedAt time.Time
}
