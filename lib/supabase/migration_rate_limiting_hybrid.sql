-- Hybrid rate limiting + guest staging migration
-- Idempotent and aligned with Implementation Playbook (Phase 1)

-----------------------------
-- Extensions
-----------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

-----------------------------
-- Guest staging tables
-----------------------------
CREATE TABLE IF NOT EXISTS guest_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_hash TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guest_conversation_id UUID NOT NULL REFERENCES guest_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  content TEXT,
  parts JSONB,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  completion_time REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_conversations_session_hash ON guest_conversations(session_hash);
CREATE INDEX IF NOT EXISTS idx_guest_messages_conv ON guest_messages(guest_conversation_id);

-----------------------------
-- rate_limits adjustments
-----------------------------
ALTER TABLE rate_limits
  ADD COLUMN IF NOT EXISTS session_hash TEXT;

-- Add bucket columns if missing
ALTER TABLE rate_limits
  ADD COLUMN IF NOT EXISTS bucket_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bucket_end TIMESTAMPTZ;

-- Generated columns to avoid expression ambiguity in constraints
ALTER TABLE rate_limits
  ADD COLUMN IF NOT EXISTS user_key UUID GENERATED ALWAYS AS (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID)) STORED,
  ADD COLUMN IF NOT EXISTS session_key TEXT GENERATED ALWAYS AS (COALESCE(session_hash, 'guest')) STORED;

-- Make legacy window_start/window_end nullable if they exist (avoid NOT NULL violations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' AND column_name = 'window_start'
  ) THEN
    ALTER TABLE rate_limits ALTER COLUMN window_start DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rate_limits' AND column_name = 'window_end'
  ) THEN
    ALTER TABLE rate_limits ALTER COLUMN window_end DROP NOT NULL;
  END IF;
END$$;

-- Drop old constraint/index if present
ALTER TABLE rate_limits
  DROP CONSTRAINT IF EXISTS rate_limits_user_resource_window_unique;
DROP INDEX IF EXISTS uq_rate_limits_user_session_resource_bucket;

-- Add bucketed uniqueness via constraint on generated columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_limits_user_session_resource_bucket_unique'
  ) THEN
    ALTER TABLE rate_limits
      ADD CONSTRAINT rate_limits_user_session_resource_bucket_unique
      UNIQUE (user_key, session_key, resource_type, bucket_start);
  END IF;
END$$;

-- Indexes to keep lookups fast
CREATE INDEX IF NOT EXISTS idx_rate_limits_session_hash
  ON rate_limits(session_hash)
  WHERE session_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limits_session_resource_bucket
  ON rate_limits(session_hash, resource_type, bucket_start)
  WHERE session_hash IS NOT NULL;

-----------------------------
-- increment_rate_limit (bucketed, session_hash)
-----------------------------
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID DEFAULT NULL,
  p_session_hash TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT 'message',
  p_limit INTEGER DEFAULT 10,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  count INTEGER,
  limit_reached BOOLEAN,
  bucket_start TIMESTAMPTZ,
  bucket_end TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_bucket_start TIMESTAMPTZ;
  v_bucket_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_limit_reached BOOLEAN;
BEGIN
  -- Defaults for day bucket (reset at midnight UTC)
  v_bucket_start := date_trunc('day', NOW());
  v_bucket_end := v_bucket_start + INTERVAL '1 day';
  v_current_count := 0;

  SELECT rl.bucket_start, rl.bucket_end, rl.count
  INTO v_bucket_start, v_bucket_end, v_current_count
  FROM rate_limits rl
  WHERE (
          (p_user_id IS NOT NULL AND user_id = p_user_id AND session_hash IS NULL)
       OR (p_user_id IS NULL AND p_session_hash IS NOT NULL AND session_hash = p_session_hash AND user_id IS NULL)
        )
    AND resource_type = p_resource_type
    AND rl.bucket_start = v_bucket_start
  LIMIT 1;
  IF NOT FOUND THEN
    v_bucket_start := date_trunc('day', NOW());
    v_bucket_end := v_bucket_start + INTERVAL '1 day';
    v_current_count := 0;
  END IF;

  IF v_current_count >= p_limit THEN
    RETURN QUERY SELECT v_current_count, TRUE, v_bucket_start, v_bucket_end;
    RETURN;
  END IF;

  INSERT INTO rate_limits (
    user_id,
    session_hash,
    resource_type,
    count,
    bucket_start,
    bucket_end
  )
  VALUES (
    p_user_id,
    p_session_hash,
    p_resource_type,
    1,
    v_bucket_start,
    v_bucket_end
  )
  ON CONFLICT ON CONSTRAINT rate_limits_user_session_resource_bucket_unique
  DO UPDATE SET
    count = rate_limits.count + 1,
    bucket_end = EXCLUDED.bucket_end
  RETURNING rate_limits.count, (rate_limits.count >= p_limit), rate_limits.bucket_start, rate_limits.bucket_end
  INTO v_current_count, v_limit_reached, v_bucket_start, v_bucket_end;

  RETURN QUERY SELECT v_current_count, v_limit_reached, v_bucket_start, v_bucket_end;
END;
$$;

-----------------------------
-- transfer_guest_to_user (staging -> main)
-----------------------------
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

-----------------------------
-- cleanup_guest_data (TTL 30 days)
-----------------------------
CREATE OR REPLACE FUNCTION cleanup_guest_data()
RETURNS TABLE(
  messages_deleted BIGINT,
  rate_limits_deleted BIGINT,
  conversations_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limits_count BIGINT := 0;
  v_conversations_count BIGINT := 0;
  v_thirty_days_ago TIMESTAMPTZ;
BEGIN
  v_thirty_days_ago := NOW() - INTERVAL '30 days';

  -- Delete old guest conversations (CASCADE removes guest_messages)
  WITH deleted_conv AS (
    DELETE FROM guest_conversations
    WHERE created_at < v_thirty_days_ago
    RETURNING id
  )
  SELECT COUNT(*) INTO v_conversations_count FROM deleted_conv;

  -- Delete old guest rate limits
  WITH deleted_rl AS (
    DELETE FROM rate_limits
    WHERE user_id IS NULL
      AND session_hash IS NOT NULL
      AND bucket_end < v_thirty_days_ago
    RETURNING id
  )
  SELECT COUNT(*) INTO v_rate_limits_count FROM deleted_rl;

  RETURN QUERY SELECT 0::BIGINT AS messages_deleted, v_rate_limits_count, v_conversations_count;
END;
$$;

-----------------------------
-- Schedule cleanup job (daily at 2 AM UTC)
-----------------------------
-- Unschedule existing job if present to avoid duplicates (safe if none exist)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-guest-data';

SELECT cron.schedule(
  'cleanup-guest-data',
  '0 2 * * *',
  $$SELECT cleanup_guest_data();$$
);

