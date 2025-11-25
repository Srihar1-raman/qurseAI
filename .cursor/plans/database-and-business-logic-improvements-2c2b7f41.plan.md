<!-- 2c2b7f41-38a6-4860-be69-f3398ab9632d 087b46e4-b828-49af-9a72-fc16cb3ecd4e -->
# Custom Instructions, Subscription Cleanup, and Rate Limiting Implementation

## Overview

Three major improvements:

1. **Custom System Instructions**: Add user-customizable system prompts with caching (like Scira)
2. **Subscription Cleanup**: Remove 'premium' tier, keep only 'free' and 'pro'
3. **Rate Limiting Migration**: Use rate_limits table with atomic increment operations (like Scira)

---

## Part 1: Custom System Instructions

### Database Schema

**File:** `lib/supabase/schema.sql`

- Create `custom_instructions` table (separate from user_preferences, like Scira):
  - `id UUID PRIMARY KEY`
  - `user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE`
  - `content TEXT NOT NULL`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Add RLS policies: users can SELECT/INSERT/UPDATE own instructions
- Add index: `idx_custom_instructions_user_id ON custom_instructions(user_id)`
- Add trigger for `updated_at` auto-update

**File:** `lib/supabase/migration_today.sql`

- Add idempotent table creation with DO block
- Add RLS policies with existence checks
- Add index and trigger

### Database Queries

**File:** `lib/db/custom-instructions.server.ts` (new)

- `getCustomInstructionsServerSide(userId: string)`: Get instructions from DB
- `saveCustomInstructionsServerSide(userId: string, content: string)`: Upsert instructions
- Return `{ id, user_id, content, created_at, updated_at }` or null

### Service Layer with Caching

**File:** `lib/services/custom-instructions.ts` (new)

- In-memory cache: `Map<userId, { content: string; timestamp: number }>`
- TTL: 5 minutes (like Scira)
- `getCustomInstructions(userId: string)`: Check cache first, then DB, then cache result
- `clearCustomInstructionsCache(userId?: string)`: Clear cache (for updates)
- `saveCustomInstructions(userId: string, content: string)`: Save to DB, then clear cache

### API Route Integration

**File:** `app/api/chat/route.ts`

- In parallel operations section (around line 280), add:
  ```typescript
  const customInstructionsPromise = lightweightUser
    ? getCustomInstructions(lightweightUser.userId)
    : Promise.resolve(null);
  ```

- In `execute` block, await custom instructions with other parallel ops
- Merge with system prompt:
  ```typescript
  const systemPrompt = customInstructions
    ? `${modeConfig.systemPrompt}\n\nUser's custom instructions (YOU MUST FOLLOW THESE): ${customInstructions}`
    : modeConfig.systemPrompt;
  ```

- Use merged `systemPrompt` in `streamText()` call (line 431)

### API Endpoint

**File:** `app/api/user/custom-instructions/route.ts` (new)

- `GET`: Return user's custom instructions (or null)
- `PUT`: Save custom instructions, validate content (max length, etc.), clear cache after save
- Both require authentication
- Use Zod validation for PUT body: `{ content: z.string().max(5000).optional() }`

### Frontend Integration

**File:** `components/settings/SystemSection.tsx`

- Add state: `content`, `isLoading`, `saveStatus`
- `useEffect` to load instructions on mount (GET `/api/user/custom-instructions`)
- Handle save button: PUT to API, show success/error toast
- Handle reset button: Clear content, reset to empty
- Show character count if needed

**File:** `app/settings/SettingsPageClient.tsx`

- Ensure SystemSection is rendered (already exists at line 379)

### Type Definitions

**File:** `lib/types.ts`

- Add `CustomInstructions` interface:
  ```typescript
  export interface CustomInstructions {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
  }
  ```


---

## Part 2: Remove Premium Tier from Subscriptions

### Database Schema

**File:** `lib/supabase/schema.sql`

- Update subscriptions table CHECK constraint:
  - Drop existing `subscriptions_plan_check` constraint
  - Add new constraint: `CHECK (plan IN ('free', 'pro'))`
- Wrap in idempotent DO block to handle existing constraint name

**File:** `lib/supabase/migration_today.sql`

- Add idempotent constraint update:
  ```sql
  DO $$
  DECLARE
    constraint_name TEXT;
  BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%plan%IN%';
    
    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', constraint_name);
    END IF;
    
    ALTER TABLE subscriptions 
    ADD CONSTRAINT subscriptions_plan_check 
    CHECK (plan IN ('free', 'pro'));
  END $$;
  ```


### Type Definitions

**File:** `lib/types.ts`

- Update `Subscription` interface: change `plan: 'free' | 'pro' | 'premium'` to `plan: 'free' | 'pro'`
- Remove all references to 'premium' in comments

### Service Layer

**File:** `lib/services/subscription.ts`

- Update `isProUser()` comment: remove mention of "Premium" (line 15)
- Logic already works (checks `plan !== 'free'`), no code changes needed

### Database Queries

**File:** `lib/db/subscriptions.server.ts`

- Update type assertions: change `as 'free' | 'pro' | 'premium'` to `as 'free' | 'pro'` (lines 41, 106, 139)
- Update return type casting in both `getUserSubscriptionServerSide` and `updateSubscriptionServerSide`

---

## Part 3: Rate Limiting Migration to rate_limits Table

### Database Queries

**File:** `lib/db/rate-limits.server.ts` (new)

- `getOrCreateRateLimitRecord(userId: string, resourceType: 'message' | 'api_call')`:
  - Calculate today's window_start (UTC midnight)
  - Query rate_limits table for existing record (user_id + resource_type + window_start)
  - If exists, return `{ id, count }`
  - If not, create new record with count=0, window_end=tomorrow midnight, return `{ id, count }`
  - Handle race conditions (unique constraint on user_id + resource_type + window_start)

- `incrementRateLimit(userId: string, resourceType: 'message' | 'api_call')`:
  - Call `getOrCreateRateLimitRecord()` to get current record
  - Atomic UPDATE: `UPDATE rate_limits SET count = count + 1 WHERE id = $id`
  - Return new count

- `getRateLimitCount(userId: string, resourceType: 'message' | 'api_call')`:
  - Call `getOrCreateRateLimitRecord()` to get current record
  - Return count (0 if no record exists yet)

### Service Layer Refactor

**File:** `lib/services/rate-limiting.ts`

- Remove import of `countMessagesTodayServerSide` (line 6)
- Add import: `getRateLimitCount, incrementRateLimit` from `@/lib/db/rate-limits.server`
- Update `canSendMessage()`:
  - Replace `countMessagesTodayServerSide(userId)` with `getRateLimitCount(userId, 'message')`
  - Keep Pro user check (unlimited)
  - Keep anonymous user handling (return allowed for now)
  - Return `{ allowed, reason, remaining }` based on count vs limit

- Update `getRateLimitInfo()`:
  - Replace `countMessagesTodayServerSide(userId)` with `getRateLimitCount(userId, 'message')`
  - Keep Pro user handling (Infinity)
  - Keep anonymous user handling

- Add new function `incrementMessageUsage(userId: string)`:
  - Call `incrementRateLimit(userId, 'message')`
  - Return new count (for logging)
  - This is called AFTER message is successfully saved

### API Route Integration

**File:** `app/api/chat/route.ts`

- In `saveUserMessage()` function (line 112):
  - Replace `countMessagesTodayServerSide()` call (line 147) with `getRateLimitCount(userId, 'message')`
  - Keep rate limit check logic the same

- After successful message save (in `saveUserMessage()` or in `onFinish`):
  - Import `incrementMessageUsage` from rate-limiting service
  - Call `await incrementMessageUsage(userId)` AFTER message is saved
  - This increments the counter atomically
  - Log the new count for monitoring

### Remove Old Implementation

**File:** `lib/db/messages.server.ts`

- Remove `countMessagesTodayServerSide()` function (lines 110-163)
- This function is no longer needed

**File:** `lib/db/queries.server.ts`

- Remove export of `countMessagesTodayServerSide` (line 13)

### Error Handling

- Handle race conditions in `getOrCreateRateLimitRecord()`:
  - If INSERT fails due to unique constraint, retry SELECT (another request created it)
  - Use transaction or retry logic

- Handle database errors gracefully:
  - If rate limit check fails, fail-open (allow message) to prevent blocking users
  - Log errors for monitoring

---

## Implementation Order

1. **Database migrations** (schema.sql updates, migration_today.sql)
2. **Custom instructions**: DB queries → service layer → API endpoint → frontend
3. **Subscription cleanup**: Schema → types → service layer
4. **Rate limiting**: DB queries → service layer → API route integration → cleanup old code

---

## Key Design Decisions

- **Custom instructions**: Separate table (like Scira) for flexibility, not in user_preferences
- **Caching**: 5-minute TTL in-memory cache to reduce DB calls
- **Rate limiting**: Atomic operations prevent race conditions, one record per user per day
- **Subscription**: Simple constraint update, no data migration needed (premium users don't exist yet)
- **Error handling**: Fail-open for rate limits (don't block users on system errors)

---

## Testing Considerations

- Custom instructions: Test cache expiration, concurrent updates
- Rate limiting: Test concurrent requests (should increment correctly)
- Subscription: Verify constraint rejects 'premium' values
- All: Test with Pro users (should bypass rate limits)

### To-dos

- [ ] Add custom_instructions table to schema.sql with RLS policies, index, and trigger
- [ ] Add custom_instructions table creation to migration_today.sql with idempotent checks
- [ ] Create lib/db/custom-instructions.server.ts with getCustomInstructionsServerSide and saveCustomInstructionsServerSide
- [ ] Create lib/services/custom-instructions.ts with caching (5min TTL) and getCustomInstructions/saveCustomInstructions functions
- [ ] Create app/api/user/custom-instructions/route.ts with GET and PUT handlers
- [ ] Integrate custom instructions into app/api/chat/route.ts: load in parallel, merge with system prompt
- [ ] Update components/settings/SystemSection.tsx to load, save, and reset custom instructions
- [ ] Add CustomInstructions interface to lib/types.ts
- [ ] Update subscriptions CHECK constraint in schema.sql to remove premium tier (free and pro only)
- [ ] Add idempotent constraint update to migration_today.sql to remove premium from plan CHECK
- [ ] Update Subscription interface in lib/types.ts to remove 'premium' from plan union type
- [ ] Update type assertions in lib/db/subscriptions.server.ts to remove 'premium' from plan type casts
- [ ] Create lib/db/rate-limits.server.ts with getOrCreateRateLimitRecord, incrementRateLimit, and getRateLimitCount functions
- [ ] Refactor lib/services/rate-limiting.ts to use rate_limits table: replace countMessagesTodayServerSide with getRateLimitCount, add incrementMessageUsage
- [ ] Update app/api/chat/route.ts saveUserMessage to use getRateLimitCount, and add incrementMessageUsage after successful save
- [ ] Remove countMessagesTodayServerSide from lib/db/messages.server.ts and remove export from lib/db/queries.server.ts