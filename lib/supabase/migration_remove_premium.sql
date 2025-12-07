-- Remove 'premium' from subscriptions.plan CHECK constraint
-- This migration updates the constraint for existing databases
-- Idempotent: Safe to run multiple times

DO $$
BEGIN
  -- Drop existing constraint (if it exists)
  -- PostgreSQL may have auto-generated a different constraint name
  -- Try common constraint names
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'subscriptions'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%plan%IN%'
  ) THEN
    -- Find and drop the actual constraint
    EXECUTE (
      SELECT format('ALTER TABLE subscriptions DROP CONSTRAINT %I', conname)
      FROM pg_constraint
      WHERE conrelid = 'subscriptions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%plan%IN%'
      LIMIT 1
    );
  END IF;
  
  -- Add new constraint without 'premium'
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
    CHECK (plan IN ('free', 'pro'));
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

