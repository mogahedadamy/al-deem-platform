// Infrastructure — PostgreSQL implementations لـ identity (ports).
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	domain "github.com/al-deem/platform/core-api/internal/identity/domain"
	"github.com/al-deem/platform/core-api/internal/identity/ports"
	"github.com/al-deem/platform/core-api/internal/platform"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type Store struct {
	db *sql.DB
}

func NewStore(databaseURL string) (*Store, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) DB() *sql.DB { return s.db }

// ===== ProfileRepository =====

func (s *Store) GetByID(ctx context.Context, id string) (*domain.Profile, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, full_name, email, phone, avatar_url, bio, locale, status
		FROM profiles WHERE id = $1`, id)
	return scanProfile(row)
}

func (s *Store) UpsertFromSSO(ctx context.Context, p domain.Profile) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO profiles (id, full_name, email, locale)
		VALUES ($1, $2, $3, COALESCE(NULLIF($4, ''), 'ar'))
		ON CONFLICT (id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			email = EXCLUDED.email,
			updated_at = now()`,
		p.ID, p.FullName, p.Email, p.Locale)
	if err != nil {
		return fmt.Errorf("upsert profile: %w", err)
	}
	return nil
}

func (s *Store) UpdateOwn(ctx context.Context, id string, fullName string, phone, bio *string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE profiles SET
			full_name = COALESCE(NULLIF($2, ''), full_name),
			phone = $3, bio = $4, updated_at = now()
		WHERE id = $1`,
		id, fullName, phone, bio)
	if err != nil {
		return fmt.Errorf("update profile: %w", err)
	}
	return nil
}

func (s *Store) List(ctx context.Context, page, pageSize int, query string) ([]domain.Profile, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM profiles`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, full_name, email, phone, avatar_url, bio, locale, status
		FROM profiles
		WHERE ($1 = '' OR full_name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		query, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = rows.Close() }()
	var out []domain.Profile
	for rows.Next() {
		p := domain.Profile{}
		if err := rows.Scan(&p.ID, &p.FullName, &p.Email, &p.Phone, &p.AvatarURL, &p.Bio, &p.Locale, &p.Status); err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	return out, total, rows.Err()
}

// ===== RoleRepository =====

func (s *Store) GetUserRoles(ctx context.Context, userID string) ([]domain.RoleKey, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT r.key FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE ur.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var roles []domain.RoleKey
	for rows.Next() {
		var k domain.RoleKey
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		roles = append(roles, k)
	}
	return roles, rows.Err()
}

func (s *Store) Assign(ctx context.Context, userID string, role domain.RoleKey, assignedBy string) error {
	// المستخدم قد يكون في Keycloak ولم يسجل دخولًا بعد (لا profile في DB) —
	// نخلق placeholder نشطًا (يُحدَّث عند أول SSO في UpsertFromSSO)
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO profiles (id, full_name, email, locale, status)
		VALUES ($1, 'موظف جديد', '', 'ar', 'active')
		ON CONFLICT (id) DO NOTHING`, userID); err != nil {
		return err
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO user_roles (user_id, role_id, assigned_by)
		SELECT $1, id, $3 FROM roles WHERE key = $2
		ON CONFLICT (user_id, role_id) DO NOTHING`,
		userID, role, assignedBy)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		// role key غير موجود أو الإسناد موجود أصلًا — نتحقق
		var exists bool
		if err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM roles WHERE key=$1)`, role).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return platform.ErrNotFound
		}
	}
	return nil
}

func (s *Store) Remove(ctx context.Context, userID string, role domain.RoleKey, removedBy string) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM user_roles
		WHERE user_id = $1 AND role_id = (SELECT id FROM roles WHERE key = $2)`,
		userID, role)
	return err
}

// ===== AuditLogger =====

func (s *Store) Log(ctx context.Context, actorID, action, resourceType, resourceID string, oldValues, newValues any) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, old_values, new_values)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
		actorID, action, resourceType, resourceID, toJSON(oldValues), toJSON(newValues))
	if err != nil {
		return fmt.Errorf("audit log: %w", err)
	}
	return nil
}

func (s *Store) ListAudit(ctx context.Context, limit, offset int) ([]domain.AuditLog, int, error) {
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM audit_logs`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT a.id, a.actor_id, COALESCE(p.full_name, 'النظام'), a.action, a.resource_type, a.resource_id, a.created_at FROM audit_logs a LEFT JOIN profiles p ON p.id = a.actor_id ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]domain.AuditLog, 0)
	for rows.Next() {
		var item domain.AuditLog
		if err := rows.Scan(&item.ID, &item.ActorID, &item.ActorName, &item.Action, &item.ResourceType, &item.ResourceID, &item.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

// compile-time interface checks
var (
	_ ports.ProfileRepository = (*Store)(nil)
	_ ports.RoleRepository    = (*Store)(nil)
	_ ports.AuditLogger       = (*Store)(nil)
	_ ports.AuditRepository   = (*Store)(nil)
)

func scanProfile(row *sql.Row) (*domain.Profile, error) {
	p := &domain.Profile{}
	err := row.Scan(&p.ID, &p.FullName, &p.Email, &p.Phone, &p.AvatarURL, &p.Bio, &p.Locale, &p.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, platform.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func toJSON(v any) any {
	if v == nil {
		return nil
	}
	b, err := jsonMarshal(v)
	if err != nil {
		return nil
	}
	return string(b)
}

func jsonMarshal(v any) ([]byte, error) {
	return json.Marshal(v)
}
