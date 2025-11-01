# 🔄 Code Flow Diagrams - Visual Guide

**Simple visual diagrams showing how code flows through the system**

---

## 🏠 Flow 1: Homepage Load

```
┌─────────────────────────────────────────────────────────┐
│ Browser loads http://localhost:3000                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ app/layout.tsx                                           │
│ - Wraps app with ThemeProvider                           │
│ - Wraps app with AuthProvider                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ app/(search)/page.tsx (Server Component)                │
│ - Renders Header, Hero, MainInput, ModelSelector         │
│ - Returns JSX with client components                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Components Mount (Browser)                              │
│ ├─ components/layout/Header.tsx                        │
│ │  └─ Calls useAuth() → Gets user from AuthContext      │
│ ├─ components/homepage/MainInput.tsx                    │
│ │  └─ Listens for user input                           │
│ └─ lib/contexts/AuthContext.tsx                         │
│    └─ useEffect: Checks session                         │
│       └─ supabase.auth.getSession()                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ UI Renders:                                              │
│ - If logged in: Shows user avatar, "Sign out" button     │
│ - If guest: Shows "Sign in" button                      │
│ - MainInput ready to accept user message                 │
└─────────────────────────────────────────────────────────┘
```

---

## 💬 Flow 2: User Sends First Message

```
┌─────────────────────────────────────────────────────────┐
│ User types in MainInput                                  │
│ components/homepage/MainInput.tsx                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ User clicks "Send" button                               │
│ handleSend() function runs                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Generate conversation ID                                 │
│ const chatId = crypto.randomUUID()                       │
│ // Result: "123e4567-e89b-12d3-a456-426614174000"       │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        │ Is user logged in?            │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                                │
    YES │                            NO  │
        ↓                                ↓
┌───────────────────┐      ┌──────────────────────┐
│ Logged in         │      │ Guest user            │
│                    │      │                      │
│ ensureConversation │      │ Use temp ID:         │
│ (chatId, userId,   │      │ temp-{chatId}        │
│  title)            │      │                      │
│                    │      │ No database save     │
│ Creates record in  │      └──────────────────────┘
│ conversations table│
│                    │
└───────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ Navigate to conversation page                            │
│ router.push(`/conversation/${chatId}?message=...`)      │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 Flow 3: Conversation Page Loads

```
┌─────────────────────────────────────────────────────────┐
│ Browser navigates to /conversation/[id]                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ app/(search)/conversation/[id]/page.tsx                 │
│ (Server Component - runs on server FIRST)               │
│                                                          │
│ 1. Get conversation ID from URL                         │
│    const { id } = await params                          │
│                                                          │
│ 2. Check user session                                    │
│    const supabase = await createClient()                │
│    const { data: { user } } = await supabase.auth.getUser()
│                                                          │
│ 3. Check if temp conversation?                          │
│    if (id.startsWith('temp-')) → Skip DB load           │
│                                                          │
│ 4. Load messages from database                          │
│    if (user && !id.startsWith('temp-')) {              │
│      initialMessages = await getMessagesServerSide(id)  │
│    }                                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ lib/db/queries.server.ts                                 │
│                                                          │
│ getMessagesServerSide(conversationId) {                  │
│   1. Create server client                                │
│   2. Query messages table                                │
│      SELECT * FROM messages                              │
│      WHERE conversation_id = conversationId              │
│      ORDER BY created_at ASC                             │
│   3. Extract reasoning from content if present          │
│   4. Return array of messages                            │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Pass to client component                                 │
│ <ConversationClient                                      │
│   conversationId={id}                                     │
│   initialMessages={initialMessages}                      │
│ />                                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ components/conversation/ConversationClient.tsx           │
│ (Client Component - runs in browser)                     │
│                                                          │
│ 1. Initialize useChat hook                               │
│    const { messages, sendMessage } = useChat({          │
│      id: conversationId,                                 │
│      initialMessages: initialMessages,                    │
│      transport: new DefaultChatTransport({               │
│        api: '/api/chat',                                 │
│      }),                                                 │
│    })                                                    │
│                                                          │
│ 2. Check if URL has ?message=...                        │
│    useEffect(() => {                                     │
│      if (urlParams.message) {                           │
│        sendMessage({ text: urlParams.message })          │
│      }                                                   │
│    }, [])                                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🤖 Flow 4: AI Response Streams

```
┌─────────────────────────────────────────────────────────┐
│ ConversationClient calls sendMessage()                   │
│ - useChat hook sends POST to /api/chat                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ app/api/chat/route.ts                                    │
│ (API Route - runs on server)                             │
│                                                          │
│ POST(req: Request) {                                     │
│   1. Get user session                                    │
│      const supabase = await createClient()               │
│      const { data: { user } } = await supabase.auth.getUser()
│                                                          │
│   2. Parse request body                                  │
│      const { messages, conversationId, model, chatMode }│
│          = await req.json()                              │
│                                                          │
│   3. Validate model access                               │
│      const accessCheck = canUseModel(model, user, false) │
│                                                          │
│   4. Save user message to database                      │
│      if (user && conversationId) {                       │
│        await validateAndSaveMessage(...)                │
│      }                                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Create AI stream                                         │
│                                                          │
│ const stream = createUIMessageStream({                    │
│   execute: async ({ writer }) => {                       │
│     const result = streamText({                          │
│       model: qurse.languageModel(model),                 │
│       messages: convertToModelMessages(messages),       │
│       system: modeConfig.systemPrompt,                    │
│       onFinish: async ({ text, reasoning }) => {         │
│         // Save assistant message to DB                  │
│         if (user && conversationId) {                     │
│           await supabase.from('messages').insert({       │
│             conversation_id: conversationId,             │
│             role: 'assistant',                            │
│             content: text + reasoning,                   │
│           })                                             │
│         }                                                │
│       }                                                  │
│     })                                                   │
│                                                          │
│     writer.merge(                                       │
│       result.toUIMessageStream()                        │
│     )                                                    │
│   }                                                      │
│ })                                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Return as Server-Sent Events (SSE)                        │
│                                                          │
│ return new Response(                                     │
│   stream.pipeThrough(new JsonToSseTransformStream()),   │
│   {                                                      │
│     headers: {                                           │
│       'Content-Type': 'text/event-stream',              │
│     }                                                    │
│   }                                                      │
│ )                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Browser receives chunks (via SSE)                        │
│                                                          │
│ useChat hook receives:                                   │
│ - "Hello" → updates messages state                       │
│ - " world" → updates messages state                      │
│ - "!" → updates messages state                           │
│                                                          │
│ Each update triggers re-render                           │
│ UI shows streaming text in real-time                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ When stream completes:                                   │
│ - onFinish callback runs                                │
│ - Assistant message saved to database                    │
│ - Status changes from "loading" to "idle"               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Flow 5: User Signs In

```
┌─────────────────────────────────────────────────────────┐
│ User clicks "Sign in with GitHub"                        │
│ components/auth/AuthButton.tsx                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Start OAuth flow                                         │
│ const supabase = createClient()                          │
│ await supabase.auth.signInWithOAuth({                    │
│   provider: 'github',                                    │
│   options: {                                             │
│     redirectTo: '/auth/callback'                        │
│   }                                                      │
│ })                                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Browser redirects to Supabase Auth                      │
│ https://xxx.supabase.co/auth/v1/authorize?provider=github
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ User authorizes on GitHub                                │
│ (User logs in to GitHub and approves)                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ GitHub redirects back                                    │
│ /auth/callback?code=abc123...                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ app/auth/callback/route.ts                              │
│                                                          │
│ GET(req: Request) {                                      │
│   1. Extract code from URL                               │
│      const code = requestUrl.searchParams.get('code')    │
│                                                          │
│   2. Exchange code for session                           │
│      const { data, error } = await supabase.auth        │
│        .exchangeCodeForSession(code)                    │
│                                                          │
│   3. Create user profile (if doesn't exist)            │
│      const { error: fetchError } = await supabase       │
│        .from('users')                                    │
│        .select('id')                                     │
│        .eq('id', data.user.id)                          │
│        .single()                                         │
│                                                          │
│      if (fetchError.code === 'PGRST116') {              │
│        // User doesn't exist, create it                 │
│        await supabase.from('users').insert({             │
│          id: data.user.id,                                │
│          email: data.user.email,                         │
│          name: data.user.user_metadata.name,              │
│        })                                                │
│      }                                                   │
│                                                          │
│   4. Redirect to homepage                                │
│      return NextResponse.redirect('/')                    │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Browser redirects to homepage                            │
│ http://localhost:3000/                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ middleware.ts runs (on every request)                    │
│                                                          │
│ export async function middleware(req: NextRequest) {     │
│   1. Create server client                                │
│      const supabase = createServerClient(...)            │
│                                                          │
│   2. Refresh session if expired                          │
│      await supabase.auth.getUser()                       │
│                                                          │
│   3. Return response with updated cookies               │
│      return NextResponse.next(...)                       │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ AuthContext detects session change                       │
│ lib/contexts/AuthContext.tsx                            │
│                                                          │
│ useEffect(() => {                                        │
│   const { data: { subscription } } = supabase.auth       │
│     .onAuthStateChange((event, newSession) => {         │
│       setSession(newSession)                             │
│       if (newSession?.user) {                           │
│         setUser({                                        │
│           id: newSession.user.id,                        │
│           email: newSession.user.email,                  │
│           name: newSession.user.user_metadata.name,       │
│         })                                               │
│       }                                                  │
│     })                                                   │
│ })                                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ UI updates to show logged-in state                      │
│ - Header shows user avatar                               │
│ - "Sign in" button becomes "Sign out" button            │
│ - History sidebar becomes available                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Flow 6: View Conversation History

```
┌─────────────────────────────────────────────────────────┐
│ User clicks history button in header                     │
│ components/layout/Header.tsx                             │
│   onHistoryClick={() => setIsHistoryOpen(true)}          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ History sidebar opens                                    │
│ components/layout/history/HistorySidebar.tsx            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ useEffect runs to load conversations                     │
│                                                          │
│ useEffect(() => {                                        │
│   if (isOpen && user) {                                  │
│     loadConversations()                                  │
│   }                                                      │
│ }, [isOpen, user])                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ lib/db/queries.ts                                         │
│                                                          │
│ async function getConversations(userId: string) {         │
│   const supabase = createClient()                        │
│                                                          │
│   const { data, error } = await supabase                 │
│     .from('conversations')                               │
│     .select('*')                                         │
│     .eq('user_id', userId)                               │
│     .order('updated_at', { ascending: false })            │
│                                                          │
│   // RLS automatically filters to user's conversations   │
│   // (enforced by Supabase database policy)             │
│                                                          │
│   return data                                            │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Query runs against database                              │
│                                                          │
│ SQL:                                                     │
│ SELECT *                                                 │
│ FROM conversations                                       │
│ WHERE user_id = 'xxx'                                    │
│   AND auth.uid() = user_id  ← RLS policy enforces this  │
│ ORDER BY updated_at DESC                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Database returns conversations                           │
│ [                                                        │
│   { id: 'abc', title: 'Hello', updated_at: '...' },    │
│   { id: 'def', title: 'How to...', updated_at: '...' }, │
│   ...                                                    │
│ ]                                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Group conversations by date                              │
│                                                          │
│ Group by:                                                │
│ - Today                                                  │
│ - Last 7 days                                            │
│ - This month                                             │
│ - Older                                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Display in sidebar                                       │
│ components/layout/history/ConversationList.tsx           │
│ - Shows grouped conversations                            │
│ - Each conversation is clickable                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ User clicks conversation                                 │
│ onClick={() => router.push(`/conversation/${id}`)}      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Navigate to conversation page                           │
│ (See Flow 3: Conversation Page Loads)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Patterns to Recognize

### Pattern 1: Server → Client Data Flow

```
Server Component (page.tsx)
  ↓ Loads data
  ↓ Passes as props
Client Component (with 'use client')
  ↓ Receives props
  ↓ Renders UI
```

### Pattern 2: Context → Component State Flow

```
Context Provider (AuthContext.tsx)
  ↓ Manages global state
  ↓ Exposes via Context.Provider
Component (anywhere in tree)
  ↓ Calls useAuth()
  ↓ Gets user state
  ↓ Uses in component
```

### Pattern 3: API Request Flow

```
Client Component
  ↓ Calls function (e.g., sendMessage)
  ↓ Makes HTTP request
API Route (/api/chat)
  ↓ Validates request
  ↓ Processes data
  ↓ Returns response
Client Component
  ↓ Receives response
  ↓ Updates state
  ↓ UI re-renders
```

### Pattern 4: Database Query Flow

```
Component
  ↓ Calls query function
  ↓ Uses Supabase client
Database (Supabase)
  ↓ RLS policies enforce security
  ↓ Returns filtered data
Component
  ↓ Receives data
  ↓ Updates state
  ↓ UI re-renders
```

---

## 📝 Quick Reference

### Where does X happen?

| What | Where |
|------|-------|
| User types message | `components/homepage/MainInput.tsx` |
| Message sent to AI | `components/conversation/ConversationClient.tsx` → `app/api/chat/route.ts` |
| AI response streams | `app/api/chat/route.ts` → `ai/providers.ts` |
| Messages saved to DB | `app/api/chat/route.ts` → `validateAndSaveMessage()` |
| User signs in | `components/auth/AuthButton.tsx` → `app/auth/callback/route.ts` |
| Session checked | `middleware.ts` (every request) |
| User state available | `lib/contexts/AuthContext.tsx` → `useAuth()` hook |
| Conversations loaded | `lib/db/queries.ts` → `getConversations()` |
| Model selected | `lib/contexts/ConversationContext.tsx` → `useConversation()` hook |
| Theme changes | `lib/theme-provider.tsx` → `useTheme()` hook |

---

## 🔍 Debugging Tips

1. **Add console.log()** at key points:
   ```typescript
   console.log('🔍 User clicked send', { message, userId });
   ```

2. **Check Network tab** in browser dev tools:
   - See API requests
   - Check request/response bodies
   - See streaming responses

3. **Check React DevTools**:
   - See component state
   - See context values
   - See props passed between components

4. **Check Database** (Supabase Dashboard):
   - See if data is saved
   - Check RLS policies
   - View table contents

5. **Check Terminal logs**:
   - Server-side logs appear here
   - API route logs appear here
   - Database query logs appear here

---

**These diagrams show the actual code flow. Follow one step at a time to understand how everything connects!**

