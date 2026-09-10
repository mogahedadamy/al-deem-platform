-- +goose Up
-- R3: Assessment & Certificate (قرار الإدارة #4)
-- الشهادة: رقمية تلقائية عند (اكتمال الدورة AND اختبار ≥70%) + طلب نسخة ورقية

CREATE TABLE quizzes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    pass_score  INT NOT NULL DEFAULT 70 CHECK (pass_score BETWEEN 1 AND 100),
    time_limit_minutes INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    -- الإجابات JSON: [{"key":"a","text":"...","correct":true}, ...]
    options     JSONB NOT NULL,
    position    INT NOT NULL DEFAULT 0,
    points      INT NOT NULL DEFAULT 1 CHECK (points >= 1)
);

CREATE TABLE quiz_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    -- إجابات الطالب JSON: {"questionId": "selectedKey", ...}
    answers     JSONB NOT NULL,
    score       INT NOT NULL CHECK (score >= 0),
    passed      BOOLEAN NOT NULL DEFAULT false,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_student ON quiz_attempts (student_id, course_id);

-- ===== الشهادات (قرار #4) =====
CREATE TABLE certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- رقم الشهادة للتحقق العام (مختلف عن id الداخلي — UUID داخلي + رقم خارجي قابل للمشاركة)
    serial_number   TEXT NOT NULL UNIQUE,
    student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    enrollment_id   UUID NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
    student_name    TEXT NOT NULL,
    course_title    TEXT NOT NULL,
    -- قرار #4: رقمية تلقائية عند ≥70%
    final_score     INT NOT NULL CHECK (final_score >= 0),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- شهادة واحدة لكل enrollment
    UNIQUE (enrollment_id)
);

-- طلب النسخة الورقية (قرار #4: "طلب نسخة ورقية من المركز عبر طلب في المنصة")
CREATE TABLE paper_certificate_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'printed', 'delivered')),
    -- عنوان التسليم
    delivery_address TEXT NOT NULL,
    delivery_phone  TEXT NOT NULL,
    notes           TEXT,
    handled_by      UUID REFERENCES profiles(id),
    handled_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_paper_requests_status ON paper_certificate_requests (status, created_at);
CREATE INDEX idx_certificates_student ON certificates (student_id);
CREATE INDEX idx_certificates_verify ON certificates (serial_number);

-- +goose Down
DROP INDEX IF EXISTS idx_certificates_verify;
DROP INDEX IF EXISTS idx_certificates_student;
DROP INDEX IF EXISTS idx_paper_requests_status;
DROP INDEX IF EXISTS idx_quiz_attempts_student;
DROP TABLE IF EXISTS paper_certificate_requests;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS quiz_attempts;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS quizzes;
