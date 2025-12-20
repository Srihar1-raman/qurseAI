# 📊 Qurse Codebase Analysis - Complete Overview

**Date:** 2025-01-18  
**Purpose:** Understanding current state before completing DB & business logic

---

## 🎯 Executive Summary

**Current Status:**
- ✅ UI/UX: Complete and polished
- ✅ Auth: Fully implemented (OAuth: Google, Twitter, GitHub)
- ✅ Database Schema: 6 core tables + 2 guest tables (8 total)
- ✅ Basic AI Logic: Model routing, registry, provider setup
- ⚠️ Business Logic: Partially complete (needs completion)
- ⚠️ Features: Chat modes, AI agents, tools not yet implemented

**Next Phase:** Complete database business logic, then move to feature set

---

## 🗄️ Database Schema Overview

### Core Tables (6)

#### 1. **`users`** (extends Supabase Auth)
```sql
- id (UUID, PK, FK → auth.users)
- email (TEXT, UNIQUE, NOT NULL)
- name (TEXT)
- avatar_url (TEXT)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/users.server.ts`)

#### 2. **`conversations`**
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- title (TEXT, DEFAULT 'New Chat')
- pinned (BOOLEAN, DEFAULT false) -- Added via migration
- share_token (UUID, UNIQUE) -- Added via migration
- shared_at (TIMESTAMP) -- Added via migration
- is_shared (BOOLEAN, DEFAULT false) -- Added via migration
- shared_message_count (INTEGER) -- Added via migration
- created_at, updated_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/conversations.server.ts`)
- Create/update/delete conversations
- Share conversation functionality
- Fork shared conversations
- Check access permissions

#### 3. **`messages`**
```sql
- id (UUID, PK)
- conversation_id (UUID, FK → conversations)
- role (TEXT: 'user' | 'assistant' | 'system' | 'tool')
- content (TEXT, nullable) -- Legacy field
- parts (JSONB) -- New format (AI SDK parts array)
- model (TEXT)
- input_tokens, output_tokens, total_tokens (INTEGER)
- completion_time (REAL)
- created_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/messages.server.ts`)
- Save messages (user & assistant)
- Get messages with pagination
- Support both legacy `content` and new `parts` format
- Shared message retrieval

#### 4. **`user_preferences`**
```sql
- user_id (UUID, PK, FK → users)
- theme ('light' | 'dark' | 'auto')
- language (TEXT, DEFAULT 'English')
- auto_save_conversations (BOOLEAN, DEFAULT true)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/preferences.server.ts`)

#### 5. **`subscriptions`**
```sql
- id (UUID, PK)
- user_id (UUID, FK → users, UNIQUE)
- plan ('free' | 'pro')
- status ('active' | 'cancelled' | 'expired' | 'trial')
- current_period_start, current_period_end (TIMESTAMPTZ)
- cancel_at_period_end (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/subscriptions.server.ts`)
- Get/update subscriptions
- Auto-create free subscription on user signup (via `ensure_user_subscription()` function)

#### 6. **`rate_limits`** (Hybrid: user_id + session_hash)
```sql
- id (UUID, PK)
- user_id (UUID, FK → users, nullable) -- For authenticated users
- session_hash (TEXT, nullable) -- For guest users
- resource_type (TEXT: 'message' | 'api_call' | 'conversation')
- count (INTEGER, DEFAULT 0)
- bucket_start, bucket_end (TIMESTAMPTZ) -- Daily buckets (resets at midnight UTC)
- window_start, window_end (TIMESTAMPTZ, nullable) -- Legacy
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE(user_key, session_key, resource_type, bucket_start)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/rate-limits.server.ts`)
- Uses `increment_rate_limit()` database function
- Supports both authenticated users and guests
- Daily bucket-based rate limiting (resets at midnight UTC)

### Guest Tables (2)

#### 7. **`guest_conversations`**
```sql
- id (UUID, PK)
- session_hash (TEXT, NOT NULL) -- HMAC'd session_id
- title (TEXT, DEFAULT 'New Chat')
- pinned (BOOLEAN, DEFAULT false)
- created_at, updated_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/guest-conversations.server.ts`)

#### 8. **`guest_messages`**
```sql
- id (UUID, PK)
- guest_conversation_id (UUID, FK → guest_conversations)
- role (TEXT: 'user' | 'assistant' | 'system' | 'tool')
- content (TEXT, nullable)
- parts (JSONB)
- model, tokens, completion_time (same as messages)
- created_at (TIMESTAMPTZ)
```
**Status:** ✅ Complete  
**Business Logic:** ✅ Complete (`lib/db/guest-messages.server.ts`)

### Database Functions

#### ✅ **`increment_rate_limit()`**
- Checks and increments rate limit for user or guest
- Returns count, limit_reached, bucket_start, bucket_end
- Handles daily buckets (resets at midnight UTC)

#### ✅ **`transfer_guest_to_user()`**
- Transfers guest conversations → conversations
- Transfers guest messages → messages
- Merges rate limits (adds counts together)
- Cleans up guest tables
- Returns transfer counts

#### ✅ **`ensure_user_subscription()`**
- Creates free subscription if user doesn't have one
- Used during OAuth callback

#### ✅ **`cleanup_guest_data()`**
- Deletes guest data older than 30 days
- Scheduled via pg_cron (daily at 2 AM UTC)

#### ✅ **`get_conversations_with_message_count()`**
- Returns conversations with message count
- Used for history sidebar

---

## 📁 File Structure & Organization

### Database Layer (`lib/db/`)

**Client-Side Queries** (for React components):
- `conversations.ts` - Get conversations, search, create, update, delete
- `messages.ts` - Get older messages (pagination)
- `preferences.ts` - Get/update user preferences
- `users.ts` - Update user profile
- `auth.ts` - Get linked OAuth providers
- `queries.ts` - Barrel export (backward compatibility)

**Server-Side Queries** (for API routes):
- `conversations.server.ts` - ✅ Complete
- `messages.server.ts` - ✅ Complete
- `preferences.server.ts` - ✅ Complete
- `users.server.ts` - ✅ Complete
- `subscriptions.server.ts` - ✅ Complete
- `rate-limits.server.ts` - ✅ Complete
- `guest-conversations.server.ts` - ✅ Complete
- `guest-messages.server.ts` - ✅ Complete
- `guest-transfer.server.ts` - ✅ Complete
- `queries.server.ts` - Barrel export

**Status:** ✅ All database operations are complete and well-structured

---

## 🔧 Business Logic Layer (`lib/services/`)

### Current Services

1. **`rate-limiting.ts`** - Main orchestrator
   - Decides guest vs auth rate limiting
   - ✅ Complete

2. **`rate-limiting-guest.ts`** - Guest rate limiting
   - Checks Redis (IP-based) + Database (session-based)
   - ✅ Complete

3. **`rate-limiting-auth.ts`** - Authenticated user rate limiting
   - Checks database for user's message count
   - ✅ Complete

4. **`account-management.ts`** - Account operations
   - Delete account, clear chats
   - ✅ Complete

5. **`user-preferences.ts`** - User settings management
   - ✅ Complete

6. **`user-profile.ts`** - User profile management
   - ✅ Complete

7. **`subscription.ts`** - Subscription management
   - ✅ Complete

**Status:** ✅ All business logic services are complete

---

## 🎨 UI Components

### ✅ Complete Components
- Auth (login, signup, OAuth buttons)
- Chat (message display, markdown rendering)
- Conversation (main chat interface, input, thread)
- Homepage (hero, input, model selector, web search selector)
- Layout (header, footer, navigation, history sidebar)
- Rate limit popups (guest & free user)
- Settings (account, general, payment, system)
- UI primitives (button, modal, toast, input, dropdown)

**Status:** ✅ UI is complete and polished

---

## 🤖 AI Integration

### Current State

**✅ Complete:**
- Model registry (`ai/models.ts`)
- Provider setup (`ai/providers.ts`)
- Model routing and access control
- AI SDK integration (`useChat` hook)
- Streaming responses
- Message format conversion (parts array)

**⚠️ Incomplete:**
- Chat modes (web search, arXiv) - infrastructure ready, not implemented
- AI tools/agents - registry exists, no tools registered
- Tool calling - infrastructure ready, no tools implemented

**Files:**
- `ai/models.ts` - Model definitions and access control
- `ai/providers.ts` - Provider connections (OpenAI, Anthropic, Groq, XAI)
- `ai/config.ts` - Chat mode configuration (ready for tools)
- `lib/tools/registry.ts` - Tool registry (empty, ready for tools)

---

## 🔐 Authentication & Authorization

### ✅ Complete
- OAuth providers (Google, Twitter/X, GitHub)
- Session management
- Guest session handling
- User profile creation
- Guest-to-user transfer
- RLS policies (Row Level Security)
- Auth context (React)

**Files:**
- `app/auth/callback/route.ts` - OAuth callback handler
- `lib/contexts/AuthContext.tsx` - Auth state management
- `lib/db/guest-transfer.server.ts` - Guest data transfer

---

## 📊 Rate Limiting System

### Architecture

**Two-Layer System:**
1. **Redis (Upstash)** - Fast IP-based rate limiting for guests
2. **Database** - Accurate count tracking (user_id or session_hash)

**Rate Limits:**
- Guests: 10 messages/day
- Free users: 20 messages/day
- Pro users: Unlimited (not enforced)

**Implementation:**
- `lib/services/rate-limiting.ts` - Orchestrator
- `lib/services/rate-limiting-guest.ts` - Guest checks
- `lib/services/rate-limiting-auth.ts` - Auth user checks
- `lib/db/rate-limits.server.ts` - Database operations
- `lib/redis/` - Redis client and rate limiters

**Status:** ✅ Complete

---

## 🚀 API Routes

### ✅ Complete Routes

**Chat:**
- `POST /api/chat` - Main AI chat endpoint (515 lines, refactored)

**Conversations:**
- `GET /api/conversation/[id]/messages` - Get messages
- `GET /api/conversations/search` - Search conversations

**Guest:**
- `GET /api/guest/conversation/[id]/messages` - Get guest messages

**User Management:**
- `GET /api/user/subscription` - Get Pro status
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/preferences` - Get preferences
- `PUT /api/user/preferences` - Update preferences
- `DELETE /api/user/conversations` - Clear all chats
- `DELETE /api/user/account` - Delete account

**Auth:**
- `GET /auth/callback` - OAuth callback

**Status:** ✅ All API routes are complete

---

## 📝 What's Missing / Incomplete

### Database & Business Logic

**✅ COMPLETE** - All database tables, functions, and business logic are implemented.

### Features (Not Yet Implemented)

1. **Chat Modes**
   - Infrastructure ready (`ai/config.ts`)
   - Web Search mode (Exa integration) - not implemented
   - arXiv mode - not implemented
   - Code execution mode - not implemented

2. **AI Tools**
   - Registry exists (`lib/tools/registry.ts`)
   - No tools registered yet
   - Tool calling infrastructure ready in AI SDK

3. **AI Agents**
   - Not implemented
   - Would use tool calling infrastructure

4. **Advanced Features**
   - Conversation export
   - Message editing/deletion
   - Conversation folders/tags
   - Search within conversations

---

## 🎯 Next Steps (Your Agenda)

### Phase 1: Complete DB & Business Logic ✅

**Status:** Already complete! All database operations and business logic are implemented.

**What exists:**
- ✅ All 6 core tables + 2 guest tables
- ✅ All database functions (rate limiting, transfer, subscription)
- ✅ All server-side database operations
- ✅ All business logic services
- ✅ All API routes
- ✅ Rate limiting system
- ✅ Guest-to-user transfer
- ✅ Share conversation functionality

### Phase 2: Complete Feature Set (Next)

**To implement:**
1. Chat modes (web search, arXiv)
2. AI tools (web search tool, code execution tool, etc.)
3. AI agents (advanced tool calling)
4. Additional features (export, editing, etc.)

---

## 📚 Key Files Reference

### Database Schema
- `lib/supabase/schema.sql` - Base schema
- `lib/supabase/migration_*.sql` - Migration files

### Database Operations
- `lib/db/*.server.ts` - Server-side queries
- `lib/db/*.ts` - Client-side queries

### Business Logic
- `lib/services/` - All business logic services

### AI Integration
- `ai/models.ts` - Model definitions
- `ai/providers.ts` - Provider setup
- `ai/config.ts` - Chat mode config
- `lib/tools/registry.ts` - Tool registry

### API Routes
- `app/api/chat/route.ts` - Main chat endpoint
- `app/api/user/*` - User management
- `app/auth/callback/route.ts` - OAuth callback

---

## 🎉 Summary

**What's Done:**
- ✅ Complete UI/UX
- ✅ Complete authentication system
- ✅ Complete database schema (6 tables + 2 guest tables)
- ✅ Complete database operations (all CRUD operations)
- ✅ Complete business logic services
- ✅ Complete rate limiting system
- ✅ Complete guest support
- ✅ Complete sharing functionality
- ✅ Basic AI integration (routing, streaming)

**What's Next:**
- ⚠️ Chat modes (web search, arXiv)
- ⚠️ AI tools implementation
- ⚠️ AI agents
- ⚠️ Advanced features

**Conclusion:** The database and business logic layer is **100% complete**. You're ready to move on to implementing the feature set (chat modes, tools, agents).

---

## 🔍 Code Quality Notes

**Strengths:**
- ✅ Clean, modular architecture
- ✅ Feature-based organization
- ✅ TypeScript strict mode
- ✅ Proper error handling
- ✅ Comprehensive logging
- ✅ Security (RLS, validation, sanitization)
- ✅ Well-documented code

**Recent Refactoring:**
- Large files split into smaller modules
- Domain-specific database files
- Extracted hooks and utilities
- Better code organization

---

**Ready for Phase 2: Feature Implementation! 🚀**

