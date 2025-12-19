<!-- 3bee7974-cd8b-4119-b2e6-2b762527da3e 5deb6b61-e597-471c-ae71-2e9663a916e8 -->
# Refactoring Plan: Large Files Cleanup

## Overview

Refactor 5 large files totaling 3,088 lines into smaller, focused modules following single responsibility principle. Remove dead code, eliminate duplicates, and improve maintainability without breaking any functionality.

## Files to Refactor

1. `app/api/chat/route.ts` (651 lines) → ~550 lines
2. `components/layout/Header.tsx` (530 lines) → ~330 lines  
3. `lib/db/queries.ts` (737 lines) → ~20 lines (barrel export) + 5 domain files (~100-250 lines each)
4. `lib/db/messages.server.ts` (434 lines) → ~150 lines (auth messages only) + guest-messages.server.ts (~150 lines)
5. `lib/contexts/AuthContext.tsx` (736 lines) → ~536 lines

**Total Reduction:** ~700 lines (23%) + Better organization via domain splitting

**Note:** `queries.ts` and `messages.server.ts` should be split by domain (conversations, messages, preferences, users, auth) to match the server-side structure and follow single responsibility principle. This is a critical refactoring for maintainability.

---

## Phase 1: Remove Dead Code (Safest First)

### 1.1 Remove Deprecated Function

**File:** `lib/db/messages.server.ts`

**Action:** Remove `countMessagesTodayServerSide` (lines 126-179)

**Verification:**

- Search confirmed: Only used in test files and documentation
- Marked `@deprecated` with note to remove after monitoring period
- Replaced by `checkRateLimit()` from `@/lib/services/rate-limiting`

**Steps:**

1. Remove function definition (lines 126-179)
2. Remove export from `lib/db/queries.server.ts` (line 13)
3. Run TypeScript compiler to verify no broken imports
4. Test rate limiting still works

**Risk:** Low - function is deprecated and unused

---

### 1.2 Remove Unused Legacy Functions

**File:** `lib/db/queries.ts`

**Functions to Remove:**

- `createMessage` (lines 479-512) - Uses old `content` format, not `parts`
- `getMessages` (lines 443-473) - Returns old `Message` type, replaced by `getOlderMessages`

**Verification:**

- Search confirmed: Only found in `queries.ts` itself and documentation
- Modern codebase uses `parts` array format
- `getOlderMessages` is the active function for message fetching

**Steps:**

1. Search codebase one final time for any imports of these functions
2. Remove both function definitions
3. Run TypeScript compiler
4. Test message creation/loading still works

**Risk:** Low - functions appear unused, but verify first

---

## Phase 2: Eliminate Duplicate Logic

### 2.1 Consolidate `ensureConversation` Functions

**Problem:** Three implementations of similar logic:

- `app/api/chat/route.ts` (lines 35-108) - Returns `string`
- `lib/db/queries.ts` (lines 538-600) - Returns `void`
- `lib/db/conversations.server.ts` (lines 15-75) - Returns `void` (server-side)

**Solution:** Use `ensureConversationServerSide` from `conversations.server.ts` everywhere

**File:** `app/api/chat/route.ts`

**Changes:**

1. Remove local `ensureConversation` function (lines 35-108)
2. Import `ensureConversationServerSide` from `@/lib/db/conversations.server`
3. Update call site (line 352):
   ```typescript
   // Before:
   const convId = await ensureConversation(user, conversationId, title, supabaseClient);
   
   // After:
   await ensureConversationServerSide(conversationId, user.id, title);
   const convId = conversationId; // Already validated
   ```

4. Handle return value difference (server version returns void, but we already have conversationId)

**File:** `lib/db/queries.ts`

**Changes:**

1. Remove `ensureConversation` function (lines 538-600)
2. Update any callers to use server-side version or remove if unused

**Verification:**

- Test conversation creation in chat route
- Test conversation creation from client-side (if `queries.ts` version is used)
- Verify race condition handling still works

**Risk:** Medium - Need to ensure return value handling is correct

---

### 2.2 Extract `saveUserMessage` to Server Module

**File:** `app/api/chat/route.ts`

**Action:** Move `saveUserMessage` (lines 114-154) to `lib/db/messages.server.ts`

**Steps:**

1. Create `saveUserMessageServerSide` in `messages.server.ts`:
   ```typescript
   export async function saveUserMessageServerSide(
     conversationId: string,
     userMessage: UIMessage,
     supabaseClient: Awaited<ReturnType<typeof createClient>>
   ): Promise<boolean>
   ```

2. Update `route.ts` to import and use it
3. Remove local function from `route.ts`
4. Update call site (line 379)

**Verification:**

- Test user message saving in chat route
- Verify parts array format is preserved

**Risk:** Low - Simple extraction

---

## Phase 3: Extract Components (Header.tsx)

### 3.1 Extract HeaderDropdown Component

**File:** `components/layout/Header.tsx`

**Action:** Extract dropdown menu (lines 243-504, ~260 lines) to separate component

**New File:** `components/layout/HeaderDropdown.tsx`

**Extract:**

- Dropdown menu structure
- User profile section
- Theme selector
- Settings/About/Terms/Privacy items
- Sign out/Sign in button

**Props:**

```typescript
interface HeaderDropdownProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
  callbackUrl: string;
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  resolvedTheme: 'light' | 'dark';
  mounted: boolean;
}
```

**Steps:**

1. Create `HeaderDropdown.tsx`
2. Move dropdown JSX and logic
3. Update `Header.tsx` to import and use component
4. Move inline styles to CSS classes where possible

**Verification:**

- Test dropdown opens/closes
- Test theme switching
- Test sign out flow
- Test navigation links

**Risk:** Low - UI component extraction

---

### 3.2 Extract ThemeSelector Component

**File:** `components/layout/HeaderDropdown.tsx` (from Phase 3.1)

**Action:** Extract theme selector section (lines 313-374) to separate component

**New File:** `components/ui/ThemeSelector.tsx`

**Props:**

```typescript
interface ThemeSelectorProps {
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  resolvedTheme: 'light' | 'dark';
  mounted: boolean;
}
```

**Steps:**

1. Create `ThemeSelector.tsx`
2. Extract theme button logic
3. Update `HeaderDropdown.tsx` to use it

**Verification:**

- Test theme switching works
- Test theme persistence

**Risk:** Low - Simple component extraction

---

### 3.3 Extract AuthButtons Component

**File:** `components/layout/Header.tsx`

**Action:** Extract auth buttons section (lines 170-186) to separate component

**New File:** `components/layout/AuthButtons.tsx`

**Props:**

```typescript
interface AuthButtonsProps {
  callbackUrl: string;
}
```

**Steps:**

1. Create `AuthButtons.tsx`
2. Extract login/signup buttons
3. Update `Header.tsx` to use it

**Verification:**

- Test login/signup navigation
- Test callback URL preservation

**Risk:** Low - Simple component extraction

---

## Phase 4: Extract Hooks (AuthContext.tsx)

### 4.1 Extract Session Validation Logic

**File:** `lib/contexts/AuthContext.tsx`

**Action:** Extract `isValidSession` and related validation (lines 16-53) to utility

**New File:** `lib/utils/session-validation.ts`

**Extract:**

- `isValidSession` function
- Session structure validation logic

**Steps:**

1. Create `session-validation.ts`
2. Move `isValidSession` function
3. Update `AuthContext.tsx` to import it
4. Remove duplicate validation comments

**Verification:**

- Test session validation still works
- Test corrupted session handling

**Risk:** Low - Pure function extraction

---

### 4.2 Extract useProStatus Hook

**File:** `lib/contexts/AuthContext.tsx`

**Action:** Extract Pro status fetching logic to custom hook

**New File:** `hooks/use-pro-status.ts`

**Extract:**

- Pro status state management
- Fetching logic (lines 309-340, 475-504)
- Realtime subscription for Pro status updates (lines 552-677)

**Returns:**

```typescript
{
  isProUser: boolean;
  isLoadingProStatus: boolean;
}
```

**Steps:**

1. Create `use-pro-status.ts` hook
2. Move Pro status state and fetching
3. Move realtime subscription logic
4. Update `AuthContext.tsx` to use hook
5. Ensure session validation is passed correctly

**Verification:**

- Test Pro status loading
- Test Pro status updates via realtime
- Test Pro status after upgrade

**Risk:** Medium - Complex state and realtime logic

---

### 4.3 Extract useLinkedProviders Hook

**File:** `lib/contexts/AuthContext.tsx`

**Action:** Extract linked providers fetching logic to custom hook

**New File:** `hooks/use-linked-providers.ts`

**Extract:**

- Linked providers state management
- Fetching logic (lines 285-307, 449-471)

**Returns:**

```typescript
{
  linkedProviders: string[];
  isLoadingProviders: boolean;
}
```

**Steps:**

1. Create `use-linked-providers.ts` hook
2. Move providers state and fetching
3. Update `AuthContext.tsx` to use hook

**Verification:**

- Test providers loading
- Test providers display in UI

**Risk:** Low - Simple state extraction

---

### 4.4 Clean Up AuthContext Comments

**File:** `lib/contexts/AuthContext.tsx`

**Action:** Remove excessive "CRITICAL" comments (52 instances)

**Strategy:**

- Keep essential JSDoc comments
- Remove redundant "CRITICAL" markers
- Convert important notes to proper JSDoc `@remarks`

**Steps:**

1. Review all "CRITICAL" comments
2. Convert essential ones to JSDoc
3. Remove redundant ones
4. Ensure code is self-documenting

**Verification:**

- Code still compiles
- No functionality changes

**Risk:** Low - Comment cleanup only

---

## Phase 5: Refactor Chat Route (route.ts)

### 5.1 Extract Helper Functions

**File:** `app/api/chat/route.ts`

**Actions:**

1. Move `saveUserMessage` → `messages.server.ts` (already planned in Phase 2.2)
2. Remove `ensureConversation` → use server version (already planned in Phase 2.1)
3. Extract rate limit header application logic to utility

**New File:** `lib/utils/rate-limit-headers.ts`

**Extract:**

- `applyRateLimitHeaders` function (lines 232-237)
- `applyConversationIdHeader` function (lines 238-242)

**Steps:**

1. Create utility file
2. Move header application logic
3. Update `route.ts` to import and use

**Verification:**

- Test rate limit headers are set correctly
- Test conversation ID header is set

**Risk:** Low - Simple utility extraction

---

### 5.2 Clean Up Comments

**File:** `app/api/chat/route.ts`

**Action:** Remove excessive "CRITICAL" comments, convert to JSDoc

**Steps:**

1. Review all "CRITICAL" comments (lines 315, 343, 344)
2. Convert to JSDoc where needed
3. Remove redundant ones

**Verification:**

- Code still compiles
- No functionality changes

**Risk:** Low - Comment cleanup only

---

## Phase 6: Split Client-Side Queries by Domain

### 6.1 Split `queries.ts` into Domain-Specific Files

**Problem:** `queries.ts` (587 lines after cleanup) mixes multiple domains:

- Conversations (8 functions)
- Messages (1 function after cleanup)
- Preferences (2 functions)
- User (1 function)
- Auth (1 function)

**Solution:** Split into domain-specific files matching server-side structure

**New Files to Create:**

1. `lib/db/conversations.ts` (~250 lines)

   - `getConversations`
   - `getGuestConversations`
   - `getConversationCount`
   - `searchConversations`
   - `createConversation`
   - `updateConversation`
   - `deleteConversation`
   - `deleteAllConversations`

2. `lib/db/messages.ts` (~100 lines)

   - `getOlderMessages`

3. `lib/db/preferences.ts` (~120 lines)

   - `getUserPreferences`
   - `updateUserPreferences`

4. `lib/db/users.ts` (~50 lines)

   - `updateUserProfile`

5. `lib/db/auth.ts` (~100 lines)

   - `getUserLinkedProviders`

**Update `queries.ts`:**

- Convert to barrel export file (~20 lines)
- Re-export all functions for backward compatibility
- Add deprecation notice: "Import from domain-specific files instead"

**Steps:**

1. Create domain-specific files
2. Move functions to appropriate files
3. Update `queries.ts` to re-export
4. Run TypeScript compiler to find any direct imports
5. Update imports gradually (or keep barrel export for compatibility)

**Verification:**

- All imports still work (backward compatible)
- TypeScript compiles
- Test conversation operations
- Test message loading
- Test preferences
- Test user profile updates
- Test auth providers

**Risk:** Low - Backward compatible via barrel export

---

## Phase 7: Split Server-Side Messages by Domain

### 7.1 Separate Guest Operations from Authenticated Messages

**Problem:** `messages.server.ts` (384 lines after cleanup) mixes:

- Authenticated messages (1 function)
- Guest conversations (1 function) - Should be in `guest-conversations.server.ts`
- Guest messages (2 functions) - Should be in separate file

**Solution:** Move guest operations to appropriate files

**Changes:**

1. **Move to `guest-conversations.server.ts`:**

   - `ensureGuestConversation` (lines 197-299)

2. **Create `lib/db/guest-messages.server.ts` (~150 lines):**

   - `getGuestMessagesServerSide`
   - `saveGuestMessage`
   - `extractMessageText` (helper function)

3. **Keep in `messages.server.ts` (~150 lines):**

   - `getMessagesServerSide`
   - `saveUserMessageServerSide` (from Phase 2.2)

**Update `queries.server.ts`:**

- Update exports to reflect new structure

**Steps:**

1. Check if `guest-conversations.server.ts` already exists
2. Move `ensureGuestConversation` to appropriate file
3. Create `guest-messages.server.ts`
4. Move guest message functions
5. Update imports in `route.ts` and other files
6. Update `queries.server.ts` exports

**Verification:**

- Test guest conversation creation
- Test guest message saving
- Test authenticated message loading
- Test chat route with both guest and auth flows

**Risk:** Medium - Need to update multiple imports

---

## Phase 8: Consolidate Legacy Content Conversion

### 8.1 Centralize Legacy Conversion

**Problem:** `convertLegacyContentToParts` called in multiple places:

- `lib/db/queries.ts` / `lib/db/messages.ts` (after split)
- `lib/db/messages.server.ts` (after cleanup)
- `lib/db/guest-messages.server.ts` (after split)

**Action:** Ensure conversion is centralized in `lib/utils/message-parts-fallback.ts`

**Verification:**

- Check if all calls use the same utility
- Verify conversion logic is consistent

**Steps:**

1. Review all conversion call sites
2. Ensure they all use `convertLegacyContentToParts`
3. Document when conversion is needed vs when parts already exist

**Risk:** Low - Verification only

---

## Testing Strategy

### Unit Tests (Manual Verification)

For each phase:

1. **Type Safety:**

   - Run `tsc --noEmit` after each change
   - Fix any type errors immediately

2. **Functionality Tests:**

   - **Phase 1:** Verify rate limiting still works
   - **Phase 2:** Test conversation creation, message saving
   - **Phase 3:** Test header dropdown, theme switching, auth buttons
   - **Phase 4:** Test Pro status, linked providers, session validation
   - **Phase 5:** Test chat route, rate limit headers
   - **Phase 6:** Test message loading with legacy content

3. **Integration Tests:**

   - Send a chat message end-to-end
   - Create new conversation
   - Switch themes
   - Sign in/out
   - Test rate limiting popups

### Verification Checklist

After all phases:

- [ ] TypeScript compiles without errors
- [ ] No linter errors
- [ ] Chat messages send and receive correctly
- [ ] Conversations create and load correctly
- [ ] Rate limiting works (guest and authenticated)
- [ ] Header dropdown works
- [ ] Theme switching works
- [ ] Auth buttons work
- [ ] Pro status loads and updates
- [ ] Linked providers load
- [ ] Session validation works
- [ ] No console errors in browser
- [ ] No broken imports

---

## File Structure After Refactoring

```
components/
  layout/
    ├── Header.tsx (~330 lines) - Main header orchestrator
    ├── HeaderDropdown.tsx (~200 lines) - Dropdown menu
    └── AuthButtons.tsx (~30 lines) - Auth buttons

components/
  ui/
    └── ThemeSelector.tsx (~60 lines) - Theme selector

hooks/
  ├── use-pro-status.ts (~150 lines) - Pro status management
  └── use-linked-providers.ts (~80 lines) - Linked providers

lib/
  utils/
    ├── session-validation.ts (~50 lines) - Session validation
    └── rate-limit-headers.ts (~30 lines) - Rate limit headers

lib/
  db/
    ├── queries.ts (~20 lines) - Barrel export (backward compatibility)
    ├── conversations.ts (~250 lines) - Client-side conversation queries
    ├── messages.ts (~100 lines) - Client-side message queries
    ├── preferences.ts (~120 lines) - Client-side preference queries
    ├── users.ts (~50 lines) - Client-side user queries
    ├── auth.ts (~100 lines) - Client-side auth queries
    ├── messages.server.ts (~150 lines) - Authenticated message operations
    ├── guest-messages.server.ts (~150 lines) - Guest message operations
    └── conversations.server.ts (existing, used by route.ts)
```

---

## Risk Assessment

| Phase | Risk Level | Mitigation |

|-------|------------|------------|

| Phase 1: Dead Code Removal | Low | Verify unused before removal |

| Phase 2: Duplicate Elimination | Medium | Test conversation creation thoroughly |

| Phase 3: Component Extraction | Low | Test UI interactions |

| Phase 4: Hook Extraction | Medium | Test state management and realtime |

| Phase 5: Route Refactoring | Low | Test API endpoint |

| Phase 6: Legacy Consolidation | Low | Verification only |

---

## Execution Order

1. **Phase 1** (Dead Code) - Safest, quick wins
2. **Phase 6** (Legacy Verification) - No code changes, just verify
3. **Phase 2** (Duplicates) - Core logic consolidation
4. **Phase 5** (Route) - API endpoint cleanup
5. **Phase 3** (Components) - UI extraction
6. **Phase 4** (Hooks) - Most complex, do last

---

## Success Criteria

- All files under 600 lines
- No duplicate logic
- No dead code
- Type-safe throughout
- All tests pass
- No functionality broken
- Code is more maintainable