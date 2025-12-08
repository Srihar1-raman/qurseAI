-- Remove 'premium' from subscriptions.plan CHECK constraint
-- This migration updates the constraint for existing databases
-- Idempotent: Safe to run multiple times

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the existing constraint name (if it exists)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'subscriptions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%plan%IN%'
  LIMIT 1;
  
  -- Drop existing constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped existing constraint: %', constraint_name;
  END IF;
  
  -- Add new constraint without 'premium' (only if it doesn't already exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'subscriptions'::regclass
      AND contype = 'c'
      AND conname = 'subscriptions_plan_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
      CHECK (plan IN ('free', 'pro'));
    RAISE NOTICE 'Added new constraint: subscriptions_plan_check';
  ELSE
    RAISE NOTICE 'Constraint subscriptions_plan_check already exists, skipping.';
  END IF;
END $$;

-- Verify no subscriptions have 'premium' plan (should be empty)
-- If any exist, they need to be migrated to 'pro' first
DO $$
DECLARE
  premium_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO premium_count
  FROM subscriptions 
  WHERE plan = 'premium';
  
  IF premium_count > 0 THEN
    RAISE WARNING 'Found % subscription(s) with premium plan. These need to be migrated to pro before constraint update.', premium_count;
  ELSE
    RAISE NOTICE 'No premium subscriptions found. Constraint updated successfully.';
  END IF;
END $$;

