# Rate Limit UI/UX Implementation Plan

## 📊 Rate Limiting Mechanism Analysis

### Current Implementation

#### Guest Users (Hybrid System)
1. **Layer 1: Redis (IP-based)**
   - **Type**: Sliding Window (24 hours)
   - **Limit**: 10 messages/day per IP
   - **Reset**: Rolling 24-hour window (not fixed time)
   - **Purpose**: Fast, coarse-grained check to block obvious abusers

2. **Layer 2: Database (Session-hash-based)**
   - **Type**: Bucketed Window (day buckets)
   - **Limit**: 10 messages/day per session_hash
   - **Reset**: Fixed time - **Midnight UTC** (00:00 UTC)
   - **Purpose**: Accurate per-session tracking

#### Authenticated Users
1. **Free Users**
   - **Type**: Bucketed Window (day buckets)
   - **Limit**: 20 messages/day per user_id
   - **Reset**: Fixed time - **Midnight UTC** (00:00 UTC)

2. **Pro Users**
   - **Type**: Bucketed Window (day buckets)
   - **Limit**: 999,999 (effectively unlimited)
   - **Reset**: Fixed time - **Midnight UTC** (00:00 UTC)
   - **Purpose**: Tracking only, no limiting

### Key Insights

- **Redis (Guest IP)**: Sliding window = resets 24 hours from first request, not at midnight
- **Database (All)**: Bucketed = resets at **midnight UTC** (00:00 UTC)
- **Reset Time**: All DB-based limits reset at **00:00 UTC** (not 11 UTC as you asked - it's midnight UTC)

---

## 🎯 UI/UX Requirements

### 1. Early Rate Limit Detection

**Problem**: Currently rate limit is checked AFTER conversation creation, message saving, etc.

**Solution**: 
- Check rate limit **BEFORE** any processing
- Return rate limit status in response headers
- Client-side: Check headers and disable UI immediately
- Show popup **before** user tries to send (proactive)

**Implementation**:
```typescript
// In API route - check rate limit FIRST
const rateLimitCheck = await checkRateLimit({...});

if (!rateLimitCheck.allowed) {
  // Return immediately - no conversation creation, no processing
  return NextResponse.json({...}, { status: 429, headers: rateLimitCheck.headers });
}
```

### 2. Rate Limit Popup/Modal Component

**Requirements**:
- Non-blocking but prominent
- Context-aware messaging based on scenario
- Action buttons (Sign In, Upgrade, Wait)
- Countdown timer showing reset time
- Auto-dismiss when limit resets (optional)

**Scenarios & Content**:

#### Scenario 1: Guest - IP Rate Limited (Shared IP)
**Trigger**: Redis layer blocks (IP limit reached, but session may have messages remaining)

**Content**:
```
Title: "Daily Limit Reached"
Message: "This IP address has reached the daily limit of 10 messages. 
          Sign in to get your own 10 messages, or wait until [RESET_TIME]."

Actions:
- [Sign In] (primary) → Redirect to /login
- [Sign Up] (secondary) → Redirect to /signup
- [Wait] (tertiary) → Show countdown, dismiss modal

Reset Time: Redis sliding window reset (24h from first request)
```

#### Scenario 2: Guest - Session Rate Limited (Used All 10)
**Trigger**: DB layer blocks (session_hash limit reached)

**Content**:
```
Title: "Daily Limit Reached"
Message: "You've used all 10 free messages today. 
          Sign in to get 20 messages per day, or wait until [RESET_TIME]."

Actions:
- [Sign In] (primary) → Redirect to /login
- [Sign Up] (secondary) → Redirect to /signup  
- [Wait] (tertiary) → Show countdown, dismiss modal

Reset Time: Midnight UTC (00:00 UTC)
```

#### Scenario 3: Free User - Rate Limited (Used All 20)
**Trigger**: DB layer blocks (user_id limit reached)

**Content**:
```
Title: "Daily Limit Reached"
Message: "You've used all 20 free messages today. 
          Upgrade to Pro for unlimited messages, or wait until [RESET_TIME]."

Actions:
- [Upgrade to Pro] (primary) → Redirect to /settings?tab=pricing
- [Wait] (secondary) → Show countdown, dismiss modal

Reset Time: Midnight UTC (00:00 UTC)
```

#### Scenario 4: Guest - Redis Degraded (Fallback)
**Trigger**: Redis unavailable, DB allows but showing degraded mode

**Content**:
```
Title: "Service Degraded"
Message: "Rate limiting service is temporarily unavailable. 
          You can continue, but limits may not be enforced accurately."

Actions:
- [Continue] (primary) → Dismiss modal, allow request
- [Sign In] (secondary) → Redirect to /login (for better tracking)

Note: This is rare, but should be handled gracefully
```

### 3. UI State Management

**Rate Limit State**:
```typescript
interface RateLimitState {
  isRateLimited: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  layer: 'redis' | 'database' | 'bypass';
  scenario: 'guest-ip' | 'guest-session' | 'free-user' | 'degraded';
  reason?: string;
}
```

**UI Disable Logic**:
- When `isRateLimited === true`:
  - Disable send button
  - Disable new conversation button
  - Disable input (or show placeholder)
  - Show rate limit popup
  - Prevent any API calls

### 4. Proactive Rate Limit Display

**Before Limit Reached**:
- Show remaining count in input area (subtle)
- Example: "8 messages remaining today" (for guest with 2 used)
- Only show for non-Pro users
- Hide when Pro or when limit is very high

**When Approaching Limit**:
- Show warning at 2 messages remaining
- Example: "⚠️ 2 messages remaining today"
- Color: Yellow/Orange

**When Limit Reached**:
- Show popup immediately
- Disable all input
- Show countdown timer

---

## 🔄 Implementation Flow

### Current Flow (Broken)
```
User clicks send
  → API creates conversation
  → API saves message
  → API checks rate limit ❌ (too late!)
  → Returns 429
  → Error shows as message in chat
```

### New Flow (Fixed)
```
User clicks send
  → Client checks rate limit status (from headers)
  → If limited: Show popup, disable UI, return early
  → If allowed: Continue to API
    → API checks rate limit FIRST
    → If limited: Return 429 immediately (no processing)
    → If allowed: Continue processing
```

### Client-Side Rate Limit Check

**Option 1: Poll Rate Limit Status**
```typescript
// Check rate limit status periodically
useEffect(() => {
  const checkStatus = async () => {
    const response = await fetch('/api/rate-limit/status');
    const data = await response.json();
    setRateLimitState(data);
  };
  
  checkStatus();
  const interval = setInterval(checkStatus, 60000); // Every minute
  return () => clearInterval(interval);
}, []);
```

**Option 2: Check on Send Attempt**
```typescript
const handleSend = async () => {
  // Check rate limit before sending
  const response = await fetch('/api/rate-limit/check', {
    method: 'POST',
    body: JSON.stringify({ message: inputValue })
  });
  
  if (response.status === 429) {
    const data = await response.json();
    showRateLimitPopup(data);
    return; // Don't send
  }
  
  // Continue with normal send flow
  await sendMessage();
};
```

**Option 3: Track from Response Headers**
```typescript
// After each API call, check headers
const response = await fetch('/api/chat', {...});
const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
const reset = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

if (remaining === 0) {
  showRateLimitPopup({ remaining: 0, reset });
}
```

**Recommended**: **Option 3** (Track from headers) + **Option 2** (Check before send)

---

## 📋 Component Structure

### 1. RateLimitPopup Component

**Location**: `components/rate-limit/RateLimitPopup.tsx`

**Props**:
```typescript
interface RateLimitPopupProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: 'guest-ip' | 'guest-session' | 'free-user' | 'degraded';
  reset: number; // Unix timestamp
  remaining: number;
  layer: 'redis' | 'database';
}
```

**Features**:
- Modal/Dialog overlay
- Context-aware messaging
- Action buttons (Sign In, Upgrade, Wait)
- Countdown timer
- Auto-close when limit resets (optional)

### 2. RateLimitIndicator Component

**Location**: `components/rate-limit/RateLimitIndicator.tsx`

**Props**:
```typescript
interface RateLimitIndicatorProps {
  remaining: number;
  limit: number;
  isPro: boolean;
}
```

**Features**:
- Shows remaining count (subtle, in input area)
- Warning state when < 3 remaining
- Hidden for Pro users

### 3. RateLimitContext

**Location**: `lib/contexts/RateLimitContext.tsx`

**Purpose**: 
- Global rate limit state
- Update from API response headers
- Provide rate limit status to all components

### 4. useRateLimit Hook

**Location**: `hooks/use-rate-limit.ts`

**Purpose**:
- Check rate limit status
- Update state from headers
- Provide helper functions

---

## 🎨 UI/UX Scenarios (Detailed)

### Scenario A: Guest User - First 9 Messages
**State**: Not rate limited
**UI**: 
- Input enabled
- Send button enabled
- Subtle indicator: "X messages remaining" (optional)

### Scenario B: Guest User - 10th Message (Last One)
**State**: Not rate limited yet, but this is the last one
**UI**:
- Input enabled
- Send button enabled
- Warning indicator: "⚠️ Last message today" (optional)
- After sending: Show popup immediately

### Scenario C: Guest User - 11th Message Attempt (IP Limited)
**Trigger**: Redis blocks (shared IP)
**UI**:
- Input disabled (grayed out)
- Send button disabled
- Popup shows: "IP limit reached - Sign in for your own 10 messages"
- Actions: Sign In, Sign Up, Wait

### Scenario D: Guest User - 11th Message Attempt (Session Limited)
**Trigger**: DB blocks (session used all 10)
**UI**:
- Input disabled
- Send button disabled
- Popup shows: "You've used all 10 messages - Sign in for 20 messages/day"
- Actions: Sign In, Sign Up, Wait

### Scenario E: Free User - First 19 Messages
**State**: Not rate limited
**UI**:
- Input enabled
- Send button enabled
- Subtle indicator: "X messages remaining" (optional)

### Scenario F: Free User - 20th Message (Last One)
**State**: Not rate limited yet, but this is the last one
**UI**:
- Input enabled
- Send button enabled
- Warning indicator: "⚠️ Last message today" (optional)
- After sending: Show popup immediately

### Scenario G: Free User - 21st Message Attempt
**Trigger**: DB blocks (user used all 20)
**UI**:
- Input disabled
- Send button disabled
- Popup shows: "You've used all 20 messages - Upgrade to Pro for unlimited"
- Actions: Upgrade to Pro, Wait

### Scenario H: Pro User
**State**: Never rate limited
**UI**:
- Input always enabled
- Send button always enabled
- No rate limit indicators (clean UI)

### Scenario I: New Conversation Attempt (Rate Limited)
**Trigger**: User tries to create new conversation while rate limited
**UI**:
- Prevent navigation to new conversation
- Show rate limit popup immediately
- No conversation creation, no API calls
- Same popup as message send attempt

---

## 🔧 Technical Implementation

### 1. API Route: Rate Limit Status Endpoint

**File**: `app/api/rate-limit/status/route.ts`

```typescript
export async function GET() {
  const { lightweightUser } = await getUserData();
  
  // Check rate limit without incrementing
  const check = await checkRateLimit({
    userId: lightweightUser?.userId || null,
    isProUser: lightweightUser?.isProUser,
    request: req,
  });
  
  return NextResponse.json({
    allowed: check.allowed,
    remaining: check.remaining,
    reset: check.reset,
    layer: check.headers['X-RateLimit-Layer'],
    limit: check.headers['X-RateLimit-Limit'],
  });
}
```

### 2. API Route: Rate Limit Check (Pre-Send)

**File**: `app/api/rate-limit/check/route.ts`

```typescript
export async function POST(req: Request) {
  const { lightweightUser } = await getUserData();
  
  const check = await checkRateLimit({
    userId: lightweightUser?.userId || null,
    isProUser: lightweightUser?.isProUser,
    request: req,
  });
  
  if (!check.allowed) {
    return NextResponse.json(
      {
        error: check.reason,
        remaining: check.remaining,
        reset: check.reset,
        layer: check.headers['X-RateLimit-Layer'],
      },
      { status: 429, headers: check.headers }
    );
  }
  
  return NextResponse.json({ allowed: true, ...check });
}
```

### 3. Update Chat API Route

**File**: `app/api/chat/route.ts`

**Changes**:
- Rate limit check happens FIRST (already done ✅)
- Return 429 immediately if limited (already done ✅)
- Include reset time in response (already done ✅)
- **NEW**: Don't create conversation if rate limited (needs fix)

### 4. Client-Side Rate Limit Tracking

**File**: `lib/contexts/RateLimitContext.tsx`

```typescript
export function RateLimitProvider({ children }) {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    remaining: 10,
    reset: 0,
    layer: 'database',
    scenario: 'guest-session',
  });
  
  // Update from API response headers
  const updateFromHeaders = (headers: Headers) => {
    const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0');
    const reset = parseInt(headers.get('X-RateLimit-Reset') || '0');
    const layer = headers.get('X-RateLimit-Layer') as 'redis' | 'database';
    
    setRateLimitState({
      isRateLimited: remaining === 0,
      remaining,
      reset,
      layer,
      scenario: determineScenario(remaining, layer, user),
    });
  };
  
  return (
    <RateLimitContext.Provider value={{ rateLimitState, updateFromHeaders }}>
      {children}
    </RateLimitContext.Provider>
  );
}
```

### 5. Update MainInput Component

**File**: `components/homepage/MainInput.tsx`

**Changes**:
- Check rate limit before navigation
- Show popup if rate limited
- Disable input/send if rate limited
- Show remaining count indicator

### 6. Update ConversationClient Component

**File**: `components/conversation/ConversationClient.tsx`

**Changes**:
- Check rate limit before send
- Show popup if rate limited
- Disable input/send if rate limited
- Track rate limit from response headers
- Show remaining count indicator

---

## 🚨 Edge Cases & Additional Scenarios

### Edge Case 1: Rate Limit During Streaming
**Scenario**: User sends message, starts streaming, but rate limit is reached mid-stream
**Solution**: 
- Allow current stream to complete
- Block next message
- Show popup after stream completes

### Edge Case 2: Multiple Tabs
**Scenario**: User has multiple tabs open, uses limit in one tab
**Solution**:
- Use localStorage/sessionStorage to sync rate limit state
- Broadcast rate limit updates across tabs
- Update all tabs when limit is reached

### Edge Case 3: Network Error During Rate Limit Check
**Scenario**: Rate limit check fails due to network error
**Solution**:
- Fail open (allow request)
- Log error
- Show warning if possible

### Edge Case 4: Rate Limit Reset During Session
**Scenario**: User is rate limited, but limit resets while they're on the page
**Solution**:
- Poll reset time
- Auto-enable UI when reset time passes
- Show notification: "Your daily limit has reset!"

### Edge Case 5: Guest Signs In While Rate Limited
**Scenario**: Guest is rate limited, signs in, gets 20 messages
**Solution**:
- Transfer guest data to user
- Reset rate limit state
- Show notification: "Welcome! Your guest messages have been transferred. You now have 20 messages/day."

### Edge Case 6: Pro User Downgrades to Free
**Scenario**: Pro user cancels, becomes free, hits 20 message limit
**Solution**:
- Check subscription status on each request
- Update rate limit state
- Show free user popup when limit reached

---

## 📝 Implementation Checklist

### Phase 1: Backend Fixes
- [ ] Ensure rate limit check happens FIRST in `/api/chat`
- [ ] Don't create conversation if rate limited
- [ ] Don't save message if rate limited
- [ ] Return proper reset time in response
- [ ] Add rate limit status endpoint (`/api/rate-limit/status`)
- [ ] Add rate limit check endpoint (`/api/rate-limit/check`)

### Phase 2: Rate Limit Context & State
- [ ] Create `RateLimitContext`
- [ ] Create `useRateLimit` hook
- [ ] Track rate limit from response headers
- [ ] Update state across components

### Phase 3: UI Components
- [ ] Create `RateLimitPopup` component
- [ ] Create `RateLimitIndicator` component
- [ ] Implement scenario-based messaging
- [ ] Add countdown timer
- [ ] Add action buttons (Sign In, Upgrade, Wait)

### Phase 4: Integration
- [ ] Update `MainInput` component
- [ ] Update `ConversationClient` component
- [ ] Disable UI when rate limited
- [ ] Show popup on rate limit
- [ ] Prevent new conversation when rate limited

### Phase 5: Edge Cases
- [ ] Handle multiple tabs
- [ ] Handle rate limit reset during session
- [ ] Handle network errors
- [ ] Handle guest sign-in while rate limited
- [ ] Handle Pro downgrade

### Phase 6: Testing
- [ ] Test all scenarios
- [ ] Test edge cases
- [ ] Test UI/UX flow
- [ ] Test countdown timer
- [ ] Test action buttons

---

## 🎯 Summary

### Key Points

1. **Rate Limit Types**:
   - Guest Redis: Sliding window (24h rolling)
   - Guest DB: Bucketed (midnight UTC reset)
   - Free DB: Bucketed (midnight UTC reset)
   - Pro DB: Bucketed (midnight UTC reset, unlimited)

2. **Reset Time**: **Midnight UTC (00:00 UTC)**, not 11 UTC

3. **UI Requirements**:
   - Check rate limit BEFORE processing
   - Show popup immediately when limit reached
   - Disable all input/send when rate limited
   - Context-aware messaging based on scenario
   - Countdown timer showing reset time

4. **Scenarios**:
   - Guest IP limited (shared IP)
   - Guest session limited (used all 10)
   - Free user limited (used all 20)
   - Pro user (never limited)

5. **Implementation**:
   - Rate limit check FIRST in API
   - Client-side state tracking
   - Popup component with actions
   - Disable UI when limited
   - Prevent new conversations when limited

---

**Last Updated**: 2025-12-16  
**Status**: Ready for Implementation

