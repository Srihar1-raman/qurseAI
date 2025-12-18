# 📚 Qurse Codebase - Complete Guide

**A simple explanation of how everything works together**

---

## 🎯 What is This App?

Qurse is an AI chat application where users can:
- Chat with AI models (like ChatGPT, Claude, etc.)
- Have conversations saved automatically
- Use different chat modes (regular chat, web search, etc.)
- Sign in with Google, Twitter, or GitHub
- Get rate-limited if they use too many messages

---

## 📁 Folder Structure Overview

```
qurse/
├── components/     # All the UI pieces (buttons, forms, chat bubbles)
├── hooks/          # Reusable logic that components can use
├── app/            # Pages and API routes (what users see and interact with)
├── lib/            # Helper functions, database code, business logic
└── ai/             # AI model configurations and settings
```

---

## 🧩 Components Folder - The UI Building Blocks

**What it is:** All the visual pieces users see on screen.

### `components/auth/` - Login & Sign Up

**Purpose:** Everything related to user authentication

- **`AuthPage.tsx`** - The login/signup page you see when clicking "Sign In"
  - Shows buttons for Google, Twitter, GitHub
  - Handles the login flow
  - Where it's used: `/login` and `/signup` routes

- **`AuthButton.tsx`** - A reusable button for OAuth providers
  - Can show just an icon or icon + text
  - Handles redirects after login
  - Where it's used: AuthPage, rate limit popups

### `components/chat/` - Chat Message Display

**Purpose:** How individual messages look

- **`ChatMessage.tsx`** - Shows one message (user or AI)
  - Displays text, reasoning (AI thinking), markdown
  - Handles copy-to-clipboard
  - Where it's used: ConversationThread (the message list)

- **`MarkdownRenderer.tsx`** - Converts markdown text to formatted HTML
  - Makes AI responses look nice (bold, code blocks, etc.)
  - Where it's used: Inside ChatMessage

### `components/conversation/` - The Chat Interface

**Purpose:** The main chat screen where conversations happen

- **`ConversationClient.tsx`** - The main orchestrator (161 lines)
  - Coordinates all the hooks and components
  - Manages rate limit popups
  - Where it's used: `/conversation/[id]` page

- **`ConversationThread.tsx`** - The message list
  - Shows all messages in a conversation
  - Shows loading indicators ("Thinking...")
  - Shows error messages
  - Where it's used: Inside ConversationClient

- **`ConversationInput.tsx`** - The input area at the bottom
  - Text input field
  - Model selector
  - Web search mode selector
  - Send button
  - Where it's used: Inside ConversationClient

- **`types.ts`** - TypeScript type definitions
  - Defines what data structures look like
  - Ensures type safety

### `components/homepage/` - The Landing Page

**Purpose:** What users see when they first visit

- **`Hero.tsx`** - The big title/description at the top
  - "Welcome to Qurse" type text
  - Where it's used: Homepage (`/`)

- **`MainInput.tsx`** - The main input field on homepage
  - Where users type their first message
  - Creates new conversations
  - Where it's used: Homepage

- **`ModelSelector.tsx`** - Dropdown to choose AI model
  - Shows list of available models (GPT-4, Claude, etc.)
  - Where it's used: Homepage and ConversationInput

- **`WebSearchSelector.tsx`** - Dropdown to choose chat mode
  - Options: Chat, Web Search, arXiv
  - Where it's used: Homepage and ConversationInput

- **`DeepSearchButton.tsx`** - Button for deep search feature
  - Where it's used: Homepage

### `components/layout/` - Page Structure

**Purpose:** The frame around all pages (header, footer, sidebar)

- **`Header.tsx`** - Top navigation bar
  - Shows user info, new chat button, history button
  - Where it's used: Every page (via NavigationWrapper)

- **`Footer.tsx`** - Bottom footer
  - Links, copyright, etc.
  - Where it's used: Homepage

- **`NavigationWrapper.tsx`** - Wraps pages with header/footer
  - Ensures header appears on all pages
  - Where it's used: Root layout

- **`RoutePrefetcher.tsx`** - Preloads routes for faster navigation
  - Makes clicking links faster
  - Where it's used: Root layout

- **`history/`** - History sidebar folder
  - **`HistorySidebar.tsx`** - The sidebar that slides in
  - **`ConversationList.tsx`** - List of past conversations
  - **`ConversationItem.tsx`** - One conversation in the list
  - **`HistorySearch.tsx`** - Search box for conversations
  - **`HistoryHeader.tsx`** - Header inside sidebar
  - **`ClearHistoryModal.tsx`** - Popup to confirm clearing history

### `components/rate-limit/` - Rate Limit Popups

**Purpose:** Popups shown when users hit message limits

- **`GuestRateLimitPopup.tsx`** - Popup for guests (not logged in)
  - Shows "Sign in to continue" with auth buttons
  - Where it's used: ConversationClient, MainInput

- **`FreeUserRateLimitPopup.tsx`** - Popup for free users
  - Shows "Upgrade to Pro" with upgrade button
  - Where it's used: ConversationClient, MainInput

- **`HeroBlock.tsx`** - Background image and logo section
  - The pretty background with model icons
  - Where it's used: Both rate limit popups

- **`ModelIconCarousel.tsx`** - Moving carousel of AI model icons
  - Shows icons sliding across the screen
  - Where it's used: HeroBlock

- **`constants.ts`** - Styling constants (sizes, colors, speeds)
- **`utils.ts`** - Helper functions (format reset time, get background style)
- **`index.ts`** - Exports all components from this folder

### `components/settings/` - Settings Page

**Purpose:** User account and app settings

- **`AccountSection.tsx`** - Account management
  - Delete account, sign out
  - Where it's used: Settings page

- **`GeneralSection.tsx`** - General preferences
  - Theme, language, auto-save
  - Where it's used: Settings page

- **`PaymentSection.tsx`** - Subscription management
  - Upgrade to Pro, payment info
  - Where it's used: Settings page

- **`SystemSection.tsx`** - System info
  - Version, diagnostics
  - Where it's used: Settings page

- **`ClearChatsModal.tsx`** - Popup to confirm clearing all chats
- **`DeleteAccountModal.tsx`** - Popup to confirm account deletion

### `components/ui/` - Reusable UI Components

**Purpose:** Basic building blocks used everywhere

- **`button.tsx`** - Basic button component
- **`Modal.tsx`** - Popup/modal container
- **`toast.tsx`** - Notification messages (success, error)
- **`toaster.tsx`** - Container for toasts
- **`input.tsx`** - Text input field
- **`dropdown.tsx`** - Dropdown menu
- **`ErrorMessage.tsx`** - Error message display
- **`ConfirmModal.tsx`** - Confirmation popup
- **`UnifiedButton.tsx`** - Enhanced button with more features
- **`ModelIconCarousel.tsx`** - Reusable carousel (used in rate limit popups and pricing page)
- **`*Skeleton.tsx`** - Loading placeholders (shows while content loads)

---

## 🎣 Hooks - Reusable Logic

**What are hooks?** 
Hooks are reusable pieces of logic that components can "hook into". Instead of writing the same code in multiple components, you write it once in a hook and use it anywhere.

**Why use hooks?**
- **Reusability:** Write once, use everywhere
- **Separation:** Keep logic separate from UI
- **Testing:** Easier to test logic in isolation
- **Organization:** Cleaner component code

### Conversation Hooks (The Big Ones)

**`use-conversation-messages.ts`** - Manages all messages
- **What it does:** Loads messages from database, merges with new messages, handles pagination
- **Why needed:** Complex logic that would clutter ConversationClient
- **Returns:** `displayMessages`, loading states, `loadOlderMessages` function
- **Used in:** ConversationClient

**`use-conversation-scroll.ts`** - Handles scrolling behavior
- **What it does:** Auto-scrolls to bottom, restores scroll position after loading older messages, detects scroll-to-top for pagination
- **Why needed:** Scroll logic is complex and used in multiple places
- **Returns:** Refs for scroll containers, `scrollToBottom` function
- **Used in:** ConversationClient

**`use-conversation-input.ts`** - Manages the input field
- **What it does:** Handles typing, sending messages, rate limit checks, textarea auto-resize
- **Why needed:** Consolidates duplicate rate limit checking logic
- **Returns:** `input` state, `handleSubmit`, `handleKeyPress`, `textareaRef`
- **Used in:** ConversationClient

**`use-chat-transport.ts`** - Connects to AI API
- **What it does:** Creates the connection to `/api/chat`, handles errors, detects rate limits
- **Why needed:** Separates API logic from UI
- **Returns:** `messages`, `sendMessage`, `status`, `error`
- **Used in:** ConversationClient

**`use-conversation-lifecycle.ts`** - Manages conversation lifecycle
- **What it does:** Handles logout redirects, sends initial message from URL params, tracks user interaction
- **Why needed:** Lifecycle logic is separate concern
- **Returns:** `hasInteracted`, `setHasInteracted`
- **Used in:** ConversationClient

### Utility Hooks (Small Helpers)

**`use-optimized-scroll.ts`** - Smart scrolling
- **What it does:** Only scrolls if user hasn't manually scrolled up
- **Why needed:** Prevents annoying auto-scroll when user is reading old messages
- **Used in:** use-conversation-scroll

**`use-textarea-auto-resize.ts`** - Makes textarea grow/shrink
- **What it does:** Automatically adjusts textarea height as user types
- **Why needed:** Better UX - no scrollbar in input field
- **Used in:** use-conversation-input, MainInput

**`use-auto-focus.ts`** - Auto-focuses input
- **What it does:** Focuses input field when user starts typing
- **Why needed:** Convenience - user doesn't need to click
- **Used in:** MainInput, ConversationInput

**`use-mobile.ts`** - Detects mobile devices
- **What it does:** Returns true if screen is mobile-sized
- **Why needed:** Different UI on mobile vs desktop
- **Used in:** Various components

**`use-click-outside.ts`** - Detects clicks outside element
- **What it does:** Calls callback when user clicks outside a component
- **Why needed:** Close dropdowns/modals when clicking outside
- **Used in:** Dropdowns, modals

**`use-infinite-scroll.ts`** - Detects scroll to edge
- **What it does:** Calls callback when user scrolls near top/bottom
- **Why needed:** Load more content automatically
- **Used in:** Could be used for pagination

**`use-conversation-id.ts`** - Extracts conversation ID from URL
- **What it does:** Gets conversation ID from `/conversation/[id]` URL
- **Why needed:** Reusable URL parsing
- **Used in:** Homepage

**`use-optimistic-navigation.ts`** - Fast navigation
- **What it does:** Updates URL instantly without page reload
- **Why needed:** Makes app feel faster (SPA behavior)
- **Used in:** MainInput

---

## 📱 App Folder - Pages and API Routes

**What it is:** Next.js App Router - defines what pages exist and what API endpoints are available.

### `app/layout.tsx` - Root Layout

**What it does:** Wraps every page with providers and global components
- Sets up theme (light/dark mode)
- Sets up auth context
- Sets up rate limit context
- Sets up toast notifications
- Wraps everything with NavigationWrapper
- **Runs:** On every page load (server-side first, then client-side)

### `app/(search)/` - Main Chat Routes

**Purpose:** Routes for the main chat interface

- **`page.tsx`** - The homepage (`/`)
  - Shows Hero, MainInput, ModelSelector
  - Conditionally shows ConversationClient if conversationId exists
  - **Runs:** When user visits homepage

- **`layout.tsx`** - Layout for search routes
  - Wraps search pages with specific layout
  - **Runs:** For all routes in `(search)` group

- **`conversation/[id]/page.tsx`** - Individual conversation page
  - Loads messages from database (server-side)
  - Passes data to ConversationClient
  - **Runs:** When user visits `/conversation/abc-123`

- **`conversation/[id]/ConversationPageClient.tsx`** - Client component for conversation
  - Handles client-side logic for conversation page
  - **Runs:** Client-side after server renders

### `app/(auth)/` - Authentication Routes

**Purpose:** Login and signup pages

- **`login/page.tsx`** - Login page (`/login`)
  - Shows AuthPage component
  - **Runs:** When user visits `/login`

- **`signup/page.tsx`** - Signup page (`/signup`)
  - Shows AuthPage component
  - **Runs:** When user visits `/signup`

### `app/api/` - Backend API Routes

**Purpose:** Server-side endpoints that handle requests

#### `app/api/chat/route.ts` - Main AI Chat Endpoint

**What it does:**
1. Checks if user is authenticated
2. Checks if user has Pro subscription (for premium models)
3. Checks rate limits (guest: 10/day, free: 20/day)
4. Validates the request
5. Gets the AI model configuration
6. Calls the AI provider (OpenAI, Anthropic, etc.)
7. Streams the response back to client
8. Saves messages to database
9. Updates conversation title

**Runs:** When user sends a message (POST request)

**Flow:**
```
User types message
  ↓
Client sends POST to /api/chat
  ↓
Server checks auth, rate limits, subscription
  ↓
Server calls AI provider
  ↓
Server streams response back
  ↓
Client receives chunks and displays them
```

#### `app/api/conversation/[id]/messages/route.ts` - Get Messages

**What it does:** Returns messages for a conversation
- Used for loading existing conversations
- Pagination support (load older messages)
- **Runs:** When ConversationClient loads messages

#### `app/api/guest/conversation/[id]/messages/route.ts` - Get Guest Messages

**What it does:** Same as above, but for guest users (not logged in)
- Uses different database tables
- **Runs:** When guest user loads conversation

#### `app/api/user/` - User Management

- **`conversations/route.ts`** - Get user's conversations list
- **`preferences/route.ts`** - Get/update user preferences
- **`profile/route.ts`** - Get/update user profile
- **`account/route.ts`** - Account management
- **`subscription/route.ts`** - Subscription management

#### `app/api/auth/callback/route.ts` - OAuth Callback

**What it does:** Handles redirect after OAuth login
- Google/Twitter/GitHub redirect here after login
- Exchanges code for session
- Transfers guest data to user account
- Redirects user back to app
- **Runs:** After OAuth provider redirects

#### `app/api/conversations/search/route.ts` - Search Conversations

**What it does:** Searches conversation titles
- Used by history sidebar search
- **Runs:** When user types in search box

### `app/settings/` - Settings Page

- **`page.tsx`** - Settings page (`/settings`)
- **`SettingsPageClient.tsx`** - Client component with settings logic

### `app/info/` - Info Page

- **`page.tsx`** - Terms of Service, Privacy Policy page

### `app/globals.css` - Global Styles

**What it does:** CSS that applies to entire app
- Theme variables (colors, fonts)
- Base styles
- **Runs:** Loaded on every page

---

## 📚 Lib Folder - Helper Code and Business Logic

**What it is:** Shared utilities, database code, business logic that multiple parts of the app use.

### `lib/contexts/` - Global State Management

**What are contexts?** React Context provides a way to share data across components without passing props down manually.

- **`AuthContext.tsx`** - User authentication state
  - **What it stores:** Current user, session, login status
  - **Why needed:** Many components need to know if user is logged in
  - **Used by:** Header, ConversationClient, rate limit popups, etc.

- **`RateLimitContext.tsx`** - Rate limit state
  - **What it stores:** Is user rate limited? When does it reset?
  - **Why needed:** Multiple components need to check rate limits
  - **Used by:** ConversationClient, MainInput

- **`ConversationContext.tsx`** - Current conversation settings
  - **What it stores:** Selected model, chat mode
  - **Why needed:** Model/mode selection persists across pages
  - **Used by:** ModelSelector, WebSearchSelector, ConversationClient

- **`SidebarContext.tsx`** - Sidebar state
  - **What it stores:** Is sidebar open? What conversations to show?
  - **Why needed:** Sidebar state shared across components
  - **Used by:** HistorySidebar, Header

- **`HistorySidebarContext.tsx`** - History sidebar specific state
- **`NavigationContext.tsx`** - Navigation state
- **`ToastContext.tsx`** - Toast notification state
  - **What it stores:** Current toast messages
  - **Why needed:** Show success/error messages anywhere in app
  - **Used by:** All components that need to show notifications

### `lib/db/` - Database Code

**Purpose:** All code that talks to the database

#### Client-Side Queries (`queries.ts`)
- **What it does:** Functions that run in the browser to fetch data
- **Used by:** Components that need to load data client-side
- **Functions:**
  - `getOlderMessages()` - Load older messages for pagination
  - `getUserLinkedProviders()` - Get user's OAuth providers
  - `searchConversations()` - Search conversation titles

#### Server-Side Queries (`*.server.ts` files)
- **What it does:** Functions that run on the server (more secure)
- **Used by:** API routes, server components
- **Files:**
  - `conversations.server.ts` - Create/update/delete conversations
  - `messages.server.ts` - Save messages
  - `guest-conversations.server.ts` - Guest conversation management
  - `guest-transfer.server.ts` - Transfer guest data to user account
  - `preferences.server.ts` - User preferences
  - `rate-limits.server.ts` - Rate limit tracking
  - `subscriptions.server.ts` - Subscription management
  - `users.server.ts` - User management
  - `queries.server.ts` - General server queries

### `lib/services/` - Business Logic

**Purpose:** Core business rules and logic

- **`rate-limiting.ts`** - Main rate limiting orchestrator
  - **What it does:** Decides which rate limit check to use (guest vs auth)
  - **Why needed:** Different rules for guests vs logged-in users
  - **Used by:** `/api/chat` route

- **`rate-limiting-guest.ts`** - Guest rate limiting
  - **What it does:** Checks Redis (IP-based) and Database (session-based)
  - **Why needed:** Two-layer protection for guests
  - **Used by:** rate-limiting.ts

- **`rate-limiting-auth.ts`** - Authenticated user rate limiting
  - **What it does:** Checks database for user's message count
  - **Why needed:** Different limits for free vs Pro users
  - **Used in:** rate-limiting.ts

- **`account-management.ts`** - Account operations
  - Delete account, clear chats
  - **Used by:** Settings page API routes

- **`user-preferences.ts`** - User settings management
- **`user-profile.ts`** - User profile management
- **`subscription.ts`** - Subscription management

### `lib/supabase/` - Database Setup

**Purpose:** Supabase client configuration and database schema

- **`client.ts`** - Browser-side Supabase client
  - **What it does:** Creates connection to Supabase from browser
  - **Used by:** Client-side database queries

- **`server.ts`** - Server-side Supabase client
  - **What it does:** Creates connection to Supabase from server
  - **Used by:** API routes, server components

- **`auth-utils.ts`** - Authentication helpers
  - **What it does:** Gets user data, validates sessions
  - **Used by:** API routes

- **`schema.sql`** - Database table definitions
  - **What it does:** Defines all tables, columns, relationships
  - **Tables:**
    - `users` - User accounts
    - `conversations` - Chat conversations
    - `messages` - Individual messages
    - `rate_limits` - Rate limit tracking
    - `subscriptions` - User subscriptions
    - `user_preferences` - User settings
    - `guest_conversations` - Guest conversations
    - `guest_messages` - Guest messages

- **`migration_*.sql`** - Database migration files
  - **What they do:** Changes to database structure over time
  - **Why needed:** Updates database schema as app evolves

### `lib/conversation/` - Conversation Utilities

**Purpose:** Helper functions for conversation management

- **`message-utils.ts`** - Message processing
  - `mergeMessages()` - Combines database messages with new messages
  - `transformToQurseMessage()` - Converts messages to app format
  - **Used by:** use-conversation-messages hook

- **`rate-limit-utils.ts`** - Rate limit error handling
  - `isRateLimitError()` - Detects if error is rate limit
  - `extractRateLimitInfo()` - Gets reset time from error
  - **Used by:** use-chat-transport hook

- **`chat-mode-utils.ts`** - Chat mode mapping
  - `getOptionFromChatMode()` - Converts mode to display name
  - `getChatModeFromOption()` - Converts display name to mode
  - **Used by:** WebSearchSelector, ConversationInput

### `lib/redis/` - Redis (Caching) Setup

**Purpose:** Redis client for rate limiting

- **`client.ts`** - Redis client configuration
  - **What it does:** Connects to Upstash Redis
  - **Why needed:** Fast IP-based rate limiting for guests
  - **Used by:** rate-limiting-guest.ts

- **`rate-limit.ts`** - Rate limit instances
  - **What it does:** Pre-configured rate limiters
  - **Used by:** rate-limiting-guest.ts

### `lib/tools/` - AI Tools Registry

**Purpose:** Registry of available AI tools

- **`registry.ts`** - Tool definitions
  - **What it does:** Lists all tools AI can use (web search, etc.)
  - **Used by:** `/api/chat` when tools are needed

- **`index.ts`** - Tool exports

### `lib/utils/` - General Utilities

**Purpose:** Small helper functions used everywhere

- **`logger.ts`** - Logging system
  - **What it does:** Structured logging with scopes
  - **Why needed:** Better debugging and monitoring

- **`error-handler.ts`** - Error handling
  - **What it does:** Converts technical errors to user-friendly messages
  - **Used by:** All API routes and components

- **`session.ts`** - Session management
  - **What it does:** Creates/manages guest session IDs
  - **Used by:** Guest rate limiting

- **`session-hash.ts`** - Session hashing
  - **What it does:** Creates secure hash of session ID
  - **Why needed:** Security - don't store raw session IDs

- **`ip-extraction.ts`** - IP address extraction
  - **What it does:** Gets user's IP from request
  - **Used by:** Guest rate limiting

- **`convo-title-generation.ts`** - Auto-generates conversation titles
- **`message-adapters.ts`** - Converts message formats
- **`message-parts-fallback.ts`** - Handles old message formats
- **`toast.ts`** - Toast notification helpers
- **`validate-return-url.ts`** - Validates redirect URLs for security

### `lib/validation/` - Input Validation

- **`chat-schema.ts`** - Validates chat API requests
  - **What it does:** Ensures request data is correct format
  - **Used by:** `/api/chat` route

### `lib/errors.ts` - Custom Error Types

**What it does:** Defines custom error classes
- `ModelAccessError` - User can't access this model
- `RateLimitError` - User hit rate limit
- `ValidationError` - Invalid request data
- **Used by:** API routes for better error handling

### `lib/theme-provider.tsx` - Theme Management

**What it does:** Manages light/dark mode
- Detects system preference
- Stores user preference
- Applies theme to app
- **Used by:** All components (via CSS variables)

### `lib/types.ts` - TypeScript Types

**What it does:** Defines all data structures
- User, Message, Conversation types
- API request/response types
- **Used by:** Entire codebase for type safety

---

## 🤖 AI Folder - AI Configuration

**Purpose:** All configuration for AI models and providers

### `ai/models.ts` - Model Definitions

**What it does:** Defines all available AI models
- Model names, providers, capabilities
- Access control (free vs Pro)
- Model-specific settings
- **Used by:** `/api/chat` to get model config, ModelSelector to show list

**Key Functions:**
- `getModelConfig()` - Gets config for a model
- `canUseModel()` - Checks if user can use model
- `requiresProSubscription()` - Checks if model needs Pro
- `getModelParameters()` - Gets model settings

### `ai/providers.ts` - AI Provider Setup

**What it does:** Creates connections to AI providers
- OpenAI, Anthropic, Groq, XAI, etc.
- Handles API keys and authentication
- **Used by:** `/api/chat` to call AI providers

### `ai/config.ts` - Chat Mode Configuration

**What it does:** Defines chat modes (Chat, Web Search, arXiv)
- Which tools each mode can use
- Which models work with each mode
- **Used by:** `/api/chat` to determine available tools

---

## 🔄 How Everything Fits Together

### The Complete User Journey

#### 1. User Visits Homepage (`/`)

```
Browser loads app
  ↓
app/layout.tsx renders (server-side)
  - Sets up all contexts (Auth, RateLimit, etc.)
  - Wraps with NavigationWrapper
  ↓
app/(search)/page.tsx renders
  - Checks if user is logged in (via AuthContext)
  - Shows Hero, MainInput, ModelSelector
  ↓
Components mount (client-side)
  - MainInput.tsx - User can type
  - ModelSelector.tsx - User can choose model
  - WebSearchSelector.tsx - User can choose mode
```

#### 2. User Types Message and Clicks Send

```
User types in MainInput
  ↓
MainInput checks rate limit (via RateLimitContext)
  - If rate limited: Shows popup, stops here
  - If not: Continues
  ↓
MainInput generates conversation ID
  ↓
MainInput updates URL: /conversation/[id]?message=...
  ↓
Homepage detects URL change
  - Hides homepage UI
  - Shows ConversationClient
  ↓
ConversationClient mounts
  - useChatTransport hook connects to /api/chat
  - useConversationLifecycle sends initial message
```

#### 3. Message Sent to Server

```
ConversationClient calls sendMessage()
  ↓
POST request to /api/chat
  ↓
app/api/chat/route.ts runs (server-side)
  1. Checks authentication
  2. Checks Pro subscription (if premium model)
  3. Checks rate limits
  4. Validates request
  5. Gets model config from ai/models.ts
  6. Gets chat mode config from ai/config.ts
  7. Calls AI provider (ai/providers.ts)
  8. Streams response back
  9. Saves message to database (lib/db/messages.server.ts)
```

#### 4. Response Streams Back

```
Server streams AI response
  ↓
useChatTransport hook receives chunks
  ↓
useConversationMessages merges with existing messages
  ↓
ConversationThread displays new message
  ↓
useConversationScroll auto-scrolls to bottom
```

#### 5. User Continues Conversation

```
User types another message
  ↓
ConversationInput handles input
  ↓
Checks rate limit again
  ↓
Sends to /api/chat
  ↓
Process repeats...
```

### Authentication Flow

```
User clicks "Sign In"
  ↓
AuthPage shows OAuth buttons
  ↓
User clicks "Google" (for example)
  ↓
Redirects to Google
  ↓
User logs in with Google
  ↓
Google redirects to /auth/callback
  ↓
app/api/auth/callback/route.ts runs
  1. Exchanges code for session
  2. Gets user info from Google
  3. Creates/updates user in database
  4. Transfers guest data to user (lib/db/guest-transfer.server.ts)
  5. Redirects back to app
  ↓
AuthContext updates with new user
  ↓
UI updates (shows user name, etc.)
```

### Rate Limiting Flow

```
User sends 11th message (guest) or 21st (free user)
  ↓
/api/chat checks rate limit
  ↓
lib/services/rate-limiting.ts runs
  - For guests: Checks Redis (IP) + Database (session)
  - For users: Checks Database (user_id)
  ↓
If limit reached:
  - Returns 429 error
  - Sets rate limit headers
  ↓
useChatTransport detects error
  ↓
extractRateLimitInfo() gets reset time
  ↓
RateLimitContext updates state
  ↓
ConversationClient shows popup
  - Guest: GuestRateLimitPopup (sign in buttons)
  - Free: FreeUserRateLimitPopup (upgrade button)
```

### Database Flow

```
Component needs data
  ↓
Calls lib/db/queries.ts function (client-side)
  OR
API route calls lib/db/*.server.ts function (server-side)
  ↓
Function uses Supabase client
  - lib/supabase/client.ts (browser)
  - lib/supabase/server.ts (server)
  ↓
Supabase queries PostgreSQL database
  ↓
Returns data
  ↓
Component/API route uses data
```

### Message Loading Flow

```
User visits /conversation/[id]
  ↓
app/(search)/conversation/[id]/page.tsx loads (server-side)
  - Calls lib/db/queries.server.ts to get messages
  - Passes to ConversationClient
  ↓
ConversationClient mounts
  ↓
useConversationMessages hook:
  - Receives initialMessages from server
  - Sets up state
  - If needed, loads more via /api/conversation/[id]/messages
  ↓
useChatTransport provides new messages from streaming
  ↓
useConversationMessages merges old + new messages
  ↓
ConversationThread displays all messages
```

### Scroll Management Flow

```
New message arrives
  ↓
useConversationScroll detects status === 'streaming'
  ↓
Calls scrollToBottom()
  ↓
useOptimizedScroll checks if user manually scrolled
  - If yes: Don't scroll (user is reading old messages)
  - If no: Scroll to bottom
  ↓
User scrolls to top
  ↓
useConversationScroll detects scrollTop < 100
  ↓
Calls loadOlderMessages()
  ↓
useConversationMessages loads older messages
  ↓
Saves scroll position before loading
  ↓
Prepends older messages
  ↓
Restores scroll position (so user stays in same place)
```

---

## 🎨 UI/UX Flow

### Theme System

```
User preference stored in localStorage
  ↓
lib/theme-provider.tsx reads preference
  ↓
Sets CSS variables (--color-text, --color-bg, etc.)
  ↓
All components use CSS variables
  ↓
App automatically adapts to light/dark mode
```

### Toast Notifications

```
Component needs to show message
  ↓
Calls useToast() hook
  ↓
ToastContext adds message to queue
  ↓
Toaster component displays message
  ↓
Auto-dismisses after few seconds
```

### Navigation

```
User clicks link/button
  ↓
Next.js router handles navigation
  ↓
RoutePrefetcher preloads route (makes it faster)
  ↓
New page renders
  ↓
NavigationWrapper ensures header is always visible
```

---

## 🔐 Security Flow

### Authentication

```
User must be logged in for certain actions
  ↓
API route checks: createClient().auth.getUser()
  ↓
If no user: Returns 401 error
  ↓
Client redirects to /login
```

### Rate Limiting

```
Every message request
  ↓
Server checks rate limit
  ↓
Redis (for guests): Fast IP-based check
Database (for all): Accurate count tracking
  ↓
If limit reached: Blocks request
  ↓
Client shows popup (can't send more messages)
```

### Row Level Security (RLS)

```
Database has RLS policies
  ↓
Users can only see their own data
  ↓
Supabase enforces automatically
  ↓
No need to check ownership in code (mostly)
```

---

## 📊 Data Flow Summary

### Client → Server

```
User action (click, type)
  ↓
Component event handler
  ↓
Hook processes (if needed)
  ↓
API call (fetch or useChat)
  ↓
POST/GET to /api/*
  ↓
Server processes
  ↓
Returns response
```

### Server → Client

```
Server streams/chunks response
  ↓
Client receives chunks
  ↓
Hook updates state
  ↓
Component re-renders
  ↓
UI updates
```

---

## 🎯 Key Concepts Explained Simply

### Server-Side vs Client-Side

**Server-Side (`*.server.ts`, API routes):**
- Runs on the server (faster, more secure)
- Can access database directly
- Can use secret API keys
- Example: Saving messages, checking rate limits

**Client-Side (components, hooks):**
- Runs in the browser
- Can't access secrets
- Can interact with user
- Example: Showing UI, handling clicks

### Context vs Props

**Props:** Data passed directly from parent to child
- Like passing a note to someone
- Must pass through every level

**Context:** Data available to any component that needs it
- Like a bulletin board everyone can read
- No need to pass through levels

### Hooks vs Components

**Components:** The UI (what you see)
- Buttons, forms, text
- Can use hooks

**Hooks:** The logic (what happens)
- Data fetching, calculations
- Can't be seen, but make components work

### State Management

**Local State (`useState`):** Data only one component needs
- Example: Input field value

**Context State:** Data multiple components need
- Example: Current user, selected model

**Server State:** Data from database
- Example: Messages, conversations

---

## 🔧 Common Patterns

### 1. Loading States

```
Component starts loading
  ↓
Shows skeleton/loading indicator
  ↓
Data arrives
  ↓
Shows actual content
```

### 2. Error Handling

```
Something goes wrong
  ↓
Error caught
  ↓
Converted to user-friendly message
  ↓
Shown in toast or error component
```

### 3. Optimistic Updates

```
User action (e.g., send message)
  ↓
UI updates immediately (optimistic)
  ↓
Request sent to server
  ↓
If success: Keep update
If error: Revert update, show error
```

---

## 📝 Summary

**Components** = What users see (UI)
**Hooks** = Reusable logic
**App** = Pages and API routes
**Lib** = Helper code and business logic
**AI** = AI model configuration

Everything works together through:
- **Contexts** for shared state
- **Hooks** for reusable logic
- **API routes** for server-side operations
- **Database** for data storage
- **Streaming** for real-time AI responses

The app follows a clear flow:
1. User interacts with UI (components)
2. Components use hooks for logic
3. Hooks call API routes when needed
4. API routes use services and database
5. Responses flow back through hooks
6. Components update UI

This structure makes the code:
- **Maintainable:** Easy to find and fix issues
- **Testable:** Each piece can be tested separately
- **Reusable:** Hooks and components can be reused
- **Scalable:** Easy to add new features

