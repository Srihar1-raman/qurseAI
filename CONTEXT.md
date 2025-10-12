# QURSE - Development Context & Progress

**Last Updated:** October 11, 2025  
**Status:** ✅ UI Complete & Refactored | Ready for Auth/Backend/AI Implementation

---

## 📋 PROJECT OVERVIEW

### What is Qurse?
An AI-powered search and chat application, rebuilt from scratch with professional, scalable architecture.

### Tech Stack
- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** TailwindCSS 4 + Modular CSS
- **AI SDK:** Vercel AI SDK (to be integrated)
- **Auth:** Supabase
- **Database:** Supabase

### Reference Projects
- **qurse-old** (`/Users/sri/Desktop/qurse-old/`) - Original messy codebase with Supabase
- **Scira** (`/Users/sri/Desktop/scira/`) - Reference project with professional architecture (Better-auth + Drizzle)

---

## 🎯 OBJECTIVES & GOALS ACHIEVED

### Phase 1: UI & Codebase Structure ✅ COMPLETE

#### Goals:
1. ✅ Build modern, responsive UI for all pages
2. ✅ Create professional, scalable codebase structure
3. ✅ Follow Scira's architectural patterns
4. ✅ Eliminate technical debt from qurse-old
5. ✅ Prepare for seamless backend integration

#### What Was Built:

**Pages (2 UI States: Guest + Logged-in):**
- ✅ Homepage (`/`) - Hero, model selector, web search, main input
- ✅ Conversation (`/conversation`) - Chat interface, message display, input area
- ✅ Login (`/login`) - Auth page with social providers
- ✅ Signup (`/signup`) - Registration page
- ✅ Settings (`/settings`) - Account, general, payment, system sections
- ✅ Info (`/info`) - About, terms, privacy, cookies

**Components:**
- ✅ Header (with user dropdown, theme selector)
- ✅ Footer
- ✅ History Sidebar (conversation management)
- ✅ Chat Message (with markdown rendering, copy, redo)
- ✅ Model Selector (with search)
- ✅ Web Search Selector
- ✅ Auth Buttons (GitHub, Google, Twitter)
- ✅ Modals (Delete Account, Clear Chats)

---

## 🏗️ ARCHITECTURAL IMPROVEMENTS

### 1. CSS
```
app/globals.css (24 lines - imports only) ✅
styles/
  ├── base.css (88 lines - CSS variables, resets)
  ├── layout.css (layout utilities)
  ├── animations.css (keyframes)
  └── components/
      ├── auth.css (198 lines)
      ├── info.css
      ├── conversation.css (646 lines)
      ├── history.css
      └── settings.css (654 lines)
```

**Result:** Modular, maintainable CSS with no inline styles.

---


### 2. Type System ✅


**Centralized Types:**
- User & Authentication (`User`, `UserPreferences`, `UserStats`)
- Conversations & Messages (`Message`, `Conversation`, `ConversationGroup`)
- Models & AI (`Model`, `ModelGroup`, `SearchOption`)
- UI Component Props (all prop interfaces)
- Settings Types (`AccountSectionProps`, `GeneralSectionProps`, etc.)
- Theme Types (`Theme`, `ResolvedTheme`)
- Utility Types (`SaveStatus`, `LoadingState`)

**Result:** Type-safe, DRY, no duplicate interfaces.

---

### 3. Route Organization ✅

```
app/
├── (auth)/              ← Auth route group
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (search)/            ← Search/AI route group
│   ├── page.tsx         (homepage)
│   └── conversation/page.tsx
├── info/page.tsx        ← Standalone pages
├── settings/page.tsx
├── layout.tsx
└── globals.css
```

**Result:** Professional Next.js route groups, organized by feature.

---

### 5. State Management ✅

**Created:** `/lib/contexts/AuthContext.tsx`
```typescript
// One place, used everywhere ✅
const { user, isAuthenticated, signOut } = useAuth();
```

**Benefits:**
- Single source of truth
- Type-safe context
- Easy to swap with real auth Supabase
- No refactoring needed when adding real auth

---

### 6. Code Quality ✅

**Eliminated Duplication:**
- ✅ Mock user data (now in AuthContext)
- ✅ Icon utility functions (consolidated in `icon-utils.ts`)
- ✅ Type definitions (centralized in `types.ts`)


## 📁 CURRENT FOLDER STRUCTURE

```
qurse/
├── app/
│   ├── (auth)/                    ← Auth pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (search)/                  ← Search/AI pages
│   │   ├── page.tsx              (homepage)
│   │   └── conversation/page.tsx
│   ├── info/page.tsx
│   ├── settings/page.tsx
│   ├── layout.tsx
│   ├── globals.css               (24 lines - imports only)
│   └── favicon.ico
├── components/
│   ├── auth/
│   │   └── AuthButton.tsx
│   ├── chat/
│   │   ├── ChatMessage.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── homepage/
│   │   ├── DeepSearchButton.tsx
│   │   ├── Hero.tsx
│   │   ├── MainInput.tsx
│   │   ├── ModelSelector.tsx
│   │   └── WebSearchSelector.tsx
│   ├── layout/
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   └── history/
│   │       ├── ClearHistoryModal.tsx
│   │       ├── ConversationItem.tsx
│   │       ├── ConversationList.tsx
│   │       ├── HistoryHeader.tsx
│   │       ├── HistorySearch.tsx
│   │       └── HistorySidebar.tsx
│   ├── settings/
│   │   ├── AccountSection.tsx
│   │   ├── ClearChatsModal.tsx
│   │   ├── DeleteAccountModal.tsx
│   │   ├── GeneralSection.tsx
│   │   ├── PaymentSection.tsx
│   │   └── SystemSection.tsx
│   └── ui/
│       ├── button.tsx
│       ├── dropdown.tsx
│       └── input.tsx
├── lib/
│   ├── contexts/
│   │   └── AuthContext.tsx       ← User state management
│   ├── constants.ts              (Model configs, web search options)
│   ├── icon-utils.ts             (Theme-aware icon loading)
│   ├── theme-provider.tsx        (Theme management)
│   ├── ThemeContext.tsx
│   ├── types.ts                  ← Centralized types (190 lines)
│   └── utils.ts                  (cn utility)
├── styles/
│   ├── base.css
│   ├── layout.css
│   ├── animations.css
│   └── components/
│       ├── auth.css
│       ├── conversation.css
│       ├── history.css
│       ├── info.css
│       └── settings.css
├── public/
│   ├── icon/                     (Dark theme icons)
│   ├── icon_light/               (Light theme icons)
│   └── images/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## ⏳ INTENTIONALLY NOT CREATED (Will add during backend phase)

### 1. `/app/api/` folder
**Why not yet:** No API routes to write without backend logic  
**When to create:** When implementing first API endpoint (likely `/api/chat` for AI)

### 2. `/app/actions.ts` (Server Actions)
**Why not yet:** Server actions need database/auth/AI clients  
**When to create:** When implementing first server action (likely auth or save conversation)

### 3. `/hooks/` folder
**Why not yet:** Avoid premature abstraction, hooks emerge naturally  
**When to create:** After noticing 3+ repeated patterns (e.g., `useChat`, `useAPI`)

---

## 🎨 UI FEATURES & STATES

### Two UI States Implemented:
1. **Guest/Anonymous User** - See UI without login
2. **Logged-in User** - Full features with mock user data

### What's Ready (Visual Only, No Backend):
- ✅ Chat interface with message history
- ✅ Model selector with search
- ✅ Web search options (Chat, Web, arxiv)
- ✅ Deep search toggle
- ✅ History sidebar with conversation management
- ✅ Settings page (Account, General, Payment, System)
- ✅ Theme switcher (Light/Dark/Auto)
- ✅ Responsive design (Mobile + Desktop)

### What's Pending (Will add during AI phase):
- ⏳ Sources tab (for web search results)
- ⏳ Reasoning display (for reasoning models)
- ⏳ Loading animations (for streaming responses)
- ⏳ Tool usage UI (for AI tools/functions)
- ⏳ File attachments
- ⏳ Image support

---

## 🔑 KEY PATTERNS & PRINCIPLES

### 1. Component Size
**Rule:** Keep components under 250 lines  
**Solution:** Break into smaller, focused components

### 2. CSS Organization
**Rule:** No inline styles, use CSS classes  
**Solution:** Modular CSS files in `/styles/components/`

### 3. Type Safety
**Rule:** All props/state should have TypeScript types  
**Solution:** Import from centralized `/lib/types.ts`

### 4. State Management
**Rule:** No duplicate state/data across files  
**Solution:** Use React Context for shared state

### 5. Route Organization
**Rule:** Group related routes together  
**Solution:** Use Next.js route groups `(auth)`, `(search)`

### 6. DRY Principle
**Rule:** Don't Repeat Yourself  
**Solution:** Extract utilities, create contexts, centralize types

---

## 🚀 NEXT OBJECTIVES (In Order)

### Phase 2: Authentication (NEXT)
**Goal:** Implement user authentication system

**Options:**
1. **Better-auth** (like Scira) - Modern, type-safe, flexible
2. **Supabase Auth** (like qurse-old) - All-in-one, faster setup

**Tasks:**
- [ ] Choose auth provider (Better-auth vs Supabase)
- [ ] Install dependencies
- [ ] Set up auth configuration
- [ ] Create `/app/api/auth/` routes
- [ ] Update `AuthContext.tsx` to use real auth
- [ ] Add sign-in/sign-out logic
- [ ] Test auth flow

**Files to Update:**
- `/lib/contexts/AuthContext.tsx` - Replace mock user with real auth
- `/app/(auth)/login/page.tsx` - Wire up auth buttons
- `/app/(auth)/signup/page.tsx` - Wire up auth buttons

---

### Phase 3: Database Setup
**Goal:** Set up database for conversations, messages, user data

**Options:**
1. **Drizzle + PostgreSQL** (like Scira) - More control, type-safe
2. **Supabase** (like qurse-old) - Easier, includes auth

**Tasks:**
- [ ] Choose database solution
- [ ] Set up database schema
- [ ] Create migrations
- [ ] Set up database queries/mutations

**Schema Needed:**
- Users (or use auth provider's schema)
- Conversations
- Messages
- Files (for attachments)

---

### Phase 4: AI Integration
**Goal:** Connect to AI models and implement chat functionality

**Tasks:**
- [ ] Install Vercel AI SDK packages
- [ ] Create `/app/api/chat/route.ts`
- [ ] Implement streaming responses
- [ ] Add model switching
- [ ] Add web search integration (Exa/Tavily)
- [ ] Add reasoning model support
- [ ] Create `useChat` hook

**Files to Create:**
- `/app/api/chat/route.ts` - Main AI endpoint
- `/hooks/useChat.ts` - Chat state management
- `/lib/ai/` - AI utilities and tools

---

### Phase 5: Backend API & Server Actions
**Goal:** Implement server-side logic for data operations

**Tasks:**
- [ ] Create `/app/actions.ts`
- [ ] Implement conversation CRUD
- [ ] Implement message saving
- [ ] Add user settings persistence
- [ ] Add file upload handling

---

### Phase 6: Advanced Features
**Goal:** Add remaining UI features and polish

**Tasks:**
- [ ] Sources tab UI
- [ ] Reasoning display
- [ ] Loading animations
- [ ] Tool usage display
- [ ] File attachments
- [ ] Image support
- [ ] Real-time features (if needed)

---

## 📝 IMPORTANT NOTES

### About Turbopack ENOENT Errors
**Issue:** You may see ENOENT errors in dev mode like:
```
ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp...'
```
**Solution:** These are known Next.js/Turbopack development quirks and NOT critical.  
**Fix (if annoying):** `rm -rf .next && pnpm run dev`

### About Mock Data
**Current State:** All pages use mock data from `AuthContext`  
**Important:** When adding real auth, ONLY update `AuthContext.tsx` - pages don't need changes!

### About Route Groups
**Pattern:** `(auth)` and `(search)` folders don't affect URLs  
**Example:** `/app/(auth)/login/page.tsx` → URL is `/login` (not `/auth/login`)

### About CSS Modules
**Pattern:** Component-specific styles in `/styles/components/`  
**Example:** Settings styles → `/styles/components/settings.css`

### About Types
**Pattern:** Always import types from `/lib/types.ts`  
**Example:** `import type { User, Message } from '@/lib/types';`

---

## 🔍 OBSERVATIONS & LEARNINGS

### What Worked Well:
1. ✅ Breaking down large components immediately improved maintainability
2. ✅ Route groups made the structure instantly more professional
3. ✅ Centralized types caught many potential bugs early
4. ✅ AuthContext pattern will make real auth integration seamless
5. ✅ Modular CSS is much easier to navigate and update

### What to Watch Out For:
1. ⚠️ Don't create server actions (`/app/actions.ts`) until you have backend to connect to
2. ⚠️ Don't create custom hooks (`/hooks/`) until patterns repeat 3+ times
3. ⚠️ Keep components under 250 lines - refactor if they grow larger
4. ⚠️ Always run build after major changes to catch type/import errors
5. ⚠️ Test both light and dark themes for new UI components

### Code Quality Checklist:
- [ ] No inline styles (use CSS classes)
- [ ] No duplicate types (import from `types.ts`)
- [ ] No duplicate state (use contexts)
- [ ] Components < 250 lines
- [ ] All types properly defined
- [ ] Build passes with no errors

---

## 📚 REFERENCE IMPLEMENTATIONS

### Check Scira for:
- Better-auth setup (`/Users/sri/Desktop/scira/lib/auth.ts`)
- Drizzle schema (`/Users/sri/Desktop/scira/drizzle/schema.ts`)
- AI chat API route (`/Users/sri/Desktop/scira/app/api/chat/route.ts`)
- useChat hook pattern (`/Users/sri/Desktop/scira/app/(search)/page.tsx`)
- Database queries (`/Users/sri/Desktop/scira/lib/db/`)

### Check qurse-old for:
- Supabase setup (`/Users/sri/Desktop/qurse-old/lib/auth.ts`)
- Database schema (`/Users/sri/Desktop/qurse-old/SUPABASE_SETUP_PRODUCTION.md`)
- AI service pattern (`/Users/sri/Desktop/qurse-old/lib/ai-service.ts`)
- API routes (`/Users/sri/Desktop/qurse-old/app/api/`)

---

## 🎯 SUCCESS METRICS

### Current Build Stats:
```
✓ Compiled successfully in 2000ms
✓ Linting and checking validity of types
✓ All 7 routes building correctly
✓ Zero ESLint errors
✓ Zero TypeScript errors

Route (app)                                 Size  First Load JS
┌ ○ /                                    7.94 kB         131 kB
├ ○ /_not-found                            984 B         103 kB
├ ○ /conversation                         322 kB         446 kB
├ ○ /info                                   3 kB         126 kB
├ ○ /login                               1.93 kB         112 kB
├ ○ /settings                            4.19 kB         128 kB
└ ○ /signup                              1.93 kB         112 kB
```

### Code Quality Achieved:
- ✅ Modular CSS (7 files vs 1 monolithic)
- ✅ Small components (all <250 lines)
- ✅ Type-safe (centralized types)
- ✅ DRY (no duplication)
- ✅ Organized (route groups, proper folders)
- ✅ Scalable (ready for backend)

---

## 💡 QUICK START FOR NEW CHAT

When starting a new chat session, you should know:

1. **✅ UI Complete** - Modern, responsive, professional
2. **✅ Auth Complete** - Supabase OAuth (GitHub, Google, Twitter) fully implemented
3. **✅ Database Ready** - Minimal schema (users, conversations, messages) with RLS
4. **🎯 Next Step: AI Integration** - Connect Vercel AI SDK, implement chat functionality
5. **Reference projects available** - Scira and qurse-old in Desktop folder
6. **All types centralized** - Import from `/lib/types.ts`
7. **Auth is real** - No more mock data, AuthContext manages sessions

**Commands to run:**
```bash
cd /Users/sri/Desktop/qurse
pnpm run dev          # Start dev server
pnpm run build        # Test build
```

**Important Files:**
- `lib/supabase/schema.sql` - Database schema
- `lib/contexts/AuthContext.tsx` - Auth state management
- `lib/db/queries.ts` - Database helpers
- `SUPABASE_SETUP.md` - Setup guide

---

## 🔐 PHASE 2: AUTHENTICATION & DATABASE ✅ COMPLETE

### Implementation Date: October 12, 2025

### Overview
Implemented professional Supabase authentication with minimal, scalable database schema. Follows Scira's lean architecture pattern - no over-engineering, just core functionality.

### Database Schema (Minimal - 3 Tables)

```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ
)
```

**Key Features:**
- ✅ Row Level Security (RLS) enabled
- ✅ Automatic timestamp updates via triggers
- ✅ Cascade deletes (deleting conversation deletes messages)
- ✅ Helper functions (get_conversations_with_message_count)
- ✅ Indexed for performance

**What We Didn't Include (Yet):**
- ⏸️ Files table (add when implementing file uploads)
- ⏸️ Usage tracking (add when implementing rate limits)
- ⏸️ Organizations/teams (add when needed)
- ⏸️ API keys, audit logs, etc. (enterprise features for later)

### Auth Architecture

**File Structure:**
```
lib/
├── supabase/
│   ├── schema.sql          # Database schema (180 lines)
│   ├── client.ts           # Browser Supabase client
│   └── server.ts           # Server Supabase client (SSR)
├── contexts/
│   └── AuthContext.tsx     # Auth state management (145 lines)
└── db/
    └── queries.ts          # Database query helpers (173 lines)

app/
└── auth/
    └── callback/
        └── route.ts        # OAuth callback handler

middleware.ts               # Session refresh middleware
```

**How It Works:**

1. **Browser Client** (`lib/supabase/client.ts`)
   - Used in Client Components
   - Handles client-side auth operations
   - Uses `@supabase/ssr` for cookie management

2. **Server Client** (`lib/supabase/server.ts`)
   - Used in Server Components, Server Actions, Route Handlers
   - Properly handles SSR with Next.js cookies
   - Prevents auth state mismatches

3. **Auth Context** (`lib/contexts/AuthContext.tsx`)
   - Single source of truth for auth state
   - Initializes session on mount
   - Listens to auth state changes (prevents race conditions)
   - Provides user data globally via React Context
   - Includes loading states for better UX

4. **OAuth Flow:**
   ```
   User clicks "Sign in" 
   → Redirected to provider (GitHub/Google/Twitter)
   → Provider redirects to /auth/callback
   → Callback exchanges code for session
   → User profile created in database
   → Redirected to homepage
   → AuthContext updates with user data
   ```

5. **Middleware** (`middleware.ts`)
   - Runs on every request
   - Refreshes expired sessions automatically
   - Ensures Server Components have fresh auth state
   - Optional: Can protect routes (commented out for now)

### Database Query Helpers

Created clean abstraction layer in `lib/db/queries.ts`:

```typescript
// Conversations
getConversations(userId)
createConversation(userId, title)
updateConversation(conversationId, updates)
deleteConversation(conversationId)
deleteAllConversations(userId)

// Messages
getMessages(conversationId)
createMessage(conversationId, content, role)
```

**Benefits:**
- Cleaner component code
- Consistent error handling
- Easy to mock for testing
- Centralized query logic

### OAuth Providers Configured

- ✅ GitHub (Primary)
- ✅ Google
- ✅ Twitter/X

All providers redirect to `/auth/callback` which handles user creation and session setup.

### Key Improvements Over qurse-old

**qurse-old Problems:**
- ❌ Multiple auth state sources (race conditions)
- ❌ No session caching (slow loading)
- ❌ Mixed client/server auth logic
- ❌ Over-engineered schema (12+ tables)
- ❌ No proper error handling
- ❌ Session sync issues

**New Implementation:**
- ✅ Single auth state source (AuthContext)
- ✅ Proper session management with middleware
- ✅ Clean client/server separation
- ✅ Minimal schema (3 tables, extensible)
- ✅ Comprehensive error handling
- ✅ No race conditions

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Optional (for AI integration later):
```bash
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_GENERATIVE_AI_API_KEY=your-key
GROQ_API_KEY=your-key
```

### Testing Checklist

Before moving to AI integration:
- ✅ OAuth login works for all providers
- ✅ User profile created in database
- ✅ Session persists across page refreshes
- ✅ Sign out clears session properly
- ✅ Auth state updates in real-time
- ✅ No race conditions or sync issues
- ✅ RLS policies protect user data
- ✅ Middleware refreshes sessions

### Documentation

Created comprehensive setup guide: `SUPABASE_SETUP.md`
- Step-by-step Supabase project setup
- OAuth provider configuration
- Environment variable setup
- Testing procedures
- Troubleshooting guide

---

## 🧪 POST-IMPLEMENTATION TESTING & OBSERVATIONS

### Testing Date: October 12, 2025

### What Works ✅
1. **GitHub OAuth** - Flawless authentication flow
2. **Google OAuth** - Works perfectly
3. **Twitter OAuth** - Authentication works, user saved in database
4. **Session Persistence** - Sessions persist across page refreshes
5. **Sign Out** - Properly clears session and redirects

### Issues Found & Fixed ✅

#### 1. Twitter Avatar Image Error (FIXED)
**Problem:** Next.js `Image` component blocked Twitter avatar URLs  
**Error:** `hostname "pbs.twimg.com" is not configured`  
**Fix:** Added Twitter image hostname to `next.config.ts`  
**Status:** ✅ Resolved

#### 2. UI Flash on Page Load (FIXED)
**Problem:** Brief flash of guest/anon UI before switching to logged-in UI  
**Cause:** Async auth initialization (~100-500ms) while components render immediately  
**Fix:** Added loading skeleton to Header that shows during `isLoading` state  
**Status:** ✅ Resolved  
**Note:** Still very brief (<100ms) but much less jarring

### Known Intentional Gaps (For Phase 3)

#### 3. Homepage → Conversation Flow (NOT IMPLEMENTED YET)
**Status:** ⏸️ Intentionally delayed to Phase 3  
**Why:** Requires AI SDK integration, API routes, streaming setup  
**When:** Implement during AI Integration phase  
**Flow to build:**
```
User enters prompt → POST /api/chat → Create conversation → 
Navigate to /conversation/[id] → Stream AI response → Save messages
```

#### 4. History Sidebar Mock Data (NOT IMPLEMENTED YET)
**Status:** ⏸️ Intentionally delayed to Phase 3  
**Current:** Shows hardcoded mock conversations  
**Fix needed:** Replace with `getConversations(user.id)` from `lib/db/queries.ts`  
**When:** After AI integration creates real conversations to display  
**Estimated effort:** 10 minutes

#### 5. Slow Page Loads (EXPECTED IN DEV MODE)
**Observation:** Settings page and other pages sometimes load slowly or show URL change without immediate render  
**Causes:**
- Development mode overhead (Turbopack, HMR)
- No query caching (refetches user on every navigation)
- Large bundle sizes (Settings: 175 kB)
- Missing loading indicators

**Solutions for Phase 3:**
- Add `loading.tsx` files for routes
- Implement query caching (React Query or similar)
- Code split modal components
- Test production build (`pnpm build && pnpm start`)

**Current status:** Acceptable for development, will optimize in Phase 3

---

## 🎯 IMPORTANT REMINDERS FOR NEXT PHASE

### Before Starting Phase 3 (AI Integration):

1. **✅ Auth is production-ready** - No changes needed
2. **✅ Database ready** - Schema supports conversations & messages
3. **✅ Query helpers ready** - Use functions from `lib/db/queries.ts`
4. **⚠️ History needs real data** - Replace mock with real fetch after AI creates conversations
5. **⚠️ Production performance** - Test with `pnpm build && pnpm start` before deploying

### Phase 3 Checklist:

**AI Integration:**
- [ ] Install AI SDK packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, etc.)
- [ ] Create `/app/api/chat/route.ts` - AI streaming endpoint
- [ ] Implement homepage → conversation flow
- [ ] Save messages to database using `createMessage()`
- [ ] Load conversation history using `getMessages()`

**UI Enhancements:**
- [ ] Replace history mock data with real database fetch
- [ ] Add loading states (`loading.tsx` files)
- [ ] Implement sources tab
- [ ] Add reasoning display
- [ ] Add loading animations for AI responses

**Performance:**
- [ ] Add query caching
- [ ] Code split heavy components
- [ ] Test production build performance
- [ ] Optimize bundle sizes

### Keep in Mind:

**✅ Working Well:**
- Auth architecture is solid (no race conditions)
- Type system is comprehensive
- Database schema is minimal and extensible
- Query helpers abstract complexity
- Build passes with zero errors

**⚠️ Watch Out For:**
- Don't over-engineer - keep the lean approach
- Use existing query helpers instead of raw Supabase calls
- Update history sidebar once real conversations exist
- Test performance in production mode regularly
- Add loading states as you build features

**🚫 Don't Repeat qurse-old Mistakes:**
- No hardcoded mock data in production code
- No race conditions (always use AuthContext)
- No over-engineered schemas (extend minimally)
- No inline database queries (use query helpers)
- No missing error handling

---

## 🔗 IMPORTANT LINKS & RESOURCES

- **Scira Reference:** `/Users/sri/Desktop/scira/`
- **Old Project:** `/Users/sri/Desktop/qurse-old/`
- **Current Project:** `/Users/sri/Desktop/qurse/`
- **Setup Guide:** `SUPABASE_SETUP.md`
- **Database Schema:** `lib/supabase/schema.sql`

---

*This context file should be updated as development progresses.*  
**Last Major Update:** Phase 2 complete + Post-testing fixes applied - October 12, 2025

