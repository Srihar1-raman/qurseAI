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

- **`Header.tsx`** - Top navigation bar (257 lines, refactored)
  - Shows user info, new chat button, history button
  - Orchestrates header components
  - Where it's used: Every page (via NavigationWrapper)

- **`HeaderDropdown.tsx`** - User dropdown menu (248 lines, extracted)
  - User profile section
  - Theme selector integration
  - Settings, About, Terms, Privacy links
  - Sign out/Sign in button
  - Where it's used: Inside Header.tsx

- **`AuthButtons.tsx`** - Login and signup buttons (26 lines, extracted)
  - Shows "Log in" and "Sign up" buttons
  - Handles callback URL preservation
  - Where it's used: Inside Header.tsx (when user not logged in)

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
- **`ThemeSelector.tsx`** - Theme selection component (83 lines, extracted)
  - Auto, Light, Dark theme buttons
  - Shows current theme selection
  - Where it's used: HeaderDropdown.tsx
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
- **What it does:** Calls callback when user scrolls near top/bottom of a container
- **Why needed:** Automatically load more content when user scrolls (infinite scroll pattern)
- **Used in:** `HistorySidebar.tsx` - loads more conversations when user scrolls to bottom
- **Difference from `use-optimized-scroll`:** 
  - `use-infinite-scroll`: Detects when user reaches edge → triggers loading more data
  - `use-optimized-scroll`: Prevents auto-scroll if user manually scrolled up (different purpose)

**`use-conversation-id.ts`** - Extracts conversation ID from URL
- **What it does:** Gets conversation ID from `/conversation/[id]` URL using Next.js `usePathname()` hook
- **Why needed:** Part of SPA (Single Page App) implementation - reads URL without page reload
- **Used in:** `Homepage` and `HistorySidebar` to know which conversation is active
- **NOT legacy:** This is the modern SPA way - URL changes but no page reload happens
- **How it works:** Uses `window.location.pathname` to extract ID, React detects URL change and updates UI

**`use-optimistic-navigation.ts`** - Fast navigation
- **What it does:** Updates URL instantly without page reload
- **Why needed:** Makes app feel faster (SPA behavior)
- **Used in:** MainInput

### Auth Hooks (User Management)

**`use-pro-status.ts`** - Pro subscription status management (225 lines, extracted)
- **What it does:** Fetches and manages user's Pro subscription status
- **Why needed:** Complex logic with realtime updates - extracted from AuthContext
- **Returns:** `isProUser`, `isLoadingProStatus`
- **Features:**
  - Fetches Pro status once when user loads
  - Subscribes to realtime database updates
  - Handles session validation
  - Caches status across navigations
- **Used in:** AuthContext.tsx

**`use-linked-providers.ts`** - OAuth provider management (80 lines, extracted)
- **What it does:** Fetches user's linked OAuth providers (Google, Twitter, GitHub)
- **Why needed:** Extracted from AuthContext for better organization
- **Returns:** `linkedProviders`, `isLoadingProviders`
- **Features:**
  - Retry logic for race conditions
  - Handles session validation
  - Caches providers across navigations
- **Used in:** AuthContext.tsx

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

#### `app/api/chat/route.ts` - Main AI Chat Endpoint (515 lines, refactored)

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

**Refactoring notes:**
- Uses `ensureConversationServerSide` from `conversations.server.ts`
- Uses `saveUserMessageServerSide` from `messages.server.ts`
- Uses `ensureGuestConversation` from `guest-conversations.server.ts`
- Uses `saveGuestMessage` from `guest-messages.server.ts`
- Uses `applyRateLimitHeaders` and `applyConversationIdHeader` from `rate-limit-headers.ts`
- Reduced from 651 lines to 515 lines (21% reduction)

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

#### `app/api/user/` - User Management API Routes

**Purpose:** All endpoints for managing user account, profile, preferences, and data

**All routes require authentication** (return 401 if not logged in)

##### `app/api/user/subscription/route.ts` - Pro Subscription Status

**What it does:** Returns whether user has Pro subscription

**Endpoint:** `GET /api/user/subscription`

**Returns:**
```json
{
  "isPro": true  // or false
}
```

**Used by:** 
- `AuthContext.tsx` (line 314, 478, 601) - Checks Pro status when user loads
- Settings page - Shows Pro badge
- Rate limit popups - Determines which popup to show

**Example:**
```typescript
// In AuthContext
fetch('/api/user/subscription')
  .then(res => res.json())
  .then(data => setIsProUser(data.isPro ?? false));
```

##### `app/api/user/profile/route.ts` - User Profile

**What it does:** Get and update user profile (name, avatar, email)

**Endpoints:**
- `GET /api/user/profile` - Get current user's profile
- `PUT /api/user/profile` - Update profile

**GET Returns:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://...",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**PUT Body:**
```json
{
  "name": "New Name",  // optional, 1-100 chars
  "avatar_url": "https://..."  // optional, valid URL or empty string
}
```

**Used by:** Settings page - Profile section

**Example:**
```typescript
// Get profile
const response = await fetch('/api/user/profile');
const profile = await response.json();

// Update profile
await fetch('/api/user/profile', {
  method: 'PUT',
  body: JSON.stringify({ name: 'New Name' })
});
```

##### `app/api/user/preferences/route.ts` - User Preferences

**What it does:** Get and update user preferences (theme, language, auto-save)

**Endpoints:**
- `GET /api/user/preferences` - Get preferences
- `PUT /api/user/preferences` - Update preferences

**GET Returns:**
```json
{
  "user_id": "user-uuid",
  "theme": "auto",  // "light" | "dark" | "auto"
  "language": "English",
  "auto_save_conversations": true
}
```

**PUT Body:**
```json
{
  "theme": "dark",  // optional
  "language": "Spanish",  // optional
  "auto_save_conversations": false  // optional
}
```

**Used by:** 
- Settings page - General section
- Theme provider - Applies theme preference

**Example:**
```typescript
// Get preferences
const response = await fetch('/api/user/preferences');
const prefs = await response.json();

// Update theme
await fetch('/api/user/preferences', {
  method: 'PUT',
  body: JSON.stringify({ theme: 'dark' })
});
```

##### `app/api/user/conversations/route.ts` - Clear Conversations

**What it does:** Delete all conversations for current user

**Endpoint:** `DELETE /api/user/conversations`

**Returns:**
```json
{
  "success": true,
  "message": "All conversations cleared successfully"
}
```

**Used by:** Settings page - Clear chats button

**Example:**
```typescript
// Clear all conversations
await fetch('/api/user/conversations', {
  method: 'DELETE'
});
```

##### `app/api/user/account/route.ts` - Account Management

**What it does:** Delete user account (permanently removes all data)

**Endpoint:** `DELETE /api/user/account`

**Body Required:**
```json
{
  "confirmation": "DELETE"  // Must be exactly "DELETE"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Used by:** Settings page - Delete account button

**Example:**
```typescript
// Delete account (requires confirmation)
await fetch('/api/user/account', {
  method: 'DELETE',
  body: JSON.stringify({ confirmation: 'DELETE' })
});
```

**Security:** Requires explicit confirmation to prevent accidental deletion

#### `app/auth/callback/route.ts` - OAuth Callback Handler

**What it does:** Handles redirect after OAuth login (Google, Twitter, GitHub)

**Endpoint:** `GET /auth/callback?code=...&callbackUrl=...`

**Flow:**
```
1. User clicks "Sign in with Google" on login page
   ↓
2. Redirects to Google OAuth page
   ↓
3. User authorizes on Google
   ↓
4. Google redirects to: /auth/callback?code=abc123...
   ↓
5. This route runs:
   - Exchanges code for session (Supabase)
   - Creates user profile in database (if new user)
   - Creates user preferences (defaults)
   - Creates subscription (free plan)
   - Transfers guest data to user account (if guest session exists)
   - Redirects back to app (or callbackUrl)
```

**What it does step-by-step:**

1. **Exchange Code for Session:**
   ```typescript
   const { data, error } = await supabase.auth.exchangeCodeForSession(code);
   // Gets session token from OAuth provider
   ```

2. **Create User Profile:**
   ```typescript
   // Checks if user exists in 'users' table
   // If not, creates profile with email, name, avatar from OAuth provider
   ```

3. **Create User Preferences:**
   ```typescript
   // Creates default preferences:
   // - theme: 'auto'
   // - language: 'English'
   // - auto_save_conversations: true
   ```

4. **Create Subscription:**
   ```typescript
   // Calls database function to ensure free subscription exists
   // Uses SECURITY DEFINER to bypass RLS safely
   ```

5. **Transfer Guest Data:**
   ```typescript
   // If user was guest before login:
   // - Reads session_id from cookie
   // - Derives session_hash (HMAC)
   // - Transfers all guest conversations, messages, rate limits to user account
   // - Merges rate limit counts (adds together, doesn't reset)
   ```

6. **Redirect Back:**
   ```typescript
   // Validates callbackUrl (prevents open redirect attacks)
   // Redirects to callbackUrl or homepage (/)
   ```

**Used by:** 
- `AuthButton.tsx` (line 60) - Sets redirect URL
- OAuth providers (Google, Twitter, GitHub) - Redirect here after login

**Example:**
```typescript
// In AuthButton.tsx
const redirectTo = `${window.location.origin}/auth/callback?callbackUrl=${callbackUrl}`;
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo }
});
// User goes to Google → authorizes → redirects to /auth/callback
```

**Security Features:**
- Validates return URL (prevents redirect attacks)
- Non-blocking guest transfer (doesn't break auth if transfer fails)
- Error handling (redirects to login on error)

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

- **`AuthContext.tsx`** - User authentication state (350 lines, refactored)
  - **What it stores:** Current user, session, login status
  - **Why needed:** Many components need to know if user is logged in
  - **Used by:** Header, ConversationClient, rate limit popups, etc.
  - **Refactoring notes:**
    - Uses `use-pro-status` hook for Pro subscription management
    - Uses `use-linked-providers` hook for OAuth provider management
    - Uses `session-validation` utility for session validation
    - Reduced from 736 lines to 350 lines (52% reduction)

- **`RateLimitContext.tsx`** - Rate limit state
  - **What it stores:** Is user rate limited? When does it reset?
  - **Why needed:** Multiple components need to check rate limits
  - **Used by:** ConversationClient, MainInput

- **`ConversationContext.tsx`** - Current conversation settings
  - **What it stores:** Selected model, chat mode
  - **Why needed:** Model/mode selection persists across pages
  - **Used by:** ModelSelector, WebSearchSelector, ConversationClient

- **`SidebarContext.tsx`** - Optimistic updates for sidebar
  - **What it stores:** Function to add conversations optimistically (before API confirms)
  - **Why needed:** When user creates new conversation, show it in sidebar immediately (before server confirms)
  - **Used by:** `MainInput` (adds conversation optimistically), `HistorySidebar` (receives the update)
  - **Key function:** `addConversationOptimistically()` - adds conversation to sidebar instantly

- **`HistorySidebarContext.tsx`** - History sidebar data and state
  - **What it stores:** List of conversations, loading state, search results, pagination state
  - **Why needed:** Manages all the data for the history sidebar (conversations list, loading, searching)
  - **Used by:** `HistorySidebar` component
  - **Key functions:** `loadConversations()`, `loadMoreConversations()`, `setSearchResults()`
  - **Difference:** `SidebarContext` = optimistic updates only, `HistorySidebarContext` = full data management
- **`NavigationContext.tsx`** - Navigation state
- **`ToastContext.tsx`** - Toast notification state
  - **What it stores:** Current toast messages
  - **Why needed:** Show success/error messages anywhere in app
  - **Used by:** All components that need to show notifications

### `lib/db/` - Database Code

**Purpose:** All code that talks to the database

**Organization:** Code is split by domain (conversations, messages, preferences, users, auth) for better maintainability.

#### Client-Side Queries (Domain-Specific Files)

**`queries.ts`** - Barrel export (48 lines, refactored)
- **What it does:** Re-exports all client-side query functions for backward compatibility
- **Note:** New code should import directly from domain-specific files
- **Used by:** Existing code (maintains backward compatibility)

**`conversations.ts`** - Conversation operations (268 lines)
- **What it does:** Client-side conversation queries
- **Functions:**
  - `getConversations()` - Get user's conversations with pagination
  - `getGuestConversations()` - Get guest conversations (via API)
  - `getConversationCount()` - Get total conversation count
  - `searchConversations()` - Search conversation titles
  - `createConversation()` - Create new conversation
  - `updateConversation()` - Update conversation title
  - `deleteConversation()` - Delete a conversation
  - `deleteAllConversations()` - Delete all user conversations
- **Used by:** HistorySidebar, ConversationClient

**`messages.ts`** - Message operations (109 lines)
- **What it does:** Client-side message queries
- **Functions:**
  - `getOlderMessages()` - Load older messages for pagination
- **Used by:** use-conversation-messages hook

**`preferences.ts`** - User preference operations (126 lines)
- **What it does:** Client-side preference queries
- **Functions:**
  - `getUserPreferences()` - Get user preferences (with defaults)
  - `updateUserPreferences()` - Update preferences (creates if missing)
- **Used by:** Settings page, Theme provider

**`users.ts`** - User profile operations (33 lines)
- **What it does:** Client-side user profile queries
- **Functions:**
  - `updateUserProfile()` - Update user name/avatar
- **Used by:** Settings page

**`auth.ts`** - Authentication operations (99 lines)
- **What it does:** Client-side auth-related queries
- **Functions:**
  - `getUserLinkedProviders()` - Get user's linked OAuth providers (with retry logic)
- **Used by:** AuthContext, Settings page

#### Server-Side Queries (`*.server.ts` files)

**What it does:** Functions that run on the server (more secure)
**Used by:** API routes, server components

**Authenticated User Operations:**
- **`conversations.server.ts`** - Create/update/delete conversations
- **`messages.server.ts`** - Authenticated message operations (154 lines, refactored)
  - `getMessagesServerSide()` - Get messages for authenticated users
  - `saveUserMessageServerSide()` - Save user messages
- **`preferences.server.ts`** - User preferences
- **`users.server.ts`** - User management
- **`subscriptions.server.ts`** - Subscription management
- **`rate-limits.server.ts`** - Rate limit tracking

**Guest Operations:**
- **`guest-conversations.server.ts`** - Guest conversation management (177 lines, updated)
  - `ensureGuestConversation()` - Create/validate guest conversations
  - `checkGuestConversationAccess()` - Verify conversation ownership
- **`guest-messages.server.ts`** - Guest message operations (180 lines, extracted)
  - `getGuestMessagesServerSide()` - Get messages for guest users
  - `saveGuestMessage()` - Save guest messages
- **`guest-transfer.server.ts`** - Transfer guest data to user account

**Barrel Exports:**
- **`queries.server.ts`** - Re-exports all server-side queries for backward compatibility

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
  - `mergeMessages()` - Combines database messages with new messages from `useChat` hook
  - `transformToQurseMessage()` - Converts messages to app format (QurseMessage)
  - **Used by:** `use-conversation-messages` hook (line 9, 247, 251)
  - **Why needed:** Database messages and streaming messages need to be merged without duplicates
  - **Example:** User has 10 old messages in DB, sends new message → merge them into one list

- **`rate-limit-utils.ts`** - Rate limit error handling
  - `isRateLimitError()` - Detects if error is rate limit
  - `extractRateLimitInfo()` - Gets reset time from error
  - **Used by:** use-chat-transport hook

- **`chat-mode-utils.ts`** - Chat mode mapping
  - `getOptionFromChatMode()` - Converts mode string ('web') to display name ('Web Search (Exa)')
  - `getChatModeFromOption()` - Converts display name back to mode string
  - **Used by:** `ConversationInput.tsx` (lines 12, 61, 63) - maps between UI dropdown and internal mode IDs
  - **Why needed:** UI shows friendly names, but backend needs mode IDs ('chat', 'web', 'arxiv')
  - **Example:** User selects "Web Search (Exa)" → converts to 'web' → sends to API

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

- **`session-validation.ts`** - Session validation utility (52 lines, extracted)
  - **What it does:** Validates Supabase session integrity
  - **Why needed:** Prevents using corrupted sessions that cause errors
  - **Functions:**
    - `isValidSession()` - Checks if session has required fields and valid structure
  - **Used by:** AuthContext, use-pro-status, use-linked-providers hooks
  - **Why extracted:** Reusable validation logic used in multiple places

- **`rate-limit-headers.ts`** - Rate limit header utilities (36 lines, extracted)
  - **What it does:** Applies rate limit headers to HTTP responses
  - **Functions:**
    - `applyRateLimitHeaders()` - Sets rate limit headers (remaining, limit, reset)
    - `applyConversationIdHeader()` - Sets conversation ID header
  - **Used by:** `app/api/chat/route.ts`
  - **Why extracted:** Centralized header logic for consistency

- **`ip-extraction.ts`** - IP address extraction
  - **What it does:** Gets user's IP from request
  - **Used by:** Guest rate limiting

- **`convo-title-generation.ts`** - Auto-generates conversation titles
- **`message-adapters.ts`** - Converts message formats
- **`message-parts-fallback.ts`** - Handles old message formats
- **`toast.ts`** - Toast notification helpers
- **`validate-return-url.ts`** - Validates redirect URLs for security
  - **What it does:** Ensures redirect URLs after OAuth login are safe (no open redirect attacks)
  - **Used by:** `app/auth/callback/route.ts` (line 12, 148) - after Google/Twitter/GitHub login
  - **Why needed:** Security - prevents attackers from redirecting users to malicious sites
  - **Example:** User logs in from `/conversation/abc?message=hi` → validates URL → redirects back safely
  - **What it checks:** Must be relative path (/...), no external URLs, no path traversal (../), max length

### `lib/validation/` - Input Validation

- **`chat-schema.ts`** - Validates chat API requests
  - **What it does:** Uses Zod to validate incoming requests to `/api/chat` (messages, model, conversationId)
  - **Used by:** `app/api/chat/route.ts` (line 15, 181) - validates request before processing
  - **Why needed:** Security and data integrity - rejects invalid/malicious requests
  - **What it validates:** 
    - Conversation ID format (UUID)
    - Message structure (must have parts or content)
    - Model name (must exist in registry)
    - Message length (max 10,000 chars)
  - **Example:** Invalid model name → returns 400 error before calling AI

### What is Zod?

**Zod** is a TypeScript-first validation library. Think of it as a "data checker" that ensures data matches what you expect.

**Simple Explanation:**
- Like a bouncer at a club checking IDs
- Before your code uses data, Zod checks if it's valid
- If invalid → throws error (doesn't let bad data through)
- If valid → data is safe to use

**Example from codebase:**

```typescript
// Define what a valid message looks like
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),  // Must be 'user' or 'assistant'
  parts: z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
  })),
});

// Validate incoming data
const result = messageSchema.safeParse(incomingData);

if (!result.success) {
  // Data is invalid - reject it
  return error('Invalid message format');
}

// Data is valid - use it safely
const validMessage = result.data;
```

**Why use Zod?**
1. **Security:** Prevents malicious/invalid data from breaking your app
2. **Type Safety:** TypeScript knows the data structure after validation
3. **Clear Errors:** Shows exactly what's wrong with invalid data
4. **Documentation:** Schema serves as documentation of expected data

**Real example from codebase:**
- User sends message to `/api/chat`
- Zod checks: Is conversationId a valid UUID? Is message text under 10,000 chars?
- If invalid → API returns 400 error immediately (doesn't even call AI)
- If valid → API processes the request

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

**What it does:** Defines all data structures used throughout the app
- **User, Message, Conversation types** - Core data structures
- **API request/response types** - What API routes expect/return
- **QurseMessage type** - Message format with parts array (for AI SDK)
- **Used by:** Entire codebase for type safety
- **Why needed:** TypeScript catches errors before code runs, ensures data matches expected format
- **Example:** If you try to use `message.content` but message has `message.parts`, TypeScript shows error

---

## 💾 Caching Explained

**What is caching?** Storing data temporarily so you don't have to fetch it again.

**Why use caching?** Makes app faster by avoiding repeated database/API calls.

### Types of Caching in This App

#### 1. **Context-Based Caching (React State)**

**Where:** `lib/contexts/` folder

**How it works:** React Context stores data in memory, persists across page navigations

**Examples:**

**`AuthContext.tsx` - Caches User Data:**
```typescript
// Fetches once when user loads, then caches in state
// Comment says: "cached across navigations"
if (!providersFetchInitiatedRef.current) {
  providersFetchInitiatedRef.current = true;
  getUserLinkedProviders().then(providers => {
    setLinkedProviders(providers); // Cached in state
  });
}
```

**What it caches:**
- Linked OAuth providers (Google, Twitter, GitHub)
- Pro subscription status
- User profile data

**Why:** These don't change often, so fetch once and reuse

**`HistorySidebarContext.tsx` - Caches Conversations:**
```typescript
const [chatHistory, setChatHistory] = useState<Conversation[]>([]);
const [hasLoaded, setHasLoaded] = useState(false);

// Only loads if not already loaded
if (!hasLoaded) {
  loadConversations(); // Fetches from database
  setHasLoaded(true); // Marks as loaded
}
```

**What it caches:**
- List of conversations
- Total conversation count
- Search results

**Why:** Don't reload conversations every time user opens sidebar

**How it works:**
1. First time: Fetches from database, stores in `chatHistory` state
2. Next time: Uses cached `chatHistory` (doesn't fetch again)
3. Reset: When user logs out, clears cache

#### 2. **In-Memory Cache (Map-Based)**

**Where:** `ai/models.ts` (line 268-328)

**How it works:** JavaScript `Map` object stores model configs in memory

```typescript
// Create cache when server starts
const modelConfigCache = new Map<string, ModelConfig>();

// Fill cache once at startup
models.forEach((model) => {
  modelConfigCache.set(model.value, model);
});

// Fast lookup (O(1) - instant)
export function getModelConfig(modelValue: string): ModelConfig | undefined {
  return modelConfigCache.get(modelValue); // ✅ Instant lookup
}
```

**What it caches:**
- Model configurations (names, providers, capabilities)
- Model access rules (free vs Pro)

**Why:** 
- **Before:** Used `Array.find()` - searched through all models every time (slow)
- **After:** Uses `Map.get()` - instant lookup (fast)
- Called 3-4 times per API request, so speed matters

**Performance:**
- **Before:** O(n) - searches 10 models, 4 times = 40 operations per request
- **After:** O(1) - instant lookup, 4 times = 4 operations per request
- **Improvement:** 10x faster

#### 3. **Next.js Built-in Caching**

**Where:** Server components and API routes

**How it works:** Next.js automatically caches server-side data

**Examples:**

**Server Components:**
```typescript
// app/(search)/conversation/[id]/page.tsx
// Next.js caches this page on the server
export default async function ConversationPage() {
  const messages = await getMessagesServerSide(...); // Cached by Next.js
}
```

**What Next.js caches:**
- Server component renders
- Database queries (if using `fetch` with cache options)
- Static assets

**Cache Duration:**
- Default: Until you redeploy
- Can configure with `revalidate` option

#### 4. **Redis Cache (Rate Limiting)**

**Where:** `lib/redis/client.ts`

**How it works:** Redis (external cache server) stores rate limit data

```typescript
// Redis stores IP addresses and message counts
export const ipRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'), // 10 messages per 24 hours
});
```

**What it caches:**
- IP addresses and message counts (for guest rate limiting)
- Sliding window timestamps

**Why:** 
- Fast lookups (Redis is super fast)
- Persists across server restarts
- Shared across multiple server instances

**Not really caching:** More like a fast database for rate limiting

### Cache Invalidation (When to Clear Cache)

**Context Caches:**
- **AuthContext:** Clears when user logs out
- **HistorySidebarContext:** Clears when user logs out, or when `forceRefresh` is called

**Model Config Cache:**
- Never clears (models don't change at runtime)
- Only resets when server restarts

**Next.js Cache:**
- Clears on deployment
- Can manually clear with `revalidatePath()` or `revalidateTag()`

### Cache Strategy Summary

| Cache Type | Location | What It Caches | When It Clears |
|------------|----------|----------------|----------------|
| **Context State** | `lib/contexts/` | User data, conversations | On logout or manual refresh |
| **In-Memory Map** | `ai/models.ts` | Model configs | Never (server restart only) |
| **Next.js Cache** | Server components | Page renders, queries | On deployment |
| **Redis** | `lib/redis/` | Rate limit data | Automatic (sliding window) |

### Why Caching Matters

**Without caching:**
- Every page load = fetch user data again
- Every API request = search through all models
- Every sidebar open = reload all conversations
- **Result:** Slow, expensive, bad UX

**With caching:**
- User data fetched once, reused everywhere
- Model lookups instant (Map-based)
- Conversations loaded once, reused
- **Result:** Fast, cheap, great UX

### Example: User Opens Sidebar

**Without caching:**
```
User clicks sidebar
  ↓
Fetch conversations from database (200ms)
  ↓
Render list
Total: 200ms
```

**With caching:**
```
User clicks sidebar (first time)
  ↓
Fetch conversations from database (200ms)
  ↓
Store in HistorySidebarContext
  ↓
Render list
Total: 200ms

User closes and reopens sidebar
  ↓
Use cached conversations (0ms)
  ↓
Render list
Total: 0ms (instant!)
```

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

## 🚀 AI SDK Usage - Complete Guide

### What is AI SDK?

AI SDK is a library from Vercel that makes it easy to build AI chat apps. It handles:
- Streaming responses (showing text as it arrives)
- Message management
- Tool calling (AI can use functions)
- Multiple providers (OpenAI, Anthropic, etc.)

### Current AI SDK Usage

#### 1. **Client-Side: `useChat` Hook**

**File:** `hooks/use-chat-transport.ts` (line 84-88)

**What it does:**
- Manages message state (automatically updates as AI responds)
- Handles streaming (receives chunks and updates UI)
- Provides `sendMessage()` function
- Tracks loading status (`idle`, `streaming`, `submitted`)

**Returns:**
- `messages` - Array of all messages
- `sendMessage` - Function to send new message
- `status` - Current state ('idle' | 'streaming' | 'submitted')
- `error` - Any errors that occurred

**Used by:** `ConversationClient.tsx` (line 40)

#### 2. **Server-Side: `streamText` Function**

**File:** `app/api/chat/route.ts` (line 441-469)

**What it does:**
- Calls the AI provider (OpenAI, Anthropic, etc.)
- Streams response back chunk by chunk
- Handles tool calling (if tools are provided)
- Manages retries on errors

**Parameters:**
- `model` - Which AI model to use
- `messages` - Conversation history
- `system` - System prompt (instructions for AI)
- `tools` - Functions AI can call (web search, etc.)

#### 3. **Server-Side: `createUIMessageStream`**

**File:** `app/api/chat/route.ts` (line 414-496)

**What it does:**
- Wraps `streamText` to format response for UI
- Handles reasoning (AI's thinking process) - shows/hides based on model
- Converts to UI message format (parts array)
- Returns stream that `useChat` can consume

#### 4. **Message Format Conversion**

**File:** `app/api/chat/route.ts` (line 443)

**What it does:**
- Converts UI message format (with parts array) to model format (content string)
- Different providers need different formats
- AI SDK handles this conversion automatically

### Future AI SDK Features

#### 1. **Tool Calling (Functions AI Can Use)**

**Current State:** Infrastructure ready, no tools registered yet

**Files:**
- `lib/tools/registry.ts` - Tool registry system
- `ai/config.ts` - Chat modes define which tools they can use

**How it will work:**
- Register tools using `registerTool()` function
- Pass tools to `streamText()` in API route
- AI decides when to call tools based on user request

**Future Tools:**
- Web search (Exa, Tavily)
- Code execution
- File reading
- Database queries
- Custom business logic

#### 2. **More Chat Modes**

**Current:** Basic chat mode only

**Future Modes:**
- **Web Search Mode:** AI can search the web for current information
- **arXiv Mode:** AI can search and read research papers
- **Code Mode:** AI can execute code and show results
- **Analysis Mode:** AI can analyze data and create visualizations

#### 3. **More Models**

**Current:** ~10 models from various providers

**Future:**
- Add more models as they're released
- Support new providers
- Custom fine-tuned models

#### 4. **AI Agents (Advanced Tool Calling)**

**Future Feature:** AI agents that can:
- Chain multiple tool calls
- Make decisions based on tool results
- Iterate until goal is achieved

### AI SDK Flow Diagram

```
User types message
  ↓
useChat.sendMessage() called
  ↓
POST to /api/chat
  ↓
Server: streamText() calls AI provider
  ↓
AI provider streams response
  ↓
createUIMessageStream formats for UI
  ↓
Server sends chunks via SSE (Server-Sent Events)
  ↓
useChat receives chunks
  ↓
messages state updates automatically
  ↓
UI re-renders with new chunks
  ↓
User sees response streaming in
```

### Key AI SDK Concepts

**1. Streaming:** Response comes in chunks, not all at once
- User sees text appear word by word
- Better UX (feels faster)
- Lower latency (first chunk arrives quickly)

**2. Parts Array:** Messages have multiple parts
- Text parts: The actual message
- Tool call parts: When AI wants to use a function
- Reasoning parts: AI's thinking process (for reasoning models)

**3. Transport:** How messages are sent/received
- `DefaultChatTransport` - Standard HTTP POST/SSE
- Can be customized for different protocols

**4. Tools:** Functions AI can call
- Defined using `tool()` function
- AI decides when to call them
- Results fed back to AI

---

## 🎣 React Hooks Explained

### What are Hooks?

Hooks are special functions in React that let you "hook into" React features. They always start with `use`.

### Built-in React Hooks

#### `useState` - Store Data

**What it does:** Stores a value that can change, and re-renders component when it changes

**Example:**
```typescript
const [count, setCount] = useState(0);
// count = 0 (initial value)
// setCount(5) → count becomes 5, component re-renders
```

**Used everywhere:** Almost every component that has changing data

#### `useEffect` - Run Code After Render

**What it does:** Runs code after component renders (or when dependencies change)

**Example:**
```typescript
useEffect(() => {
  // This runs after component renders
  console.log('Component rendered');
  
  // Cleanup function (runs when component unmounts)
  return () => {
    console.log('Component unmounting');
  };
}, [dependency]); // Only runs when dependency changes
```

**Used for:**
- Fetching data
- Setting up event listeners
- Cleanup (removing listeners, canceling requests)

**Example in codebase:** `use-conversation-lifecycle.ts` (line 40-54) - redirects on logout

#### `useRef` - Store Value Without Re-render

**What it does:** Stores a value that persists across renders but doesn't cause re-render when changed

**Example:**
```typescript
const inputRef = useRef<HTMLInputElement>(null);
// Later: inputRef.current.focus() - doesn't cause re-render
```

**Used for:**
- DOM element references
- Storing values that shouldn't trigger re-renders
- Previous value tracking

**Example in codebase:** `use-conversation-scroll.ts` - stores scroll position

#### `useMemo` - Remember Calculated Value

**What it does:** Remembers a calculated value, only recalculates when dependencies change

**Example:**
```typescript
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]); // Only recalculates when data changes
```

**Used for:** Performance - avoid recalculating expensive operations

#### `useCallback` - Remember Function

**What it does:** Remembers a function, only recreates when dependencies change

**Example:**
```typescript
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]); // Only recreates when value changes
```

**Used for:** Performance - avoid recreating functions on every render

### AI SDK Hook: `useChat`

**What it does:** Special hook from AI SDK for chat functionality

**What it provides:**
- `messages` - Array of all messages
- `sendMessage` - Function to send message
- `status` - Current state ('idle' | 'streaming' | 'submitted')
- `error` - Any errors

**How it works:**
- Automatically manages message state
- Handles streaming (updates as chunks arrive)
- Manages loading states
- Handles errors

**Example:**
```typescript
const { messages, sendMessage, status } = useChat({
  api: '/api/chat',
});

// Send message
sendMessage({
  role: 'user',
  parts: [{ type: 'text', text: 'Hello' }],
});

// messages automatically updates as AI responds
```

**Used in:** `hooks/use-chat-transport.ts` (wraps `useChat` for our app)

### Custom Hooks (Our App)

**What they are:** Hooks we created to reuse logic

**Examples:**
- `useConversationMessages` - Manages message loading and merging
- `useConversationScroll` - Manages scroll behavior
- `useChatTransport` - Wraps `useChat` with our custom logic

**Why create custom hooks:**
- Reuse logic across components
- Keep components clean
- Easier to test

### Hook Rules

1. **Only call hooks at top level** (not inside if statements)
2. **Only call hooks from React components or other hooks**
3. **Hooks must be called in same order every render**

### Hook Comparison

| Hook | Purpose | When to Use |
|------|---------|-------------|
| `useState` | Store changing data | Need to store value that changes |
| `useEffect` | Run code after render | Fetch data, setup listeners, cleanup |
| `useRef` | Store value without re-render | DOM refs, previous values |
| `useMemo` | Remember calculated value | Expensive calculations |
| `useCallback` | Remember function | Pass function to child components |
| `useChat` | AI chat functionality | Building chat interface |
| Custom hooks | Reuse logic | Logic used in multiple places |

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
MainInput updates URL: /conversation/[id]?message=...&model=...&mode=...
  - **NOT legacy:** This is part of SPA implementation
  - **Why:** Passes initial message, model, and mode via URL params (no page reload)
  - **How:** Uses `window.history.replaceState()` - updates URL instantly (0ms delay)
  - **What happens:** `useConversationLifecycle` hook reads `?message=` param and auto-sends it
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
  - **What is `sendMessage()`?** Function returned by `useChat` hook from AI SDK
  - **Where is it?** `hooks/use-chat-transport.ts` (line 84-88) - wraps `useChat` hook
  - **What it does:** Sends message to `/api/chat` endpoint
  ↓
POST request to /api/chat
  - **What does this mean?** HTTP POST request = browser sends data to server
  - **Easy explanation:** Like mailing a letter - browser "mails" the message to server
  - **What's sent:** Message text, conversation ID, model name, chat mode
  - **Where it goes:** `app/api/chat/route.ts` receives it
  - **Example:** User types "Hello" → POST request with {message: "Hello", conversationId: "abc-123", ...}
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
  - **Where defined:** `hooks/use-conversation-messages.ts` (line 247) - `mergeMessages()` function
  - **What it does:** Combines old messages from database with new streaming messages
  ↓
ConversationThread displays new message
  - **Where defined:** `components/conversation/ConversationThread.tsx` (line 901-908)
  - **What it does:** Renders the message list using `ChatMessage` component
  ↓
useConversationScroll auto-scrolls to bottom
  - **Where defined:** `hooks/use-conversation-scroll.ts` (line 7-14) - `scrollToBottom()` function
  - **What it does:** Scrolls chat container to show latest message
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
AuthButton.tsx calls supabase.auth.signInWithOAuth()
  ↓
Redirects to Google OAuth page
  ↓
User logs in with Google
  ↓
Google redirects to /auth/callback?code=abc123&callbackUrl=/conversation/xyz
  ↓
app/auth/callback/route.ts runs:
  1. Exchanges code for session (Supabase)
  2. Gets user info from Google (email, name, avatar)
  3. Creates user profile in 'users' table (if new user)
  4. Creates user preferences in 'user_preferences' table (defaults)
  5. Creates subscription in 'subscriptions' table (free plan)
  6. Transfers guest data to user (lib/db/guest-transfer.server.ts):
     - Reads session_id from cookie
     - Derives session_hash (HMAC)
     - Transfers guest_conversations → conversations
     - Transfers guest_messages → messages
     - Merges rate_limits (adds counts together)
  7. Validates callbackUrl (security check)
  8. Redirects back to app (callbackUrl or homepage)
  ↓
AuthContext detects new session
  ↓
Fetches Pro status from /api/user/subscription
  ↓
UI updates (shows user name, avatar, Pro badge if applicable)
```

**Key Files:**
- `components/auth/AuthButton.tsx` - Initiates OAuth flow
- `app/auth/callback/route.ts` - Handles OAuth callback
- `lib/db/guest-transfer.server.ts` - Transfers guest data
- `lib/contexts/AuthContext.tsx` - Manages auth state

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

---

## 🔄 Recent Refactoring (2025-01-18)

**What changed:** Large files were split into smaller, focused modules following single responsibility principle.

### File Size Reductions
- `Header.tsx`: 530 → 257 lines (51% reduction)
- `AuthContext.tsx`: 736 → 350 lines (52% reduction)
- `app/api/chat/route.ts`: 651 → 515 lines (21% reduction)
- `queries.ts`: 737 → 48 lines (93% reduction, now barrel export)
- `messages.server.ts`: 434 → 154 lines (64% reduction)

### New Files Created

**Components:**
- `components/layout/HeaderDropdown.tsx` (248 lines) - Extracted dropdown menu
- `components/layout/AuthButtons.tsx` (26 lines) - Extracted auth buttons
- `components/ui/ThemeSelector.tsx` (83 lines) - Extracted theme selector

**Hooks:**
- `hooks/use-pro-status.ts` (225 lines) - Pro subscription management
- `hooks/use-linked-providers.ts` (80 lines) - OAuth provider management

**Utilities:**
- `lib/utils/session-validation.ts` (52 lines) - Session validation
- `lib/utils/rate-limit-headers.ts` (36 lines) - Rate limit header utilities

**Database (Domain-Specific):**
- `lib/db/conversations.ts` (268 lines) - Client-side conversation queries
- `lib/db/messages.ts` (109 lines) - Client-side message queries
- `lib/db/preferences.ts` (126 lines) - Client-side preference queries
- `lib/db/users.ts` (33 lines) - Client-side user queries
- `lib/db/auth.ts` (99 lines) - Client-side auth queries
- `lib/db/guest-messages.server.ts` (180 lines) - Guest message operations

**Benefits:**
- ✅ All files under 600 lines
- ✅ Clear domain separation
- ✅ Better code organization
- ✅ Easier to maintain and test
- ✅ Backward compatible (barrel exports)

