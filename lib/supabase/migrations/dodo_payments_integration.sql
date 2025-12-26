-- =====================================================
-- DODO PAYMENTS INTEGRATION MIGRATION
-- Adds payment tracking, audit trails, and webhook support
-- =====================================================

-- =====================================================
-- STAGE 1: UPDATE SUBSCRIPTIONS TABLE
-- =====================================================

DO $$
BEGIN
  -- Dodo Payments customer ID (for customer portal access)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'dodo_customer_id') THEN
    ALTER TABLE subscriptions ADD COLUMN dodo_customer_id TEXT;
  END IF;

  -- Dodo Payments subscription ID (prevents duplicates, webhook correlation)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'dodo_subscription_id') THEN
    ALTER TABLE subscriptions ADD COLUMN dodo_subscription_id TEXT UNIQUE;
  END IF;

  -- Last payment date (tracks successful renewals)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'last_payment_at') THEN
    ALTER TABLE subscriptions ADD COLUMN last_payment_at TIMESTAMPTZ;
  END IF;

  -- Next billing date (calculated from webhook, shown in UI)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'next_billing_at') THEN
    ALTER TABLE subscriptions ADD COLUMN next_billing_at TIMESTAMPTZ;
  END IF;

  -- Cancellation date (audit trail)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at') THEN
    ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_customer_id
  ON subscriptions(dodo_customer_id) WHERE dodo_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_subscription_id
  ON subscriptions(dodo_subscription_id) WHERE dodo_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON subscriptions(next_billing_at) WHERE next_billing_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN subscriptions.dodo_customer_id IS 'Dodo Payments customer ID for portal access';
COMMENT ON COLUMN subscriptions.dodo_subscription_id IS 'Dodo Payments subscription ID for webhook correlation';
COMMENT ON COLUMN subscriptions.last_payment_at IS 'Timestamp of last successful payment';
COMMENT ON COLUMN subscriptions.next_billing_at IS 'Next billing date from Dodo Payments';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'When the subscription was cancelled';

-- =====================================================
-- STAGE 2: CREATE PAYMENT TRANSACTIONS TABLE (AUDIT TRAIL)
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  dodo_payment_id TEXT NOT NULL UNIQUE,
  dodo_subscription_id TEXT,
  event_type TEXT NOT NULL, -- 'payment.succeeded', 'subscription.active', etc.
  amount INTEGER, -- in cents
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  metadata JSONB DEFAULT '{}', -- Full webhook payload for debugging
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_dodo_payment_id
  ON payment_transactions(dodo_payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_event_type
  ON payment_transactions(event_type);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS 'Complete audit log of all payment and subscription events';

-- =====================================================
-- STAGE 3: ROW LEVEL SECURITY FOR PAYMENT_TRANSACTIONS
-- =====================================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies - server-side only (webhooks)

-- =====================================================
-- STAGE 4: MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Dodo Payments integration migration complete!';
  RAISE NOTICE 'Added columns: dodo_customer_id, dodo_subscription_id, last_payment_at, next_billing_at, cancelled_at';
  RAISE NOTICE 'Created table: payment_transactions';
  RAISE NOTICE 'Created indexes for performance optimization';
END $$;
