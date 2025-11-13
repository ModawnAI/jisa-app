-- Migration: Add Foreign Key Relationships
-- Description: Add foreign key constraints for query_logs and analytics_events tables
-- Date: 2025-11-13

-- Add foreign key from query_logs.user_id to profiles.id
-- This allows Supabase to understand the relationship for joins
ALTER TABLE query_logs
  DROP CONSTRAINT IF EXISTS query_logs_user_id_fkey;

ALTER TABLE query_logs
  ADD CONSTRAINT query_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Add foreign key from analytics_events.user_id to profiles.id
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Add index on user_id columns for better join performance
CREATE INDEX IF NOT EXISTS query_logs_user_id_idx ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
