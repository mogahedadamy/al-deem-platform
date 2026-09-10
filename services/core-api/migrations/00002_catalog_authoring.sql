-- +goose Up
-- R1: Catalog & Authoring
-- الكتالوج والتأليف: فئات، دورات (UUID + slug)، وحدات، دروس، مواد.
-- State machine للدورة: draft → pending_review → published | rejected(→draft) | archived

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name_ar     TEXT NOT NULL,
    description TEXT,
    position    INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    instructor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    level           TEXT NOT NULL DEFAULT 'beginner'
                    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    language        TEXT NOT NULL DEFAULT 'ar',
    price_amount    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
    currency        CHAR(3) NOT NULL DEFAULT 'SDG',
    duration_hours  INT NOT NULL DEFAULT 0 CHECK (duration_hours >= 0),
    cover_image_url TEXT,
    -- قرار الإدارة #5: Zoom حساب مركزي اختياري — المدرب يحدد إن كانت دورته تحتوي حصص مباشرة
    has_live_sessions BOOLEAN NOT NULL DEFAULT false,
    -- مراجعة المحتوى (content_reviewer)
    review_notes    TEXT,
    reviewed_by     UUID REFERENCES profiles(id),
    reviewed_at     TIMESTAMPTZ,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    position    INT  NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (course_id, position)
);

CREATE TABLE lessons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id  UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'video'
                CHECK (type IN ('video', 'text', 'quiz', 'assignment')),
    title       TEXT NOT NULL,
    content     TEXT,
    video_url   TEXT,
    position    INT  NOT NULL,
    is_free_preview BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, position)
);

CREATE TABLE lesson_assets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id   UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    asset_type  TEXT NOT NULL CHECK (asset_type IN ('file', 'link', 'image')),
    title       TEXT NOT NULL,
    url         TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- فهارس مبنية على الاستعلامات الحقيقية (blueprint §10):
CREATE INDEX idx_courses_status_slug     ON courses (status, slug);
CREATE INDEX idx_courses_instructor     ON courses (instructor_id, status);
CREATE INDEX idx_courses_category        ON courses (category_id) WHERE status = 'published';
CREATE INDEX idx_lessons_course          ON lessons (course_id);
CREATE INDEX idx_lesson_assets_lesson    ON lesson_assets (lesson_id);

-- +goose Down
DROP INDEX IF EXISTS idx_lesson_assets_lesson;
DROP INDEX IF EXISTS idx_lessons_course;
DROP INDEX IF EXISTS idx_courses_category;
DROP INDEX IF EXISTS idx_courses_instructor;
DROP INDEX IF EXISTS idx_courses_status_slug;
DROP TABLE IF EXISTS lesson_assets;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS course_sections;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS categories;
