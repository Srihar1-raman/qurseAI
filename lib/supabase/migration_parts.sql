-- =====================================================
-- MIGRATION: Add Parts JSONB Column & Make Content Nullable
-- Safe to run on existing database
-- Adds parts column for AI SDK native parts array storage
-- Makes content column nullable (legacy field, new messages use parts)
-- =====================================================

-- Make content column nullable (if not already)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'messages' 
             AND column_name = 'content' 
             AND is_nullable = 'NO') THEN
    ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
    RAISE NOTICE 'Made content column nullable';
  ELSE
    RAISE NOTICE 'Content column already nullable, skipping';
  END IF;
END $$;

-- Add parts JSONB column to messages table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'parts') THEN
    ALTER TABLE messages ADD COLUMN parts JSONB;
    RAISE NOTICE 'Added parts column to messages table';
  ELSE
    RAISE NOTICE 'Parts column already exists, skipping';
  END IF;
END $$;

-- Create GIN index on parts column for query performance
-- GIN index is optimal for JSONB queries
CREATE INDEX IF NOT EXISTS idx_messages_parts ON messages USING GIN (parts) WHERE parts IS NOT NULL;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This migration adds the parts column to store AI SDK's native parts array.
-- The parts column will contain JSONB arrays with structure:
-- [
--   { type: 'text', text: '...' },
--   { type: 'reasoning', text: '...' },
--   { type: 'tool-{toolName}', state: '...', input: {...}, output: {...} },
--   { type: 'step-start' },
--   { type: 'dynamic-tool', toolName: '...', ... }
-- ]
--
-- The content column is now nullable and kept for backward compatibility.
-- Old messages will have content (with optional delimiter-based reasoning).
-- New messages will have parts array (and optionally content for compatibility).
-- Future migration will remove content column once all messages use parts.
--
-- Migration path:
-- 1. New messages: Save with parts array (and content for compatibility)
-- 2. Old messages: Load from content (with delimiter parsing fallback)
-- 3. Future: Migrate old messages to parts format (optional cleanup)
--
-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration complete! Parts column added with GIN index ✅' as status;

