-- =====================================================
-- BACKFILL SCRIPT: Populate daily_activity_stats with historical data
--
-- This script aggregates all existing messages and populates
-- the daily_activity_stats table with historical data.
--
-- Run this AFTER creating the daily_activity_stats table.
-- =====================================================

-- First, let's see what data we're working with
SELECT
  'Historical data summary' as info,
  COUNT(DISTINCT id) as total_messages,
  COUNT(DISTINCT conversation_id) as total_conversations,
  MIN(created_at)::date as earliest_date,
  MAX(created_at)::date as latest_date,
  COUNT(DISTINCT DATE(created_at)) as unique_days
FROM messages
WHERE role = 'assistant';

-- =====================================================
-- BACKFILL QUERY
-- This aggregates all historical data by date
-- =====================================================

WITH daily_groups AS (
  SELECT
    DATE(created_at) as activity_date
  FROM messages
  WHERE role = 'assistant'
  GROUP BY DATE(created_at)
),
model_metrics AS (
  SELECT
    DATE(m.created_at) as activity_date,
    REGEXP_REPLACE(m.model, '^(openai|anthropic)/', '') as model,
    COUNT(DISTINCT m.id) as msg_count,
    SUM(m.input_tokens) as input_tokens,
    SUM(m.output_tokens) as output_tokens,
    SUM(m.total_tokens) as total_tokens,
    COUNT(DISTINCT m.conversation_id) as conversation_count
  FROM messages m
  WHERE m.role = 'assistant' AND m.model IS NOT NULL
  GROUP BY DATE(m.created_at), REGEXP_REPLACE(m.model, '^(openai|anthropic)/', '')
)
INSERT INTO daily_activity_stats (
  activity_date,
  messages_count,
  conversations_count,
  input_tokens,
  output_tokens,
  total_tokens,
  metrics
)
SELECT
  dg.activity_date,
  COUNT(DISTINCT m.id)::INTEGER as messages_count,
  COUNT(DISTINCT m.conversation_id)::INTEGER as conversations_count,
  COALESCE(SUM(m.input_tokens), 0)::BIGINT as input_tokens,
  COALESCE(SUM(m.output_tokens), 0)::BIGINT as output_tokens,
  COALESCE(SUM(m.total_tokens), 0)::BIGINT as total_tokens,
  COALESCE(
    JSONB_BUILD_OBJECT(
      'models',
      (
        SELECT JSONB_OBJECT_AGG(
          mm.model,
          JSONB_BUILD_OBJECT(
            'messages', mm.msg_count,
            'inputTokens', COALESCE(mm.input_tokens, 0),
            'outputTokens', COALESCE(mm.output_tokens, 0),
            'totalTokens', COALESCE(mm.total_tokens, 0),
            'conversations', mm.conversation_count
          )
        )
        FROM model_metrics mm
        WHERE mm.activity_date = dg.activity_date
      )
    ),
    '{}'::jsonb
  ) as metrics
FROM daily_groups dg
LEFT JOIN messages m ON DATE(m.created_at) = dg.activity_date AND m.role = 'assistant'
GROUP BY dg.activity_date
ON CONFLICT (activity_date) DO UPDATE SET
  messages_count = EXCLUDED.messages_count,
  conversations_count = EXCLUDED.conversations_count,
  input_tokens = EXCLUDED.input_tokens,
  output_tokens = EXCLUDED.output_tokens,
  total_tokens = EXCLUDED.total_tokens,
  metrics = EXCLUDED.metrics,
  updated_at = NOW();

-- =====================================================
-- VERIFY BACKFILL
-- Check that the data was inserted correctly
-- =====================================================

SELECT
  'Backfill complete' as status,
  COUNT(*) as days_populated,
  SUM(messages_count) as total_messages,
  SUM(conversations_count) as total_conversations,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  MIN(activity_date) as earliest_date,
  MAX(activity_date) as latest_date
FROM daily_activity_stats;

-- Show sample data
SELECT
  activity_date,
  messages_count,
  conversations_count,
  total_tokens,
  metrics
FROM daily_activity_stats
ORDER BY activity_date DESC
LIMIT 10;
