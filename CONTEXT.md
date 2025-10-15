# QURSE - Development Context & Progress

**Last Updated:** October 15, 2025  
**Status:** ✅ Phase 3B Complete - Full AI-Backend Integration with UI Connected

---

## 📋 PROJECT OVERVIEW

### What is Qurse?
An AI-powered search and chat application, rebuilt from scratch with professional, scalable architecture.

### Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** TailwindCSS 4 + Modular CSS
- **AI SDK:** Vercel AI SDK v5
- **AI Providers:** Groq, xAI (Grok), Anannas (via OpenAI-compatible wrapper)
- **Auth:** Supabase Auth (OAuth: GitHub, Google, Twitter/X)
- **Database:** Supabase PostgreSQL with RLS

### Reference Projects
- **qurse-old** (`/Users/sri/Desktop/qurse-old/`) - Original messy codebase with Supabase
- **Scira** (`/Users/sri/Desktop/scira/`) - Reference project with professional architecture

---

## 🎯 COMPLETED PHASES

### Phase 1: UI & Codebase Structure ✅ COMPLETE

#### What Was Built:
**Pages (2 UI States: Guest + Logged-in):**
- ✅ Homepage (`/`) - Hero, model selector, web search, main input
- ✅ Dynamic Conversation (`/conversation/[id]`) - Chat interface with streaming
- ✅ Login (`/login`) - OAuth with GitHub, Google, Twitter/X
- ✅ Signup (`/signup`) - Registration page
- ✅ Settings (`/settings`) - Account, general, payment, system sections
- ✅ Info (`/info`) - About, terms, privacy, cookies

**Components:**
- ✅ Header (with user dropdown, theme selector, loading skeleton)
- ✅ Footer
- ✅ History Sidebar (real database integration, loading states)
- ✅ Chat Message (with markdown rendering, copy)
- ✅ Model Selector (with search and auth filtering)
- ✅ Web Search Selector
- ✅ Auth Buttons (GitHub, Google, Twitter)
- ✅ Loading Skeletons (message, conversation, text variants)
- ✅ Error Message Component (with retry functionality)

---

### Phase 2: Supabase Auth + Database ✅ COMPLETE

#### Architecture:
**Files:**
- `lib/supabase/client.ts` - Browser client (SSR-compatible)
- `lib/supabase/server.ts` - Server client (cookies-based)
- `lib/supabase/schema.sql` - Database schema (users, conversations, messages)
- `lib/contexts/AuthContext.tsx` - Global auth state management
- `lib/db/queries.ts` - Database query helpers
- `app/auth/callback/route.ts` - OAuth callback handler
- `middleware.ts` - Session refresh + auth redirects

**Features:**
✅ OAuth login (GitHub, Google, Twitter/X)
✅ Automatic user profile creation
✅ Session management (no race conditions)
✅ Protected routes (redirect logged-in users from auth pages)
✅ Linked accounts display (shows all connected OAuth providers)
✅ Profile image support (Twitter, GitHub, Google avatars)
✅ Sign-out functionality (header dropdown + settings page)
✅ Loading states to prevent UI flash
✅ Graceful handling of missing environment variables

**Database Schema:**
- `users` table: id, email, name, avatar_url, created_at, updated_at
- `conversations` table: id, user_id, title, created_at, updated_at, message_count
- `messages` table: id, conversation_id, role, content, created_at
- RLS policies: Users can only access their own data
- Indexes: Optimized for conversation and message queries

---

### Phase 3A: AI Backend Core ✅ COMPLETE

#### Architecture:

**Provider Abstraction (`ai/providers.ts`):**
- Uses Vercel AI SDK's `customProvider` to unify multiple providers
- Groq: For GPT OSS 120B (fast, free, reasoning)
- xAI: For Grok 3 Mini (smart, pro-tier, requires auth)
- Anannas: For Kimi K2 (free, fast, via OpenAI-compatible wrapper)

**Model Configuration (`ai/models.ts`):**
- Centralized model metadata (capabilities, access control, parameters)
- Helper functions: `getModelConfig`, `canUseModel`, `requiresAuthentication`, etc.
- Access control: Free/Pro/Auth-required tiers
- Future-proof: Easy to add new models and providers

**Chat Mode System (`ai/config.ts`):**
- Registry pattern for extensible chat modes
- Default mode: `chat` (general conversation)
- Future modes: `web`, `arxiv`, `deep-search` (placeholders)
- Each mode: system prompt, enabled tools, default model

**Tool Registry (`lib/tools/registry.ts`):**
- Centralized tool registration system
- Tools can be reused across chat modes
- Future: web search, arXiv search, image generation, etc.

**API Route (`app/api/chat/route.ts`):**
- ✅ Authentication check (guest vs logged-in)
- ✅ Model access control (free vs auth-required)
- ✅ Conversation creation/management
- ✅ Message persistence (user + assistant)
- ✅ AI streaming response
- ✅ Error handling (API key errors, rate limits)
- ✅ Header: `X-Conversation-ID` for frontend redirection

**Models Implemented:**
1. **GPT OSS 120B** (Groq)
   - Provider: `groq`
   - Free, fast, reasoning, structured output
   - Context: 131K tokens, Output: 65K tokens
   - No auth required

2. **Grok 3 Mini** (xAI)
   - Provider: `xai`
   - Smart, logic-based, reasoning
   - Context: 131K tokens, Output: 16K tokens
   - Requires auth (Pro in future)

3. **Kimi K2** (Moonshot AI via Anannas)
   - Provider: `anannas`
   - Free, fast, 32B MoE model
   - Context: 131K tokens, Output: 4K tokens
   - No auth required

---

### Phase 3B: UI-Backend Integration ✅ COMPLETE

#### What Was Built:

**Context Management:**
- `lib/contexts/ConversationContext.tsx` - Shares selected model and chat mode across components
- `app/(search)/layout.tsx` - Wraps search routes with ConversationProvider

**Homepage Integration (`components/homepage/MainInput.tsx`):**
- ✅ Sends first prompt to `/api/chat`
- ✅ Extracts conversation ID from response header
- ✅ Redirects to `/conversation/[id]`
- ✅ Loading states (spinner on send button)
- ✅ Error handling (logs errors, resets loading state)

**Conversation Page (`app/(search)/conversation/[id]/page.tsx`):**
- ✅ Dynamic route with conversation ID
- ✅ Loads existing messages from database
- ✅ Displays message history
- ✅ Sends follow-up messages to API
- ✅ Streams AI responses in real-time
- ✅ Manual stream parsing (ReadableStream + TextDecoder)
- ✅ Auto-scroll to bottom
- ✅ Loading indicator ("Thinking...")
- ✅ Works for both guest and logged-in users

**History Sidebar (`components/layout/history/HistorySidebar.tsx`):**
- ✅ Loads real conversations from database
- ✅ Displays conversations grouped by date (Today, Last 7 days, etc.)
- ✅ Guest state: "Sign in to view history" with login link
- ✅ Empty state: "No conversations yet" for logged-in users
- ✅ Loading skeleton while fetching
- ✅ Error state with retry button
- ✅ Rename conversation (updates database)
- ✅ Delete conversation (removes from database)
- ✅ Clear all history (deletes all user conversations)
- ✅ Search functionality

**Loading & Error Components:**
- `components/ui/LoadingSkeleton.tsx` - Variants: message, conversation, text
- `components/ui/ErrorMessage.tsx` - Displays errors with optional retry

**Model Selector (Future Enhancement):**
- Currently shows models from `constants.ts` (placeholder)
- Future: Will use `ai/models.ts` for auth-based filtering

---

## 🏗️ FILE STRUCTURE

```
qurse/
├── app/
│   ├── (auth)/              # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── (search)/            # Search/Chat route group
│   │   ├── page.tsx         # Homepage
│   │   ├── conversation/
│   │   │   └── [id]/        # Dynamic conversation route
│   │   │       └── page.tsx
│   │   └── layout.tsx       # ConversationProvider wrapper
│   ├── api/
│   │   └── chat/
│   │       └── route.ts     # AI streaming endpoint
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts     # OAuth callback
│   ├── info/
│   ├── settings/
│   ├── globals.css          # 24 lines (imports only)
│   └── layout.tsx           # Root layout (ThemeProvider, AuthProvider)
├── ai/
│   ├── providers.ts         # AI provider abstraction (Groq, xAI, Anannas)
│   ├── models.ts            # Model configurations & metadata
│   └── config.ts            # Chat mode registry
├── components/
│   ├── auth/
│   │   └── AuthButton.tsx
│   ├── chat/
│   │   ├── ChatMessage.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── homepage/
│   │   ├── MainInput.tsx    # Sends to API, redirects to conversation
│   │   ├── ModelSelector.tsx
│   │   └── WebSearchSelector.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── history/
│   │       ├── HistorySidebar.tsx    # Real DB integration
│   │       ├── ConversationList.tsx
│   │       └── ...
│   ├── settings/
│   │   ├── AccountSection.tsx
│   │   ├── GeneralSection.tsx
│   │   ├── PaymentSection.tsx
│   │   ├── SystemSection.tsx
│   │   ├── DeleteAccountModal.tsx
│   │   └── ClearChatsModal.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── dropdown.tsx
│       ├── LoadingSkeleton.tsx       # NEW
│       └── ErrorMessage.tsx          # NEW
├── lib/
│   ├── contexts/
│   │   ├── AuthContext.tsx           # Global auth state
│   │   └── ConversationContext.tsx   # Model/mode state (NEW)
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── schema.sql                # DB schema
│   ├── db/
│   │   └── queries.ts                # DB helper functions
│   ├── tools/
│   │   ├── registry.ts               # Tool registry system
│   │   └── index.ts
│   ├── constants.ts
│   ├── icon-utils.ts
│   ├── types.ts                      # Centralized types
│   ├── utils.ts
│   ├── theme-provider.tsx
│   └── ThemeContext.tsx
├── styles/
│   ├── base.css
│   ├── layout.css
│   ├── animations.css                # Includes skeleton animations
│   └── components/
│       ├── auth.css
│       ├── info.css
│       ├── conversation.css
│       ├── history.css
│       └── settings.css
├── middleware.ts                     # Session refresh + redirects
├── next.config.ts                    # Image hostnames configured
├── package.json
└── .env.local                        # Supabase + AI provider keys
```

---

## 🔐 ENVIRONMENT VARIABLES

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI Providers
GROQ_API_KEY=xxx          # For GPT OSS 120B
XAI_API_KEY=xxx           # For Grok 3 Mini
ANANNAS_API_KEY=xxx       # For Kimi K2
```

---

## 🚀 CURRENT CAPABILITIES

### What Works Right Now:

1. **Homepage Flow:**
   - User types a message
   - Selects a model (from context)
   - Clicks send
   - → API creates conversation
   - → Redirects to `/conversation/[id]`

2. **Conversation Flow:**
   - Page loads existing messages from database
   - User sees conversation history
   - User types follow-up message
   - → AI response streams in real-time
   - → Messages saved to database (if logged in)

3. **History Sidebar:**
   - Opens with history button in header
   - Loads all user conversations
   - Grouped by date (Today, Last 7 days, etc.)
   - Click conversation → Navigate to `/conversation/[id]`
   - Rename/Delete conversations
   - Clear all history

4. **Authentication:**
   - Sign in with GitHub, Google, or Twitter/X
   - Profile displays in header
   - Conversations saved to database
   - Sign out functionality
   - Guest users: Can chat but history not saved

5. **AI Streaming:**
   - Groq GPT OSS 120B (default, free)
   - Grok 3 Mini (requires auth)
   - Kimi K2 (free, fast)
   - Real-time streaming response
   - Model-specific system prompts

---

## 🛠️ NEXT STEPS (Future Enhancements)

### Phase 4: Advanced AI Features (Future)

#### Chat Modes:
- [ ] Web Search mode (Exa/Tavily integration)
- [ ] arXiv mode (academic paper search)
- [ ] Deep Search mode (multi-step reasoning)
- [ ] Code mode (specialized for coding tasks)

#### Tools:
- [ ] Web search tool
- [ ] arXiv search tool
- [ ] Image generation tool
- [ ] PDF/document upload tool
- [ ] Code execution tool
- [ ] Calculator tool

#### Model Selector:
- [ ] Replace MODEL_GROUPS from constants.ts with ai/models.ts
- [ ] Show auth-required badge for protected models
- [ ] Show Pro badge for premium models
- [ ] Filter models based on user auth status
- [ ] Group by category (Free, Pro, Premium)

#### Business Logic:
- [ ] Rate limiting (guest vs free vs pro users)
- [ ] Pro subscription logic (check `isPro` status)
- [ ] Usage tracking and limits
- [ ] Cost attribution per model
- [ ] Analytics and monitoring

#### Performance:
- [ ] Message pagination (load older messages on scroll)
- [ ] Conversation search
- [ ] Message caching
- [ ] Optimistic UI updates
- [ ] Conversation previews in history

#### Polish:
- [ ] Redo message functionality
- [ ] Edit user messages
- [ ] Regenerate AI responses
- [ ] Copy conversation as markdown
- [ ] Export conversation
- [ ] Share conversation (public links)
- [ ] Conversation branching
- [ ] Message reactions/feedback

---

## ⚙️ HOW TO USE

### Development:
```bash
pnpm run dev
# Runs on http://localhost:3000 (or next available port)
```

### Testing AI Chat:
1. Visit homepage: `http://localhost:3000`
2. Type a message
3. Click send
4. → Redirects to `/conversation/[id]`
5. → AI response streams in
6. → Type follow-up questions

### Testing as Guest:
- Chat works without signing in
- Conversations not saved
- History sidebar shows "Sign in to view history"

### Testing as Logged-in User:
- Sign in with GitHub/Google/Twitter
- Conversations saved automatically
- History sidebar shows all conversations
- Rename/delete conversations
- Clear all history

---

## 🐛 KNOWN ISSUES & NOTES

### Fixed Issues:
- ✅ Twitter image hostname error (added to next.config.ts)
- ✅ UI flash on page load (loading skeleton in Header)
- ✅ Sign-out in dropdown not working (removed `await` keyword)
- ✅ Linked accounts only showing one provider (fetch from `auth.identities`)
- ✅ Qurse logo font on auth pages (added `font-reenie` class)
- ✅ Mock data in history sidebar (replaced with real DB calls)
- ✅ Static conversation page (moved to dynamic `[id]` route)
- ✅ AI SDK `useChat` not available (implemented manual streaming)

### Current Limitations:
- Model switching mid-conversation not yet implemented
- Web Search/arXiv modes are UI-only (no backend logic yet)
- File upload button is placeholder
- Pro subscription checks are commented out (future)

### Development Notes:
- ENOENT errors in dev server are Next.js/Turbopack HMR quirks (ignore)
- Supabase environment variables must be set in `.env.local`
- AI provider keys must be valid for models to work
- Guest users can't see conversation history (by design)

---

## 📚 REFERENCE DOCS

### Supabase Setup:
See `SUPABASE_SETUP.md` for detailed setup instructions.

### Auth Implementation:
See `AUTH_IMPLEMENTATION_SUMMARY.md` for architecture overview.

### AI Backend:
See `supabase-auth-implementation.plan.md` for Phase 3 implementation details.

---

## 🎉 ACHIEVEMENTS

### What's Different from `qurse-old`:
✅ **No race conditions** - Proper async/await flow
✅ **No session issues** - SSR-compatible Supabase clients
✅ **Fast history loading** - Optimized queries with indexes
✅ **Clean auth flow** - No confusion about login state
✅ **Professional structure** - Modular, scalable, maintainable
✅ **Type-safe** - Centralized types, no `any`
✅ **No inline styles** - Modular CSS
✅ **No mock data** - Real database integration
✅ **Proper error handling** - Loading states, error messages
✅ **Extensible AI system** - Easy to add providers/models/tools

### What's Better than `Scira`:
✅ **AI streaming** - Real-time response streaming
✅ **Multi-provider support** - Groq, xAI, Anannas (easily extensible)
✅ **Chat mode system** - Flexible, registry-based
✅ **Tool registry** - Reusable tools across modes

---

## 💡 PRINCIPLES & PATTERNS

### Core Principles:
1. **Separation of Concerns** - UI, business logic, data access are separate
2. **DRY (Don't Repeat Yourself)** - Shared utilities, centralized types
3. **Type Safety** - TypeScript strict mode, no `any`
4. **Extensibility** - Easy to add models, providers, tools, modes
5. **Professional Standards** - Like Scira, but better for AI

### Patterns Used:
- **Context API** - Global state (auth, conversation)
- **Registry Pattern** - Chat modes, tools
- **Provider Pattern** - AI provider abstraction
- **Composition** - Small, reusable components
- **SSR-Compatible** - Server/client Supabase clients
- **Error Boundaries** - Graceful error handling

---

**End of Context Document**
