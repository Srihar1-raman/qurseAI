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
- **Auth:** TBD (Better-auth or Supabase)
- **Database:** TBD (Drizzle + PostgreSQL or Supabase)

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

### 1. CSS Refactoring ✅

**Before:**
```
app/globals.css (1907 lines) ❌
```

**After:**
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

### 2. Component Breakdown ✅

**Before:**
```
app/settings/page.tsx (757 lines) ❌
```

**After:**
```
app/settings/page.tsx (241 lines - orchestrator) ✅
components/settings/
  ├── AccountSection.tsx (159 lines)
  ├── GeneralSection.tsx (133 lines)
  ├── PaymentSection.tsx (43 lines)
  ├── SystemSection.tsx (33 lines)
  ├── DeleteAccountModal.tsx (81 lines)
  └── ClearChatsModal.tsx (63 lines)
```

**Result:** Small, focused components (<250 lines each).

---

### 3. Type System ✅

**Created:** `/lib/types.ts` (190 lines)

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

### 4. Route Organization ✅

**Before:**
```
app/
├── page.tsx
├── conversation/
├── login/
├── signup/
└── settings/
```

**After:**
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

**Before:**
```typescript
// Duplicated in 4 files ❌
const mockUser = { name: 'John Doe', email: 'john@example.com' };
```

**After:**
```typescript
// One place, used everywhere ✅
const { user, isAuthenticated, signOut } = useAuth();
```

**Benefits:**
- Single source of truth
- Type-safe context
- Easy to swap with real auth (Better-auth/Supabase)
- No refactoring needed when adding real auth

---

### 6. Code Quality ✅

**Removed ALL Inline Styles:**
- ✅ Settings page & components
- ✅ Auth pages (login/signup)  
- ✅ Modals

**Eliminated Duplication:**
- ✅ Mock user data (now in AuthContext)
- ✅ Icon utility functions (consolidated in `icon-utils.ts`)
- ✅ Type definitions (centralized in `types.ts`)

**Build Optimization:**
- Homepage: 7.96 kB → 7.94 kB
- Login: 2.31 kB → 1.93 kB (-16%)
- Signup: 2.32 kB → 1.93 kB (-17%)
- Settings: 4.67 kB → 4.19 kB (-10%)

---

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

1. **Project is ready for backend** - UI complete, structure solid
2. **Next step is auth** - Choose Better-auth or Supabase
3. **Reference projects available** - Scira and qurse-old in Desktop folder
4. **All types centralized** - Import from `/lib/types.ts`
5. **Auth context ready** - Just swap mock user with real auth
6. **No major refactoring needed** - Foundation is solid

**Commands to run:**
```bash
cd /Users/sri/Desktop/qurse
pnpm run dev          # Start dev server
pnpm run build        # Test build
```

**Dev server runs on:** `http://localhost:3000` (or 3004, 3005, 3006 if port in use)

---

## 🔗 IMPORTANT LINKS & RESOURCES

- **Scira Reference:** `/Users/sri/Desktop/scira/`
- **Old Project:** `/Users/sri/Desktop/qurse-old/`
- **Current Project:** `/Users/sri/Desktop/qurse/`

---

*This context file should be updated as development progresses. Last major update: Phase 1 (UI & Structure) complete.*

