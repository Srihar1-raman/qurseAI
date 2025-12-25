-- =====================================================
-- QURSE MINIMAL DATABASE SCHEMA
-- Professional, Lean, Scalable (Inspired by Scira)
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES (Minimal Setup)
-- =====================================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Conversations table (chat history)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages table (individual messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT, -- Made nullable: legacy field, new messages use parts array
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- MESSAGES TABLE IMPROVEMENTS
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
  
  -- Add parts JSONB column for AI SDK parts array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'messages' AND column_name = 'parts') THEN
    ALTER TABLE messages ADD COLUMN parts JSONB;
  END IF;
END $$;

-- Update role CHECK constraint to include 'tool' role
-- Drop existing constraint and create new one
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the actual constraint name (PostgreSQL may auto-generate it)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'messages'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%IN%';
  
  -- Drop old constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', constraint_name);
  END IF;
  
  -- Add new constraint with 'tool' role included
  ALTER TABLE messages ADD CONSTRAINT messages_role_check 
    CHECK (role IN ('user', 'assistant', 'system', 'tool'));
END $$;

-- =====================================================
-- INDEXES (For Performance)
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_model ON messages(model) WHERE model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_parts ON messages USING GIN (parts) WHERE parts IS NOT NULL;

-- =====================================================
-- FUNCTIONS (Helper Functions)
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversations with message count
CREATE OR REPLACE FUNCTION get_conversations_with_message_count(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    COUNT(m.id)::BIGINT as message_count
  FROM conversations c
  LEFT JOIN messages m ON c.id = m.conversation_id
  WHERE c.user_id = user_uuid
  GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS (Auto-update Timestamps)
-- =====================================================

-- Update conversations timestamp when modified
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update users timestamp when modified
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update conversation timestamp when message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users policies (users can only access their own profile)
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Conversations policies (users can only access their own conversations)
CREATE POLICY "Users can view own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" 
  ON conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" 
  ON conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- Messages policies (users can only access messages from their conversations)
CREATE POLICY "Users can view messages from own conversations" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations" 
  ON messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own conversations" 
  ON messages FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- =====================================================
-- NEW TABLES (Current Features)
-- =====================================================

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'auto' NOT NULL,
  language TEXT DEFAULT 'English' NOT NULL,
  auto_save_conversations BOOLEAN DEFAULT true NOT NULL,
  custom_prompt TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Partial index for custom_prompt (only index non-null values for performance)
CREATE INDEX IF NOT EXISTS idx_user_preferences_custom_prompt
ON user_preferences(custom_prompt)
WHERE custom_prompt IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT CHECK (plan IN ('free', 'pro')) DEFAULT 'free' NOT NULL,
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) DEFAULT 'active' NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Indexes for rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_resource ON rate_limits(resource_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_resource ON rate_limits(user_id, resource_type, window_start);

-- Trigger for updated_at
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- User Preferences policies
CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Note: Subscription updates should be server-side only (via webhooks)
-- No UPDATE/INSERT policies for subscriptions - handled server-side

-- Rate Limits policies
CREATE POLICY "Users can view own rate limits" 
  ON rate_limits FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Note: Rate limit updates should be server-side only
-- No UPDATE/INSERT policies for rate_limits - handled server-side

-- =====================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

-- Function to ensure user has a subscription (creates if missing)
-- Uses SECURITY DEFINER to bypass RLS for subscription creation
-- This is safe because it validates user_id and only creates free subscriptions
CREATE OR REPLACE FUNCTION ensure_user_subscription(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_id UUID;
  now_timestamp TIMESTAMPTZ;
  one_year_later TIMESTAMPTZ;
BEGIN
  -- Check if subscription already exists
  SELECT id INTO subscription_id
  FROM subscriptions
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- If subscription exists, return it
  IF subscription_id IS NOT NULL THEN
    RETURN subscription_id;
  END IF;
  
  -- Calculate period dates (1 year from now)
  now_timestamp := NOW();
  one_year_later := now_timestamp + INTERVAL '1 year';
  
  -- Create default subscription (free plan)
  INSERT INTO subscriptions (
    user_id,
    plan,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  VALUES (
    user_uuid,
    'free',
    'active',
    now_timestamp,
    one_year_later,
    false
  )
  RETURNING id INTO subscription_id;
  
  -- Return the created subscription ID
  RETURN subscription_id;
EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another request created subscription between check and insert
    -- Return the existing subscription ID
    SELECT id INTO subscription_id
    FROM subscriptions
    WHERE user_id = user_uuid
    LIMIT 1;
    RETURN subscription_id;
  WHEN OTHERS THEN
    -- Re-raise the error
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
-- This allows the function to be called via RPC from the application
GRANT EXECUTE ON FUNCTION ensure_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_subscription(UUID) TO anon;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Minimal database schema setup complete! 🎉' as status;

