# Rate Limiting & Message Persistence Implementation Plan

**Status:** Planning  
**Priority:** High  
**Date:** 2025-01-08  
**Approach:** Hybrid (Redis + Database) with Message Persistence

---

## 📋 Overview

Implement comprehensive rate limiting and message persistence for:
- **Guest users**: Hybrid (Redis IP-based + DB session-based), 10 messages/day (rolling 24h)
- **Free users**: Database-based, 20 messages/day (rolling 24h)
- **Pro users**: Unlimited, but track usage in database
- **Message persistence**: Guest messages persist and transfer to authenticated user

**Why Hybrid?**
- **Layer 1 (Redis)**: Fast rejection (~1-2ms) for obvious abuse, reduces DB load by ~80%
- **Layer 2 (DB)**: Accurate per-session limits, enables message persistence
- **Best of both**: Speed + Accuracy + Features

---

## 🎯 Goals

1. **Fastest TTFB**: Rate limiting adds < 10ms overhead (critical for "fastest AI chat app")
2. **Prevent abuse**: Control costs and prevent spam
3. **Fair usage**: Accurate limits per user/session
4. **Message persistence**: Guest messages transfer to authenticated user
5. **Production-ready**: Scalable, resilient, professional error handling

---

## 🏗️ Architecture

### Hybrid Rate Limiting Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Guest Request                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Fast Check (Redis - IP-based)                 │
│  ────────────────────────────────────────                │
│  • Extract IP from headers                               │
│  • Check Redis: @upstash/ratelimit:unauth:ip:{ip}       │
│  • Limit: 10/day (sliding window)                       │
│  • Latency: ~1-2ms                                       │
│  • Purpose: Quick rejection, reduce DB load              │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Exceeded?              Allowed?
         │                       │
         ▼                       ▼
    Return 429          Continue to Layer 2
    (No DB call)         (Accurate check)
    (~1-2ms total)       (~5-10ms total)
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Accurate Check (DB - Session-based)          │
│  ────────────────────────────────────────                │
│  • Get/Create session_id (cookie/localStorage)          │
│  • Check rate_limits table: session_id-based            │
│  • Limit: 10/day (rolling 24h)                          │
│  • Latency: ~5-10ms                                      │
│  • Purpose: Accurate limits, enable persistence         │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Exceeded?              Allowed?
         │                       │
         ▼                       ▼
    Return 429          Process Request
    (Accurate)          Store messages
    (~6-12ms total)     with session_id
                             │
                             ▼
                    ┌─────────────────┐
                    │  On Auth:       │
                    │  Transfer       │
                    │  session_id →   │
                    │  user_id        │
                    └─────────────────┘
```

### Performance Characteristics

**Latency Breakdown:**
- Layer 1 (Redis): ~1-2ms (in-memory, fast)
- Layer 2 (DB): ~5-10ms (indexed query, atomic)
- **Total overhead: ~6-12ms** (acceptable for "fastest AI chat app")

**Load Distribution:**
- 100 requests:
  - 80 blocked by Redis (no DB call) = **80% reduction in DB load**
  - 20 pass to DB (accurate check)
  - 15 allowed, 5 blocked by DB

**Why This Works for Speed:**
- Most abuse filtered quickly (Redis) - no DB call
- Only legitimate requests hit DB
- Single atomic DB query (optimized)
- Total overhead negligible compared to AI inference time

---

## 💾 Database Schema Changes

### 1. Messages Table

**NO CHANGES NEEDED** ✅

**Why:**
- Messages already link to conversations via `conversation_id`
- Conversations will have `session_id` for guests
- Messages belong to conversations, conversations belong to users/sessions
- This is proper normalization (no redundancy)

**For guest messages:**
- Query via: `SELECT * FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE session_id = ?)`
- Transfer: Update conversations, messages automatically transfer (foreign key)

**For cleanup:**
- Delete conversations: `DELETE FROM conversations WHERE session_id = ? AND user_id IS NULL`
- Messages automatically deleted (CASCADE)
- Or: `DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE session_id = ? AND user_id IS NULL)`

### 2. Rate Limits Table

**Add `session_id` column for guest rate limiting:**

```sql
-- Add session_id column (nullable - only for guests)
ALTER TABLE rate_limits 
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Drop old unique constraint
ALTER TABLE rate_limits 
DROP CONSTRAINT IF EXISTS rate_limits_user_resource_window_unique;

-- New unique constraint (handles both user_id and session_id)
ALTER TABLE rate_limits 
ADD CONSTRAINT rate_limits_user_session_resource_window_unique 
UNIQUE(
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID), 
  COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::UUID), 
  resource_type, 
  window_start
);

-- Index for guest rate limit lookup
CREATE INDEX IF NOT EXISTS idx_rate_limits_session_id 
ON rate_limits(session_id) 
WHERE session_id IS NOT NULL;

-- Composite index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_session_resource_window 
ON rate_limits(session_id, resource_type, window_start) 
WHERE session_id IS NOT NULL;

-- Index for cleanup (TTL - old guest rate limits)
CREATE INDEX IF NOT EXISTS idx_rate_limits_guest_window_end 
ON rate_limits(window_end) 
WHERE user_id IS NULL AND session_id IS NOT NULL;
```

**Why:**
- `session_id` nullable: authenticated users use `user_id`
- Unique constraint handles both cases (guest + authenticated)
- Indexes for fast lookups and cleanup

### 3. Conversations Table (REQUIRED - Not Optional)

**CRITICAL: Must make `user_id` nullable to support guest conversations**

```sql
-- CRITICAL: Make user_id nullable (required for guest conversations)
-- This is a breaking change - existing conversations have user_id, so safe
ALTER TABLE conversations 
ALTER COLUMN user_id DROP NOT NULL;

-- Add session_id column (nullable - only for guest conversations)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Add constraint: Either user_id OR session_id must be set (not both null)
ALTER TABLE conversations 
ADD CONSTRAINT conversations_user_or_session_check 
CHECK (user_id IS NOT NULL OR session_id IS NOT NULL);

-- Index for guest conversation lookup
CREATE INDEX IF NOT EXISTS idx_conversations_session_id 
ON conversations(session_id) 
WHERE session_id IS NOT NULL;

-- Index for cleanup (TTL - old guest conversations)
CREATE INDEX IF NOT EXISTS idx_conversations_guest_created 
ON conversations(created_at) 
WHERE user_id IS NULL AND session_id IS NOT NULL;

-- Composite index for transfer lookups
CREATE INDEX IF NOT EXISTS idx_conversations_session_user 
ON conversations(session_id, user_id) 
WHERE session_id IS NOT NULL;
```

**Why:**
- **REQUIRED**: Guest conversations need `user_id = NULL`
- **Constraint**: Ensures either user_id or session_id is set (data integrity)
- **Better organization**: Conversations linked to session for guests
- **Easier transfer**: Transfer entire conversation on auth
- **Cleaner cleanup**: Delete conversation + messages together

**RLS Policy Updates (REQUIRED):**

```sql
-- Drop old policies (they block guests)
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- New policies: Allow authenticated users OR guests (via session_id)
CREATE POLICY "Users can view own conversations" 
  ON conversations FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL) -- Guest access via session_id
  );

CREATE POLICY "Users can insert own conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL) -- Guest can create with session_id
  );

CREATE POLICY "Users can update own conversations" 
  ON conversations FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL) -- Guest can update
  );

CREATE POLICY "Users can delete own conversations" 
  ON conversations FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL AND session_id IS NOT NULL) -- Guest can delete
  );

-- CRITICAL: Also update messages policies to allow guest access
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON messages;

CREATE POLICY "Users can view messages from own conversations" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (
        (auth.uid() IS NOT NULL AND conversations.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND conversations.session_id IS NOT NULL) -- Guest access
      )
    )
  );

CREATE POLICY "Users can insert messages to own conversations" 
  ON messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (
        (auth.uid() IS NOT NULL AND conversations.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND conversations.session_id IS NOT NULL) -- Guest access
      )
    )
  );

CREATE POLICY "Users can delete messages from own conversations" 
  ON messages FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (
        (auth.uid() IS NOT NULL AND conversations.user_id = auth.uid()) OR
        (auth.uid() IS NULL AND conversations.session_id IS NOT NULL) -- Guest access
      )
    )
  );
```

**Why RLS Updates:**
- **Current policies block guests**: They check `auth.uid() = user_id`, which fails for guests
- **Guest access needed**: Guests need to access conversations via `session_id`
- **Security**: Still enforces ownership (authenticated via user_id, guests via session_id)

### 4. Database Functions

**CRITICAL OPTIMIZATION:** Pass limit from application layer (we already know Pro status)
**Why:** Avoids unnecessary subscription table lookup inside function (faster, cleaner)

**Atomic increment function (optimized for performance):**

```sql
-- Function for atomic rate limit increment (guest or authenticated)
-- OPTIMIZED: Limit passed from application (avoids subscription lookup)
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT 'message',
  p_limit INTEGER DEFAULT 10, -- Pass limit from application (10 for guest, 20 for free, 999999 for pro)
  p_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  count INTEGER,
  limit_reached BOOLEAN,
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_limit_reached BOOLEAN;
BEGIN
  -- Find existing record in rolling window (optimized query with indexes)
  -- CRITICAL: Correct NULL handling - must match exactly (user_id XOR session_id)
  SELECT window_start, window_end, count
  INTO v_window_start, v_window_end, v_current_count
  FROM rate_limits
  WHERE 
    -- For authenticated users: match user_id exactly, session_id must be NULL
    (p_user_id IS NOT NULL AND user_id = p_user_id AND session_id IS NULL)
    OR
    -- For guests: match session_id exactly, user_id must be NULL
    (p_session_id IS NOT NULL AND session_id = p_session_id AND user_id IS NULL)
    AND resource_type = p_resource_type
    AND window_start >= NOW() - (p_window_hours || ' hours')::INTERVAL
  ORDER BY window_start DESC
  LIMIT 1;
  
  -- If no record exists, create new window
  IF v_window_start IS NULL THEN
    v_window_start := NOW();
    v_window_end := v_window_start + (p_window_hours || ' hours')::INTERVAL;
    v_current_count := 0;
  END IF;
  
  -- Check if limit reached BEFORE incrementing (fail fast)
  IF v_current_count >= p_limit THEN
    RETURN QUERY SELECT v_current_count, true, v_window_start, v_window_end;
    RETURN;
  END IF;
  
  -- Atomic increment (single operation - INSERT or UPDATE)
  -- This is the critical optimization: single atomic operation, no separate SELECT
  INSERT INTO rate_limits (user_id, session_id, resource_type, count, window_start, window_end)
  VALUES (p_user_id, p_session_id, p_resource_type, 1, v_window_start, v_window_end)
  ON CONFLICT (
    COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::UUID),
    resource_type,
    window_start
  )
  DO UPDATE SET 
    count = rate_limits.count + 1,
    updated_at = NOW()
  RETURNING rate_limits.count, (rate_limits.count >= p_limit), rate_limits.window_start, rate_limits.window_end
  INTO v_current_count, v_limit_reached, v_window_start, v_window_end;
  
  RETURN QUERY SELECT v_current_count, v_limit_reached, v_window_start, v_window_end;
END;
$$;
```

**Why This Is Better:**
- **Performance**: Limit passed from app (avoids subscription table lookup)
- **Single atomic operation**: INSERT ... ON CONFLICT handles everything
- **Fail fast**: Checks limit before incrementing
- **Cleaner**: Application layer determines limit (single responsibility)
- **Faster**: One less database query (no subscription check)

**Transfer function (guest to authenticated):**

```sql
-- Function to transfer guest data to authenticated user
-- CRITICAL: Messages automatically transfer via conversation foreign key
CREATE OR REPLACE FUNCTION transfer_guest_to_user(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS TABLE(
  messages_transferred INTEGER,
  rate_limits_transferred INTEGER,
  conversations_transferred INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_count INTEGER;
  v_rate_limits_count INTEGER;
  v_conversations_count INTEGER;
BEGIN
  -- Count messages before transfer (for return value)
  SELECT COUNT(*) INTO v_messages_count
  FROM messages
  WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE session_id = p_session_id AND user_id IS NULL
  );
  
  -- Transfer conversations FIRST (messages automatically transfer via foreign key)
  -- CRITICAL: Handle conversation ID conflicts (guest ID might already exist for user)
  -- Use ON CONFLICT to merge or skip conflicting conversations
  FOR v_conv IN 
    SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE session_id = p_session_id AND user_id IS NULL
  LOOP
    -- Try to update (transfer)
    UPDATE conversations
    SET user_id = p_user_id, session_id = NULL, updated_at = GREATEST(updated_at, v_conv.updated_at)
    WHERE id = v_conv.id AND user_id IS NULL;
    
    -- If no rows updated, conversation might already exist for user (skip - don't duplicate)
    -- This handles edge case where guest conversation ID conflicts with user's existing conversation
    IF NOT FOUND THEN
      -- Check if conversation already exists for user (ID conflict)
      SELECT COUNT(*) INTO v_temp_count
      FROM conversations
      WHERE id = v_conv.id AND user_id = p_user_id;
      
      -- If exists, skip (don't create duplicate)
      -- If doesn't exist, something else went wrong (log but continue)
      IF v_temp_count = 0 THEN
        -- Conversation doesn't exist for user - this shouldn't happen
        -- Log warning but continue with other conversations
        RAISE WARNING 'Failed to transfer conversation % - unexpected state', v_conv.id;
      END IF;
    END IF;
  END LOOP;
  
  -- Count transferred conversations
  SELECT COUNT(*) INTO v_conversations_count
  FROM conversations
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  -- Messages automatically belong to transferred conversations (no UPDATE needed)
  -- Foreign key relationship handles this automatically
  
  -- Transfer rate limits
  UPDATE rate_limits
  SET user_id = p_user_id, session_id = NULL
  WHERE session_id = p_session_id AND user_id IS NULL;
  
  GET DIAGNOSTICS v_rate_limits_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_messages_count, v_rate_limits_count, v_conversations_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_guest_to_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_guest_to_user(UUID, UUID) TO anon;
```

**Why:**
- **Order matters**: Conversations first (messages reference them via foreign key)
- **Messages auto-transfer**: No UPDATE needed - foreign key handles it
- **Single atomic operation**: All transfers in one transaction
- **Returns counts**: For logging and monitoring
- **SECURITY DEFINER**: Bypasses RLS safely (validates inputs)
- **Proper normalization**: Messages belong to conversations, not directly to users/sessions

---

## 🔄 Implementation Flow

### Guest User Flow (Hybrid)

```
1. Request arrives
   ├─ Extract IP: x-forwarded-for → x-real-ip → 'unknown'
   └─ Get/Create session_id: cookie → localStorage → generate UUID

2. Layer 1: Fast Check (Redis - IP-based)
   ├─ Key: @upstash/ratelimit:unauth:ip:{ip}
   ├─ Check: sliding window, 10/day
   ├─ If exceeded: Return 429 (~1-2ms total)
   └─ If allowed: Continue to Layer 2

3. Layer 2: Accurate Check (DB - Session-based)
   ├─ Call: increment_rate_limit(NULL, session_id, 'message', 10, 24)
   ├─ Function checks limit (10/day), increments atomically
   ├─ If exceeded: Return 429 (~6-12ms total)
   └─ If allowed: Continue to processing

4. Process Request
   ├─ Ensure conversation exists (with session_id for guests)
   ├─ Generate AI response
   ├─ Store message (links via conversation_id, conversation has session_id)
   └─ Return response with rate limit headers

5. On Authentication
   ├─ Detect: User signs up/logs in
   ├─ Call: transfer_guest_to_user(session_id, user_id)
   ├─ Transfer: messages, rate_limits, conversations
   └─ Clear: session_id cookie/localStorage
```

### Authenticated User Flow

```
1. Request arrives
   ├─ Get user_id from auth
   └─ Check if Pro user

2. Rate Limit Check
   ├─ If Pro: 
   │   ├─ Call: increment_rate_limit(user_id, NULL, 'message', 999999, 24)
   │   ├─ Track but don't limit (limit = 999999)
   │   └─ Allow request
   │
   └─ If Free:
       ├─ Call: increment_rate_limit(user_id, NULL, 'message', 20, 24)
       ├─ Function checks limit (20/day), increments atomically
       ├─ If exceeded: Return 429
       └─ If allowed: Continue to processing

3. Process Request
   ├─ Generate AI response
   ├─ Store message with user_id (session_id = NULL)
   └─ Return response with rate limit headers
```

---

## 📦 Dependencies

### New Packages

```json
{
  "@upstash/ratelimit": "^1.0.0",
  "@upstash/redis": "^1.0.0"
}
```

### Environment Variables

```env
# Upstash Redis (REQUIRED)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Optional: Rate limit bypass (dev/staging only)
RATE_LIMIT_BYPASS=false

# Optional: Redis timeout (ms)
REDIS_TIMEOUT=5000
```

**CRITICAL: Environment Variable Validation**

All environment variables must be validated at startup to fail fast with clear error messages:

```typescript
// lib/redis/client.ts
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    'Missing Upstash Redis environment variables. ' +
    'Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env.local file.'
  );
}
```

**Why:** Prevents runtime errors and provides clear feedback during development.

---

## 📝 Type Definitions

**CRITICAL: Add to `lib/types.ts`**

All new types must be added to maintain type safety across the codebase:

```typescript
// ============================================
// Rate Limiting Types
// ============================================

/**
 * Rate limit check result
 * Returned by all rate limiting functions
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number; // Unix timestamp
  headers: Record<string, string>;
  sessionId?: string; // Only for guest users
}

/**
 * Rate limit response headers
 * Standard headers for rate limit information
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Layer': 'redis' | 'database';
  'X-RateLimit-Degraded'?: 'true'; // Only present if Redis is down
}

/**
 * Guest to user transfer result
 * Returned by transfer_guest_to_user function
 */
export interface GuestTransferResult {
  messagesTransferred: number;
  rateLimitsTransferred: number;
  conversationsTransferred: number;
}

/**
 * Rate limit database record
 * Extends existing RateLimit type with session_id
 */
export interface RateLimitRecord {
  id: string;
  user_id: string | null;
  session_id: string | null;
  resource_type: 'message' | 'api_call' | 'conversation';
  count: number;
  window_start: string;
  window_end: string;
  created_at: string;
  updated_at: string;
}

/**
 * Conversation with session support
 * Extends existing Conversation type with session_id
 */
export interface ConversationWithSession extends Conversation {
  session_id?: string | null;
}
```

**Why:** Maintains type safety, enables IntelliSense, prevents runtime errors.

---

## 🎨 UI Requirements (Minimal Implementation)

**IMPORTANT:** UI implementation is kept **bare minimum** for initial release. Full UI polish will be done later.

### Philosophy

The rate limiting system is **backend-first**. UI elements are minimal placeholders that:
1. Inform users when limits are reached
2. Show basic rate limit status (optional)
3. Provide clear error messages
4. Don't block core functionality

**UI enhancements** (animations, progress bars, detailed stats, etc.) will be implemented in a later phase.

### Required UI Elements (Minimal)

#### 1. Rate Limit Reached Error Message

**Location:** Shown when user hits rate limit (429 response)

**Implementation:**
- Simple toast/alert notification
- Message: "Daily limit reached. Sign in for more messages." (guest) or "Daily limit reached. Upgrade to Pro for unlimited access." (free)
- No fancy animations or progress bars (for now)

**Code Example:**
```typescript
// In API route error handler
if (rateLimitCheck.allowed === false) {
  return NextResponse.json(
    { error: rateLimitCheck.reason },
    { 
      status: 429,
      headers: rateLimitCheck.headers
    }
  );
}

// In client component (useChat hook)
// Error will be caught and shown via existing error handling
// No special UI component needed - uses existing toast system
```

**Status:** ✅ Uses existing error handling - no new UI component needed

#### 2. Guest Message Transfer Notification (Optional)

**Location:** After user signs in, if guest messages were transferred

**Implementation:**
- Simple toast notification (one-time, after auth)
- Message: "X messages transferred to your account"
- Dismissible, non-blocking

**Code Example:**
```typescript
// In AuthContext or auth callback
if (transferResult.messagesTransferred > 0) {
  // Store in session/localStorage for one-time display
  // Show toast on next page load
  showToast(`Welcome! ${transferResult.messagesTransferred} messages transferred to your account.`);
}
```

**Status:** ⚠️ Optional - can be added later if needed

#### 3. Rate Limit Status Indicator (Optional)

**Location:** Header or chat input area

**Implementation:**
- Simple text: "X messages remaining today" (for free users)
- Hidden for Pro users
- No progress bars or fancy visuals (for now)

**Code Example:**
```typescript
// In chat input component
{!isProUser && (
  <span className="text-sm text-muted-foreground">
    {rateLimitRemaining} messages remaining today
  </span>
)}
```

**Status:** ⚠️ Optional - can be added later if needed

### UI Elements NOT Required (For Now)

- ❌ Progress bars showing rate limit usage
- ❌ Animated countdown timers
- ❌ Detailed rate limit statistics
- ❌ Rate limit history/charts
- ❌ Upgrade prompts with fancy modals
- ❌ Real-time rate limit updates (polling)

**Why:** These are nice-to-have features that don't block core functionality. They can be added in a later UI enhancement phase.

### Implementation Strategy

1. **Phase 1 (Current):** Backend rate limiting + minimal error messages
   - Rate limiting works correctly
   - Users see clear error messages when limits are reached
   - No fancy UI - just functional

2. **Phase 2 (Later):** UI enhancements
   - Add rate limit status indicators
   - Add progress bars
   - Add upgrade prompts
   - Polish animations and transitions

**Current Focus:** Get rate limiting working correctly. UI polish comes later.

### Integration with Existing UI

The implementation uses existing UI patterns:
- **Error handling:** Uses existing `handleApiError` and toast system
- **Loading states:** Uses existing loading patterns
- **Notifications:** Uses existing toast/notification system

**No new UI components required** for initial implementation. All error messages flow through existing error handling infrastructure.

---

## 🗂️ File Structure

```
lib/
  services/
    rate-limiting.ts              # Main rate limiting orchestrator
    rate-limiting-guest.ts        # Guest rate limiting (hybrid)
    rate-limiting-auth.ts         # Authenticated rate limiting
  db/
    rate-limits.server.ts        # Database operations for rate_limits
    guest-transfer.server.ts      # Guest to user transfer logic
  redis/
    client.ts                     # Upstash Redis client setup
    rate-limit.ts                 # Redis rate limiting wrapper
  utils/
    session.ts                    # Session ID management (cookie/localStorage)
    ip-extraction.ts              # IP extraction from headers
```

---

## 🔧 Implementation Details

### 1. Session ID Management

**File:** `lib/utils/session.ts`

**CRITICAL:** Server-side only (API routes) - cookies work for both server and client
**Why:** localStorage is client-only, cookies work everywhere (server can read, client can read)

```typescript
/**
 * Get session ID from cookie (read-only, for transfer operations)
 * Returns null if no session_id cookie exists
 */
export function getSessionIdFromCookie(request: Request): string | null {
  const cookies = request.headers.get('cookie') || '';
  const sessionId = parseCookie(cookies, 'session_id');
  if (sessionId && isValidUUID(sessionId)) {
    return sessionId;
  }
  return null;
}

/**
 * Get or create session ID for guest users (server-side)
 * Priority: Cookie → Generate new
 * Note: Server-side only - cookies work for both server and client
 */
export function getOrCreateSessionId(request: Request): string {
  // Parse cookies from request
  const cookies = request.headers.get('cookie') || '';
  const sessionIdFromCookie = parseCookie(cookies, 'session_id');
  
  // Validate UUID format
  if (sessionIdFromCookie && isValidUUID(sessionIdFromCookie)) {
    return sessionIdFromCookie;
  }
  
  // Generate new session ID (UUID v4)
  const newSessionId = crypto.randomUUID();
  
  // Note: Cookie will be set in response (see setSessionIdCookie)
  return newSessionId;
}

/**
 * Parse cookie value from cookie string
 */
function parseCookie(cookieString: string, name: string): string | null {
  const cookies = cookieString.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Set session ID in response (cookie)
 * CRITICAL: Must be called before response is sent
 */
export function setSessionIdCookie(response: Response, sessionId: string): void {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  const cookieValue = `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
  
  // Append to existing Set-Cookie headers (NextResponse handles this)
  response.headers.append('Set-Cookie', cookieValue);
}
```

**Why:**
- **Server-side only**: Cookies work for both server and client (no localStorage needed)
- **HttpOnly**: Prevents XSS attacks (JavaScript can't access)
- **SameSite=Lax**: CSRF protection
- **Secure**: HTTPS only (in production)
- **30-day expiration**: Matches TTL for cleanup
- **UUID v4**: Extremely low collision probability

### 2. IP Extraction

**File:** `lib/utils/ip-extraction.ts`

```typescript
/**
 * Extract client IP from request headers
 * Order: x-forwarded-for (first IP) → x-real-ip → 'unknown'
 */
export function getClientIp(request: Request): string {
  // Try x-forwarded-for (first IP in comma-separated list)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }
  
  // Try x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp;
  }
  
  // Fallback
  return 'unknown';
}

function isValidIp(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Basic IPv6 validation (simplified - supports compressed format)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/i;
  // Also check for IPv6 with IPv4 embedded (::ffff:192.168.1.1)
  const ipv6MappedRegex = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ipv6MappedRegex.test(ip);
}
```

### 3. Redis Rate Limiting (Layer 1)

**File:** `lib/redis/client.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// CRITICAL: Validate environment variables at startup
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error(
    'Missing Upstash Redis environment variables. ' +
    'Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env.local file.'
  );
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  prefix: '@upstash/ratelimit:unauth',
  analytics: true,
});
```

**How Redis Key Structure Works:**
- **Prefix**: `@upstash/ratelimit:unauth` (configured in Ratelimit)
- **Identifier**: `ip:{clientIp}` (passed to `limit()`)
- **Full Key**: `@upstash/ratelimit:unauth:ip:192.168.1.1`
- **Why**: Namespaced by prefix, organized by IP

**File:** `lib/redis/rate-limit.ts`

```typescript
import { ipRateLimit } from './client';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('redis/rate-limit');

export async function checkGuestRateLimitIP(
  ip: string
): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
  degraded?: boolean;
}> {
  try {
    // Build identifier: "ip:192.168.1.1"
    // Upstash Ratelimit combines this with prefix: "@upstash/ratelimit:unauth:ip:192.168.1.1"
    const identifier = `ip:${ip}`;
    const result = await ipRateLimit.limit(identifier);
    
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset, // Unix timestamp when limit resets
    };
  } catch (error) {
    // Redis down - fail open with warning
    // CRITICAL: Better UX than blocking all guests
    logger.warn('Redis unavailable, allowing request', { error, ip });
    return {
      allowed: true,
      remaining: 10,
      reset: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      degraded: true, // Indicate degraded mode (add to response header)
    };
  }
}
```

**Redis Logic Review:**
✅ **Correct**: Uses sliding window (fair, rolling 24h)  
✅ **Correct**: Fail open on error (better UX)  
✅ **Correct**: Returns reset timestamp (for headers)  
✅ **Correct**: Logs warnings (monitoring)  
✅ **Correct**: Key structure (prefix + identifier)

**Potential Issues:**
⚠️ **IP Validation**: `isValidIp()` might be too strict (IPv6 support)  
⚠️ **Unknown IP**: Falls back to `'unknown'` - all unknown IPs share same limit  
⚠️ **Proxy Chains**: Takes first IP from `x-forwarded-for` (correct behavior)

**Recommendations:**
- Consider IPv6 validation improvements (if needed)
- Monitor `'unknown'` IP usage (might indicate proxy issues)
- Consider rate limiting `'unknown'` IPs more strictly (or blocking)

### 4. Database Rate Limiting (Layer 2)

**File:** `lib/db/rate-limits.server.ts`

**CRITICAL:** Pass limit from application (we already know Pro status)
**Why:** Avoids subscription lookup in database function (faster, cleaner)

```typescript
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('db/rate-limits');

export async function checkAndIncrementRateLimit(params: {
  userId?: string | null;
  sessionId?: string | null;
  resourceType?: string;
  limit: number; // CRITICAL: Pass limit from application (10 for guest, 20 for free, 999999 for pro)
  windowHours?: number;
}): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  windowStart: Date;
  windowEnd: Date;
}> {
  const {
    userId = null,
    sessionId = null,
    resourceType = 'message',
    limit, // Required - passed from application
    windowHours = 24,
  } = params;
  
  const supabase = await createClient();
  
  // Call database function (atomic operation)
  // OPTIMIZED: Pass limit from application (avoids subscription lookup)
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_session_id: sessionId,
    p_resource_type: resourceType,
    p_limit: limit, // Pass limit from application
    p_window_hours: windowHours,
  });
  
  if (error) {
    logger.error('Rate limit check failed', error, { userId, sessionId, limit });
    // Fail open on DB error (better UX than blocking all)
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
  
  const result = data[0];
  
  return {
    allowed: !result.limit_reached,
    count: result.count,
    limit,
    remaining: Math.max(0, limit - result.count),
    windowStart: new Date(result.window_start),
    windowEnd: new Date(result.window_end),
  };
}
```

**Why This Is Better:**
- **Performance**: No subscription table lookup (limit passed from app)
- **Cleaner**: Application determines limit (single responsibility)
- **Faster**: One less database query
- **Consistent**: Same limit logic in application and database

### 5. Guest Rate Limiting (Hybrid)

**File:** `lib/services/rate-limiting-guest.ts`

```typescript
import { checkGuestRateLimitIP } from '@/lib/redis/rate-limit';
import { checkAndIncrementRateLimit } from '@/lib/db/rate-limits.server';
import { getClientIp } from '@/lib/utils/ip-extraction';
import { getOrCreateSessionId } from '@/lib/utils/session';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting-guest');

export async function checkGuestRateLimit(
  request: Request
): Promise<{
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
  sessionId: string;
}> {
  // Extract IP and session ID
  const ip = getClientIp(request);
  const sessionId = getOrCreateSessionId(request);
  
  // Layer 1: Fast check (Redis - IP-based)
  const redisCheck = await checkGuestRateLimitIP(ip);
  
  if (!redisCheck.allowed) {
    logger.debug('Guest rate limit exceeded (Redis)', { ip, sessionId });
    return {
      allowed: false,
      reason: 'Daily limit reached (10 messages). Sign in for more.',
      remaining: 0,
      reset: redisCheck.reset,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': redisCheck.reset.toString(),
        'X-RateLimit-Layer': 'redis',
        ...(redisCheck.degraded ? { 'X-RateLimit-Degraded': 'true' } : {}),
      },
      sessionId,
    };
  }
  
  // Layer 2: Accurate check (DB - Session-based)
  // Pass limit: 10 for guest users
  const dbCheck = await checkAndIncrementRateLimit({
    sessionId,
    resourceType: 'message',
    limit: 10, // Guest limit
    windowHours: 24,
  });
  
  if (!dbCheck.allowed) {
    logger.debug('Guest rate limit exceeded (DB)', { ip, sessionId, count: dbCheck.count });
    return {
      allowed: false,
      reason: 'Daily limit reached (10 messages). Sign in for more.',
      remaining: 0,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
        'X-RateLimit-Layer': 'database',
      },
      sessionId,
    };
  }
  
  logger.debug('Guest rate limit check passed', {
    ip,
    sessionId,
    count: dbCheck.count,
    remaining: dbCheck.remaining,
  });
  
  return {
    allowed: true,
    remaining: dbCheck.remaining,
    reset: dbCheck.windowEnd.getTime(),
    headers: {
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': dbCheck.remaining.toString(),
      'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
      'X-RateLimit-Layer': 'database',
      ...(redisCheck.degraded ? { 'X-RateLimit-Degraded': 'true' } : {}),
    },
    sessionId,
  };
}
```

### 6. Authenticated Rate Limiting

**File:** `lib/services/rate-limiting-auth.ts`

```typescript
import { checkAndIncrementRateLimit } from '@/lib/db/rate-limits.server';
import { isProUser } from '@/lib/services/subscription';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting-auth');

export async function checkAuthenticatedRateLimit(
  userId: string,
  isProUserOverride?: boolean
): Promise<{
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}> {
  // Check if Pro user
  const isPro = isProUserOverride !== undefined 
    ? isProUserOverride 
    : await isProUser(userId);
  
  // Pro users: unlimited but still track
  if (isPro) {
    const dbCheck = await checkAndIncrementRateLimit({
      userId,
      resourceType: 'message',
      limit: 999999, // Effectively unlimited (but still track)
      windowHours: 24,
    });
    
    logger.debug('Pro user rate limit (tracking only)', {
      userId,
      count: dbCheck.count,
    });
    
    return {
      allowed: true,
      remaining: Infinity,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': 'unlimited',
        'X-RateLimit-Remaining': 'unlimited',
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
      },
    };
  }
  
  // Free users: check limit (20 messages/day)
  const dbCheck = await checkAndIncrementRateLimit({
    userId,
    resourceType: 'message',
    limit: 20, // Free user limit
    windowHours: 24,
  });
  
  if (!dbCheck.allowed) {
    logger.warn('Free user rate limit exceeded', {
      userId,
      count: dbCheck.count,
      limit: dbCheck.limit,
    });
    
    return {
      allowed: false,
      reason: `Daily limit reached (${dbCheck.limit} messages). Upgrade to Pro for unlimited access.`,
      remaining: 0,
      reset: dbCheck.windowEnd.getTime(),
      headers: {
        'X-RateLimit-Limit': dbCheck.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
      },
    };
  }
  
  logger.debug('Free user rate limit check passed', {
    userId,
    count: dbCheck.count,
    remaining: dbCheck.remaining,
  });
  
  return {
    allowed: true,
    remaining: dbCheck.remaining,
    reset: dbCheck.windowEnd.getTime(),
    headers: {
      'X-RateLimit-Limit': dbCheck.limit.toString(),
      'X-RateLimit-Remaining': dbCheck.remaining.toString(),
      'X-RateLimit-Reset': dbCheck.windowEnd.getTime().toString(),
    },
  };
}
```

### 7. Guest to User Transfer

**File:** `lib/db/guest-transfer.server.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('db/guest-transfer');

import type { GuestTransferResult } from '@/lib/types';

export async function transferGuestToUser(
  sessionId: string,
  userId: string
): Promise<GuestTransferResult> {
  const supabase = await createClient();
  
  // Call database function (atomic operation)
  const { data, error } = await supabase.rpc('transfer_guest_to_user', {
    p_session_id: sessionId,
    p_user_id: userId,
  });
  
  if (error) {
    logger.error('Guest transfer failed', error, { sessionId, userId });
    throw error;
  }
  
  const result = data[0];
  
  logger.info('Guest data transferred to user', {
    sessionId,
    userId,
    messages: result.messages_transferred,
    rateLimits: result.rate_limits_transferred,
    conversations: result.conversations_transferred,
  });
  
  return {
    messagesTransferred: result.messages_transferred,
    rateLimitsTransferred: result.rate_limits_transferred,
    conversationsTransferred: result.conversations_transferred,
  };
}
```

### 8. Main Rate Limiting Orchestrator

**File:** `lib/services/rate-limiting.ts`

```typescript
import { checkGuestRateLimit } from './rate-limiting-guest';
import { checkAuthenticatedRateLimit } from './rate-limiting-auth';
import { setSessionIdCookie } from '@/lib/utils/session';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('services/rate-limiting');

export async function checkRateLimit(params: {
  userId?: string | null;
  isProUser?: boolean;
  request: Request;
  response?: Response;
}): Promise<{
  allowed: boolean;
  reason?: string;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
  sessionId?: string;
}> {
  const { userId, isProUser, request, response } = params;
  
  // Guest user: hybrid rate limiting
  if (!userId) {
    const result = await checkGuestRateLimit(request);
    
    // Set session ID cookie if new
    // CRITICAL: Must set cookie BEFORE streaming starts (for streaming responses)
    if (response && result.sessionId) {
      setSessionIdCookie(response, result.sessionId);
      // For streaming responses, cookie must be set in initial response headers
      // NextResponse/Response handles this automatically when headers are set before streaming
    }
    
    return result;
  }
  
  // Authenticated user: DB rate limiting
  return await checkAuthenticatedRateLimit(userId, isProUser);
}
```

---

## 🔄 Message Persistence Flow

### Guest Message Storage

**When guest sends message:**
```typescript
// In /api/chat route
const rateLimitCheck = await checkRateLimit({
  userId: null,
  request,
  response,
});

if (!rateLimitCheck.allowed) {
  return NextResponse.json({ error: rateLimitCheck.reason }, { status: 429 });
}

// Process request and save message
// Note: No session_id needed - messages link via conversation_id
// Conversation already has session_id (set in ensureConversation)
await saveUserMessage(
  convId,
  userMessage,
  null, // Guest user_id
  supabaseClient
);
```

### Transfer on Authentication

**In auth callback (`app/auth/callback/route.ts`):**
```typescript
// After user creation/login (Step 4 in callback)
// CRITICAL: Parse session_id from cookie (server-side, read-only for transfer)
import { getSessionIdFromCookie } from '@/lib/utils/session';
const sessionId = getSessionIdFromCookie(request); // Returns existing session_id or null

if (sessionId) {
  try {
    const transferResult = await transferGuestToUser(sessionId, userId);
    
    if (transferResult.messagesTransferred > 0) {
      logger.info('Guest data transferred to user', {
        userId,
        messages: transferResult.messagesTransferred,
        conversations: transferResult.conversationsTransferred,
        rateLimits: transferResult.rateLimitsTransferred,
      });
      
      // Optional: Store transfer result in session for UI notification
      // Frontend can show: "X messages transferred to your account"
    }
  } catch (error) {
    logger.error('Failed to transfer guest data', error, { sessionId, userId });
    // Don't block auth flow - transfer can happen later
    // User can still sign in, transfer can be retried
  }
  
  // Clear session_id cookie after transfer (optional)
  // Or keep it for potential retry
}
```

**Why in auth callback:**
- Server-side (more reliable)
- Happens immediately after auth
- Can retry if fails (don't block auth)
- User sees transferred data immediately

**CRITICAL: Session ID retrieval:**
- Get from cookie: `getSessionIdFromCookie(request)`
- Must use server-side cookie parsing (not client-side)
- If no session_id cookie, no transfer needed (user had no guest data)

**Alternative (Client-side):**
- In `AuthContext.tsx` on `SIGNED_IN` event
- Less reliable (client-side)
- Can show UI notification immediately

---

## 🧹 Cleanup Job (TTL)

**Using Supabase pg_cron Extension (Built-in)**

**File:** `lib/supabase/migration_rate_limiting_hybrid.sql` (add to migration)

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup function (called by cron)
CREATE OR REPLACE FUNCTION cleanup_guest_data()
RETURNS TABLE(
  messages_deleted BIGINT,
  rate_limits_deleted BIGINT,
  conversations_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages_count BIGINT;
  v_rate_limits_count BIGINT;
  v_conversations_count BIGINT;
  v_thirty_days_ago TIMESTAMPTZ;
BEGIN
  v_thirty_days_ago := NOW() - INTERVAL '30 days';
  
  -- Delete old guest conversations FIRST (CASCADE will delete messages automatically)
  -- CRITICAL: Delete conversations first, then count messages separately to avoid double-counting
  WITH deleted_conv AS (
    DELETE FROM conversations
    WHERE user_id IS NULL
      AND session_id IS NOT NULL
      AND created_at < v_thirty_days_ago
    RETURNING id
  )
  SELECT COUNT(*) INTO v_conversations_count FROM deleted_conv;
  
  -- Count messages that were deleted via CASCADE (for logging)
  -- Note: We can't count them directly since CASCADE happens automatically
  -- So we count messages in conversations that should have been deleted
  -- (This is approximate - actual count might be slightly different due to timing)
  SELECT COUNT(*) INTO v_messages_count
  FROM messages
  WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE user_id IS NULL 
      AND session_id IS NOT NULL 
      AND created_at < v_thirty_days_ago
  );
  -- Note: This query will return 0 if conversations were already deleted (CASCADE)
  -- But it's fine - we're just logging approximate counts
  
  -- Delete old guest rate limits
  WITH deleted AS (
    DELETE FROM rate_limits
    WHERE user_id IS NULL
      AND session_id IS NOT NULL
      AND window_end < v_thirty_days_ago
    RETURNING id
  )
  SELECT COUNT(*) INTO v_rate_limits_count FROM deleted;
  
  RETURN QUERY SELECT v_messages_count, v_rate_limits_count, v_conversations_count;
END;
$$;

-- Schedule cleanup job (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-guest-data',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$SELECT cleanup_guest_data();$$
);
```

**Why Supabase pg_cron:**
- **Built-in**: No external cron service needed
- **Reliable**: Runs inside database (no network calls)
- **Simple**: SQL-only, no separate job runner
- **Efficient**: Direct database access

**Alternative:** If pg_cron not available, use Vercel Cron or similar external service

---

## 🔄 Integration with Existing Code

### Current State Analysis

**Existing Rate Limiting:**
- `lib/services/rate-limiting.ts`: Uses `countMessagesTodayServerSide()` (counts from messages table)
- `canSendMessage()`: Checks rate limit (guest not implemented, free: 10/day)
- `getRateLimitInfo()`: Returns rate limit info (uses message count)
- **Problem**: Guest users not rate limited, uses message count (slow, not accurate)

**Existing Message Storage:**
- `saveUserMessage()`: Saves messages (no `session_id` support)
- `ensureConversation()`: Creates conversations (no `session_id` support)
- Guest conversations: Use `temp-` prefix (not stored in DB)
- **Problem**: Guest messages not stored, can't persist

**Existing Code to Update:**
1. `app/api/chat/route.ts`: Replace `canSendMessage()` with new hybrid rate limiting
2. `saveUserMessage()`: Add `session_id` parameter
3. `ensureConversation()`: Add `session_id` parameter for guests
4. Remove/deprecate: `canSendMessage()`, `getRateLimitInfo()`, `countMessagesTodayServerSide()`

### Integration Points

**1. `/api/chat` Route Integration:**

```typescript
// OLD (current):
const rateLimitCheck = await canSendMessage(
  lightweightUser?.userId || null,
  lightweightUser?.isProUser
);

// NEW (hybrid):
const rateLimitCheck = await checkRateLimit({
  userId: lightweightUser?.userId || null,
  isProUser: lightweightUser?.isProUser,
  request,
  response, // For setting session_id cookie
});

// Add rate limit headers to response
Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
  response.headers.set(key, value);
});
```

**2. `saveUserMessage()` Update:**

```typescript
// OLD:
async function saveUserMessage(
  conversationId: string,
  userMessage: UIMessage,
  userId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  isProUserOverride?: boolean
): Promise<boolean>

// NEW:
async function saveUserMessage(
  conversationId: string,
  userMessage: UIMessage,
  userId: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId?: string | null, // NEW: For guest messages
  isProUserOverride?: boolean
): Promise<boolean>

// In function body:
await supabase.from('messages').insert({
  conversation_id: conversationId,
  role: 'user',
  parts: userMessage.parts,
  content: messageText.trim(),
  user_id: userId, // null for guests
  session_id: sessionId || null, // NEW: Link to session for guests
});
```

**3. `ensureConversation()` Update:**

```typescript
// OLD:
async function ensureConversation(
  user: { id: string },
  conversationId: string,
  title: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string>

// NEW:
async function ensureConversation(
  user: { id: string } | null, // null for guests
  conversationId: string,
  title: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId?: string | null // NEW: For guest conversations
): Promise<string>

// In function body:
// CRITICAL: Handle both guest and authenticated cases
if (!conversationId || conversationId.startsWith('temp-')) {
  // Still skip temp conversations (backward compatibility during migration)
  return conversationId;
}

// Check if conversation exists
const { data: existing, error: checkError } = await supabase
  .from('conversations')
  .select('id, user_id, session_id')
  .eq('id', conversationId)
  .maybeSingle();

if (checkError) {
  throw new Error('Failed to check conversation');
}

if (existing) {
  // Conversation exists - verify ownership
  if (user) {
    // Authenticated: Must match user_id
    if (existing.user_id !== user.id) {
      throw new Error('Unauthorized: conversation belongs to another user');
    }
  } else {
    // Guest: Must match session_id
    if (existing.session_id !== sessionId) {
      throw new Error('Unauthorized: conversation belongs to another session');
    }
  }
  return conversationId;
}

// Conversation doesn't exist - create it
if (!user) {
  // Guest: Create conversation with session_id
  if (!sessionId) {
    throw new Error('Session ID required for guest conversations');
  }
  const { error: insertError } = await supabase.from('conversations').insert({
    id: conversationId,
    user_id: null, // Guest
    session_id: sessionId,
    title: title,
  });
  if (insertError) {
    // Handle race condition (duplicate key)
    if (insertError.code === '23505') {
      // Another request created it - verify ownership
      const { data: verify } = await supabase
        .from('conversations')
        .select('session_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (verify && verify.session_id === sessionId) {
        return conversationId; // Created by another request, ownership verified
      }
      throw new Error('Conversation ID conflict');
    }
    throw insertError;
  }
} else {
  // Authenticated: Existing logic (user_id set)
  const { error: insertError } = await supabase.from('conversations').insert({
    id: conversationId,
    user_id: user.id,
    session_id: null, // Authenticated users don't need session_id
    title: title,
  });
  if (insertError) {
    // Handle race condition (same as before)
    // ...
  }
}

return conversationId;
```

**4. Guest Conversation Handling:**

**Current:** Guest conversations use `temp-` prefix, not stored in DB
**New:** Guest conversations stored with `session_id`, no `temp-` prefix needed

```typescript
// OLD:
if (conversationId.startsWith('temp-')) {
  // Skip DB operations
}

// NEW:
// All conversations stored (guest or authenticated)
// Check: if (!userId && !sessionId) { skip } // Only skip if truly no identifier
```

### Old Code Cleanup

**Files to Deprecate/Remove:**

1. **`lib/services/rate-limiting.ts`** (OLD):
   - `canSendMessage()` → Replace with new `checkRateLimit()`
   - `getRateLimitInfo()` → Replace with new rate limit info from `checkRateLimit()`
   - `RATE_LIMITS` constant → Keep for reference, but use new limits (10 guest, 20 free)
   - **Action**: Mark as deprecated, remove after migration complete

2. **`lib/db/messages.server.ts`**:
   - `countMessagesTodayServerSide()` → Remove (replaced by rate_limits table)
   - **Action**: Remove after migration, or keep as fallback for 1-2 weeks

3. **`app/api/chat/route.ts`**:
   - Remove duplicate rate limit check in `saveUserMessage()` (line 138-152)
   - Rate limiting now happens before `saveUserMessage()` is called
   - **Action**: Remove redundant check after new rate limiting integrated

**Migration Strategy:**
1. Implement new rate limiting alongside old (feature flag)
2. Test thoroughly
3. Switch to new (remove feature flag)
4. Monitor for 1-2 weeks
5. Remove old code

### Streaming Response Headers

**CRITICAL:** Rate limit headers must be added to streaming responses

**Current:** Headers only added to JSON responses
**Problem:** Streaming responses don't have headers until end

**Solution:** Add headers to initial response chunk

```typescript
// In /api/chat route, before streaming:
const rateLimitCheck = await checkRateLimit({...});

// Create response with headers
const response = new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    // Add rate limit headers
    ...rateLimitCheck.headers,
  },
});

return response;
```

**Why:** Frontend needs headers immediately to show remaining count

---

## 🔄 Implementation Phases

### Phase 1: Database Schema & Functions (3-4 hours)

**Tasks:**
1. **Create migration file**: `lib/supabase/migration_rate_limiting_hybrid.sql`
2. **Update conversations table** (REQUIRED - Breaking Change):
   - `ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL` ✅ CRITICAL
   - `ALTER TABLE conversations ADD COLUMN session_id UUID` ✅
   - `ALTER TABLE conversations ADD CONSTRAINT conversations_user_or_session_check CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)` ✅
3. **Add `session_id` to rate_limits**:
   - `ALTER TABLE rate_limits ADD COLUMN session_id UUID` ✅
4. **Update unique constraints**:
   - Drop old constraint on `rate_limits`
   - Add new constraint with `COALESCE` for user_id/session_id
5. **Update RLS policies** (REQUIRED):
   - Drop old policies (they block guests)
   - Create new policies that allow guest access via session_id
   - Update conversations policies
   - Update messages policies
4. **Create indexes**:
   - Partial indexes for guest data (WHERE session_id IS NOT NULL)
   - Composite indexes for fast lookups
   - Cleanup indexes (WHERE created_at < ...)
5. **Create `increment_rate_limit()` function**:
   - Optimized: Pass limit from application (no subscription lookup)
   - Atomic operation (INSERT ... ON CONFLICT)
   - Returns count, limit_reached, window
6. **Create `transfer_guest_to_user()` function**:
   - Transfers conversations first (messages reference them)
   - Handles race conditions (ON CONFLICT)
   - Returns counts for logging
7. **Create `cleanup_guest_data()` function**:
   - Deletes old guest messages, rate_limits, conversations
   - Uses CTEs for efficient deletion
8. **Set up pg_cron job**:
   - Enable pg_cron extension
   - Schedule cleanup job (daily at 2 AM UTC)
9. **Test database functions**:
   - Test with various inputs (guest, free, pro)
   - Test concurrent increments (race conditions)
   - Test transfer function
   - Test cleanup function

**Files:**
- `lib/supabase/migration_rate_limiting_hybrid.sql` (NEW)

**SQL Migration Checklist:**
- [ ] **CRITICAL**: Make conversations.user_id nullable (DROP NOT NULL)
- [ ] Add session_id columns (rate_limits, conversations) - NOT messages ✅
- [ ] Add constraint: user_id OR session_id must be set (data integrity)
- [ ] **CRITICAL**: Update RLS policies (allow guest access via session_id)
- [ ] Create indexes (partial, composite, cleanup)
- [ ] Update unique constraints
- [ ] Create increment_rate_limit() function (with corrected WHERE clause)
- [ ] Create transfer_guest_to_user() function (with conflict handling)
- [ ] Create cleanup_guest_data() function (delete conversations first)
- [ ] Enable pg_cron extension
- [ ] Schedule cleanup job
- [ ] Grant permissions (EXECUTE on functions)

**Testing:**
- [ ] Test increment_rate_limit() with guest (session_id)
- [ ] Test increment_rate_limit() with free user (user_id, limit 20)
- [ ] Test increment_rate_limit() with pro user (user_id, limit 999999)
- [ ] Test concurrent increments (same user/session, multiple requests)
- [ ] Test transfer_guest_to_user() (messages, rate_limits, conversations)
- [ ] Test cleanup_guest_data() (deletes old data)
- [ ] Verify pg_cron job is scheduled

**Rollback Plan:**
- Keep old code until new code is tested
- Migration is idempotent (IF NOT EXISTS, CREATE OR REPLACE)
- Can rollback by dropping new columns (data loss for guests only)

### Phase 2: Redis Setup & Layer 1 (2-3 hours)

**Tasks:**
1. **Install packages**:
   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```
2. **Set up Upstash Redis**:
   - Create Upstash Redis database
   - Get REST URL and token
   - Add to `.env.local`: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. **Create Redis client** (`lib/redis/client.ts`):
   - Initialize Redis client
   - Initialize Ratelimit with sliding window (10/day, 24h)
   - Set prefix: `@upstash/ratelimit:unauth`
4. **Create IP extraction utility** (`lib/utils/ip-extraction.ts`):
   - Extract from `x-forwarded-for` (first IP)
   - Fallback to `x-real-ip`
   - Fallback to `'unknown'`
   - Validate IP format (IPv4/IPv6)
5. **Create Redis rate limiting wrapper** (`lib/redis/rate-limit.ts`):
   - `checkGuestRateLimitIP()` function
   - Error handling (fail open with warning)
   - Return: allowed, remaining, reset, degraded
6. **Test Redis rate limiting**:
   - Test with various IPs
   - Test Redis failure scenarios
   - Measure latency (should be ~1-2ms)
   - Test sliding window behavior

**Files:**
- `lib/redis/client.ts` (NEW)
- `lib/redis/rate-limit.ts` (NEW)
- `lib/utils/ip-extraction.ts` (NEW)
- `.env.local` (update with Redis credentials)

**Testing:**
- [ ] Test IP extraction (x-forwarded-for, x-real-ip, unknown)
- [ ] Test Redis rate limiting (10/day limit)
- [ ] Test Redis failure (should fail open)
- [ ] Measure latency (target: < 2ms)
- [ ] Test sliding window (24h rolling)
- [ ] Test with multiple IPs (different limits per IP)

**Edge Cases:**
- [ ] IP with proxy chain (multiple IPs in x-forwarded-for)
- [ ] Invalid IP format
- [ ] Redis timeout
- [ ] Redis connection error

### Phase 3: Session Management (1-2 hours)

**Tasks:**
1. **Create session ID utility** (`lib/utils/session.ts`):
   - `getOrCreateSessionId()`: Parse cookie, generate if missing
   - `setSessionIdCookie()`: Set cookie in response
   - `parseCookie()`: Helper to parse cookie string
   - `isValidUUID()`: Validate UUID format
2. **Cookie configuration**:
   - HttpOnly (security)
   - SameSite=Lax (CSRF protection)
   - Secure (HTTPS only in production)
   - Max-Age: 30 days (matches TTL)
3. **Test session persistence**:
   - Test cookie parsing
   - Test cookie setting
   - Test session persistence across requests
   - Test session ID format (UUID v4)

**Files:**
- `lib/utils/session.ts` (NEW)

**Testing:**
- [ ] Test session ID generation (UUID v4 format)
- [ ] Test cookie parsing (existing session)
- [ ] Test cookie setting (new session)
- [ ] Test session persistence (same session across requests)
- [ ] Test cookie expiration (30 days)
- [ ] Test invalid UUID handling

**Security:**
- [ ] HttpOnly flag (prevents XSS)
- [ ] SameSite=Lax (prevents CSRF)
- [ ] Secure flag (HTTPS only)
- [ ] UUID validation (prevents injection)

### Phase 4: Database Layer 2 (2-3 hours)

**Tasks:**
1. **Create database rate limiting service** (`lib/db/rate-limits.server.ts`):
   - `checkAndIncrementRateLimit()` function
   - Call `increment_rate_limit()` database function
   - Pass limit from application (10 guest, 20 free, 999999 pro)
   - Handle errors (fail open)
   - Return: allowed, count, limit, remaining, window
2. **Error handling**:
   - Database errors → fail open (better UX)
   - Log errors for monitoring
   - Return safe defaults
3. **Test concurrent requests**:
   - Multiple requests from same user/session
   - Verify atomic increments (no double-counting)
   - Test race conditions
4. **Test limit enforcement**:
   - Guest: 10/day limit
   - Free: 20/day limit
   - Pro: Unlimited (but tracked)

**Files:**
- `lib/db/rate-limits.server.ts` (NEW)

**Testing:**
- [ ] Test rate limit check (guest, free, pro)
- [ ] Test concurrent increments (same user/session)
- [ ] Test limit enforcement (block at limit)
- [ ] Test rolling window (24h from first request)
- [ ] Test database errors (fail open)
- [ ] Measure latency (target: < 10ms)

**Performance:**
- [ ] Verify single database call (no extra queries)
- [ ] Verify atomic operation (no race conditions)
- [ ] Verify indexed queries (fast lookups)

### Phase 5: Hybrid Rate Limiting (3-4 hours)

**Tasks:**
1. **Create guest rate limiting service** (`lib/services/rate-limiting-guest.ts`):
   - Combine Redis (Layer 1) + DB (Layer 2)
   - Extract IP and session ID
   - Check Redis first (fast rejection)
   - Check DB second (accurate limit)
   - Return: allowed, reason, remaining, reset, headers, sessionId
2. **Create authenticated rate limiting service** (`lib/services/rate-limiting-auth.ts`):
   - Check Pro status (use override if available)
   - Pro: Track but don't limit (limit 999999)
   - Free: Check limit (20/day)
   - Return: allowed, reason, remaining, reset, headers
3. **Create main orchestrator** (`lib/services/rate-limiting.ts`):
   - `checkRateLimit()` function
   - Route to guest or authenticated service
   - Set session ID cookie if new
   - Return unified interface
4. **Integrate into `/api/chat` route**:
   - Replace `canSendMessage()` with `checkRateLimit()`
   - Pass `request` and `response` objects
   - Add rate limit headers to response
   - Handle 429 errors
   - **CRITICAL**: Add headers to streaming responses too
5. **Update `saveUserMessage()`**:
   - NO CHANGES NEEDED ✅
   - Messages don't need `session_id` (link via `conversation_id`)
   - Conversations have `session_id` for guests
6. **Update `ensureConversation()`**:
   - Add `sessionId` parameter
   - Handle guest conversations (user_id = null, session_id = sessionId)
   - Remove `temp-` prefix check (all conversations stored now)
7. **Test full flow**:
   - Guest: Redis → DB → Process
   - Authenticated: DB → Process
   - Edge cases: Redis down, DB down, both down
   - Performance: Measure total overhead

**Files:**
- `lib/services/rate-limiting-guest.ts` (NEW)
- `lib/services/rate-limiting-auth.ts` (NEW)
- `lib/services/rate-limiting.ts` (UPDATE - replace old)
- `app/api/chat/route.ts` (UPDATE)
- `lib/db/messages.server.ts` (UPDATE - add sessionId to saveUserMessage)

**Integration Checklist:**
- [ ] Replace `canSendMessage()` with `checkRateLimit()`
- [ ] ~~Update `saveUserMessage()` signature~~ ✅ NO CHANGES NEEDED
- [ ] Update `ensureConversation()` signature (add sessionId)
- [ ] Remove `temp-` prefix checks (all conversations stored)
- [ ] Add rate limit headers to JSON responses
- [ ] Add rate limit headers to streaming responses
- [ ] Remove duplicate rate limit check in `saveUserMessage()`

**Testing:**
- [ ] Test guest flow (Redis → DB → Process)
- [ ] Test authenticated flow (DB → Process)
- [ ] Test Pro users (unlimited but tracked)
- [ ] Test Free users (20/day limit)
- [ ] Test edge cases (Redis down, DB down, both down)
- [ ] Test concurrent requests (race conditions)
- [ ] Measure performance (target: < 10ms overhead)
- [ ] Test rate limit headers (present in responses)

**Breaking Changes:**
- [ ] Guest conversations now stored (no more `temp-` prefix)
- [ ] Rate limit check happens before message save
- [ ] Old `canSendMessage()` deprecated (remove after testing)

### Phase 6: Message Persistence (3-4 hours)

**Tasks:**
1. **Update message storage** (NO CHANGES NEEDED):
   - Messages don't need `session_id` (they link via `conversation_id`)
   - Conversations have `session_id` for guests
   - Messages automatically belong to conversations (foreign key)
2. **Update conversation storage** (already done in Phase 5):
   - `ensureConversation()` now accepts `sessionId`
   - Conversations stored with `session_id` for guests
   - Conversations stored with `user_id` for authenticated
3. **Create guest transfer service** (`lib/db/guest-transfer.server.ts`):
   - `transferGuestToUser()` function
   - Call `transfer_guest_to_user()` database function
   - Handle errors (don't block auth flow)
   - Return transfer counts
4. **Integrate transfer on authentication**:
   - **Location**: In `app/auth/callback/route.ts` (after user creation, Step 4)
   - **Why here**: Server-side, cookie available, happens immediately after auth
   - **Flow**:
     1. User completes OAuth → redirects to `/auth/callback?code=...`
     2. Callback route exchanges code for session (creates user)
     3. **session_id cookie is present in request** (same domain, persisted through OAuth redirect)
     4. Read session_id from cookie: `getSessionIdFromCookie(request)`
     5. Call transfer function: `transferGuestToUser(sessionId, userId)`
     6. Log transfer results
     7. Don't block auth flow if transfer fails (user still signs in)
   - **Alternative (Not Recommended)**: In `lib/contexts/AuthContext.tsx` on `SIGNED_IN` event
     - Less reliable (client-side, network issues)
     - Can show UI notification immediately
     - **Issue**: Cookie might not be accessible client-side (HttpOnly)
5. **Handle conversation_id updates**:
   - Transfer function handles this (conversations transferred first)
   - Messages reference conversations (foreign key)
   - No manual conversation_id updates needed
6. **Test message persistence**:
   - Guest sends messages (stored with session_id)
   - User signs up/logs in
   - Messages transfer to user_id
   - User sees previous conversations

**Files:**
- `lib/db/guest-transfer.server.ts` (NEW)
- `app/auth/callback/route.ts` (UPDATE)
- `lib/contexts/AuthContext.tsx` (UPDATE - optional, for client-side notification)

**Integration Points:**
- [ ] Get session_id from cookie in auth callback
- [ ] Call transfer function after user creation/login
- [ ] Handle transfer errors (log, don't block)
- [ ] Show notification to user (X messages transferred)
- [ ] Clear session_id cookie after transfer

**Testing:**
- [ ] Test guest message storage (via conversation_id)
- [ ] Test guest conversation storage (session_id set)
- [ ] Test transfer on signup (new user)
- [ ] Test transfer on login (existing user)
- [ ] Test multiple conversations (all transfer)
- [ ] Test transfer failure (doesn't block auth)
- [ ] Test concurrent transfers (same session_id)
- [ ] Test transfer with no guest data (no error)

**Edge Cases:**
- [ ] User signs up with no guest data (no transfer needed)
- [ ] Transfer fails (user still signs in, transfer retries later)
- [ ] Multiple conversations with same session_id (all transfer)
- [ ] Transfer while user already has conversations (merge)

### Phase 7: Type Definitions & Environment Validation (1 hour)

**Tasks:**
1. **Add type definitions to `lib/types.ts`**:
   - `RateLimitCheckResult` interface
   - `RateLimitHeaders` interface
   - `GuestTransferResult` interface
   - `RateLimitRecord` interface (extends existing)
   - `ConversationWithSession` interface (extends existing)
2. **Add environment variable validation**:
   - Validate `UPSTASH_REDIS_REST_URL` in `lib/redis/client.ts`
   - Validate `UPSTASH_REDIS_REST_TOKEN` in `lib/redis/client.ts`
   - Throw clear error messages if missing
3. **Update function signatures**:
   - Use new types in all rate limiting functions
   - Ensure type safety throughout
4. **Test type checking**:
   - Run `tsc --noEmit` to verify no type errors
   - Fix any type mismatches

**Files:**
- `lib/types.ts` (UPDATE - add new types)
- `lib/redis/client.ts` (UPDATE - add validation)
- `lib/services/rate-limiting.ts` (UPDATE - use types)
- `lib/services/rate-limiting-guest.ts` (UPDATE - use types)
- `lib/services/rate-limiting-auth.ts` (UPDATE - use types)
- `lib/db/rate-limits.server.ts` (UPDATE - use types)
- `lib/db/guest-transfer.server.ts` (UPDATE - use types)

**Type Safety Checklist:**
- [ ] All new types added to `lib/types.ts`
- [ ] All functions use proper types (no `any`)
- [ ] Environment variables validated
- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] No type errors in IDE

**Testing:**
- [ ] Verify types work with IntelliSense
- [ ] Test missing env vars (should fail fast with clear error)
- [ ] Verify type safety in all new functions

### Phase 8: Cleanup & Polish (3-4 hours)

**Tasks:**
1. **Cleanup job** (already created in Phase 1):
   - `cleanup_guest_data()` database function
   - pg_cron job scheduled (daily at 2 AM UTC)
   - No separate job file needed (Supabase handles it)
2. **Add rate limit headers to responses**:
   - JSON responses: Already done in Phase 5
   - **Streaming responses**: Add headers to initial response
   - Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-RateLimit-Layer
3. **Add monitoring/logging**:
   - Log rate limit checks (debug level)
   - Log rate limit hits (warn level)
   - Log Redis failures (warn level)
   - Log transfer operations (info level)
   - Log cleanup operations (info level)
4. **Deprecate old code**:
   - Mark `canSendMessage()` as deprecated
   - Mark `getRateLimitInfo()` as deprecated
   - Mark `countMessagesTodayServerSide()` as deprecated
   - Add JSDoc comments: `@deprecated Use checkRateLimit() instead`
5. **Remove old code** (after 1-2 weeks of monitoring):
   - Remove `canSendMessage()` from `lib/services/rate-limiting.ts`
   - Remove `getRateLimitInfo()` from `lib/services/rate-limiting.ts`
   - Remove `countMessagesTodayServerSide()` from `lib/db/messages.server.ts`
   - Remove duplicate rate limit check in `saveUserMessage()`
6. **Add admin bypass** (dev only):
   - Environment variable: `RATE_LIMIT_BYPASS=true`
   - Check in `checkRateLimit()` function
   - Only in development/staging
   - Log when bypass is used
7. **Update exports**:
   - Remove old exports from `lib/db/queries.server.ts`
   - Update imports in other files
   - Ensure backward compatibility during migration

**Files:**
- `lib/services/rate-limiting.ts` (UPDATE - deprecate old functions)
- `lib/db/messages.server.ts` (UPDATE - remove countMessagesTodayServerSide)
- `lib/db/queries.server.ts` (UPDATE - remove old exports)
- `app/api/chat/route.ts` (UPDATE - add headers to streaming responses)
- `.env.local` (UPDATE - add RATE_LIMIT_BYPASS if needed)

**Cleanup Checklist:**
- [ ] Mark old functions as deprecated
- [ ] Add JSDoc @deprecated tags
- [ ] Remove duplicate rate limit check in saveUserMessage()
- [ ] Add rate limit headers to streaming responses
- [ ] Add admin bypass (dev only)
- [ ] Update all imports (use new functions)
- [ ] Test backward compatibility (old code still works during migration)
- [ ] Monitor for 1-2 weeks
- [ ] Remove old code after monitoring period

**Testing:**
- [ ] Test cleanup job (runs daily, deletes old data)
- [ ] Test rate limit headers (present in all responses)
- [ ] Test streaming response headers (present in initial chunk)
- [ ] Test admin bypass (dev only, logs usage)
- [ ] Test monitoring/logging (all events logged)
- [ ] Performance testing (verify < 10ms overhead)

**Migration Safety:**
- [ ] Keep old code during migration (feature flag)
- [ ] Test new code alongside old
- [ ] Switch to new code (remove feature flag)
- [ ] Monitor for issues
- [ ] Remove old code after 1-2 weeks

---

## 🧪 Testing Strategy

### Unit Tests
- IP extraction (various header scenarios)
- Session ID management
- Redis rate limiting
- Database rate limiting
- Guest transfer

### Integration Tests
- Full guest flow (Redis + DB)
- Full authenticated flow
- Message persistence
- Transfer on auth
- Edge cases (Redis down, DB down, etc.)

### Load Tests
- Concurrent requests from same user
- Many users hitting rate limits
- Redis performance under load
- Database performance under load
- Measure TTFB impact

### Performance Tests
- Measure latency: Redis (~1-2ms), DB (~5-10ms), Total (~6-12ms)
- Verify < 10ms overhead (critical for "fastest AI chat app")
- Test under high load

---

## 📈 Monitoring

### Metrics to Track
- Rate limit hits (429 responses) - by layer (Redis vs DB)
- Redis availability and latency
- Database query performance
- Rate limit check latency (p50, p95, p99)
- Guest message storage count
- Transfer success rate
- Cleanup job performance

### Alerts
- Redis down for > 5 minutes
- Rate limit check latency > 10ms (p95)
- High rate of 429 responses (> 10% of requests)
- Transfer failures > 1%
- Cleanup job failures

### Logging
- Rate limit checks (debug level)
- Rate limit hits (warn level)
- Redis failures (warn level)
- Transfer operations (info level)
- Cleanup operations (info level)

---

## 🎯 Success Criteria

- [ ] Guest users limited to 10 messages/day (rolling 24h)
- [ ] Free users limited to 20 messages/day (rolling 24h)
- [ ] Pro users unlimited but tracked
- [ ] Hybrid approach working (Redis + DB)
- [ ] Message persistence working (guest → authenticated)
- [ ] Atomic operations (no race conditions)
- [ ] Rate limit headers in responses
- [ ] Graceful Redis failure handling
- [ ] Graceful DB failure handling
- [ ] Historical data cleanup (30-day TTL)
- [ ] Production-ready error handling
- [ ] Comprehensive logging
- [ ] **Performance: < 10ms overhead per request** (critical)
- [ ] Transfer on authentication working
- [ ] Cleanup job running daily

---

## 🔧 Edge Cases & Solutions

### 1. Redis Down, DB Up
**Solution:** Layer 1 fails open (allows), Layer 2 enforces
**Result:** Still accurate, slightly slower (~5-10ms instead of ~6-12ms)

### 2. DB Down, Redis Up
**Solution:** Layer 1 blocks obvious abuse, Layer 2 fails open
**Result:** Basic protection, log incident

### 3. Both Down
**Solution:** Fail open with warning (better UX than blocking all)
**Result:** Allow requests, log heavily, alert

### 4. Session ID Collision
**Solution:** UUID v4 (extremely unlikely: 1 in 5.3 × 10³⁶)
**Result:** Practically impossible

### 5. IP Changes Mid-Session
**Solution:** Layer 1 might allow (new IP), Layer 2 blocks (same session)
**Result:** Accurate (session-based wins)

### 6. User Upgrades Mid-Period
**Solution:** Keep current count, remove limit going forward
**Result:** Fair (they already used free messages)

### 7. Transfer Fails on Auth
**Solution:** Don't block auth flow, log error, allow retry later
**Result:** User can still sign in, transfer happens in background

### 8. Multiple Guest Conversations
**Solution:** Transfer all conversations with same session_id
**Result:** User sees all their guest conversations

### 9. Conversation ID Conflict on Transfer
**Scenario:** Guest conversation ID already exists for user (UUID collision)

**Solution:** Skip conflicting conversation, log warning, continue with others
- Check if conversation ID exists for user before transfer
- If exists, skip (don't create duplicate)
- Log warning for monitoring
- Continue transferring other conversations

**Result:** No data loss, user gets most conversations transferred

### 10. RLS Policy Blocking Guests
**Scenario:** Current RLS policies check `auth.uid() = user_id`, blocking guests

**Solution:** Update policies to allow guest access via session_id
- New policies: `(auth.uid() = user_id) OR (auth.uid() IS NULL AND session_id IS NOT NULL)`
- Applies to conversations and messages tables
- Still secure (guests can only access their own session_id)

**Result:** Guests can create and access conversations

---

## 📊 Rate Limit Headers

Add to all API responses:

```
X-RateLimit-Limit: 20          // User's limit (or "unlimited" for Pro)
X-RateLimit-Remaining: 5       // Remaining messages
X-RateLimit-Reset: 1234567890  // Unix timestamp when limit resets
X-RateLimit-Layer: database    // Which layer enforced (redis/database)
X-RateLimit-Degraded: true     // (Optional) If Redis is down
```

**Why:** Helps frontend show remaining count, standard practice

---

## 📝 Notes

- **Hybrid approach:** Best of both worlds (speed + accuracy + features)
- **Rolling window:** Fairer than daily reset, prevents gaming
- **Atomic operations:** Single database function call (fast, safe)
- **Message persistence:** Guest messages transfer on auth (better UX)
- **Performance:** < 10ms overhead (critical for "fastest AI chat app")
- **Storage:** Temporary guest data with 30-day TTL (manageable)
- **Resilience:** Works even if one layer fails (graceful degradation)

---

## 🔗 References

- [Upstash Rate Limiting Docs](https://upstash.com/docs/redis/features/ratelimit)
- [PostgreSQL ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Rate Limit Headers (RFC 6585)](https://tools.ietf.org/html/rfc6585)
- [UUID v4 Collision Probability](https://en.wikipedia.org/wiki/Universally_unique_identifier#Collisions)

---

---

## 🚨 Critical Implementation Notes

### Performance Requirements
- **Target:** < 10ms overhead per request (critical for "fastest AI chat app")
- **Measurement:** Redis (~1-2ms) + DB (~5-10ms) = ~6-12ms total
- **Optimization:** Limit passed from app (avoids subscription lookup)
- **Monitoring:** Track p50, p95, p99 latencies

### Security Considerations
- **Session ID:** UUID v4 (extremely low collision probability)
- **Cookies:** HttpOnly, SameSite=Lax, Secure (HTTPS only)
- **RLS:** Database functions use SECURITY DEFINER (validates inputs)
- **IP Extraction:** Validate format (prevent injection)

### Data Consistency
- **Atomic Operations:** Single database function call
- **Race Conditions:** Handled by PostgreSQL (ON CONFLICT)
- **Transfer:** All-or-nothing (transaction)
- **Cleanup:** Idempotent (can run multiple times)

### Backward Compatibility
- **Migration Period:** 1-2 weeks (old + new code)
- **Feature Flag:** Can switch between old/new
- **Deprecation:** Mark old code, remove after monitoring
- **Rollback Plan:** Keep old code until new is proven

### Monitoring & Alerts
- **Metrics:** Rate limit hits, Redis latency, DB latency, transfer success
- **Alerts:** Redis down > 5min, latency > 10ms, transfer failures > 1%
- **Logging:** All operations logged (debug/warn/info levels)
- **Dashboard:** Track rate limit usage, guest data growth

---

**Last Updated:** 2025-01-08  
**Status:** Ready for Implementation  
**Approach:** Hybrid (Redis + Database) with Message Persistence  
**Review Status:** ✅ Complete - All issues identified and fixed

---

## 🚨 CRITICAL ISSUES FOUND & FIXED

### Issue 1: Conversations Table Schema ❌ → ✅
**Problem:** `user_id NOT NULL` prevents guest conversations
**Fix:** Make `user_id` nullable, add constraint: `user_id OR session_id must be set`
**Impact:** Guest conversations can now be stored

### Issue 2: RLS Policies Block Guests ❌ → ✅
**Problem:** All policies check `auth.uid() = user_id`, blocking guests
**Fix:** Update policies to allow: `(auth.uid() = user_id) OR (auth.uid() IS NULL AND session_id IS NOT NULL)`
**Impact:** Guests can create and access conversations

### Issue 3: Database Function WHERE Clause ❌ → ✅
**Problem:** WHERE clause logic incorrect - matches all rows when NULL
**Fix:** Correct logic: `(p_user_id IS NOT NULL AND user_id = p_user_id AND session_id IS NULL) OR (p_session_id IS NOT NULL AND session_id = p_session_id AND user_id IS NULL)`
**Impact:** Rate limiting works correctly for both guests and authenticated users

### Issue 4: Transfer Function Missing Conflict Handling ❌ → ✅
**Problem:** If guest conversation ID exists for user, transfer fails
**Fix:** Loop through conversations, handle conflicts, skip duplicates
**Impact:** Transfer works even with ID conflicts

### Issue 5: Cleanup Job Double-Deletion ❌ → ✅
**Problem:** Deletes messages first, then conversations (CASCADE deletes messages again)
**Fix:** Delete conversations first (CASCADE handles messages), count separately
**Impact:** Cleanup works correctly, no double-counting

### Issue 6: ensureConversation Guest Handling ❌ → ✅
**Problem:** Function requires `user: { id: string }`, breaks for guests
**Fix:** Accept `user: { id: string } | null`, handle guest case with session_id
**Impact:** Guest conversations can be created

### Issue 7: Session ID Cookie in Streaming ❌ → ✅
**Problem:** Cookie setting unclear for streaming responses
**Fix:** Set cookie before streaming starts (NextResponse handles automatically)
**Impact:** Session ID persists correctly for guests
