-- +goose Up
-- Prevent concurrent duplicate open payment submissions for one enrollment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_open_enrollment
ON payment_requests (enrollment_id)
WHERE status IN ('submitted', 'under_review');

-- +goose Down
DROP INDEX IF EXISTS uq_payment_requests_open_enrollment;
