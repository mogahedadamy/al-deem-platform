-- +goose Up
-- R4-B: leads & inquiries — استفسارات الموقع (www/contact) وإدارة المبيعات.
-- الاستفسار قد يتحول لاحقًا إلى طالب/طلب عبر Use Case واضح (Blueprint).

CREATE TABLE leads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    subject     TEXT NOT NULL DEFAULT 'استفسار عام',
    message     TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'website',
    -- new → contacted → qualified → converted | lost
    status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','contacted','qualified','converted','lost')),
    -- عند التحويل: ربط بالطالب الناتج (profile) أو الدورة المستفسَر عنها
    profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    course_id   UUID REFERENCES courses(id) ON DELETE SET NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON leads (status, created_at DESC);
CREATE INDEX idx_leads_email ON leads (email);

-- +goose Down
DROP TABLE IF EXISTS leads;
