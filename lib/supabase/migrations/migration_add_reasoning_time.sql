-- Migration: Add reasoning_time column for tracking reasoning duration
-- Run this migration to add reasoning_time column to messages tables
-- Old rows will have NULL by default

-- Add reasoning_time column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reasoning_time'
  ) THEN
    ALTER TABLE messages ADD COLUMN reasoning_time REAL;
  END IF;
END $$;

-- Add reasoning_time column to guest_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guest_messages' AND column_name = 'reasoning_time'
  ) THEN
    ALTER TABLE guest_messages ADD COLUMN reasoning_time REAL;
  END IF;
END $$;

-- Grant permissions (if needed)
-- ALTER TABLE messages ALTER COLUMN reasoning_time SET DEFAULT NULL;
-- ALTER TABLE guest_messages ALTER COLUMN reasoning_time SET DEFAULT NULL;
