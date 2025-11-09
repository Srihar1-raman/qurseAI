# Hooks Implementation and Future Opportunities

## Overview

This document details the high-priority hooks extraction implementation and identifies additional hook opportunities for improving code organization, reusability, and maintainability.

---

## High-Priority Hooks Implementation

### 1. `useMobile` Hook

**File:** `hooks/use-mobile.ts`

**Purpose:** Detect if the viewport is mobile-sized with responsive breakpoint support.

**Implementation:**
```typescript
export function useMobile(breakpoint: number = 768): boolean
```

**Features:**
- Configurable breakpoint (default: 768px)
- Listens to window resize events
- Returns boolean indicating mobile state
- Properly cleans up event listeners

**Usage:**
```typescript
const isMobile = useMobile(); // Default 768px breakpoint
const isMobile = useMobile(1024); // Custom breakpoint
```

**Replaced Logic:**
- `components/homepage/MainInput.tsx` - Mobile detection with resize listener

**Benefits:**
- Reusable across components
- Consistent breakpoint handling
- Automatic cleanup

---

### 2. `useAutoFocus` Hook

**File:** `hooks/use-auto-focus.ts`

**Purpose:** Automatically focus an input element when user types (global keydown listener).

**Implementation:**
```typescript
export function useAutoFocus(
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
): void
```

**Features:**
- Focuses input when user presses any key
- Ignores modifier keys (Ctrl, Meta, Alt)
- Ignores Tab, Escape, Enter keys
- Only focuses if no input/textarea/contenteditable is currently focused
- Properly cleans up event listeners

**Usage:**
```typescript
const inputRef = useRef<HTMLTextAreaElement>(null);
useAutoFocus(inputRef);
```

**Replaced Logic:**
- `components/homepage/MainInput.tsx` - Auto-focus input when user types

**Benefits:**
- Clean, declarative API
- Handles edge cases automatically
- Reusable for any input/textarea

---

### 3. `useTextareaAutoResize` Hook

**File:** `hooks/use-textarea-auto-resize.ts`

**Purpose:** Automatically resize a textarea based on its content, optionally tracking multiline state.

**Implementation:**
```typescript
export function useTextareaAutoResize(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  options: UseTextareaAutoResizeOptions = {}
): UseTextareaAutoResizeReturn
```

**Options:**
- `maxHeight?: number` - Maximum height in pixels (default: 200)
- `minHeight?: number` - Minimum height in pixels (optional)
- `multilineThreshold?: number` - Threshold to determine multiline mode (default: 60)
- `onMultilineChange?: (isMultiline: boolean) => void` - Callback when multiline state changes

**Features:**
- Auto-resizes based on content
- Tracks multiline state for UI adjustments
- Scrolls to bottom if content exceeds max height
- Uses `useMobile` hook internally for responsive behavior
- Callback stability via `useRef` to prevent unnecessary re-renders

**Usage:**
```typescript
// With multiline tracking (MainInput)
const { isMultiline } = useTextareaAutoResize(inputRef, inputValue, {
  multilineThreshold: 60,
  maxHeight: 200,
});

// Without multiline tracking (ConversationClient)
useTextareaAutoResize(textareaRef, input, {
  maxHeight: 200,
});
```

**Replaced Logic:**
- `components/homepage/MainInput.tsx` - Textarea auto-resize with multiline detection
- `components/conversation/ConversationClient.tsx` - Textarea auto-resize

**Benefits:**
- Handles both simple and complex use cases
- Reusable across different components
- Consistent behavior

---

### 4. `useClickOutside` Hook

**File:** `hooks/use-click-outside.ts`

**Purpose:** Detect clicks outside of a referenced element (useful for closing dropdowns, modals, menus).

**Implementation:**
```typescript
export function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  enabled: boolean = true
): void
```

**Features:**
- Detects clicks outside the referenced element
- Optional enabled flag to control when the hook is active
- Callback stability via `useRef` to prevent unnecessary re-subscriptions
- Properly cleans up event listeners

**Usage:**
```typescript
const dropdownRef = useRef<HTMLDivElement>(null);
useClickOutside(dropdownRef, () => {
  setIsOpen(false);
  setSearchQuery('');
}, isOpen);
```

**Replaced Logic:**
- `components/homepage/ModelSelector.tsx` - Close dropdown on outside click
- `components/homepage/WebSearchSelector.tsx` - Close dropdown on outside click
- `components/layout/Header.tsx` - Close dropdown on outside click
- `components/ui/dropdown.tsx` - Close dropdown on outside click

**Benefits:**
- Consistent click-outside behavior
- Reduces code duplication
- Easy to enable/disable

---

### 5. `useConversationId` Hook

**File:** `hooks/use-conversation-id.ts`

**Purpose:** Extract conversation ID from URL pathname.

**Implementation:**
```typescript
export function useConversationId(): string | null
```

**Features:**
- Extracts conversation ID from URL pathname
- Handles both regular UUIDs and temp- prefixed IDs
- Returns `null` if no conversation ID found
- Uses `useMemo` for performance

**Usage:**
```typescript
const conversationId = useConversationId();
```

**Replaced Logic:**
- `app/(search)/page.tsx` - Conversation ID extraction from URL

**Benefits:**
- Centralized URL parsing logic
- Consistent ID extraction
- Easy to update if URL structure changes

---

### 6. `useInfiniteScroll` Hook

**File:** `hooks/use-infinite-scroll.ts`

**Purpose:** Detect when user scrolls near the edge of a container and trigger load more callback.

**Implementation:**
```typescript
export function useInfiniteScroll<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): void
```

**Options:**
- `threshold?: number` - Distance in pixels from edge to trigger load (default: 200)
- `direction?: 'bottom' | 'top'` - Direction to detect scroll (default: 'bottom')
- `enabled?: boolean` - Whether the hook is enabled (default: true)

**Features:**
- Supports both bottom and top scroll detection
- Configurable threshold
- Optional enabled flag
- Generic type support for any HTMLElement subtype
- Callback stability via `useRef` to prevent unnecessary re-subscriptions
- Properly cleans up event listeners

**Usage:**
```typescript
useInfiniteScroll(
  contentRef,
  loadMoreConversations,
  {
    threshold: 200,
    direction: 'bottom',
    enabled: isOpen && !searchQuery.trim() && hasMoreConversations && !isLoadingMore,
  }
);
```

**Replaced Logic:**
- `components/layout/history/HistorySidebar.tsx` - Scroll detection for infinite scrolling

**Benefits:**
- Flexible scroll direction support
- Reusable for any scrollable container
- Easy to configure

---

## Issues Found and Fixed

### 1. Callback Stability Issues

**Problem:** Callbacks in dependency arrays caused unnecessary re-subscriptions of event listeners.

**Solution:** Used `useRef` to store callbacks and removed them from dependency arrays:
- `useClickOutside` - Stores callback in ref
- `useInfiniteScroll` - Stores callback in ref
- `useTextareaAutoResize` - Stores callback in ref

**Impact:** Prevents unnecessary re-renders and event listener re-subscriptions, improving performance.

### 2. Type Safety Issues

**Problem:** Type mismatches between hook parameter types and component ref types.

**Solution:**
- Made `useInfiniteScroll` generic to accept any HTMLElement subtype
- Updated `useTextareaAutoResize` to accept `HTMLTextAreaElement | null`
- Ensured all hooks properly handle null refs

**Impact:** Better type safety and compatibility with React ref patterns.

---

## Future Hook Opportunities

### Medium-Priority Hooks

#### 1. `useScrollPositionRestore` Hook

**Purpose:** Restore scroll position when navigating back to a page.

**Use Cases:**
- Conversation list scroll position
- Message thread scroll position
- Any scrollable list that should remember position

**Implementation Ideas:**
- Store scroll position in sessionStorage or state
- Restore on mount
- Optional debouncing for performance

**Files to Extract From:**
- `components/conversation/ConversationClient.tsx` - Message thread scroll position
- `components/layout/history/HistorySidebar.tsx` - Conversation list scroll position

---

#### 2. `useConversationMessages` Hook

**Purpose:** Encapsulate conversation message loading, pagination, and state management.

**Use Cases:**
- Loading initial messages
- Loading older messages (pagination)
- Managing message state
- Handling loading/error states

**Implementation Ideas:**
- Combine `loadInitialMessages` and `loadOlderMessages` logic
- Manage `loadedMessages`, `hasMoreMessages`, `isLoadingOlderMessages` state
- Handle conversation ID changes
- Return messages, loading states, and load functions

**Files to Extract From:**
- `components/conversation/ConversationClient.tsx` - Message loading logic

---

#### 3. `useConversationHistory` Hook

**Purpose:** Encapsulate conversation history loading, pagination, and state management.

**Use Cases:**
- Loading conversation list
- Infinite scroll pagination
- Search functionality
- CRUD operations (rename, delete)

**Implementation Ideas:**
- Combine `loadConversations` and `loadMoreConversations` logic
- Manage `chatHistory`, `hasMoreConversations`, `isLoadingMore` state
- Handle search filtering
- Return conversations, loading states, and CRUD functions

**Files to Extract From:**
- `components/layout/history/HistorySidebar.tsx` - Conversation history logic

---

#### 4. `useDateGrouping` Hook

**Purpose:** Group items by date ranges (Today, Last 24 hours, Last 7 days, etc.).

**Use Cases:**
- Conversation history grouping
- Message grouping
- Any time-based grouping

**Implementation Ideas:**
- Accept array of items with timestamp
- Return grouped items with labels
- Configurable date ranges
- Optional sorting

**Files to Extract From:**
- `components/layout/history/HistorySidebar.tsx` - `getDateGroup` and `groupConversations` functions

---

#### 5. `useURLParams` Hook

**Purpose:** Extract and manage URL search parameters.

**Use Cases:**
- Reading URL parameters
- Updating URL parameters
- Syncing state with URL

**Implementation Ideas:**
- Use `useSearchParams` from Next.js
- Provide typed getters/setters
- Optional validation with Zod
- Handle encoding/decoding

**Files to Extract From:**
- `app/(search)/page.tsx` - `hasInitialMessageParam` logic
- Various components that read URL params

---

#### 6. `useRefsSync` Hook

**Purpose:** Sync multiple refs or sync ref with state.

**Use Cases:**
- Syncing scroll position refs
- Syncing multiple element refs
- Ref forwarding patterns

**Implementation Ideas:**
- Accept array of refs to sync
- Optional callback when refs change
- Handle null refs gracefully

**Files to Extract From:**
- `components/conversation/ConversationClient.tsx` - Multiple refs management

---

### Lower-Priority Hooks

#### 1. `useDebounce` Hook

**Purpose:** Debounce a value or function call.

**Use Cases:**
- Search input debouncing
- API call debouncing
- Resize event debouncing

**Implementation Ideas:**
- Generic hook that accepts value and delay
- Returns debounced value
- Optional callback version

**Potential Usage:**
- `components/layout/history/HistorySearch.tsx` - Search input debouncing
- `components/homepage/ModelSelector.tsx` - Search query debouncing

---

#### 2. `useLocalStorage` Hook

**Purpose:** Sync state with localStorage.

**Use Cases:**
- User preferences
- Theme settings
- Draft messages
- User preferences

**Implementation Ideas:**
- Accept key and initial value
- Returns [value, setValue] similar to useState
- Handles JSON serialization
- Optional validation

**Potential Usage:**
- Theme preferences
- User settings
- Draft message storage

---

#### 3. `useWindowSize` Hook

**Purpose:** Track window dimensions.

**Use Cases:**
- Responsive layouts
- Conditional rendering based on size
- Dynamic calculations

**Implementation Ideas:**
- Returns width and height
- Optional debouncing for performance
- Handles SSR (server-side rendering)

**Potential Usage:**
- Responsive component rendering
- Dynamic layout calculations

---

## Implementation Statistics

### Hooks Created: 6
- `useMobile`
- `useAutoFocus`
- `useTextareaAutoResize`
- `useClickOutside`
- `useConversationId`
- `useInfiniteScroll`

### Components Updated: 8
- `components/homepage/MainInput.tsx`
- `components/conversation/ConversationClient.tsx`
- `components/homepage/ModelSelector.tsx`
- `components/homepage/WebSearchSelector.tsx`
- `components/layout/Header.tsx`
- `components/ui/dropdown.tsx`
- `app/(search)/page.tsx`
- `components/layout/history/HistorySidebar.tsx`

### Lines of Code Reduced: ~150+
- Removed duplicate logic
- Centralized common patterns
- Improved maintainability

### Issues Fixed: 2
- Callback stability (performance)
- Type safety (compatibility)

---

## Best Practices Applied

1. **Callback Stability:** Used `useRef` to store callbacks and prevent unnecessary re-subscriptions
2. **Type Safety:** Proper TypeScript types with generic support where needed
3. **Cleanup:** All event listeners properly cleaned up in `useEffect` return functions
4. **Documentation:** JSDoc comments for all hooks
5. **Reusability:** Hooks are generic and configurable via options
6. **Performance:** Memoization where appropriate (`useMemo`, `useCallback`)
7. **Edge Cases:** Handled null refs, disabled states, and error cases

---

## Next Steps

### Immediate (Medium Priority)
1. Implement `useConversationMessages` hook
2. Implement `useConversationHistory` hook
3. Implement `useDateGrouping` hook

### Future (Lower Priority)
1. Implement `useDebounce` hook
2. Implement `useLocalStorage` hook
3. Implement `useWindowSize` hook
4. Implement `useScrollPositionRestore` hook
5. Implement `useURLParams` hook

---

## Conclusion

The high-priority hooks extraction successfully:
- ✅ Reduced code duplication
- ✅ Improved code organization
- ✅ Enhanced reusability
- ✅ Fixed performance issues
- ✅ Improved type safety
- ✅ Made codebase more maintainable

The identified future hooks will further improve the codebase by:
- Encapsulating complex logic
- Reducing component complexity
- Improving testability
- Enhancing reusability

All hooks follow React best practices and are production-ready.

