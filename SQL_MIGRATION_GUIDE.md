# SQL Migration Guide

## 🎯 Quick Answer

**If you already have the database set up:**
- ✅ **Run `migration_today.sql`** - Only includes today's new changes, fully idempotent

**If this is a fresh database:**
- ✅ **Run `schema.sql`** - Complete schema setup

---

## 📋 What's the Difference?

### `schema.sql` (Full Schema)
- Contains **everything** (old + new)
- Includes core tables: `users`, `conversations`, `messages`
- Includes all indexes, triggers, functions, RLS policies
- **Problem:** Some commands will error if run twice (policies, triggers)
- **Use when:** Setting up a fresh database

### `migration_today.sql` (Today's Changes Only)
- Contains **only today's new changes**
- New columns on `messages` table
- New tables: `user_preferences`, `subscriptions`, `rate_limits`
- All commands are **idempotent** (safe to run multiple times)
- **Use when:** You already have the database set up

---

## ✅ Is It Safe to Run the Full `schema.sql` Again?

### Mostly Safe, But...

**✅ Safe Commands (won't error):**
- `CREATE TABLE IF NOT EXISTS` - Skips if table exists
- `CREATE INDEX IF NOT EXISTS` - Skips if index exists
- `CREATE OR REPLACE FUNCTION` - Replaces if exists
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` - Idempotent
- `DO $$ BEGIN ... IF NOT EXISTS ... END $$;` - Checks before creating

**⚠️ Will Error (but harmless):**
- `CREATE POLICY` - Will error if policy already exists
- `CREATE TRIGGER` - Will error if trigger already exists

**Example errors you might see:**
```
ERROR: policy "Users can view own profile" for relation "users" already exists
ERROR: trigger "update_conversations_updated_at" for relation "conversations" already exists
```

**These errors are harmless** - they just mean the policy/trigger already exists. The migration will continue.

---

## 🚀 Recommended Approach

### Option 1: Use Migration Script (Recommended)
```sql
-- Run this in Supabase SQL Editor
-- File: lib/supabase/migration_today.sql
```
**Pros:**
- ✅ Only adds new stuff
- ✅ Fully idempotent (no errors)
- ✅ Clean and focused

### Option 2: Run Full Schema (If You Don't Mind Errors)
```sql
-- Run this in Supabase SQL Editor
-- File: lib/supabase/schema.sql
```
**Pros:**
- ✅ Ensures everything is set up
- ✅ Good for fresh databases

**Cons:**
- ⚠️ Will show errors for existing policies/triggers (but they're harmless)

---

## 📝 Step-by-Step Instructions

### Using Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "SQL Editor" in the left sidebar

2. **Choose Your Script:**
   - **If database already exists:** Copy `lib/supabase/migration_today.sql`
   - **If fresh database:** Copy `lib/supabase/schema.sql`

3. **Paste and Run:**
   - Paste the SQL into the editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

4. **Check Results:**
   - Should see: `Migration complete! ✅` or `Minimal database schema setup complete! 🎉`
   - If you see errors about existing policies/triggers, that's fine - they already exist

### Using Supabase CLI (Alternative)

```bash
# If using Supabase CLI
supabase db reset  # For fresh database
# OR
psql $DATABASE_URL < lib/supabase/migration_today.sql  # For existing database
```

---

## 🔍 What Gets Created

### New Columns on `messages` Table
- `model` (TEXT) - AI model used
- `input_tokens` (INTEGER) - Input token count
- `output_tokens` (INTEGER) - Output token count
- `total_tokens` (INTEGER) - Total tokens
- `completion_time` (REAL) - Generation time

### New Tables
1. **`user_preferences`** - User settings (theme, language, etc.)
2. **`subscriptions`** - Subscription management
3. **`rate_limits`** - Usage tracking (schema ready, not actively used yet)

### New Indexes
- Indexes on all new tables for performance

### New RLS Policies
- Policies for all new tables to ensure security

---

## ✅ Verification

After running the migration, verify it worked:

```sql
-- Check if new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('model', 'input_tokens', 'output_tokens', 'total_tokens', 'completion_time');

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_preferences', 'subscriptions', 'rate_limits');

-- Should return 5 columns and 3 tables
```

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Meaning:** Table/index already exists  
**Solution:** This is fine - the `IF NOT EXISTS` clause prevents actual errors

### Error: "policy already exists"
**Meaning:** RLS policy already exists  
**Solution:** This is harmless - the policy is already there, which is what we want

### Error: "trigger already exists"
**Meaning:** Trigger already exists  
**Solution:** This is harmless - the trigger is already there

### Error: "column already exists"
**Meaning:** Column already exists  
**Solution:** This shouldn't happen with the migration script (it checks first), but if it does, the column is already there, which is fine

---

## 📚 Summary

**TL;DR:**
- ✅ **Use `migration_today.sql`** if you already have a database (recommended)
- ✅ **Use `schema.sql`** if starting fresh
- ⚠️ Running `schema.sql` twice will show harmless errors for existing policies/triggers
- ✅ All new changes are idempotent and safe to run multiple times

**Bottom line:** Run `migration_today.sql` - it's cleaner and won't show any errors! 🚀

