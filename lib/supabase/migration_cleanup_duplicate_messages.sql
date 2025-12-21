-- =====================================================
-- Cleanup Duplicate Messages Functions
-- Layer 2: Database-level cleanup for duplicate assistant messages
-- Removes duplicates where one has stop text and one doesn't
-- =====================================================

-- Function to clean up duplicate assistant messages (authenticated users)
CREATE OR REPLACE FUNCTION cleanup_duplicate_messages()
RETURNS TABLE(
  deleted_count BIGINT,
  conversations_affected BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT := 0;
  v_conversations_affected BIGINT := 0;
BEGIN
  -- Delete duplicate messages where:
  -- 1. Same conversation_id
  -- 2. Both are assistant role
  -- 3. Created within 20 seconds of each other
  -- 4. One has is_stopped = true, one has is_stopped = false
  -- 5. Keep the one with is_stopped = true (delete the full one)
  
  WITH duplicates_to_delete AS (
    SELECT m1.id
    FROM messages m1
    WHERE m1.role = 'assistant'
      AND m1.is_stopped = false
      AND EXISTS (
        SELECT 1
        FROM messages m2
        WHERE m2.conversation_id = m1.conversation_id
          AND m2.role = 'assistant'
          AND m2.id != m1.id
          AND m2.is_stopped = true
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) < 20
      )
  )
  DELETE FROM messages
  WHERE id IN (SELECT id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Count unique conversations affected
  WITH duplicates_to_delete AS (
    SELECT m1.id, m1.conversation_id
    FROM messages m1
    WHERE m1.role = 'assistant'
      AND m1.is_stopped = false
      AND EXISTS (
        SELECT 1
        FROM messages m2
        WHERE m2.conversation_id = m1.conversation_id
          AND m2.role = 'assistant'
          AND m2.id != m1.id
          AND m2.is_stopped = true
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) < 20
      )
  )
  SELECT COUNT(DISTINCT conversation_id) INTO v_conversations_affected
  FROM duplicates_to_delete;
  
  RETURN QUERY SELECT v_deleted_count, v_conversations_affected;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_duplicate_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_messages() TO anon;

-- Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_duplicate_cleanup 
ON messages(conversation_id, role, created_at)
WHERE role = 'assistant';

-- Function to clean up duplicate guest messages
CREATE OR REPLACE FUNCTION cleanup_duplicate_guest_messages()
RETURNS TABLE(
  deleted_count BIGINT,
  conversations_affected BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count BIGINT := 0;
  v_conversations_affected BIGINT := 0;
BEGIN
  -- Same logic as above but for guest_messages table
  WITH duplicates_to_delete AS (
    SELECT m1.id
    FROM guest_messages m1
    WHERE m1.role = 'assistant'
      AND m1.is_stopped = false
      AND EXISTS (
        SELECT 1
        FROM guest_messages m2
        WHERE m2.guest_conversation_id = m1.guest_conversation_id
          AND m2.role = 'assistant'
          AND m2.id != m1.id
          AND m2.is_stopped = true
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) < 20
      )
  )
  DELETE FROM guest_messages
  WHERE id IN (SELECT id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Count unique conversations affected
  WITH duplicates_to_delete AS (
    SELECT m1.id, m1.guest_conversation_id
    FROM guest_messages m1
    WHERE m1.role = 'assistant'
      AND m1.is_stopped = false
      AND EXISTS (
        SELECT 1
        FROM guest_messages m2
        WHERE m2.guest_conversation_id = m1.guest_conversation_id
          AND m2.role = 'assistant'
          AND m2.id != m1.id
          AND m2.is_stopped = true
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))) < 20
      )
  )
  SELECT COUNT(DISTINCT guest_conversation_id) INTO v_conversations_affected
  FROM duplicates_to_delete;
  
  RETURN QUERY SELECT v_deleted_count, v_conversations_affected;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_duplicate_guest_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_guest_messages() TO anon;

CREATE INDEX IF NOT EXISTS idx_guest_messages_duplicate_cleanup 
ON guest_messages(guest_conversation_id, role, created_at)
WHERE role = 'assistant';

