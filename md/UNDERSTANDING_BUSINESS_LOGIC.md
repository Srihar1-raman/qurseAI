# Understanding Business Logic & Database Design

## 🤔 What is "Business Logic"?

**Business Logic** = The rules and decisions your app makes based on data.

Think of it like this:
- **Database** = The filing cabinet (stores data)
- **Business Logic** = The rules for what you can do with that data

### Example: Rate Limiting

**The Problem**: You want to limit how many messages users can send.

**The Database Part** (what to store):
- Who sent a message?
- When did they send it?
- How many have they sent today?

**The Business Logic Part** (the rules):
- Anonymous users: 2 messages per day
- Free logged-in: 10 messages per day  
- Pro users: Unlimited

**The Code**:
```typescript
// Business Logic Service
async function canSendMessage(user: User | null): Promise<boolean> {
  // 1. Check user type
  if (!user) {
    // Anonymous - check daily limit
    const count = await getMessageCountToday(null);
    return count < 2; // 2 messages max
  }
  
  if (user.isPro) {
    return true; // Pro = unlimited
  }
  
  // Free logged-in
  const count = await getMessageCountToday(user.id);
  return count < 10; // 10 messages max
}
```

---

## 💰 How Subscriptions Work (Simple Explanation)

### The Flow:

1. **User clicks "Upgrade to Pro"** → Goes to payment page (Dodo Payments)
2. **Payment succeeds** → Dodo sends webhook to your server
3. **Your server receives webhook** → Updates database:
   - Set `subscriptions.status = 'active'`
   - Set `subscriptions.current_period_end = '2025-02-15'` (1 month from now)
4. **User is now Pro** → Can use Pro features
5. **Every month** → Dodo charges them automatically
6. **If payment fails** → Set `status = 'cancelled'`, user loses Pro

### The Database Tables You Need:

```sql
-- Subscriptions table
subscriptions (
  user_id → who has the subscription
  plan → 'free', 'pro', 'premium'
  status → 'active', 'cancelled', 'expired'
  current_period_end → when subscription expires
  cancel_at_period_end → should cancel after this period?
)
```

### The Business Logic:

```typescript
// Check if user is Pro
async function isProUser(userId: string): Promise<boolean> {
  const sub = await getSubscription(userId);
  
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (new Date(sub.current_period_end) < new Date()) return false;
  
  return true; // User is Pro!
}
```

---

## 📊 Rate Limiting Explained

### What is Rate Limiting?

**Rate limiting** = Tracking how many times someone did something, and stopping them if they exceed the limit.

### How It Works:

1. **User sends a message** → Your API checks: "Have they sent too many today?"
2. **If under limit** → Allow the message, increment counter
3. **If over limit** → Block the message, return error

### The Database:

You need to track:
- **Who** did it (user_id or null for anonymous)
- **What** they did (resource_type: 'message', 'api_call', etc.)
- **When** they did it (timestamp)
- **How many** (count)

### Simple Approach: Count Messages Per Day

```sql
-- Track each message
messages (
  id,
  user_id,  -- NULL for anonymous
  created_at -- when sent
)

-- Business logic: Count messages today
SELECT COUNT(*) 
FROM messages 
WHERE user_id = $1 
  AND created_at >= CURRENT_DATE  -- today
```

### Advanced Approach: Rate Limits Table

```sql
-- Dedicated rate limits table
rate_limits (
  user_id,
  resource_type,  -- 'message', 'api_call'
  count,          -- how many this period
  window_start,   -- when period started
  window_end      -- when period ends
)
```

**Why a separate table?**
- Faster queries (indexed)
- Can track different limits (messages, API calls, etc.)
- Can reset daily/weekly/monthly easily

---

## 🎯 Credits vs Message Limits

### Two Approaches:

#### Approach 1: Message Limits (Simpler)
- Anonymous: 2 messages/day
- Free: 10 messages/day
- Pro: Unlimited

**How to count**: Just count messages in `messages` table where `created_at >= today`

#### Approach 2: Credits System (More Flexible)
- Anonymous: 2 credits/day
- Free: 10 credits/day
- Pro: 1000 credits/month

**How it works**:
- Each message costs 1 credit
- Credits reset daily (free) or monthly (pro)
- Can use credits for other things too (file uploads, etc.)

**Database**:
```sql
user_credits (
  user_id,
  credits_remaining,
  credits_total,
  period_start,
  period_end
)
```

### Which Should You Use?

**Start with Message Limits** (simpler):
- Easier to understand
- Easier to implement
- Can upgrade to credits later if needed

---

## 🗄️ Database Design: Making Tables "Smarter"

### Current Tables (Good Foundation):

```sql
users (id, email, name, avatar_url, created_at, updated_at)
conversations (id, user_id, title, created_at, updated_at)
messages (id, conversation_id, role, content, created_at)
```

### What's Missing for Business Logic:

#### 1. User Preferences
```sql
user_preferences (
  user_id PRIMARY KEY,
  theme,
  language,
  auto_save_conversations
)
```

#### 2. Subscriptions
```sql
subscriptions (
  id,
  user_id UNIQUE,  -- one subscription per user
  plan,            -- 'free', 'pro', 'premium'
  status,          -- 'active', 'cancelled', 'expired'
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
```

#### 3. Rate Limiting (Optional - can use message count instead)
```sql
rate_limits (
  id,
  user_id,         -- NULL for anonymous
  resource_type,   -- 'message', 'api_call'
  count,
  window_start,
  window_end
)
```

#### 4. Payment Records (For Dodo Payments webhooks)
```sql
payments (
  id,
  user_id,
  subscription_id,
  amount,
  currency,
  status,          -- 'pending', 'completed', 'failed'
  dodo_payment_id, -- ID from Dodo Payments
  created_at
)
```

---

## 🔄 The Complete Flow: User Sends Message

### Step-by-Step:

1. **User types message** → Frontend sends to `/api/chat`

2. **API Route** (`app/api/chat/route.ts`):
   ```typescript
   // Step 1: Get user (or null for anonymous)
   const user = await getUser();
   
   // Step 2: Check rate limit (BUSINESS LOGIC)
   const canSend = await checkRateLimit(user);
   if (!canSend) {
     return error("Daily limit reached");
   }
   
   // Step 3: Check subscription (BUSINESS LOGIC)
   const isPro = await isProUser(user?.id);
   if (model.requiresPro && !isPro) {
     return error("Pro subscription required");
   }
   
   // Step 4: Save message (DATABASE)
   await saveMessage(conversationId, content);
   
   // Step 5: Stream AI response
   return streamAIResponse(...);
   ```

3. **Business Logic Service** (`lib/services/rate-limiting.ts`):
   ```typescript
   async function checkRateLimit(user: User | null): Promise<boolean> {
     if (!user) {
       // Anonymous: 2 per day
       const count = await countMessagesToday(null);
       return count < 2;
     }
     
     if (await isProUser(user.id)) {
       return true; // Unlimited
     }
     
     // Free: 10 per day
     const count = await countMessagesToday(user.id);
     return count < 10;
   }
   ```

4. **Database Query** (`lib/db/queries.server.ts`):
   ```typescript
   async function countMessagesToday(userId: string | null): Promise<number> {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     
     const { count } = await supabase
       .from('messages')
       .select('*', { count: 'exact', head: true })
       .eq('user_id', userId)
       .gte('created_at', today.toISOString());
     
     return count || 0;
   }
   ```

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Do This First)
1. ✅ Database schema extensions (add tables)
2. ✅ Basic queries (get/set preferences, check subscription)
3. ✅ Business logic services (simple functions)

### Phase 2: Rate Limiting (Simple Version)
1. Count messages per day (use existing `messages` table)
2. Add check in `/api/chat` route
3. Return error if limit exceeded

### Phase 3: Subscriptions (When Ready for Payments)
1. Add `subscriptions` table
2. Create webhook endpoint for Dodo Payments
3. Update subscription status when payment received
4. Check subscription in API routes

### Phase 4: Advanced Features (Later)
1. Credits system (if needed)
2. Advanced rate limiting (separate table)
3. Analytics/usage tracking

---

## 🎓 Key Concepts Summary

### Database vs Business Logic:

- **Database** = Storage (tables, columns, data)
- **Business Logic** = Rules (functions that check data and make decisions)

### Example:
```typescript
// DATABASE: Get data
const messageCount = await db.countMessages(userId);

// BUSINESS LOGIC: Make decision
if (messageCount >= 10) {
  return "Limit reached";
}
```

### Services Layer:

Put business logic in `lib/services/`:
- `rate-limiting.ts` - Rate limit checks
- `subscription.ts` - Subscription checks
- `user-preferences.ts` - Preference management

**Why separate?**
- Reusable (use in API routes, server actions, etc.)
- Testable (easy to test logic separately)
- Maintainable (one place to change rules)

---

## 🚀 Where to Start?

**Start Simple:**

1. **Add `user_preferences` table** (easiest, no complex logic)
2. **Add simple rate limiting** (count messages, check limit)
3. **Add `subscriptions` table** (structure ready, connect payments later)
4. **Wire everything together** (update API routes to use services)

**Don't overthink it!** Start with message counting, upgrade to credits later if needed.

