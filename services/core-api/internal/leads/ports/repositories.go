// Ports — مستودع الاستفسارات.
package ports

import (
	"context"

	ldom "github.com/al-deem/platform/core-api/internal/leads/domain"
)

type LeadRepository interface {
	// Create — استفسار عام (لا يحتاج جلسة)
	Create(ctx context.Context, l *ldom.Lead) error
	List(ctx context.Context, status string, limit, offset int) ([]ldom.Lead, int, error)
	GetByID(ctx context.Context, id string) (*ldom.Lead, error)
	// UpdateStatus — تقدم الاستفسار + ملاحظات فريق المبيعات
	Update(ctx context.Context, id string, status ldom.LeadStatus, notes string) error
}
