# Scira Flow Analysis: From Send to Stream (TTFB)

**Date:** Latest  
**Focus:** Detailed analysis of Scira's flow from hitting send to stream starting

---

## 🔑 Key Architectural Difference

**Scira's Approach:**
- **Homepage IS the chat interface** - No redirect for new conversations
- **Stay on same page** - URL changes but component stays mounted
- **Aggressive parallelization** - Everything starts in parallel immediately

**Your Approach:**
- **Homepage → Conversation page** - Navigate to new route
- **Page redirect** - Component unmounts/remounts
- **Sequential operations** - Some operations wait for others

---

## 📊 Complete Flow Breakdown

### Phase 1: User Hits Send (0ms)

#### Scira's Flow:

**File:** `components/chat-interface.tsx` (Lines 288-388)

```typescript
// User types message and hits send
const { messages, sendMessage, ... } = useChat<ChatMessage>({
  id: chatId,  // Generated on mount (line 194)
  transport: new DefaultChatTransport({
    api: '/api/search',
    prepareSendMessagesRequest({ messages, body }) {
      return {
        body: {
          id: chatId,
          messages,
          model: selectedModelRef.current,
          // ... other params
        },
      };
    },
  }),
  // ...
});

// User clicks send button or presses Enter
// sendMessage() is called directly - NO NAVIGATION
sendMessage({
  parts: [{ type: 'text', text: messageText }],
  role: 'user',
});
```

**Key Points:**
1. ✅ **NO navigation** - `sendMessage()` called directly on homepage
2. ✅ **NO redirect** - Component stays mounted
3. ✅ **Chat ID generated on mount** - Already exists (line 194: `const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId])`)
4. ✅ **Instant API call** - No page load delay

**Time:** 0ms (instant)

---

#### Your Flow:

**File:** `components/homepage/MainInput.tsx` (Lines 111-131)

```typescript
const handleSend = () => {
  const messageText = inputValue.trim();
  if (!messageText || isCreatingConversation) return;

  setIsCreatingConversation(true);
  
  // Generate conversation ID
  const chatId = crypto.randomUUID();
  
  // Redirect immediately - conversation will be created in API route
  if (user && user.id) {
    router.push(`/conversation/${chatId}?message=${encodeURIComponent(messageText)}&...`);
  } else {
    router.push(`/conversation/temp-${chatId}?message=${encodeURIComponent(messageText)}&...`);
  }
  
  setInputValue('');
};
```

**Key Points:**
1. ❌ **Navigation required** - `router.push()` called
2. ❌ **Component unmounts** - Homepage component destroyed
3. ❌ **Chat ID generated during send** - Not pre-generated
4. ❌ **Page load delay** - Server-side page rendering required

**Time:** 200-500ms (navigation + page load)

---

### Phase 2: API Route Receives Request

#### Scira's Flow:

**File:** `app/api/search/route.ts` (Lines 104-271)

```typescript
export async function POST(req: Request) {
  const requestStartTime = Date.now();
  const { messages, model, group, id, ... } = await req.json();
  
  // CRITICAL: Get lightweight user FIRST (fast - no DB join)
  const lightweightUser = await getLightweightUser();  // ~50ms
  
  // Early exit checks (no DB operations)
  if (!lightweightUser) {
    if (requiresAuthentication(model)) {
      return new ChatSDKError('unauthorized:model', ...).toResponse();
    }
  }
  
  // ⚡ START ALL CRITICAL PARALLEL OPERATIONS IMMEDIATELY
  const isProUser = lightweightUser?.isProUser ?? false;
  
  // 1. Config (needed for streaming) - start immediately
  configPromise = getGroupConfig(group);  // ~100ms
  
  // 2. Full user data (needed for usage checks and custom instructions)
  const fullUserPromise = lightweightUser 
    ? getCurrentUser()  // ~150ms
    : Promise.resolve(null);
  
  // 3. Custom instructions (only if enabled and authenticated)
  const customInstructionsPromise = lightweightUser && (isCustomInstructionsEnabled ?? true)
    ? fullUserPromise.then(user => user ? getCachedCustomInstructionsByUserId(user.id) : null)  // ~50ms
    : Promise.resolve(null);
  
  // 4. Chat validation and creation (must be synchronous for DB consistency)
  let criticalChecksPromise: Promise<{...}>;
  
  if (lightweightUser) {
    const chatValidationPromise = getChatById({ id }).then(async (existingChat) => {
      // Validate ownership if chat exists
      if (existingChat && existingChat.userId !== lightweightUser.userId) {
        throw new ChatSDKError('forbidden:chat', ...);
      }
      
      // Create chat if it doesn't exist (MUST be sync - other operations depend on it)
      if (!existingChat) {
        await saveChat({
          id,
          userId: lightweightUser.userId,
          title: 'New Chat',
          visibility: selectedVisibilityType,
        });  // ~100ms
        
        // Generate better title in background (non-critical)
        after(async () => {
          try {
            const title = await generateTitleFromUserMessage({...});
            await updateChatTitleById({ chatId: id, title });
          } catch (error) {
            console.error('Background title generation failed:', error);
          }
        });
      }
      
      return existingChat;
    });
    
    // For non-Pro users: run usage checks in parallel
    if (!isProUser) {
      criticalChecksPromise = Promise.all([
        fullUserPromise,
        chatValidationPromise,
      ]).then(async ([user]) => {
        const [messageCountResult, extremeSearchUsage] = await Promise.all([
          getUserMessageCount(user),
          getExtremeSearchUsageCount(user),
        ]);
        // ... validation logic
        return { canProceed: true, ... };
      });
    } else {
      // Pro users: just validate chat ownership
      criticalChecksPromise = Promise.all([
        fullUserPromise,
        chatValidationPromise,
      ]).then(([user]) => ({
        canProceed: true,
        isProUser: true,
        // ...
      }));
    }
  } else {
    // Unauthenticated users: no checks needed
    criticalChecksPromise = Promise.resolve({
      canProceed: true,
      isProUser: false,
      // ...
    });
  }
  
  // ⚡ CREATE STREAM IMMEDIATELY (before waiting for operations)
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Wait for critical checks and config in parallel (only what's needed to start streaming)
      const [criticalResult, { tools: activeTools, instructions }, customInstructionsResult, user] = await Promise.all([
        criticalChecksPromise,      // ~200ms (parallel)
        configPromise,               // ~100ms (parallel)
        customInstructionsPromise,   // ~50ms (parallel)
        fullUserPromise,              // ~150ms (parallel)
      ]);
      
      // Save user message BEFORE streaming (critical for conversation history)
      if (user) {
        await saveMessages({
          messages: [{
            chatId: id,
            id: messages[messages.length - 1].id,
            role: 'user',
            parts: messages[messages.length - 1].parts,
            // ...
          }],
        });  // ~100ms
      }
      
      const setupTime = (Date.now() - requestStartTime) / 1000;
      console.log(`🚀 Time to streamText: ${setupTime.toFixed(2)}s`);
      
      // Start streaming
      const result = streamText({
        model: scira.languageModel(model),
        messages: convertToModelMessages(messages),
        // ...
      });
      
      // Merge stream immediately
      dataStream.merge(result.toUIMessageStream({...}));
    },
    // ...
  });
  
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

**Key Optimizations:**

1. ✅ **Lightweight user check first** - Fast auth check (~50ms) before heavy operations
2. ✅ **ALL operations start in parallel** - Lines 140-271 start everything immediately
3. ✅ **Stream created BEFORE waiting** - Line 276 creates stream, execute block waits for operations
4. ✅ **Parallel execution in execute block** - Line 279 waits for all operations in parallel
5. ✅ **User message saved AFTER parallel ops** - Line 292 saves message after operations complete
6. ✅ **Background operations** - Title generation, stream tracking use `after()` (non-blocking)

**Timeline:**
```
0ms:    Request received
50ms:   Lightweight user check completes
50ms:   All promises start (parallel)
        - configPromise: ~100ms
        - fullUserPromise: ~150ms
        - customInstructionsPromise: ~50ms
        - chatValidationPromise: ~100ms
        - criticalChecksPromise: ~200ms
200ms:  Stream created (execute block starts)
200ms:  Promise.all waits for all operations (parallel)
        - Max of: 200ms (criticalChecksPromise)
300ms:  User message saved (~100ms)
400ms:  streamText() starts
450ms:  First chunk arrives (TTFB)
```

**Total Time:** ~450ms from request to first chunk

---

#### Your Flow:

**File:** `app/api/chat/route.ts` (Lines 135-399)

```typescript
export async function POST(req: Request) {
  const requestStartTime = Date.now();
  const { messages, conversationId, model, mode, ... } = await req.json();
  const supabase = await createClient();
  
  // Auth check (sequential)
  const { data: { user } } = await supabase.auth.getUser();  // ~100ms
  
  // ... validation ...
  
  // Convert messages to UI format
  const uiMessages = toUIMessageFromZod(messages);
  
  // Create stream
  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }) => {
      // Conversation creation and user message save (BEFORE streaming)
      let convId = conversationId;
      
      if (user) {
        // Ensure conversation exists
        convId = await ensureConversation(user, conversationId, title, supabase);  // ~100-300ms
        
        // Save user message
        await saveUserMessage(user, convId, userMessageText, supabase);  // ~100ms
      }
      
      // Start streaming
      const result = streamText({...});
      
      // Merge stream
      dataStream.merge(result.toUIMessageStream({...}));
    },
    // ...
  });
  
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

**Key Issues:**

1. ❌ **Sequential auth check** - `supabase.auth.getUser()` waits before other operations
2. ❌ **No parallel operations** - Operations happen sequentially
3. ❌ **Conversation creation in execute block** - Blocks streaming start
4. ❌ **User message save in execute block** - Blocks streaming start

**Timeline:**
```
0ms:    Request received
100ms:  Auth check completes
100ms:  Convert messages
150ms:  Stream created (execute block starts)
150ms:  ensureConversation starts (~100-300ms)
250ms:  saveUserMessage starts (~100ms)
350ms:  streamText() starts
450ms:  First chunk arrives (TTFB)
```

**Total Time:** ~450ms from request to first chunk

**BUT:** Combined with navigation delay (200-500ms), total time is **650-950ms**

---

## 🎯 Critical Differences

### 1. **No Navigation (Scira's Biggest Win)**

**Scira:**
- Homepage IS chat interface
- `sendMessage()` called directly
- **0ms navigation delay**

**Your App:**
- Homepage → Conversation page redirect
- `router.push()` required
- **200-500ms navigation delay**

**Impact:** 200-500ms saved

---

### 2. **Parallel Operation Start**

**Scira:**
```typescript
// Start ALL operations immediately (parallel)
const configPromise = getGroupConfig(group);
const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
const customInstructionsPromise = ...;
const criticalChecksPromise = ...;

// Create stream BEFORE waiting
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Wait for all operations in parallel
    const [criticalResult, config, customInstructions, user] = await Promise.all([
      criticalChecksPromise,
      configPromise,
      customInstructionsPromise,
      fullUserPromise,
    ]);
    // ...
  },
});
```

**Your App:**
```typescript
// Operations happen sequentially
const { data: { user } } = await supabase.auth.getUser();  // Wait
// ... more sequential operations ...

const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Operations happen sequentially inside execute block
    await ensureConversation(...);  // Wait
    await saveUserMessage(...);     // Wait
    // Then stream
  },
});
```

**Impact:** 100-200ms saved (parallel vs sequential)

---

### 3. **Lightweight User Check**

**Scira:**
```typescript
// Fast auth check first (no DB join)
const lightweightUser = await getLightweightUser();  // ~50ms

// Early exit if needed
if (!lightweightUser && requiresAuthentication(model)) {
  return error;
}

// Full user data fetched in parallel (if needed)
const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
```

**Your App:**
```typescript
// Full auth check (with DB join potentially)
const { data: { user } } = await supabase.auth.getUser();  // ~100ms
```

**Impact:** 50ms saved (lightweight check vs full check)

---

### 4. **Stream Creation Timing**

**Scira:**
```typescript
// Create stream IMMEDIATELY (before waiting for operations)
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Wait for operations inside execute block
    const [result, config, ...] = await Promise.all([...]);
    // ...
  },
});
```

**Your App:**
```typescript
// Operations happen BEFORE stream creation
const { data: { user } } = await supabase.auth.getUser();
// ... more operations ...

// THEN create stream
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Operations happen inside execute block
    await ensureConversation(...);
    // ...
  },
});
```

**Impact:** Stream starts earlier (better perceived performance)

---

## 📈 Performance Comparison

### Scira's Total Time:

```
User clicks send:              0ms
API request sent:             0ms
API route receives:           50ms
Lightweight user check:       50ms
Operations start (parallel):  50ms
Stream created:               200ms
Execute block waits:          200ms (parallel)
User message saved:           300ms
streamText() starts:          400ms
First chunk arrives:          450ms
```

**Total:** ~450ms from send to first chunk

---

### Your App's Total Time:

```
User clicks send:              0ms
router.push() called:          0ms
Navigation delay:              200-500ms
Page renders:                 200-500ms
Server-side page load:        100-200ms
Client-side component mount:  50-100ms
useEffect runs:               100-200ms
sendMessage() called:         350-900ms
API request sent:              350-900ms
API route receives:           400-950ms
Auth check:                   500-1050ms
ensureConversation:           600-1350ms
saveUserMessage:              700-1450ms
streamText() starts:          800-1550ms
First chunk arrives:           850-1600ms
```

**Total:** ~850-1600ms from send to first chunk

---

## 🚀 Recommendations

### Priority 1: Eliminate Navigation (Biggest Win)

**Option A: Stay on Homepage (Like Scira)**
- Make homepage IS the chat interface
- No redirect for new conversations
- URL changes but component stays mounted
- **Saves:** 200-500ms

**Option B: Optimize Navigation**
- Use `window.history.replaceState()` before `router.push()`
- Prefetch route aggressively
- **Saves:** 100-200ms

---

### Priority 2: Parallelize API Operations

**Current:**
```typescript
const { data: { user } } = await supabase.auth.getUser();  // Sequential
// ... more sequential operations ...
```

**Optimized:**
```typescript
// Start ALL operations in parallel immediately
const userPromise = supabase.auth.getUser();
const configPromise = getModeConfig(mode);
const conversationPromise = userPromise.then(user => 
  user ? ensureConversation(user, conversationId, ...) : conversationId
);

const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Wait for all operations in parallel
    const [userResult, config, conversationId] = await Promise.all([
      userPromise,
      configPromise,
      conversationPromise,
    ]);
    // ...
  },
});
```

**Saves:** 100-200ms

---

### Priority 3: Lightweight Auth Check

**Current:**
```typescript
const { data: { user } } = await supabase.auth.getUser();  // Full check
```

**Optimized:**
```typescript
// Fast auth check first (no DB join)
const lightweightUser = await getLightweightUser();  // ~50ms faster

// Full user data fetched in parallel (if needed)
const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
```

**Saves:** 50ms

---

### Priority 4: Stream Creation Timing

**Current:**
```typescript
// Operations happen BEFORE stream creation
const { data: { user } } = await supabase.auth.getUser();
// ... more operations ...
const stream = createUIMessageStream({...});
```

**Optimized:**
```typescript
// Start operations in parallel
const userPromise = supabase.auth.getUser();
const configPromise = getModeConfig(mode);
// ...

// Create stream IMMEDIATELY (before waiting)
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Wait for operations inside execute block
    const [user, config, ...] = await Promise.all([...]);
    // ...
  },
});
```

**Saves:** Better perceived performance (stream starts earlier)

---

## 📊 Expected Performance After Optimizations

### With All Optimizations:

```
User clicks send:              0ms
API request sent:              0ms (no navigation)
API route receives:           50ms
Lightweight user check:        50ms
Operations start (parallel):  50ms
Stream created:               150ms
Execute block waits:          150ms (parallel)
User message saved:           250ms
streamText() starts:          350ms
First chunk arrives:           400ms
```

**Total:** ~400ms from send to first chunk

**Improvement:** 850-1600ms → 400ms (2-4x faster)

---

## 🎯 Summary

**Scira's Key Advantages:**

1. ✅ **No navigation** - Homepage IS chat interface (0ms delay)
2. ✅ **Aggressive parallelization** - All operations start immediately
3. ✅ **Lightweight auth check** - Fast check before heavy operations
4. ✅ **Stream created early** - Before waiting for operations
5. ✅ **Background operations** - Non-critical work uses `after()`

**Your App's Current Bottlenecks:**

1. ❌ **Navigation required** - 200-500ms delay
2. ❌ **Sequential operations** - Operations wait for each other
3. ❌ **Full auth check** - Slower than lightweight check
4. ❌ **Stream created late** - After operations complete

**Biggest Win:** Eliminating navigation (200-500ms saved) by making homepage IS the chat interface, like Scira.

