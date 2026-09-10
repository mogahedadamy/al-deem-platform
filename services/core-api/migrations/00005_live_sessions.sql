-- +goose Up
-- R3-B: Zoom والحصص المباشرة (قرار الإدارة #5)
-- حساب Zoom مركزي واحد (Server-to-Server OAuth) — المدرب يحدد has_live_sessions
-- والباقي مسجل. live_sessions تُنشأ فقط للدورات المفعّلة.

-- إعدادات Zoom المركزية (حساب واحد — Server-to-Server OAuth)
CREATE TABLE zoom_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name    TEXT NOT NULL,
    s2s_account_id  TEXT NOT NULL,
    s2s_client_id   TEXT NOT NULL,
    -- مشفّر في طبقة التطبيق (AES-GCM بمفتاح من env)
    s2s_client_secret_enc BYTEA NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_token_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (NOT is_active OR last_token_at IS NULL OR last_token_at > now() - interval '1 hour' + interval '25 hours')
);

-- الحصص المباشرة — تُنشأ فقط للدورات has_live_sessions=true
CREATE TABLE live_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id      UUID REFERENCES course_sections(id) ON DELETE SET NULL,
    instructor_id   UUID NOT NULL REFERENCES profiles(id),
    title           TEXT NOT NULL,
    -- state machine: scheduled → join_open → live → ended → recording_processing → archived
    status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','join_open','live','ended','recording_processing','archived','cancelled')),
    starts_at       TIMESTAMPTZ NOT NULL,
    -- نافذة الانضمام: تفتح قبل الموعد بهذا القدر (دقائق، افتراضي 10)
    join_window_min  INT NOT NULL DEFAULT 10 CHECK (join_window_min BETWEEN 0 AND 120),
    duration_min     INT NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 5 AND 480),
    timezone         TEXT NOT NULL DEFAULT 'Africa/Khartoum',
    -- حدود الحصة بتوقيت UTC (بلا منطقة) — لقيد عدم التعارض IMMUTABLE
    starts_at_utc    TIMESTAMP NOT NULL,
    ends_at_utc      TIMESTAMP NOT NULL,
    -- Zoom meeting (nullable: الاجتماع يُنشأ خادميًا أو يُدخل إداريًا)
    zoom_meeting_id  TEXT,
    zoom_join_url    TEXT,
    -- تسجيل الحصة (رابط بعد المعالجة)
    recording_url   TEXT,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- منع تعارض حصتين لنفس المدرب في نفس الوقت.
-- عمودا البداية والنهاية بلا توقيت (UTC موحّد) → tsrange تعبير IMMUTABLE يصلح للفهرس.
-- starts_at_utc وends_at_utc يحسبهما التطبيق دائمًا بالتوقيت العالمي.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE INDEX live_sessions_instructor_time_idx ON live_sessions (instructor_id, starts_at);
ALTER TABLE live_sessions
    ADD CONSTRAINT no_instructor_overlap
    EXCLUDE USING gist (
        instructor_id WITH =,
        tsrange(starts_at_utc, ends_at_utc) WITH &&
    ) WHERE (status IN ('scheduled','join_open','live'));

-- حضور الحصة — سجل واحد لكل (حصة، طالب)
CREATE TABLE live_session_attendees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES profiles(id),
    -- join_url الموقّع الذي تسلّمه الطالب (مرة واحدة)
    zoom_join_url   TEXT,
    joined_at       TIMESTAMPTZ,
    left_at         TIMESTAMPTZ,
    duration_min    INT, -- مدة الحضور المحسوبة من الأحداث
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (live_session_id, student_id)
);

-- سجل أحداث Zoom webhook — idempotent (event id فريد)
CREATE TABLE zoom_webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zoom_event_id   TEXT NOT NULL UNIQUE, -- de-duplication
    event_type      TEXT NOT NULL,
    meeting_id      TEXT,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS zoom_webhook_events;
DROP TABLE IF EXISTS live_session_attendees;
DROP TABLE IF EXISTS live_sessions;
DROP TABLE IF EXISTS zoom_connections;
