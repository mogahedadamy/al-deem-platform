-- +goose Up
-- R2: Enrollment & Payment
-- التسجيل والدفع: قرار #9 (تحويل بنكي يدوي بمراجعة الموظف المالي #6)
-- State machines:
--   enrollment: pending_payment → active → completed (أو cancelled)
--   payment_request: submitted → under_review → approved | rejected(→ resubmit)

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    status          TEXT NOT NULL DEFAULT 'pending_payment'
                    CHECK (status IN ('pending_payment', 'active', 'completed', 'cancelled')),
    -- price snapshot وقت التسجيل (لا يتأثر بتغيير سعر الدورة لاحقًا)
    price_amount    NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
    currency        CHAR(3) NOT NULL DEFAULT 'SDG',
    -- تقدم الطالب
    progress_pct    INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- طالب واحد لا يسجل نفس الدورة مرتين (نشِطًا)
    EXCLUDE USING gist (student_id WITH =, course_id WITH =)
        WHERE (status IN ('pending_payment', 'active'))
);

CREATE TABLE payment_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    -- قرار #9: تحويل بنكي يدوي — الطالب يرفع إيصال التحويل
    method          TEXT NOT NULL DEFAULT 'bank_transfer'
                    CHECK (method IN ('bank_transfer')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency        CHAR(3) NOT NULL DEFAULT 'SDG',
    status          TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
    -- إيصال التحويل (رابط مرفوع — R2 الحالي: ملفات محلية/CDN لاحقًا)
    receipt_url     TEXT NOT NULL,
    bank_reference   TEXT,
    -- مراجعة الموظف المالي (قرار #6: مخصص 24/7)
    reviewer_id     UUID REFERENCES profiles(id),
    reviewed_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تسجيل الدخول للدروس المحمية (entitlement فحص سريع)
CREATE TABLE lesson_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX idx_enrollments_student     ON enrollments (student_id, status);
CREATE INDEX idx_enrollments_course     ON enrollments (course_id) WHERE status = 'active';
CREATE INDEX idx_payment_requests_status ON payment_requests (status, created_at);
CREATE INDEX idx_payment_requests_student ON payment_requests (student_id);

-- +goose Down
DROP INDEX IF EXISTS idx_payment_requests_student;
DROP INDEX IF EXISTS idx_payment_requests_status;
DROP INDEX IF EXISTS idx_enrollments_course;
DROP INDEX IF EXISTS idx_enrollments_student;
DROP TABLE IF EXISTS lesson_views;
DROP TABLE IF EXISTS payment_requests;
DROP TABLE IF EXISTS enrollments;
-- extension قد يستخدمها آخرون — لا نحذفها في Down (idempotent-safe)
DROP EXTENSION IF EXISTS btree_gist;
