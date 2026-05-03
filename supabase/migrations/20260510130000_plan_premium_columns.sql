-- Add premium plan columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_badge boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
