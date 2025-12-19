-- =====================================================
-- MIGRATION: Add DELETE policy for users table
-- Allows users to delete their own account
-- Safe to run multiple times (DROP IF EXISTS)
-- =====================================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can delete own account" ON users;

-- Create DELETE policy for users table
-- Users can only delete their own account
CREATE POLICY "Users can delete own account" 
  ON users FOR DELETE 
  USING (auth.uid() = id);

