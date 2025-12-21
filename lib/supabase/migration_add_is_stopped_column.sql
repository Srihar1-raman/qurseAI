-- =====================================================
-- Add is_stopped Column to Messages Tables
-- Simplifies duplicate message prevention by using boolean flag
-- =====================================================

-- Add is_stopped column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT FALSE NOT NULL;

-- Add is_stopped column to guest_messages table
ALTER TABLE guest_messages 
ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for performance (frequently queried)
CREATE INDEX IF NOT EXISTS idx_messages_is_stopped 
ON messages(conversation_id, is_stopped, created_at)
WHERE is_stopped = true;

CREATE INDEX IF NOT EXISTS idx_guest_messages_is_stopped 
ON guest_messages(guest_conversation_id, is_stopped, created_at)
WHERE is_stopped = true;

-- Add comment for documentation
COMMENT ON COLUMN messages.is_stopped IS 'Indicates if this message was stopped by the user. Used for duplicate prevention.';
COMMENT ON COLUMN guest_messages.is_stopped IS 'Indicates if this message was stopped by the user. Used for duplicate prevention.';

