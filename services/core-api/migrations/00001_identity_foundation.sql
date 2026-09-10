-- +goose Up
-- R0: Identity foundation
-- قاعدة الهوية: الملفات الشخصية والأدوار والصلاحيات وسجل التدقيق.
-- المستخدمون أنفسهم يعيشون في Keycloak (SSO)؛ هنا نخزن الملف والربط بالأدوار.

CREATE TABLE profiles (
    id          UUID PRIMARY KEY,                  -- Keycloak user id (sub claim)
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT,
    avatar_url  TEXT,
    bio         TEXT,
    locale      TEXT NOT NULL DEFAULT 'ar',
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'deactivated')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL UNIQUE,              -- student | instructor | finance_officer | ...
    name_ar     TEXT NOT NULL,
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT true,    -- أدوار النظام لا تُحذف
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (key, name_ar, description) VALUES
    ('student',         'طالب',      'يتعلم ويطلب دورات'),
    ('instructor',      'مدرب',      'يؤلف دورات ويدير طلابه'),
    ('content_reviewer','مشرف محتوى','يراجع وينشر الدورات'),
    ('finance_officer', 'موظف مالي', 'يراجع ويعتمد المدفوعات (مخصص 24/7)'),
    ('support_agent',   'دعم فني',   'يساعد الطلاب'),
    ('erp_staff',       'موظف إداري','عمليات ERP'),
    ('erp_manager',     'مدير إداري','تقارير وإدارة عليا'),
    ('system_admin',    'مدير نظام', 'إدارة كاملة');

CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES profiles(id),
    action        TEXT NOT NULL,                    -- e.g. role.assigned, payment.approved
    resource_type TEXT NOT NULL,
    resource_id   TEXT,
    old_values    JSONB,
    new_values    JSONB,
    request_id    TEXT,
    ip            INET,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor   ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action  ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);

CREATE INDEX idx_user_roles_role ON user_roles (role_id);

-- +goose Down
DROP INDEX IF EXISTS idx_user_roles_role;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS profiles;
