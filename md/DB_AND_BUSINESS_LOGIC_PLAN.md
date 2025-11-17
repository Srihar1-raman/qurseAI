# Database & Business Logic Completion Plan

## 📊 Current State Analysis

### ✅ What's Complete
- **Core Tables**: `users`, `conversations`, `messages` with RLS
- **Basic CRUD**: Conversations and messages can be created/read/updated/deleted
- **Auth Integration**: User authentication working with Supabase
- **Query Functions**: Client and server-side query helpers exist

### ❌ What's Missing

#### Database Schema
1. **User Preferences** - No table for storing user settings
2. **Subscriptions** - No table for Pro/Premium subscriptions
3. **Rate Limiting** - No tracking table for usage limits
4. **File Attachments** - No storage for uploaded files metadata
5. **User Profile Updates** - Users table exists but no update logic

#### Business Logic
1. **User Preferences** - Settings page has TODOs, no persistence
2. **Account Management** - Delete account, clear chats (TODOs)
3. **Subscription Management** - Pro check infrastructure exists but no enforcement
4. **Rate Limiting** - Hooks exist but no actual limiting logic
5. **User Profile** - No API for updating name/avatar

---

## 🎯 Implementation Plan

### Phase 1: User Preferences & Settings (Priority: HIGH)

#### 1.1 Database Schema
**File**: `lib/supabase/schema.sql`

```sql
-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT CHECK (theme IN ('light', 'dark', 'auto')) DEFAULT 'auto',
  language TEXT DEFAULT 'English',
  auto_save_conversations BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

#### 1.2 Database Queries
**File**: `lib/db/queries.ts` (client) and `lib/db/queries.server.ts` (server)

**Functions to add:**
- `getUserPreferences(userId: string)` - Get user preferences
- `updateUserPreferences(userId: string, preferences: Partial<UserPreferences>)` - Update preferences
- `createUserPreferences(userId: string, preferences: UserPreferences)` - Create default preferences

#### 1.3 API Route
**File**: `app/api/user/preferences/route.ts`

**Endpoints:**
- `GET /api/user/preferences` - Get current user's preferences
- `PUT /api/user/preferences` - Update preferences

#### 1.4 Business Logic Service
**File**: `lib/services/user-preferences.ts` (NEW)

**Purpose**: Centralize preference logic, validation, defaults

---

### Phase 2: User Profile Management (Priority: HIGH)

#### 2.1 Database Schema
**Already exists** - `users` table has `name`, `avatar_url`, `updated_at`

**Add trigger** (if missing):
```sql
-- Already exists in schema.sql, verify it's there
```

#### 2.2 Database Queries
**File**: `lib/db/queries.ts` and `lib/db/queries.server.ts`

**Functions to add:**
- `updateUserProfile(userId: string, updates: { name?: string; avatar_url?: string })` - Update profile
- `getUserProfile(userId: string)` - Get full user profile

#### 2.3 API Route
**File**: `app/api/user/profile/route.ts`

**Endpoints:**
- `GET /api/user/profile` - Get current user's profile
- `PUT /api/user/profile` - Update profile

#### 2.4 Business Logic Service
**File**: `lib/services/user-profile.ts` (NEW)

**Purpose**: Profile validation, avatar URL sanitization, etc.

---

### Phase 3: Account Management (Priority: HIGH)

#### 3.1 Database Schema
**No new tables needed** - Uses existing `users`, `conversations`, `messages` with CASCADE DELETE

#### 3.2 Database Queries
**File**: `lib/db/queries.server.ts` (server-side only for security)

**Functions to add:**
- `deleteUserAccount(userId: string)` - Delete user and all related data (CASCADE handles it)
- `clearAllUserConversations(userId: string)` - Already exists in `queries.ts`, add server version

#### 3.3 API Routes
**File**: `app/api/user/account/route.ts`

**Endpoints:**
- `DELETE /api/user/account` - Delete account (requires confirmation)
- `DELETE /api/user/conversations` - Clear all conversations

#### 3.4 Business Logic Service
**File**: `lib/services/account-management.ts` (NEW)

**Purpose**: Account deletion validation, confirmation checks, audit logging

---

### Phase 4: Subscription Management (Priority: MEDIUM)

#### 4.1 Database Schema
**File**: `lib/supabase/schema.sql`

```sql
-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT CHECK (plan IN ('free', 'pro', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trial')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id) -- One subscription per user
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" 
  ON subscriptions FOR SELECT 
  USING (auth.uid() = user_id);
```

#### 4.2 Database Queries
**File**: `lib/db/queries.ts` and `lib/db/queries.server.ts`

**Functions to add:**
- `getUserSubscription(userId: string)` - Get subscription status
- `isProUser(userId: string)` - Check if user has Pro/Premium
- `updateSubscription(userId: string, subscription: Partial<Subscription>)` - Update subscription

#### 4.3 Business Logic Service
**File**: `lib/services/subscription.ts` (NEW)

**Purpose**: Subscription checks, plan validation, Pro feature gating

**Update**: `lib/supabase/auth-utils.ts` - Replace TODO with actual subscription check

---

### Phase 5: Rate Limiting (Priority: MEDIUM)

#### 5.1 Database Schema
**File**: `lib/supabase/schema.sql`

```sql
-- Rate Limiting Table (for tracking usage)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'api_call', 'message', 'conversation'
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, resource_type, window_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_resource ON rate_limits(resource_type);

-- RLS Policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" 
  ON rate_limits FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() IS NULL);
```

#### 5.2 Business Logic Service
**File**: `lib/services/rate-limiting.ts` (NEW)

**Purpose**: 
- Check rate limits before API calls
- Increment counters
- Clean up old windows
- Return rate limit headers

**Integration**: Add to `app/api/chat/route.ts` before streaming starts

---

### Phase 6: File Attachments (Priority: LOW - Future)

#### 6.1 Database Schema
```sql
-- File Attachments Table
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_conversation_id ON file_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_message_id ON file_attachments(message_id);

-- RLS Policies
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments" 
  ON file_attachments FOR SELECT 
  USING (auth.uid() = user_id);
```

**Note**: This is for future implementation when file uploads are added.

---

## 📁 File Structure

### New Files to Create

```
lib/
  services/                    # NEW - Business logic services
    user-preferences.ts
    user-profile.ts
    account-management.ts
    subscription.ts
    rate-limiting.ts

app/api/
  user/                        # NEW - User management APIs
    preferences/
      route.ts
    profile/
      route.ts
    account/
      route.ts
```

### Files to Modify

```
lib/supabase/schema.sql        # Add new tables
lib/db/queries.ts              # Add client-side query functions
lib/db/queries.server.ts       # Add server-side query functions
lib/types.ts                   # Add new types (Subscription, RateLimit, etc.)
app/settings/SettingsPageClient.tsx  # Wire up API calls
lib/supabase/auth-utils.ts     # Replace TODO with subscription check
```

---

## 🔄 Implementation Order

### Step 1: User Preferences (Complete First)
1. Add `user_preferences` table to schema
2. Create query functions (client + server)
3. Create API route `/api/user/preferences`
4. Create service `lib/services/user-preferences.ts`
5. Wire up SettingsPageClient to use API
6. Test: Save/load preferences

### Step 2: User Profile
1. Add query functions for profile updates
2. Create API route `/api/user/profile`
3. Create service `lib/services/user-profile.ts`
4. Wire up AccountSection component
5. Test: Update name/avatar

### Step 3: Account Management
1. Add server-side query functions
2. Create API route `/api/user/account`
3. Create service `lib/services/account-management.ts`
4. Wire up DeleteAccountModal and ClearChatsModal
5. Test: Delete account, clear chats

### Step 4: Subscriptions (When Ready)
1. Add `subscriptions` table to schema
2. Create query functions
3. Create service `lib/services/subscription.ts`
4. Update `auth-utils.ts` to check subscriptions
5. Update `ai/models.ts` to enforce Pro requirements
6. Test: Pro model access control

### Step 5: Rate Limiting (When Needed)
1. Add `rate_limits` table to schema
2. Create service `lib/services/rate-limiting.ts`
3. Integrate into `/api/chat` route
4. Test: Rate limit enforcement

---

## 🎨 Type Definitions

### Add to `lib/types.ts`

```typescript
// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoSaveConversations: boolean;
}

// Subscription
export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// Rate Limit
export interface RateLimit {
  id: string;
  user_id: string | null;
  resource_type: 'api_call' | 'message' | 'conversation';
  count: number;
  window_start: string;
  window_end: string;
}
```

---

## ✅ Testing Checklist

For each phase:
- [ ] Database migration runs successfully
- [ ] RLS policies work correctly
- [ ] Query functions return correct data
- [ ] API routes handle errors properly
- [ ] Client components update UI correctly
- [ ] Settings persist across page reloads
- [ ] Auth checks prevent unauthorized access

---

## 🚀 Next Steps

1. **Start with Phase 1** (User Preferences) - Highest priority, most visible
2. **Test thoroughly** before moving to next phase
3. **Follow existing patterns** - Use same structure as `queries.ts` and `queries.server.ts`
4. **Keep it simple** - Don't over-engineer, add complexity only when needed

---

## 📝 Notes

- **RLS is critical** - All new tables must have proper RLS policies
- **Server vs Client** - Account deletion must be server-side only
- **Error handling** - Use existing error handling patterns
- **Type safety** - Add proper TypeScript types for all new data structures
- **Migration strategy** - Test schema changes in development first

