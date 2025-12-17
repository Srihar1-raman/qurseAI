# Qurse Codebase Overview - Complete Analysis

## 📋 Executive Summary

**Project**: Qurse - AI Chat Application (Rebuild)  
**Status**: UI ✅ | Auth ✅ | Database Schema ✅ | AI Core ✅ | Business Logic ⚠️ (Partial)  
**Next Phase**: Complete DB & Business Logic

---

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.5.6 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (OAuth: GitHub, Google, Twitter)
- **AI SDK**: Vercel AI SDK v5
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context + Server Components

### Folder Structure
```
qurse/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (search)/          # Main chat routes
│   ├── api/               # API routes
│   └── settings/          # Settings pages
├── components/            # React components
│   ├── auth/              # Auth components
│   ├── chat/              # Chat UI
│   ├── conversation/      # Conversation UI
│   ├── homepage/          # Homepage components
│   ├── layout/            # Layout components
│   ├── settings/          # Settings components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── contexts/          # React contexts (Auth, Conversation, etc.)
│   ├── db/                # Database queries (client + server)
│   ├── services/          # Business logic services
│   ├── supabase/          # Supabase clients & migrations
│   ├── tools/             # AI tools registry
│   └── utils/             # Utilities
├── ai/                    # AI configuration
│   ├── config.ts          # Chat modes registry
│   ├── models.ts          # Model configurations
│   └── providers.ts       # AI provider abstraction
└── hooks/                 # React hooks
```

---

## 💾 Database Schema (6 Tables)

### ✅ Core Tables (Complete)

#### 1. `users` (extends Supabase Auth)
```sql
- id (UUID, PK, FK → auth.users)
- email (TEXT, UNIQUE)
- name (TEXT)
- avatar_url (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete with RLS policies

#### 2. `conversations`
```sql
- id (UUID, PK)
- user_id (UUID, FK → users, NOT NULL)
- title (TEXT, DEFAULT 'New Chat')
- created_at, updated_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete with RLS, triggers, indexes

#### 3. `messages`
```sql
- id (UUID, PK)
- conversation_id (UUID, FK → conversations)
- role (TEXT: 'user' | 'assistant' | 'system' | 'tool')
- content (TEXT, nullable - legacy)
- parts (JSONB) - NEW: AI SDK parts array
- model (TEXT)
- input_tokens, output_tokens, total_tokens (INTEGER)
- completion_time (REAL)
- created_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete with RLS, indexes, GIN index on parts

### ✅ Feature Tables (Complete)

#### 4. `user_preferences`
```sql
- user_id (UUID, PK, FK → users)
- theme ('light' | 'dark' | 'auto')
- language (TEXT)
- auto_save_conversations (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete with RLS, triggers

#### 5. `subscriptions`
```sql
- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- plan ('free' | 'pro')
- status ('active' | 'cancelled' | 'expired' | 'trial')
- current_period_start, current_period_end (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete with RLS, helper function `ensure_user_subscription()`

#### 6. `rate_limits`
```sql
- id (UUID, PK)
- user_id (UUID, FK → users, nullable)
- session_hash (TEXT, nullable) - NEW: for guest users
- resource_type ('message' | 'api_call' | 'conversation')
- count (INTEGER)
- window_start, window_end (TIMESTAMPTZ) - legacy
- bucket_start, bucket_end (TIMESTAMPTZ) - NEW: bucketed windows
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(user_id, resource_type, window_start)
```
**Status**: ✅ Complete with hybrid guest/auth support

### ✅ Guest Staging Tables (Complete)

#### 7. `guest_conversations`
```sql
- id (UUID, PK)
- session_hash (TEXT, NOT NULL)
- title (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete (server-side only, no RLS)

#### 8. `guest_messages`
```sql
- id (UUID, PK)
- guest_conversation_id (UUID, FK → guest_conversations)
- role, content, parts, model, tokens, completion_time
- created_at (TIMESTAMPTZ)
```
**Status**: ✅ Complete (server-side only, no RLS)

### Database Functions
- ✅ `update_updated_at_column()` - Auto-update timestamps
- ✅ `get_conversations_with_message_count()` - Efficient conversation queries
- ✅ `update_conversation_on_message()` - Auto-update conversation timestamp
- ✅ `ensure_user_subscription()` - Create default subscription
- ✅ `increment_rate_limit()` - Rate limit tracking (hybrid)
- ✅ `transfer_guest_to_user()` - Transfer guest data on signup
- ✅ `cleanup_guest_data()` - Cleanup old guest data (pg_cron scheduled)

---

## 🔐 Authentication System

### ✅ Implementation Status: COMPLETE

**Files**:
- `lib/contexts/AuthContext.tsx` - Global auth state
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/supabase/auth-utils.ts` - Auth helpers (getUserData, isProUser)
- `middleware.ts` - Session refresh
- `app/auth/callback/route.ts` - OAuth callback

**Features**:
- ✅ OAuth providers: GitHub, Google, Twitter
- ✅ Session management (automatic refresh)
- ✅ User profile creation on first login
- ✅ Pro subscription checking (cached)
- ✅ Guest mode support
- ✅ Auth state synchronization

---

## 🤖 AI System

### ✅ Implementation Status: COMPLETE (Core)

**Files**:
- `ai/providers.ts` - Unified provider (`qurse` provider)
- `ai/models.ts` - Model registry & configuration
- `ai/config.ts` - Chat modes registry
- `app/api/chat/route.ts` - Main chat API

**Models Implemented**:
1. **GPT OSS 120B** (Groq) - Free, reasoning, 131K context
2. **Grok 3 Mini** (xAI) - Pro, reasoning, 131K context
3. **Kimi K2** (Anannas) - Free, fast, 131K context

**Features**:
- ✅ Provider abstraction (easy to add models)
- ✅ Model access control (auth/Pro requirements)
- ✅ Reasoning middleware support
- ✅ Streaming responses
- ✅ Tool support (registry ready)
- ✅ Chat modes (registry pattern)
- ✅ Message persistence (parts array)

---

## 💼 Business Logic Services

### ✅ Complete Services

#### 1. `lib/services/user-preferences.ts`
- ✅ `getUserPreferences()` - Get with defaults
- ✅ `updateUserPreferences()` - Update/create
- ✅ `getDefaultPreferences()` - Default values

#### 2. `lib/services/subscription.ts`
- ✅ `isProUser()` - Check Pro status
- ✅ `getUserSubscription()` - Get subscription
- ✅ `updateSubscription()` - Update (webhook)
- ✅ `isSubscriptionActive()` - Validate status

#### 3. `lib/services/user-profile.ts`
- ✅ `getUserProfile()` - Get profile
- ✅ `updateUserProfile()` - Update name/avatar

#### 4. `lib/services/account-management.ts`
- ✅ `deleteUserAccount()` - Delete account
- ✅ `clearAllConversations()` - Clear chats

#### 5. `lib/services/rate-limiting.ts`
- ✅ `checkRateLimit()` - Hybrid orchestrator
- ✅ Guest: Redis IP + DB session_hash
- ✅ Auth: DB with Pro/Free handling

#### 6. `lib/services/rate-limiting-guest.ts`
- ✅ `checkGuestRateLimit()` - Guest rate limiting

#### 7. `lib/services/rate-limiting-auth.ts`
- ✅ `checkAuthenticatedRateLimit()` - Auth rate limiting

---

## 📡 API Routes

### ✅ Complete Routes

#### Chat
- ✅ `POST /api/chat` - Main chat endpoint (streaming, rate limiting, persistence)

#### User Management
- ✅ `GET /api/user/preferences` - Get preferences
- ✅ `PUT /api/user/preferences` - Update preferences
- ✅ `GET /api/user/subscription` - Get Pro status
- ✅ `GET /api/user/profile` - Get profile
- ✅ `PUT /api/user/profile` - Update profile
- ✅ `DELETE /api/user/account` - Delete account

#### Conversations
- ✅ `GET /api/conversations` - List conversations
- ✅ `GET /api/conversation/[id]/messages` - Get messages
- ✅ `GET /api/conversations/search` - Search conversations

#### Guest
- ✅ `GET /api/guest/conversations` - List guest conversations
- ✅ `GET /api/guest/conversation/[id]/messages` - Get guest messages

---

## 🗄️ Database Query Layer

### Client-Side Queries (`lib/db/queries.ts`)
- ✅ `getConversations()` - List with pagination
- ✅ `getGuestConversations()` - List guest conversations
- ✅ `getConversationCount()` - Count conversations
- ✅ `searchConversations()` - Search by title
- ✅ `getOlderMessages()` - Pagination for messages
- ✅ `getMessages()` - Get all messages
- ✅ `createConversation()` - Create conversation
- ✅ `updateConversation()` - Update title
- ✅ `deleteConversation()` - Delete conversation
- ✅ `createMessage()` - Create message (legacy)
- ✅ `deleteAllConversations()` - Clear all
- ✅ `ensureConversation()` - Idempotent create
- ✅ `getUserPreferences()` - Get preferences
- ✅ `updateUserPreferences()` - Update preferences
- ✅ `updateUserProfile()` - Update profile

### Server-Side Queries (`lib/db/*.server.ts`)
- ✅ `messages.server.ts` - Message operations
- ✅ `conversations.server.ts` - Conversation operations
- ✅ `users.server.ts` - User operations
- ✅ `preferences.server.ts` - Preferences operations
- ✅ `subscriptions.server.ts` - Subscription operations
- ✅ `rate-limits.server.ts` - Rate limit operations
- ✅ `guest-conversations.server.ts` - Guest conversation operations
- ✅ `guest-transfer.server.ts` - Guest-to-user transfer

---

## ⚠️ What's Missing / Incomplete

### Database Schema
- ✅ All 6 core tables exist
- ✅ Guest staging tables exist
- ✅ All indexes, triggers, RLS policies exist
- ✅ All helper functions exist

### Business Logic
- ✅ All services exist and are implemented
- ✅ Rate limiting is complete (hybrid Redis + DB)
- ✅ Subscription checking is complete
- ✅ User preferences are complete
- ✅ Account management is complete

### API Routes
- ✅ All user management routes exist
- ✅ All conversation routes exist
- ✅ Chat route is complete

### Potential Gaps (To Verify)
1. **Webhook Endpoints** - Subscription webhooks (Dodo Payments integration)
   - Status: Not found in codebase
   - Needed: `POST /api/webhooks/subscription` for payment updates

2. **Admin Functions** - Database cleanup, analytics
   - Status: Basic cleanup exists (`cleanup_guest_data()`)
   - May need: Admin dashboard endpoints

3. **File Attachments** - If planned
   - Status: No file storage tables found
   - Schema: Would need `file_attachments` table

4. **Analytics/Usage Tracking** - If needed
   - Status: Basic rate limiting tracking exists
   - May need: Usage analytics tables

---

## 🔄 Data Flow Examples

### 1. User Sends Message (Authenticated)
```
User Input → /api/chat
  ↓
1. Auth check (getUserData)
2. Rate limit check (checkRateLimit)
3. Model access check (canUseModel)
4. Ensure conversation exists
5. Save user message
6. Stream AI response
7. Save assistant message (background)
8. Generate title (background)
```

### 2. Guest Sends Message
```
Guest Input → /api/chat
  ↓
1. Extract session_hash from cookie
2. Rate limit check (Redis IP + DB session_hash)
3. Ensure guest conversation exists
4. Save guest message
5. Stream AI response
6. Save assistant message (background)
```

### 3. User Signs Up (Guest → Auth)
```
OAuth Callback → /auth/callback
  ↓
1. Create user profile
2. Create user preferences
3. Create subscription (free)
4. Transfer guest data (transfer_guest_to_user)
   - guest_conversations → conversations
   - guest_messages → messages
   - rate_limits (session_hash → user_id)
```

---

## 🎯 Next Steps (Your Agenda)

### Phase 1: Verify & Complete Database
1. ✅ **Schema Review** - All tables exist
2. ⚠️ **Migration Status** - Check if all migrations applied
3. ⚠️ **Function Testing** - Verify all DB functions work
4. ⚠️ **RLS Testing** - Verify RLS policies work correctly

### Phase 2: Complete Business Logic
1. ✅ **Services** - All services exist
2. ⚠️ **Integration** - Verify services are used in API routes
3. ⚠️ **Error Handling** - Verify error handling is complete
4. ⚠️ **Validation** - Verify input validation

### Phase 3: Missing Features (If Needed)
1. ⚠️ **Webhook Endpoints** - Subscription webhooks
2. ⚠️ **File Storage** - If file attachments needed
3. ⚠️ **Analytics** - If usage tracking needed

---

## 📝 Key Files Reference

### Database
- `lib/supabase/schema.sql` - Full schema
- `lib/supabase/migration_rate_limiting_hybrid.sql` - Guest tables + rate limiting
- `lib/db/queries.ts` - Client-side queries
- `lib/db/*.server.ts` - Server-side queries

### Business Logic
- `lib/services/*.ts` - All business logic services

### API Routes
- `app/api/chat/route.ts` - Main chat endpoint
- `app/api/user/*/route.ts` - User management
- `app/api/conversation/*/route.ts` - Conversation management

### AI System
- `ai/providers.ts` - Provider abstraction
- `ai/models.ts` - Model registry
- `ai/config.ts` - Chat modes

### Auth
- `lib/contexts/AuthContext.tsx` - Auth state
- `lib/supabase/auth-utils.ts` - Auth helpers
- `middleware.ts` - Session refresh

---

## ✅ Summary

**What's Complete**:
- ✅ Database schema (6 core tables + guest tables)
- ✅ Authentication system
- ✅ AI provider system
- ✅ Business logic services
- ✅ API routes (most)
- ✅ Rate limiting (hybrid)
- ✅ Message persistence

**What Needs Verification**:
- ⚠️ All migrations applied?
- ⚠️ All services integrated?
- ⚠️ Webhook endpoints (if needed)?
- ⚠️ Error handling complete?

**Ready For**:
- ✅ Feature completion (chat modes, tools, agents)
- ✅ Frontend integration
- ✅ Testing & deployment

---

**Last Updated**: 2025-12-16 
**Status**: Ready for DB & Business Logic Completion Phase

