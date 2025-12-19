-- =====================================================
-- MIGRATION: Fix transfer_guest_to_user to preserve original updated_at timestamps
-- Fixes issue where updated_at was being overwritten by message insert trigger
-- Safe to run multiple times (CREATE OR REPLACE)
-- =====================================================

-- Fix transfer_guest_to_user to preserve original updated_at from guest_conversations
CREATE OR REPLACE FUNCTION transfer_guest_to_user(
  p_session_hash TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  messages_transferred INTEGER,
  rate_limits_transferred INTEGER,
  conversations_transferred INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_count INTEGER := 0;
  v_rate_limits_count INTEGER := 0;
  v_conversations_count INTEGER := 0;
BEGIN
  -- Conversations first (IDs preserved), skip on conflict
  INSERT INTO conversations (id, user_id, title, created_at, updated_at)
  SELECT id, p_user_id, title, created_at, updated_at
  FROM guest_conversations
  WHERE session_hash = p_session_hash
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_conversations_count = ROW_COUNT;

  -- Messages, pointing to transferred conversations
  INSERT INTO messages (
    id, conversation_id, role, content, parts, model,
    input_tokens, output_tokens, total_tokens, completion_time, created_at
  )
  SELECT gm.id, gc.id, gm.role, gm.content, gm.parts, gm.model,
         gm.input_tokens, gm.output_tokens, gm.total_tokens, gm.completion_time, gm.created_at
  FROM guest_messages gm
  JOIN guest_conversations gc ON gc.id = gm.guest_conversation_id
  WHERE gc.session_hash = p_session_hash
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_messages_count = ROW_COUNT;

  -- RESTORE ORIGINAL updated_at TIMESTAMPS
  -- The update_conversation_on_new_message trigger fires on message INSERT
  -- and sets updated_at = NOW(), overwriting the original timestamp.
  -- We restore the original updated_at from guest_conversations here.
  UPDATE conversations c
  SET updated_at = gc.updated_at
  FROM guest_conversations gc
  WHERE c.id = gc.id
    AND gc.session_hash = p_session_hash;

  -- Transfer rate limits to user (merge if user already has record for same bucket)
  -- Strategy: 
  -- 1. For guest records where user has NO existing record: UPDATE guest to user
  -- 2. For guest records where user HAS existing record: MERGE counts, then DELETE guest
  
  -- Count guest rate limit records before transfer (for return value)
  SELECT COUNT(*) INTO v_rate_limits_count
  FROM rate_limits
  WHERE session_hash = p_session_hash AND user_id IS NULL;
  
  -- Step 1: Update non-conflicting guest records to user
  UPDATE rate_limits rl_guest
    SET user_id = p_user_id, session_hash = NULL
  WHERE rl_guest.session_hash = p_session_hash 
    AND rl_guest.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM rate_limits rl_user
      WHERE rl_user.user_id = p_user_id
        AND rl_user.session_hash IS NULL
        AND rl_user.resource_type = rl_guest.resource_type
        AND rl_user.bucket_start = rl_guest.bucket_start
    );
  
  -- Step 2: Merge conflicting records (user already has record for same bucket)
  -- Add guest count to user's existing count, then delete guest record
  WITH guest_to_merge AS (
    SELECT resource_type, bucket_start, count as guest_count
    FROM rate_limits
    WHERE session_hash = p_session_hash AND user_id IS NULL
  )
  UPDATE rate_limits rl_user
    SET count = rl_user.count + gtm.guest_count,
        updated_at = NOW()
  FROM guest_to_merge gtm
  WHERE rl_user.user_id = p_user_id
    AND rl_user.session_hash IS NULL
    AND rl_user.resource_type = gtm.resource_type
    AND rl_user.bucket_start = gtm.bucket_start;
  
  -- Step 3: Delete guest rate limit records (already merged or transferred)
  DELETE FROM rate_limits
  WHERE session_hash = p_session_hash AND user_id IS NULL;

  -- Cleanup guest rows
  DELETE FROM guest_messages
  USING guest_conversations gc
  WHERE guest_messages.guest_conversation_id = gc.id
    AND gc.session_hash = p_session_hash;

  DELETE FROM guest_conversations
  WHERE session_hash = p_session_hash;

  RETURN QUERY SELECT v_messages_count, v_rate_limits_count, v_conversations_count;
END;
$$;

-- Grant execute permission (idempotent)
GRANT EXECUTE ON FUNCTION transfer_guest_to_user(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_guest_to_user(TEXT, UUID) TO anon;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, test the transfer:
-- 
-- 1. Create guest conversation with old updated_at (e.g., 2 days ago)
-- 2. Create guest messages for that conversation
-- 3. Call transfer_guest_to_user()
-- 4. Verify:
--    - Guest conversations transferred with ORIGINAL updated_at (not current time)
--    - Guest messages transferred
--    - Rate limits merged correctly
--    - Guest data cleaned up
-- =====================================================

