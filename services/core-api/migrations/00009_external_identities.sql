-- +goose Up
CREATE TABLE external_identities (
    issuer      TEXT NOT NULL,
    subject     TEXT NOT NULL,
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (issuer, subject),
    UNIQUE (profile_id, issuer)
);

CREATE INDEX idx_external_identities_profile ON external_identities(profile_id);

-- +goose Down
DROP TABLE IF EXISTS external_identities;
