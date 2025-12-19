-- Add pinned column to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE NOT NULL;

-- Add pinned column to guest_conversations table
ALTER TABLE guest_conversations
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index on pinned for efficient sorting
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(pinned);
CREATE INDEX IF NOT EXISTS idx_guest_conversations_pinned ON guest_conversations(pinned);

-- Add composite index for common query pattern: pinned DESC, updated_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_pinned_updated ON conversations(pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_conversations_pinned_updated ON guest_conversations(pinned DESC, updated_at DESC);

