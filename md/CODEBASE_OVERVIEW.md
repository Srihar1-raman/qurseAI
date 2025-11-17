# Qurse Codebase Overview

## 📋 Current State Summary

This is a **ground-up rebuild** of Qurse, an AI chat application. The codebase is well-structured, follows modern Next.js patterns, and has a solid foundation in place.

---

## ✅ What's Complete

### 1. **UI & Frontend** ✅
- Modern, responsive UI with Tailwind CSS and shadcn/ui components
- Theme system (light/dark/auto) with proper SSR handling
- Homepage with model selector, search options, and input
- Conversation view with message rendering and markdown support
- Settings page (UI complete, backend TODOs remain)
- History sidebar for conversation management
- Navigation and routing system
- Error boundaries and loading states

### 2. **Authentication** ✅
- Supabase Auth integration (OAuth: GitHub, Google, Twitter/X)
- Auth callback handling
- Protected routes (settings page)
- User context (`AuthContext`) for client-side user state
- Server-side auth utilities (`auth-utils.ts`)
- Middleware for session refresh

### 3. **Database** ✅ (Minimal - 3 tables)
- **Schema**: `users`, `conversations`, `messages`
- RLS (Row Level Security) policies on all tables
- Indexes for performance
- Triggers for auto-updating timestamps
- Client-side queries (`lib/db/queries.ts`)
- Server-side queries (`lib/db/queries.server.ts`)
- Basic CRUD operations working

### 4. **AI Integration** ✅
- Multi-provider AI system (Groq, XAI, Anannas)
- Model configuration system (`ai/models.ts`)
- Provider abstraction (`ai/providers.ts`)
- Reasoning support with middleware
- Streaming responses with `createUIMessageStream`
- Chat mode system (`ai/config.ts`) - registry pattern
- Tool system infrastructure (`lib/tools/`) - ready for tools
- Model access control (auth checks, Pro checks infrastructure)

### 5. **API Routes** ✅
- `/api/chat` - Main streaming endpoint with:
  - Request validation (Zod)
  - Authentication checks
  - Model access control
  - Conversation/message persistence
  - Background title generation
  - Error handling
- `/api/conversation/[id]/messages` - Message pagination
- `/api/conversations/search` - Conversation search

### 6. **Architecture & Patterns** ✅
- Feature-based structure (following rules)
- TypeScript strict mode
- Error handling system (`lib/errors.ts`, `lib/utils/error-handler.ts`)
- Logging system (`lib/utils/logger.ts`)
- Validation with Zod (`lib/validation/chat-schema.ts`)
- Context providers for state management
- Custom hooks for common patterns

---

## ❌ What's Missing (From DB_AND_BUSINESS_LOGIC_PLAN.md)

### 1. **Database Schema Extensions**
- ❌ `user_preferences` table (theme, language, auto-save settings)
- ❌ `subscriptions` table (Pro/Premium plans)
- ❌ `rate_limits` table (usage tracking)
- ❌ `file_attachments` table (future - file uploads)

### 2. **Business Logic Services** (Not Yet Created)
- ❌ `lib/services/user-preferences.ts` - Preference management
- ❌ `lib/services/user-profile.ts` - Profile updates
- ❌ `lib/services/account-management.ts` - Account deletion, clear chats
- ❌ `lib/services/subscription.ts` - Subscription checks
- ❌ `lib/services/rate-limiting.ts` - Rate limit enforcement

### 3. **API Routes** (Not Yet Created)
- ❌ `/api/user/preferences` - GET/PUT user preferences
- ❌ `/api/user/profile` - GET/PUT user profile
- ❌ `/api/user/account` - DELETE account, clear conversations

### 4. **Settings Page Backend** (TODOs)
- ❌ Save preferences to database
- ❌ Update user profile (name, avatar)
- ❌ Delete account functionality
- ❌ Clear all conversations functionality

### 5. **Subscription System** (Infrastructure Only)
- ✅ Model config has `requiresPro` flags
- ✅ `auth-utils.ts` has `isProUser` field (currently always `false`)
- ❌ Actual subscription checking logic
- ❌ Subscription enforcement in API routes

### 6. **Rate Limiting** (Infrastructure Only)
- ✅ Model config has `freeUnlimited` flags
- ✅ `shouldBypassRateLimits()` function exists
- ❌ Actual rate limiting enforcement
- ❌ Rate limit tracking in database

### 7. **Tools** (Infrastructure Only)
- ✅ Tool registry system exists
- ✅ Chat modes can specify enabled tools
- ❌ No actual tools registered yet (web_search, etc.)

---

## 🏗️ Architecture Overview

### Folder Structure
```
qurse/
├── ai/                    # AI provider & model configuration
│   ├── config.ts         # Chat mode registry
│   ├── models.ts         # Model metadata & access control
│   └── providers.ts       # Provider abstraction
├── app/                   # Next.js App Router
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── (search)/         # Main chat interface
│   ├── api/              # API routes
│   ├── settings/         # Settings page
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── auth/            # Auth components
│   ├── chat/            # Chat UI components
│   ├── conversation/     # Conversation view
│   ├── homepage/        # Homepage components
│   ├── layout/          # Layout components
│   ├── settings/        # Settings components
│   └── ui/              # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Shared utilities & business logic
│   ├── contexts/        # React contexts (Auth, History, etc.)
│   ├── db/              # Database queries (client & server)
│   ├── supabase/        # Supabase client setup
│   ├── tools/           # AI tools registry
│   ├── utils/           # Utility functions
│   └── validation/      # Zod schemas
└── md/                   # Documentation
```

### Key Patterns

1. **Provider Pattern**: AI providers abstracted via `qurse` custom provider
2. **Registry Pattern**: Chat modes and tools use registries
3. **Service Layer**: Business logic separated (when implemented)
4. **Client/Server Split**: Separate query files for client vs server
5. **Error Handling**: Custom error classes with safe user messages
6. **Type Safety**: Strict TypeScript, Zod validation

---

## 🔑 Key Files to Understand

### Core AI System
- `ai/providers.ts` - Provider abstraction, model wrapping
- `ai/models.ts` - Model configuration, access control
- `ai/config.ts` - Chat mode registry
- `app/api/chat/route.ts` - Main streaming endpoint

### Database
- `lib/supabase/schema.sql` - Database schema (3 tables)
- `lib/db/queries.ts` - Client-side queries
- `lib/db/queries.server.ts` - Server-side queries

### Auth
- `lib/supabase/auth-utils.ts` - User fetching utilities
- `lib/contexts/AuthContext.tsx` - Client-side auth state
- `middleware.ts` - Session refresh

### UI
- `app/(search)/page.tsx` - Main homepage/conversation view
- `components/conversation/ConversationClient.tsx` - Chat interface
- `app/settings/SettingsPageClient.tsx` - Settings page

---

## 🎯 Next Steps (Priority Order)

Based on `DB_AND_BUSINESS_LOGIC_PLAN.md`:

### Phase 1: User Preferences (HIGH Priority)
1. Add `user_preferences` table to schema
2. Create query functions (client + server)
3. Create `/api/user/preferences` route
4. Create `lib/services/user-preferences.ts`
5. Wire up SettingsPageClient to save/load preferences

### Phase 2: User Profile (HIGH Priority)
1. Add profile update query functions
2. Create `/api/user/profile` route
3. Create `lib/services/user-profile.ts`
4. Wire up AccountSection component

### Phase 3: Account Management (HIGH Priority)
1. Add server-side account deletion queries
2. Create `/api/user/account` route
3. Create `lib/services/account-management.ts`
4. Wire up DeleteAccountModal and ClearChatsModal

### Phase 4: Subscriptions (MEDIUM Priority)
1. Add `subscriptions` table
2. Create subscription service
3. Update `auth-utils.ts` to check subscriptions
4. Enable Pro enforcement in API routes

### Phase 5: Rate Limiting (MEDIUM Priority)
1. Add `rate_limits` table
2. Create rate limiting service
3. Integrate into `/api/chat` route

---

## 📝 Code Quality Notes

### Strengths
- ✅ Clean, modular architecture
- ✅ Type-safe throughout
- ✅ Proper error handling
- ✅ Good separation of concerns
- ✅ Follows Next.js 15 best practices
- ✅ Performance optimizations (caching, parallel operations)

### Areas for Future Improvement
- ⚠️ Some TODOs in code (subscription checks, rate limiting)
- ⚠️ Settings page has placeholder logic
- ⚠️ Tool system ready but no tools implemented yet
- ⚠️ Chat modes defined but only 'chat' mode active

---

## 🔍 Comparison with Reference Projects

### vs. qurse-old
- ✅ Much cleaner architecture
- ✅ Better type safety
- ✅ Proper error handling
- ✅ Modern Next.js patterns
- ✅ No hacked-together logic

### vs. scira
- Similar structure and patterns
- Both use feature-based architecture
- Both use Supabase for auth/DB
- Both use AI SDK for streaming
- Qurse has more detailed model configuration
- Scira may have more complete business logic (to verify)

---

## 🚀 Ready to Proceed

The codebase is in excellent shape for implementing the missing business logic. The foundation is solid, patterns are established, and the infrastructure is ready.

**Recommended starting point**: Phase 1 (User Preferences) from the DB plan, as it's:
- High priority
- Most visible to users
- Establishes the service layer pattern
- Relatively straightforward

