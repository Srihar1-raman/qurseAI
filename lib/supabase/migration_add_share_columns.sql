-- Migration: Add share columns to conversations table
-- Enables shareable conversation URLs with snapshot behavior

-- Add share-related columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shared_message_count INTEGER;

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_share_token ON conversations(share_token);

-- Add comment for documentation
COMMENT ON COLUMN conversations.share_token IS 'Unique token for shareable conversation URL';
COMMENT ON COLUMN conversations.shared_at IS 'Timestamp when conversation was shared';
COMMENT ON COLUMN conversations.is_shared IS 'Flag indicating if conversation is currently shared';
COMMENT ON COLUMN conversations.shared_message_count IS 'Snapshot of message count at share time (frozen snapshot)';

