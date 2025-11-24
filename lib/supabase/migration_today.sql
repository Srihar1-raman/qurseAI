-- =====================================================
-- MIGRATION: Today's Changes Only
-- Safe to run on existing database
-- Run this instead of the full schema.sql if you already have tables
-- =====================================================

-- =====================================================
-- 1. MESSAGES TABLE IMPROVEMENTS
-- =====================================================

-- Add new columns to messages table (if they don't exist)
DO $$ 
BEGIN
  -- Add model field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'model') THEN
    ALTER TABLE messages ADD COLUMN model TEXT;
  END IF;
  
  -- Add token tracking fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'input_tokens') THEN
    ALTER TABLE messages ADD COLUMN input_tokens INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'output_tokens') THEN
    ALTER TABLE messages ADD COLUMN output_tokens INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'total_tokens') THEN
    ALTER TABLE messages ADD COLUMN total_tokens INTEGER;
  END IF;
  
  -- Add completion time field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'completion_time') THEN
    ALTER TABLE messages ADD COLUMN completion_time REAL;
  END IF;
END $$;

-- Update role CHECK constraint to include 'tool' role
DO $$
DECLARE
  constraint_name TEXT;
  constraint_def TEXT;
BEGIN
  -- Find any existing role constraint (check all CHECK constraints on messages table)
  FOR constraint_name, constraint_def IN
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
  LOOP
    -- Check if this constraint is about role values
    IF constraint_def LIKE '%IN%' AND constraint_def LIKE '%role%' THEN
      -- Drop old constraint
      EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', constraint_name);
      EXIT; -- Only one role constraint expected
    END IF;
  END LOOP;
  
  -- Add new constraint with 'tool' role included (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'messages'::regclass 
    AND conname = 'messages_role_check'
  ) THEN
    BEGIN
      ALTER TABLE messages ADD CONSTRAINT messages_role_check 
        CHECK (role IN ('user', 'assistant', 'system', 'tool'));
    EXCEPTION WHEN duplicate_object THEN
      -- Constraint already exists (maybe with different name), ignore
      NULL;
    END;
  END IF;
END $$;

-- =====================================================
-- 2. NEW TABLES
-- =====================================================

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'auto' NOT NULL,
  language TEXT DEFAULT 'English' NOT NULL,
  auto_save_conversations BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT CHECK (plan IN ('free', 'pro', 'premium')) DEFAULT 'free' NOT NULL,
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) DEFAULT 'active' NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT check_period_dates CHECK (current_period_start IS NULL OR current_period_end IS NULL OR current_period_end > current_period_start)
);

-- Rate Limits table (for tracking usage)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'message', 'api_call', 'conversation'
  count INTEGER DEFAULT 0 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_type, window_start)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- Index for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

-- Indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_resource ON rate_limits(resource_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_resource ON rate_limits(user_id, resource_type, window_start);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger for user_preferences updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for subscriptions updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger for rate_limits updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_rate_limits_updated_at'
  ) THEN
    CREATE TRIGGER update_rate_limits_updated_at
      BEFORE UPDATE ON rate_limits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables (idempotent - safe to run multiple times)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- User Preferences policies
-- Using DO block with exception handling for idempotency
DO $$
BEGIN
  -- Create policy if it doesn't exist (using exception handling)
  BEGIN
    CREATE POLICY "Users can view own preferences" 
      ON user_preferences FOR SELECT 
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    -- Policy already exists, ignore
    NULL;
  END;
  
  BEGIN
    CREATE POLICY "Users can update own preferences" 
      ON user_preferences FOR UPDATE 
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    CREATE POLICY "Users can insert own preferences" 
      ON user_preferences FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Subscriptions policies
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can view own subscription" 
      ON subscriptions FOR SELECT 
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Rate Limits policies
DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can view own rate limits" 
      ON rate_limits FOR SELECT 
      USING (auth.uid() = user_id OR auth.uid() IS NULL);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration complete! ✅' as status;

