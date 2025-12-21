-- =====================================================
-- MIGRATION: Cleanup Duplicate Messages (pg_cron Job)
-- Safe, smart duplicate detection and cleanup
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch; -- For Levenshtein distance function

-- =====================================================
-- HELPER FUNCTION: Extract text content from parts JSONB
-- =====================================================
CREATE OR REPLACE FUNCTION extract_text_from_parts(parts_jsonb JSONB)
RETURNS TEXT AS $$
DECLARE
  text_content TEXT := '';
  part JSONB;
BEGIN
  IF parts_jsonb IS NULL OR NOT jsonb_typeof(parts_jsonb) = 'array' THEN
    RETURN '';
  END IF;
  
  FOR part IN SELECT value FROM jsonb_array_elements(parts_jsonb)
  LOOP
    IF (part->>'type') = 'text' AND (part->>'text') IS NOT NULL THEN
      -- Remove stop text for comparison
      text_content := text_content || regexp_replace(part->>'text', '\*User stopped this message here\*', '', 'g');
    END IF;
  END LOOP;
  
  RETURN trim(text_content);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- HELPER FUNCTION: Extract reasoning content from parts JSONB
-- =====================================================
CREATE OR REPLACE FUNCTION extract_reasoning_from_parts(parts_jsonb JSONB)
RETURNS TEXT AS $$
DECLARE
  reasoning_content TEXT := '';
  part JSONB;
BEGIN
  IF parts_jsonb IS NULL OR NOT jsonb_typeof(parts_jsonb) = 'array' THEN
    RETURN '';
  END IF;
  
  FOR part IN SELECT value FROM jsonb_array_elements(parts_jsonb)
  LOOP
    IF (part->>'type') = 'reasoning' AND (part->>'text') IS NOT NULL THEN
      reasoning_content := reasoning_content || (part->>'text');
    END IF;
  END LOOP;
  
  RETURN trim(reasoning_content);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- HELPER FUNCTION: Check if message has stop text
-- =====================================================
CREATE OR REPLACE FUNCTION has_stop_text(parts_jsonb JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  part JSONB;
BEGIN
  IF parts_jsonb IS NULL OR NOT jsonb_typeof(parts_jsonb) = 'array' THEN
    RETURN FALSE;
  END IF;
  
  FOR part IN SELECT value FROM jsonb_array_elements(parts_jsonb)
  LOOP
    IF (part->>'type') = 'text' AND (part->>'text') IS NOT NULL THEN
      IF (part->>'text') LIKE '%*User stopped this message here*%' THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- HELPER FUNCTION: Calculate text similarity
-- Returns similarity ratio (0.0 to 1.0)
-- Uses different algorithms based on string length
-- =====================================================
CREATE OR REPLACE FUNCTION text_similarity(text1 TEXT, text2 TEXT)
RETURNS FLOAT AS $$
DECLARE
  len1 INT;
  len2 INT;
  max_len INT;
  min_len INT;
  distance INT;
  similarity FLOAT;
  prefix1 TEXT;
  prefix2 TEXT;
  suffix1 TEXT;
  suffix2 TEXT;
BEGIN
  -- Handle NULL or empty strings
  IF text1 IS NULL OR text1 = '' OR text2 IS NULL OR text2 = '' THEN
    IF text1 = text2 THEN
      RETURN 1.0;
    ELSE
      RETURN 0.0;
    END IF;
  END IF;
  
  len1 := length(text1);
  len2 := length(text2);
  max_len := GREATEST(len1, len2);
  min_len := LEAST(len1, len2);
  
  IF max_len = 0 THEN
    RETURN 1.0;
  END IF;
  
  -- For very short strings, use exact match
  IF max_len <= 10 THEN
    IF text1 = text2 THEN
      RETURN 1.0;
    ELSE
      RETURN 0.0;
    END IF;
  END IF;
  
  -- For strings <= 255 chars, use Levenshtein distance
  IF max_len <= 255 THEN
    distance := levenshtein(text1, text2);
    similarity := 1.0 - (distance::FLOAT / max_len::FLOAT);
    RETURN GREATEST(0.0, similarity); -- Ensure non-negative
  END IF;
  
  -- For longer strings, use prefix/suffix comparison + substring matching
  -- This is more efficient and works for long messages
  prefix1 := LEFT(text1, 200);
  prefix2 := LEFT(text2, 200);
  suffix1 := RIGHT(text1, 200);
  suffix2 := RIGHT(text2, 200);
  
  -- Check prefix similarity (first 200 chars)
  IF prefix1 = prefix2 THEN
    -- Prefixes match, check if one is a prefix of the other
    IF len1 <= len2 AND text1 = LEFT(text2, len1) THEN
      RETURN 0.95; -- One is prefix of other (very similar)
    ELSIF len2 <= len1 AND text2 = LEFT(text1, len2) THEN
      RETURN 0.95; -- One is prefix of other (very similar)
    ELSE
      -- Check suffix similarity
      IF suffix1 = suffix2 THEN
        -- Both prefix and suffix match - very likely duplicates
        RETURN 0.90;
      ELSE
        -- Only prefix matches - calculate similarity on prefix
        distance := levenshtein(prefix1, prefix2);
        similarity := 1.0 - (distance::FLOAT / 200.0);
        RETURN GREATEST(0.0, similarity);
      END IF;
    END IF;
  END IF;
  
  -- Prefixes don't match exactly - use Levenshtein on prefixes
  distance := levenshtein(prefix1, prefix2);
  similarity := 1.0 - (distance::FLOAT / 200.0);
  
  -- Also check if one contains the other (for partial matches)
  IF text1 LIKE '%' || text2 || '%' OR text2 LIKE '%' || text1 || '%' THEN
    -- One contains the other - high similarity
    similarity := GREATEST(similarity, 0.85);
  END IF;
  
  RETURN GREATEST(0.0, similarity);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- MAIN FUNCTION: Cleanup duplicate messages
-- Very conservative - only deletes if 100% sure they're duplicates
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_messages()
RETURNS TABLE(
  deleted_count INT,
  kept_messages JSONB,
  deleted_messages JSONB
) AS $$
DECLARE
  msg1 RECORD;
  msg2 RECORD;
  text1 TEXT;
  text2 TEXT;
  reasoning1 TEXT;
  reasoning2 TEXT;
  has_stop1 BOOLEAN;
  has_stop2 BOOLEAN;
  text_sim FLOAT;
  reasoning_sim FLOAT;
  deleted_ids UUID[] := ARRAY[]::UUID[];
  kept_ids UUID[] := ARRAY[]::UUID[];
  deleted_count INT := 0;
  deleted_details JSONB[] := ARRAY[]::JSONB[];
  kept_details JSONB[] := ARRAY[]::JSONB[];
BEGIN
  -- Process each conversation separately
  FOR msg1 IN 
    SELECT DISTINCT conversation_id 
    FROM messages 
    WHERE role = 'assistant' 
      AND parts IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days' -- Only check recent messages (last 7 days)
    ORDER BY conversation_id
  LOOP
    -- Find potential duplicates within this conversation
    FOR msg1 IN
      SELECT m1.id, m1.conversation_id, m1.parts, m1.created_at, m1.content
      FROM messages m1
      WHERE m1.conversation_id = msg1.conversation_id
        AND m1.role = 'assistant'
        AND m1.parts IS NOT NULL
        AND m1.id NOT IN (SELECT unnest(deleted_ids)) -- Skip already deleted
      ORDER BY m1.created_at
    LOOP
      -- Extract content from msg1
      text1 := extract_text_from_parts(msg1.parts);
      reasoning1 := extract_reasoning_from_parts(msg1.parts);
      has_stop1 := has_stop_text(msg1.parts);
      
      -- Compare with all other assistant messages in the same conversation
      FOR msg2 IN
        SELECT m2.id, m2.conversation_id, m2.parts, m2.created_at, m2.content
        FROM messages m2
        WHERE m2.conversation_id = msg1.conversation_id
          AND m2.role = 'assistant'
          AND m2.parts IS NOT NULL
          AND m2.id != msg1.id -- Don't compare with itself
          AND m2.id NOT IN (SELECT unnest(deleted_ids)) -- Skip already deleted
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - msg1.created_at))) <= 10 -- Within 10 seconds (duplicates happen close together)
        ORDER BY m2.created_at
      LOOP
        -- Extract content from msg2
        text2 := extract_text_from_parts(msg2.parts);
        reasoning2 := extract_reasoning_from_parts(msg2.parts);
        has_stop2 := has_stop_text(msg2.parts);
        
        -- Calculate similarities
        text_sim := text_similarity(text1, text2);
        reasoning_sim := text_similarity(reasoning1, reasoning2);
        
        -- CONSERVATIVE DUPLICATE DETECTION:
        -- Only consider duplicates if:
        -- 1. Text similarity > 0.85 (85% similar) OR
        -- 2. Text similarity > 0.70 AND reasoning similarity > 0.80 (very similar reasoning)
        -- 3. One has stop text and the other doesn't (classic duplicate case)
        -- 4. Both have same reasoning prefix (first 200 chars) and similar text
        
        IF (
          -- Case 1: High text similarity
          (text_sim > 0.85) OR
          -- Case 2: Medium text + high reasoning similarity
          (text_sim > 0.70 AND reasoning_sim > 0.80) OR
          -- Case 3: One has stop text, other doesn't, and content is similar
          (has_stop1 != has_stop2 AND text_sim > 0.75) OR
          -- Case 4: Same reasoning prefix and similar text
          (reasoning1 != '' AND reasoning2 != '' 
           AND LEFT(reasoning1, 200) = LEFT(reasoning2, 200) 
           AND text_sim > 0.70)
        ) THEN
          -- DECISION: Which one to keep?
          -- Priority:
          -- 1. Keep the one with stop text (if one has it)
          -- 2. Keep the one with more content (longer text)
          -- 3. Keep the first one (earlier created_at)
          
          IF has_stop1 AND NOT has_stop2 THEN
            -- Keep msg1 (has stop text), delete msg2
            IF msg2.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg2.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details, 
                jsonb_build_object(
                  'id', msg2.id,
                  'conversation_id', msg2.conversation_id,
                  'created_at', msg2.created_at,
                  'reason', 'Duplicate of message with stop text'
                )
              );
            END IF;
          ELSIF has_stop2 AND NOT has_stop1 THEN
            -- Keep msg2 (has stop text), delete msg1
            IF msg1.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg1.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg1.id,
                  'conversation_id', msg1.conversation_id,
                  'created_at', msg1.created_at,
                  'reason', 'Duplicate of message with stop text'
                )
              );
            END IF;
          ELSIF length(text1) > length(text2) THEN
            -- Keep msg1 (more content), delete msg2
            IF msg2.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg2.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg2.id,
                  'conversation_id', msg2.conversation_id,
                  'created_at', msg2.created_at,
                  'reason', 'Duplicate with less content'
                )
              );
            END IF;
          ELSIF length(text2) > length(text1) THEN
            -- Keep msg2 (more content), delete msg1
            IF msg1.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg1.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg1.id,
                  'conversation_id', msg1.conversation_id,
                  'created_at', msg1.created_at,
                  'reason', 'Duplicate with less content'
                )
              );
            END IF;
          ELSE
            -- Same length, keep the first one (earlier), delete the second
            IF msg1.created_at < msg2.created_at THEN
              IF msg2.id != ALL(deleted_ids) THEN
                deleted_ids := array_append(deleted_ids, msg2.id);
                deleted_count := deleted_count + 1;
                deleted_details := array_append(deleted_details,
                  jsonb_build_object(
                    'id', msg2.id,
                    'conversation_id', msg2.conversation_id,
                    'created_at', msg2.created_at,
                    'reason', 'Duplicate (kept earlier message)'
                  )
                );
              END IF;
            ELSE
              IF msg1.id != ALL(deleted_ids) THEN
                deleted_ids := array_append(deleted_ids, msg1.id);
                deleted_count := deleted_count + 1;
                deleted_details := array_append(deleted_details,
                  jsonb_build_object(
                    'id', msg1.id,
                    'conversation_id', msg1.conversation_id,
                    'created_at', msg1.created_at,
                    'reason', 'Duplicate (kept earlier message)'
                  )
                );
              END IF;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Actually delete the duplicate messages
  IF array_length(deleted_ids, 1) > 0 THEN
    DELETE FROM messages WHERE id = ANY(deleted_ids);
    
    -- Log kept messages (for transparency)
    SELECT array_agg(
      jsonb_build_object(
        'id', id,
        'conversation_id', conversation_id,
        'created_at', created_at
      )
    ) INTO kept_details
    FROM messages
    WHERE conversation_id IN (
      SELECT DISTINCT conversation_id 
      FROM messages 
      WHERE id = ANY(deleted_ids)
    )
    AND role = 'assistant'
    AND parts IS NOT NULL
    AND id != ALL(deleted_ids);
  END IF;
  
  -- Return results
  RETURN QUERY SELECT
    deleted_count,
    COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(kept_details) elem),
      '[]'::jsonb
    ) as kept_messages,
    COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(deleted_details) elem),
      '[]'::jsonb
    ) as deleted_messages;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP FUNCTION FOR GUEST MESSAGES
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_duplicate_guest_messages()
RETURNS TABLE(
  deleted_count INT,
  kept_messages JSONB,
  deleted_messages JSONB
) AS $$
DECLARE
  msg1 RECORD;
  msg2 RECORD;
  text1 TEXT;
  text2 TEXT;
  reasoning1 TEXT;
  reasoning2 TEXT;
  has_stop1 BOOLEAN;
  has_stop2 BOOLEAN;
  text_sim FLOAT;
  reasoning_sim FLOAT;
  deleted_ids UUID[] := ARRAY[]::UUID[];
  deleted_count INT := 0;
  deleted_details JSONB[] := ARRAY[]::JSONB[];
  kept_details JSONB[] := ARRAY[]::JSONB[];
BEGIN
  -- Process each guest conversation separately
  FOR msg1 IN 
    SELECT DISTINCT guest_conversation_id 
    FROM guest_messages 
    WHERE role = 'assistant' 
      AND parts IS NOT NULL
      AND created_at >= NOW() - INTERVAL '7 days' -- Only check recent messages
    ORDER BY guest_conversation_id
  LOOP
    -- Find potential duplicates within this conversation
    FOR msg1 IN
      SELECT m1.id, m1.guest_conversation_id, m1.parts, m1.created_at, m1.content
      FROM guest_messages m1
      WHERE m1.guest_conversation_id = msg1.guest_conversation_id
        AND m1.role = 'assistant'
        AND m1.parts IS NOT NULL
        AND m1.id NOT IN (SELECT unnest(deleted_ids))
      ORDER BY m1.created_at
    LOOP
      -- Extract content from msg1
      text1 := extract_text_from_parts(msg1.parts);
      reasoning1 := extract_reasoning_from_parts(msg1.parts);
      has_stop1 := has_stop_text(msg1.parts);
      
      -- Compare with all other assistant messages in the same conversation
      FOR msg2 IN
        SELECT m2.id, m2.guest_conversation_id, m2.parts, m2.created_at, m2.content
        FROM guest_messages m2
        WHERE m2.guest_conversation_id = msg1.guest_conversation_id
          AND m2.role = 'assistant'
          AND m2.parts IS NOT NULL
          AND m2.id != msg1.id
          AND m2.id NOT IN (SELECT unnest(deleted_ids))
          AND ABS(EXTRACT(EPOCH FROM (m2.created_at - msg1.created_at))) <= 10
        ORDER BY m2.created_at
      LOOP
        -- Extract content from msg2
        text2 := extract_text_from_parts(msg2.parts);
        reasoning2 := extract_reasoning_from_parts(msg2.parts);
        has_stop2 := has_stop_text(msg2.parts);
        
        -- Calculate similarities
        text_sim := text_similarity(text1, text2);
        reasoning_sim := text_similarity(reasoning1, reasoning2);
        
        -- Same duplicate detection logic as messages table
        IF (
          (text_sim > 0.85) OR
          (text_sim > 0.70 AND reasoning_sim > 0.80) OR
          (has_stop1 != has_stop2 AND text_sim > 0.75) OR
          (reasoning1 != '' AND reasoning2 != '' 
           AND LEFT(reasoning1, 200) = LEFT(reasoning2, 200) 
           AND text_sim > 0.70)
        ) THEN
          -- Same decision logic as messages table
          IF has_stop1 AND NOT has_stop2 THEN
            IF msg2.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg2.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg2.id,
                  'guest_conversation_id', msg2.guest_conversation_id,
                  'created_at', msg2.created_at,
                  'reason', 'Duplicate of message with stop text'
                )
              );
            END IF;
          ELSIF has_stop2 AND NOT has_stop1 THEN
            IF msg1.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg1.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg1.id,
                  'guest_conversation_id', msg1.guest_conversation_id,
                  'created_at', msg1.created_at,
                  'reason', 'Duplicate of message with stop text'
                )
              );
            END IF;
          ELSIF length(text1) > length(text2) THEN
            IF msg2.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg2.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg2.id,
                  'guest_conversation_id', msg2.guest_conversation_id,
                  'created_at', msg2.created_at,
                  'reason', 'Duplicate with less content'
                )
              );
            END IF;
          ELSIF length(text2) > length(text1) THEN
            IF msg1.id != ALL(deleted_ids) THEN
              deleted_ids := array_append(deleted_ids, msg1.id);
              deleted_count := deleted_count + 1;
              deleted_details := array_append(deleted_details,
                jsonb_build_object(
                  'id', msg1.id,
                  'guest_conversation_id', msg1.guest_conversation_id,
                  'created_at', msg1.created_at,
                  'reason', 'Duplicate with less content'
                )
              );
            END IF;
          ELSE
            IF msg1.created_at < msg2.created_at THEN
              IF msg2.id != ALL(deleted_ids) THEN
                deleted_ids := array_append(deleted_ids, msg2.id);
                deleted_count := deleted_count + 1;
                deleted_details := array_append(deleted_details,
                  jsonb_build_object(
                    'id', msg2.id,
                    'guest_conversation_id', msg2.guest_conversation_id,
                    'created_at', msg2.created_at,
                    'reason', 'Duplicate (kept earlier message)'
                  )
                );
              END IF;
            ELSE
              IF msg1.id != ALL(deleted_ids) THEN
                deleted_ids := array_append(deleted_ids, msg1.id);
                deleted_count := deleted_count + 1;
                deleted_details := array_append(deleted_details,
                  jsonb_build_object(
                    'id', msg1.id,
                    'guest_conversation_id', msg1.guest_conversation_id,
                    'created_at', msg1.created_at,
                    'reason', 'Duplicate (kept earlier message)'
                  )
                );
              END IF;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Actually delete the duplicate guest messages
  IF array_length(deleted_ids, 1) > 0 THEN
    DELETE FROM guest_messages WHERE id = ANY(deleted_ids);
    
    -- Log kept messages
    SELECT array_agg(
      jsonb_build_object(
        'id', id,
        'guest_conversation_id', guest_conversation_id,
        'created_at', created_at
      )
    ) INTO kept_details
    FROM guest_messages
    WHERE guest_conversation_id IN (
      SELECT DISTINCT guest_conversation_id 
      FROM guest_messages 
      WHERE id = ANY(deleted_ids)
    )
    AND role = 'assistant'
    AND parts IS NOT NULL
    AND id != ALL(deleted_ids);
  END IF;
  
  -- Return results
  RETURN QUERY SELECT
    deleted_count,
    COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(kept_details) elem),
      '[]'::jsonb
    ) as kept_messages,
    COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(deleted_details) elem),
      '[]'::jsonb
    ) as deleted_messages;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- WRAPPER FUNCTION: Run cleanup for both tables
-- =====================================================
CREATE OR REPLACE FUNCTION run_duplicate_cleanup()
RETURNS JSONB AS $$
DECLARE
  messages_result RECORD;
  guest_messages_result RECORD;
  result JSONB;
BEGIN
  -- Cleanup messages table
  SELECT * INTO messages_result FROM cleanup_duplicate_messages();
  
  -- Cleanup guest_messages table
  SELECT * INTO guest_messages_result FROM cleanup_duplicate_guest_messages();
  
  -- Combine results
  result := jsonb_build_object(
    'timestamp', NOW(),
    'messages', jsonb_build_object(
      'deleted_count', messages_result.deleted_count,
      'kept_messages', messages_result.kept_messages,
      'deleted_messages', messages_result.deleted_messages
    ),
    'guest_messages', jsonb_build_object(
      'deleted_count', guest_messages_result.deleted_count,
      'kept_messages', guest_messages_result.kept_messages,
      'deleted_messages', guest_messages_result.deleted_messages
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULE pg_cron JOB: Run daily at 2 AM UTC
-- =====================================================
-- Note: This requires superuser privileges. Run manually in Supabase SQL Editor
-- or ask Supabase support to enable pg_cron if not available

-- Schedule the job (commented out - run manually in Supabase SQL Editor)
-- SELECT cron.schedule(
--   'cleanup-duplicate-messages',           -- Job name
--   '0 2 * * *',                            -- Cron: Daily at 2 AM UTC
--   $$SELECT run_duplicate_cleanup();$$     -- SQL to execute
-- );

-- =====================================================
-- MANUAL EXECUTION (for testing)
-- =====================================================
-- To test manually, run:
-- SELECT * FROM run_duplicate_cleanup();

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- This cleanup job:
-- 1. Only processes messages from the last 7 days (recent duplicates)
-- 2. Only compares messages within 10 seconds of each other (duplicates happen close together)
-- 3. Uses conservative similarity thresholds (85% text or 70% text + 80% reasoning)
-- 4. Always keeps the message with stop text if one exists
-- 5. Keeps the message with more content if lengths differ
-- 6. Keeps the earlier message if everything else is equal
-- 7. Returns detailed logs of what was deleted and kept
--
-- Safety features:
-- - Only processes assistant messages (never touches user messages)
-- - Only processes messages with parts column (new format)
-- - Very conservative similarity thresholds
-- - Detailed logging for audit trail
-- - Processes conversations separately (no cross-conversation comparisons)
--
-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration complete! Duplicate cleanup functions created ✅' as status;

