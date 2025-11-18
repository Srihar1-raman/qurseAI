# Scira Analysis & Implementation Guide for Qurse

## 🔍 How Scira Does It (Real Implementation)

After analyzing scira's codebase, here's how they handle everything:

---

## 📊 Database Schema (What Scira Uses)

### 1. **Message Usage Tracking** (Rate Limiting)
```typescript
// From scira/lib/db/schema.ts
messageUsage = pgTable('message_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  messageCount: integer('message_count').notNull().default(0),
  date: timestamp('date').notNull().defaultNow(),
  resetAt: timestamp('reset_at').notNull(),  // When to reset counter
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Key Insight**: They use a **dedicated usage table** with:
- `messageCount` - Current count for the period
- `resetAt` - When to reset (daily/weekly/monthly)
- One row per user per period

**Why this approach?**
- Fast lookups (indexed by userId)
- Easy to reset (just update resetAt)
- Can track multiple resource types (messages, searches, etc.)

### 2. **Subscriptions** (Polar + DodoPayments)
```typescript
subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => user.id),
  status: text('status').notNull(),  // 'active', 'canceled', etc.
  currentPeriodStart: timestamp('currentPeriodStart').notNull(),
  currentPeriodEnd: timestamp('currentPeriodEnd').notNull(),
  productId: text('productId').notNull(),
  amount: integer('amount').notNull(),
  // ... more fields
});

payment = pgTable('payment', {
  id: text('id').primaryKey(),  // Dodo payment ID
  userId: text('user_id').references(() => user.id),
  status: text('status'),  // 'succeeded', 'failed', etc.
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at').notNull(),
  // ... more fields
});
```

**Key Insight**: They support **TWO payment providers**:
1. **Polar** - Recurring subscriptions (webhook updates `subscription` table)
2. **DodoPayments** - One-time payments (webhook creates `payment` record)

**How DodoPayments works**:
- Payment succeeds → Create `payment` record with `status = 'succeeded'`
- Check if payment is within subscription duration (e.g., 1 month)
- If payment date + duration > now → User is Pro

---

## 🧠 Business Logic (How Scira Checks Limits)

### 1. **Lightweight User Check** (Fast Auth)
```typescript
// From scira/lib/user-data-server.ts
export async function getLightweightUserAuth(): Promise<LightweightUserAuth | null> {
  // 1. Get session (fast)
  const session = await auth.api.getSession({ headers: await headers() });
  
  // 2. Check cache first (in-memory, 2 min TTL)
  const cached = getCachedLightweightAuth(userId);
  if (cached) return cached;
  
  // 3. Single JOIN query: user + subscription
  const result = await db
    .select({
      userId: user.id,
      email: user.email,
      subscriptionStatus: subscription.status,
      subscriptionEnd: subscription.currentPeriodEnd,
    })
    .from(user)
    .leftJoin(subscription, eq(subscription.userId, user.id))
    .where(eq(user.id, userId));
  
  // 4. Check DodoPayments if no Polar subscription
  let isDodoActive = false;
  if (!hasActivePolarSub) {
    const recentDodoPayment = await db
      .select({ createdAt: payment.createdAt })
      .from(payment)
      .where(and(
        eq(payment.userId, userId),
        eq(payment.status, 'succeeded')
      ))
      .orderBy(desc(payment.createdAt))
      .limit(1);
    
    if (recentDodoPayment.length > 0) {
      const paymentDate = new Date(recentDodoPayment[0].createdAt);
      const subscriptionEndDate = new Date(paymentDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1 month
      isDodoActive = subscriptionEndDate > new Date();
    }
  }
  
  // 5. Return lightweight data
  return {
    userId: result[0].userId,
    email: result[0].email,
    isProUser: hasActivePolarSub || isDodoActive,
  };
}
```

**Key Insights**:
- **Cache everything** (2-5 min TTL)
- **Single query** for user + subscription (JOIN)
- **Check DodoPayments only if no Polar subscription**
- **Return minimal data** (userId, email, isProUser)

### 2. **Usage Checking** (Rate Limiting)
```typescript
// From scira/lib/db/queries.ts (simplified)
export async function getUserMessageCount(userId: string): Promise<number> {
  // Get or create usage record for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetAt = new Date(today);
  resetAt.setDate(resetAt.getDate() + 1); // Tomorrow
  
  // Try to get existing record
  const [usage] = await db
    .select()
    .from(messageUsage)
    .where(and(
      eq(messageUsage.userId, userId),
      gte(messageUsage.resetAt, new Date()) // Not expired
    ))
    .limit(1);
  
  if (usage) {
    return usage.messageCount;
  }
  
  // Create new record if doesn't exist
  await db.insert(messageUsage).values({
    userId,
    messageCount: 0,
    date: today,
    resetAt,
  });
  
  return 0;
}

export async function incrementMessageUsage(userId: string): Promise<void> {
  // Get current count
  const count = await getUserMessageCount(userId);
  
  // Increment
  await db
    .update(messageUsage)
    .set({ 
      messageCount: count + 1,
      updatedAt: new Date(),
    })
    .where(eq(messageUsage.userId, userId));
}
```

**Key Insights**:
- **One record per user per period** (daily/weekly/monthly)
- **Auto-create** if doesn't exist
- **Reset logic**: Check `resetAt` date, create new record if expired

### 3. **API Route Flow** (How It All Connects)
```typescript
// From scira/app/api/search/route.ts (simplified)
export async function POST(req: Request) {
  // STEP 1: Fast auth check (lightweight, cached)
  const lightweightUser = await getLightweightUser();
  
  // STEP 2: Early exit checks (no DB operations)
  if (!lightweightUser) {
    if (requiresAuthentication(model)) {
      return error('Authentication required');
    }
  } else {
    if (requiresProSubscription(model) && !lightweightUser.isProUser) {
      return error('Pro subscription required');
    }
  }
  
  // STEP 3: Parallel operations (if authenticated)
  if (lightweightUser) {
    const [messageCount, fullUser] = await Promise.all([
      getUserMessageCount(lightweightUser.userId),
      getCurrentUser(), // Full user data
    ]);
    
    // STEP 4: Check rate limits
    const isPro = lightweightUser.isProUser;
    const shouldBypass = shouldBypassRateLimits(model, lightweightUser);
    
    if (!shouldBypass && !isPro) {
      // Free user limits
      const limit = 10; // messages per day
      if (messageCount >= limit) {
        return error('Daily message limit reached');
      }
    }
    
    // STEP 5: Increment usage (in background)
    after(async () => {
      await incrementMessageUsage(lightweightUser.userId);
    });
  }
  
  // STEP 6: Stream AI response
  return streamAIResponse(...);
}
```

**Key Insights**:
- **Lightweight check first** (fast, cached)
- **Early exits** (avoid unnecessary work)
- **Parallel operations** (fetch multiple things at once)
- **Background updates** (increment usage after response starts)

---

## 💡 Key Patterns from Scira

### 1. **Caching Strategy**
```typescript
// In-memory cache with TTL
const userDataCache = new Map<string, { data: UserData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(userId: string): UserData | null {
  const cached = userDataCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}
```

**Why cache?**
- Subscription status doesn't change often
- Reduces database queries
- Faster API responses

### 2. **Lightweight vs Full User Data**
- **Lightweight**: userId, email, isProUser (fast, for auth checks)
- **Full**: All user data + subscription details (slower, for settings page)

**Use lightweight in API routes**, full data only when needed.

### 3. **Usage Tracking Pattern**
```typescript
// Pattern: Get or create, then increment
async function trackUsage(userId: string, resourceType: string) {
  // 1. Get current count (or create record)
  const usage = await getOrCreateUsage(userId, resourceType);
  
  // 2. Check limit
  if (usage.count >= limit) {
    throw new Error('Limit reached');
  }
  
  // 3. Increment (in background if possible)
  await incrementUsage(userId, resourceType);
}
```

### 4. **Subscription Checking Pattern**
```typescript
// Check both Polar and DodoPayments
async function isProUser(userId: string): Promise<boolean> {
  // 1. Check Polar subscription (active status)
  const polarSub = await getActiveSubscription(userId);
  if (polarSub) return true;
  
  // 2. Check DodoPayments (recent successful payment)
  const recentPayment = await getRecentDodoPayment(userId);
  if (recentPayment) {
    const expiresAt = new Date(recentPayment.createdAt);
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return expiresAt > new Date();
  }
  
  return false;
}
```

---

## 🎯 What You Should Build (Inspired by Scira)

### Phase 1: Database Schema (Start Here)

#### 1. Message Usage Table
```sql
CREATE TABLE IF NOT EXISTS message_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_message_usage_user_id ON message_usage(user_id);
CREATE INDEX idx_message_usage_reset_at ON message_usage(reset_at);
```

**For anonymous users**: Track by IP or session (optional, can skip for now)

#### 2. Subscriptions Table
```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT CHECK (plan IN ('free', 'pro', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);
```

#### 3. Payments Table (DodoPayments)
```sql
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,  -- Dodo payment ID
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,  -- 'succeeded', 'failed', 'pending'
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  -- Store webhook data as JSON
  metadata JSONB
);
```

### Phase 2: Business Logic Services

#### 1. Usage Service (`lib/services/usage.ts`)
```typescript
export async function getUserMessageCount(userId: string): Promise<number> {
  // Get or create usage record for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetAt = new Date(today);
  resetAt.setDate(resetAt.getDate() + 1);
  
  // Try to get existing
  const { data: usage } = await supabase
    .from('message_usage')
    .select('message_count')
    .eq('user_id', userId)
    .gte('reset_at', new Date().toISOString())
    .maybeSingle();
  
  if (usage) {
    return usage.message_count;
  }
  
  // Create new if doesn't exist
  await supabase.from('message_usage').insert({
    user_id: userId,
    message_count: 0,
    date: today.toISOString().split('T')[0],
    reset_at: resetAt.toISOString(),
  });
  
  return 0;
}

export async function incrementMessageUsage(userId: string): Promise<void> {
  const count = await getUserMessageCount(userId);
  
  await supabase
    .from('message_usage')
    .update({ 
      message_count: count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .gte('reset_at', new Date().toISOString());
}
```

#### 2. Subscription Service (`lib/services/subscription.ts`)
```typescript
export async function isProUser(userId: string): Promise<boolean> {
  // Check Polar subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  
  if (sub && new Date(sub.current_period_end) > new Date()) {
    return true;
  }
  
  // Check DodoPayments
  const { data: payment } = await supabase
    .from('payments')
    .select('created_at')
    .eq('user_id', userId)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (payment) {
    const paymentDate = new Date(payment.created_at);
    const expiresAt = new Date(paymentDate);
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month
    return expiresAt > new Date();
  }
  
  return false;
}
```

#### 3. Rate Limiting Service (`lib/services/rate-limiting.ts`)
```typescript
export async function checkMessageLimit(
  user: { id: string; isProUser: boolean } | null
): Promise<{ allowed: boolean; reason?: string }> {
  // Pro users: unlimited
  if (user?.isProUser) {
    return { allowed: true };
  }
  
  // Anonymous: 2 per day
  if (!user) {
    // TODO: Track anonymous usage (by IP or skip for now)
    return { allowed: true }; // Allow for now
  }
  
  // Free logged-in: 10 per day
  const count = await getUserMessageCount(user.id);
  const limit = 10;
  
  if (count >= limit) {
    return { 
      allowed: false, 
      reason: `Daily limit of ${limit} messages reached` 
    };
  }
  
  return { allowed: true };
}
```

### Phase 3: Update API Route

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // 1. Get lightweight user (fast, cached)
  const { lightweightUser } = await getUserData();
  
  // 2. Check subscription (update isProUser)
  if (lightweightUser) {
    const isPro = await isProUser(lightweightUser.userId);
    lightweightUser.isProUser = isPro; // Update cached value
  }
  
  // 3. Check rate limit
  const limitCheck = await checkMessageLimit(lightweightUser);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.reason },
      { status: 429 }
    );
  }
  
  // 4. Stream response
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // ... streaming logic
      
      // 5. Increment usage in background
      if (lightweightUser) {
        after(async () => {
          await incrementMessageUsage(lightweightUser.userId);
        });
      }
    },
  });
  
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

---

## 🔄 DodoPayments Webhook Flow

### 1. Webhook Endpoint
```typescript
// app/api/webhooks/dodo/route.ts
export async function POST(req: Request) {
  const payload = await req.json();
  
  // Verify webhook signature (important!)
  // ... verification logic
  
  if (payload.event === 'payment.succeeded') {
    const { payment_id, user_id, total_amount, currency, created_at } = payload.data;
    
    // Save payment record
    await supabase.from('payments').insert({
      id: payment_id,
      user_id: user_id,
      status: 'succeeded',
      total_amount: total_amount,
      currency: currency,
      created_at: created_at,
      metadata: payload.data,
    });
    
    // Clear user cache (so isProUser check picks up new payment)
    clearUserDataCache(user_id);
  }
  
  return NextResponse.json({ received: true });
}
```

### 2. How It Works
1. User pays on DodoPayments
2. Dodo sends webhook to `/api/webhooks/dodo`
3. You save payment record
4. Next API call: `isProUser()` checks recent payment
5. If payment date + 1 month > now → User is Pro

---

## 📝 Implementation Order

1. **Database tables** (message_usage, subscriptions, payments)
2. **Query functions** (getUserMessageCount, isProUser)
3. **Business logic services** (rate-limiting.ts, subscription.ts)
4. **Update API route** (add checks before streaming)
5. **Webhook endpoint** (for DodoPayments)
6. **Cache integration** (cache subscription status)

---

## 🎓 Key Takeaways

1. **Use dedicated usage tables** (faster than counting messages)
2. **Cache everything** (subscription status, user data)
3. **Lightweight checks first** (fast auth, then full data if needed)
4. **Background updates** (increment usage after response starts)
5. **Support multiple payment providers** (Polar + DodoPayments)
6. **One record per user per period** (daily/weekly/monthly)

---

## 🚀 Next Steps

1. Add database tables (SQL migrations)
2. Create query functions
3. Build business logic services
4. Update API route with checks
5. Add webhook endpoint
6. Test with real payments

**Start simple, add complexity later!**

