# 🎓 How Qurse Works - Complete Guide

**For beginners to understand the codebase step by step**

---

## 📚 Table of Contents

1. [The Big Picture](#the-big-picture)
2. [User Journey: From Homepage to Chat](#user-journey)
3. [How Authentication Works](#authentication)
4. [How the Database Works](#database)
5. [How AI Streaming Works](#ai-streaming)
6. [How Components Talk to Each Other](#components)
7. [File Structure Explained](#file-structure)
8. [Common Flows Explained](#common-flows)

---

## 🎯 The Big Picture

### What Happens When You Open Qurse?

```
1. Browser loads the app
   ↓
2. Next.js renders the page (server-side)
   ↓
3. React components mount (client-side)
   ↓
4. Auth context checks if you're logged in
   ↓
5. UI shows homepage OR conversation page
```

### The 3 Main Layers:

```
┌─────────────────────────────────────┐
│  CLIENT LAYER (Browser)             │
│  - React components                 │
│  - User interactions                │
│  - State management                 │
└─────────────────────────────────────┘
              ↕ (HTTP requests)
┌─────────────────────────────────────┐
│  API LAYER (Next.js routes)        │
│  - /api/chat (AI streaming)        │
│  - /auth/callback (OAuth)           │
│  - Server-side logic               │
└─────────────────────────────────────┘
              ↕ (Database queries)
┌─────────────────────────────────────┐
│  DATABASE LAYER (Supabase)          │
│  - PostgreSQL database             │
│  - Row Level Security (RLS)         │
│  - Auth users table                │
└─────────────────────────────────────┘
```

---

## 🚀 User Journey: From Homepage to Chat

### Step 1: User Opens Homepage

**What happens:**

```
Browser → app/(search)/page.tsx (server component)
   ↓
Renders: Header, Hero, MainInput, ModelSelector
   ↓
Client components mount (useEffect runs)
   ↓
AuthContext checks: Are you logged in?
   ↓
UI shows: Logged in user OR guest user
```

**Files involved:**
- `app/(search)/page.tsx` - Main homepage component
- `components/homepage/MainInput.tsx` - The input field
- `lib/contexts/AuthContext.tsx` - Checks auth status

---

### Step 2: User Types a Message and Clicks Send

**What happens:**

```
1. User types in MainInput component
   ↓
2. Clicks "Send" button
   ↓
3. handleSend() function runs:
   - Generates a conversation ID (UUID)
   - Creates title from first 50 chars of message
   - If logged in: Creates conversation in database
   - If guest: Uses "temp-" prefix (no database)
   ↓
4. Navigates to /conversation/[id]?message=...
```

**Code flow:**

```typescript
// components/homepage/MainInput.tsx
const handleSend = async () => {
  // Generate unique ID
  const chatId = crypto.randomUUID();
  
  // Get user from auth context
  if (user && user.id) {
    // Logged in: Save to database
    await ensureConversation(chatId, user.id, title);
    router.push(`/conversation/${chatId}?message=...`);
  } else {
    // Guest: Temporary ID
    router.push(`/conversation/temp-${chatId}?message=...`);
  }
};
```

**Files involved:**
- `components/homepage/MainInput.tsx` - Handles input and navigation
- `lib/db/queries.ts` - `ensureConversation()` function
- `lib/contexts/AuthContext.tsx` - Provides user state

---

### Step 3: Conversation Page Loads

**What happens:**

```
1. Next.js server renders page (server-side)
   ↓
2. Reads conversation ID from URL
   ↓
3. Checks: Is this a temp conversation? Is user logged in?
   ↓
4. If logged in AND not temp: Load messages from database
   ↓
5. Passes initial messages to ConversationClient component
```

**Code flow:**

```typescript
// app/(search)/conversation/[id]/page.tsx
export default async function ConversationPage({ params, searchParams }) {
  // Server-side code runs FIRST
  const { id: conversationId } = await params;
  const supabase = await createClient(); // Server client
  const { data: { user } } = await supabase.auth.getUser();
  
  let initialMessages = [];
  
  // Only load if:
  // - Not a temp conversation
  // - User is logged in
  // - No initial message param (already exists)
  if (!conversationId.startsWith('temp-') && user && !urlParams.message) {
    initialMessages = await getMessagesServerSide(conversationId);
  }
  
  // Pass to client component
  return (
    <ConversationClient
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
```

**Files involved:**
- `app/(search)/conversation/[id]/page.tsx` - Server component
- `lib/db/queries.server.ts` - `getMessagesServerSide()` function
- `components/conversation/ConversationClient.tsx` - Client component

---

### Step 4: AI Response Streams In

**What happens:**

```
1. ConversationClient component mounts (client-side)
   ↓
2. useChat hook from AI SDK connects to /api/chat
   ↓
3. If URL has ?message=...: Auto-sends first message
   ↓
4. API route streams response back
   ↓
5. useChat hook updates messages state in real-time
   ↓
6. UI re-renders with each chunk of response
   ↓
7. Message saves to database when stream completes
```

**Code flow:**

```typescript
// components/conversation/ConversationClient.tsx
const {
  messages,
  sendMessage,
  status,
} = useChat({
  id: conversationId,
  initialMessages: initialMessages,
  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest({ messages }) {
      return {
        body: {
          messages,
          conversationId: conversationIdRef.current,
          model: selectedModelRef.current,
          chatMode: chatModeRef.current,
        },
      };
    },
  }),
});

// Auto-send if URL has message param
useEffect(() => {
  if (urlParams.message && !initialMessageSentRef.current) {
    sendMessage({ text: urlParams.message });
    initialMessageSentRef.current = true;
  }
}, []);
```

**Files involved:**
- `components/conversation/ConversationClient.tsx` - Uses useChat hook
- `app/api/chat/route.ts` - Streams AI response
- `@ai-sdk/react` - Provides useChat hook

---

## 🔐 How Authentication Works

### The Authentication Flow

```
1. User clicks "Sign in with GitHub" button
   ↓
2. Redirects to Supabase Auth page
   ↓
3. User authorizes on GitHub
   ↓
4. GitHub redirects back to /auth/callback?code=...
   ↓
5. Callback route exchanges code for session
   ↓
6. Creates user profile in database (if doesn't exist)
   ↓
7. Redirects to homepage
   ↓
8. AuthContext picks up session
   ↓
9. UI updates to show logged-in state
```

**Step-by-step breakdown:**

#### Step 1: User Clicks Sign In

```typescript
// components/auth/AuthButton.tsx
const handleSignIn = async () => {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};
```

#### Step 2: OAuth Callback Handles Response

```typescript
// app/auth/callback/route.ts
export async function GET(request: Request) {
  const code = requestUrl.searchParams.get('code');
  const supabase = await createClient();
  
  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  // Create user profile if doesn't exist
  if (data.user) {
    const { error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create profile
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        avatar_url: data.user.user_metadata?.avatar_url,
      });
    }
  }
  
  return NextResponse.redirect(`${origin}/`);
}
```

#### Step 3: AuthContext Listens for Changes

```typescript
// lib/contexts/AuthContext.tsx
useEffect(() => {
  // Get initial session
  const { data: { session } } = await supabase.auth.getSession();
  setSession(session);
  
  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, newSession) => {
      setSession(newSession);
      // Update user state
      if (newSession?.user) {
        setUser({
          id: newSession.user.id,
          email: newSession.user.email,
          name: newSession.user.user_metadata?.name,
        });
      } else {
        setUser(null);
      }
    }
  );
  
  return () => subscription.unsubscribe();
}, []);
```

**Files involved:**
- `components/auth/AuthButton.tsx` - Starts OAuth flow
- `app/auth/callback/route.ts` - Handles OAuth callback
- `lib/contexts/AuthContext.tsx` - Manages auth state
- `middleware.ts` - Refreshes session on each request

---

## 💾 How the Database Works

### The 3 Tables

```
users
├── id (UUID, references auth.users)
├── email
├── name
├── avatar_url
└── created_at, updated_at

conversations
├── id (UUID)
├── user_id (references users.id)
├── title
└── created_at, updated_at

messages
├── id (UUID)
├── conversation_id (references conversations.id)
├── role ('user' | 'assistant' | 'system')
├── content (text with reasoning if present)
└── created_at
```

### Row Level Security (RLS)

**What is RLS?**
- Supabase automatically enforces that users can only see/edit their own data
- No need to manually check `user_id` in every query
- Database-level security

**Example policies:**

```sql
-- Users can only view their own conversations
CREATE POLICY "Users can view own conversations" 
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can only insert messages to their own conversations
CREATE POLICY "Users can insert messages to own conversations" 
  ON messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );
```

### How Queries Work

#### Client-Side Queries (Browser)

```typescript
// lib/db/queries.ts
export async function getConversations(userId: string) {
  const supabase = createClient(); // Browser client
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  return data;
}
```

**When to use:**
- Components that need to fetch data after mount
- User interactions (like clicking a conversation)
- Client-side operations

#### Server-Side Queries (API/Server Components)

```typescript
// lib/db/queries.server.ts
export async function getMessagesServerSide(conversationId: string) {
  const supabase = await createClient(); // Server client
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  return data;
}
```

**When to use:**
- Server components (pre-render on server)
- API routes (handling requests)
- Initial page load data

**Files involved:**
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client
- `lib/db/queries.ts` - Client-side query helpers
- `lib/db/queries.server.ts` - Server-side query helpers
- `lib/supabase/schema.sql` - Database schema with RLS

---

## 🤖 How AI Streaming Works

### The Streaming Flow

```
1. useChat hook sends POST request to /api/chat
   ↓
2. API route validates request (auth, model access)
   ↓
3. Saves user message to database (if logged in)
   ↓
4. Calls AI provider (Groq/xAI/Anannas)
   ↓
5. Streams response back chunk by chunk
   ↓
6. useChat hook receives chunks and updates UI
   ↓
7. When complete, saves assistant message to database
```

### Step-by-Step Breakdown

#### Step 1: API Route Receives Request

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // Get user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Parse request body
  const body = await req.json();
  const { messages, conversationId, model, chatMode } = body;
  
  // Validate access to model
  const accessCheck = canUseModel(model, user, false);
  if (!accessCheck.canUse) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  
  // Save user message to database
  if (user && conversationId) {
    await 2(user, conversationId, messages, supabase);
  }
}
```

#### Step 2: Stream AI Response

```typescript
// Create UI message stream
const stream = createUIMessageStream({
  execute: async ({ writer: dataStream }) => {
    // Call AI provider
    const result = streamText({
      model: qurse.languageModel(model), // Get model from provider
      messages: convertToModelMessages(messages),
      system: modeConfig.systemPrompt,
      maxRetries: 5,
    });
    
    // Merge stream into UI stream
    dataStream.merge(
      result.toUIMessageStream({
        sendReasoning: shouldSendReasoning,
      })
    );
  },
});

// Return as Server-Sent Events (SSE)
return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
  headers: {
    'Content-Type': 'text/event-stream',
  },
});
```

#### Step 3: Client Receives Stream

```typescript
// components/conversation/ConversationClient.tsx
const { messages, status } = useChat({
  id: conversationId,
  transport: new DefaultChatTransport({
    api: '/api/chat',
  }),
});

// messages state updates automatically as chunks arrive
// UI re-renders with each update
```

### How Models Are Loaded

```typescript
// ai/providers.ts
export const qurse = customProvider({
  languageModels: {
    'openai/gpt-oss-120b': wrapReasoningModel(groq('openai/gpt-oss-120b')),
    'grok-3-mini': wrapReasoningModel(xai('grok-3-mini')),
    'moonshotai/kimi-k2-instruct': anannas.chat('moonshotai/kimi-k2-instruct'),
  },
});

// Usage in API route:
const model = qurse.languageModel(modelId);
// model is now ready to use with streamText()
```

**Files involved:**
- `app/api/chat/route.ts` - Main streaming endpoint
- `ai/providers.ts` - Provider abstraction
- `ai/models.ts` - Model configuration
- `ai/config.ts` - Chat mode configuration
- `components/conversation/ConversationClient.tsx` - Uses useChat hook

---

## 🧩 How Components Talk to Each Other

### Context API for Global State

#### AuthContext (Authentication State)

```typescript
// lib/contexts/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  
  // ... auth logic ...
  
  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in any component:
const { user, isAuthenticated } = useAuth();
```

**Where it's used:**
- `components/homepage/MainInput.tsx` - Checks if user exists
- `components/layout/Header.tsx` - Shows user profile
- `app/api/chat/route.ts` - Validates user for database saves

#### ConversationContext (Model/Mode Selection)

```typescript
// lib/contexts/ConversationContext.tsx
export function ConversationProvider({ children }) {
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  const [chatMode, setChatMode] = useState('chat');
  
  return (
    <ConversationContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </ConversationContext.Provider>
  );
}

// Usage:
const { selectedModel, setSelectedModel } = useConversation();
```

**Where it's used:**
- `components/homepage/ModelSelector.tsx` - Updates selected model
- `components/conversation/ConversationClient.tsx` - Sends model to API

### Props vs Context

**Use Props for:**
- Data specific to one component tree
- Parent-to-child communication
- Simple state that doesn't need global access

**Use Context for:**
- Global state (auth, theme, selected model)
- Data needed by many unrelated components
- State that changes infrequently

**Files involved:**
- `lib/contexts/AuthContext.tsx` - Auth state
- `lib/contexts/ConversationContext.tsx` - Model/mode state
- `lib/theme-provider.tsx` - Theme state

---

## 📁 File Structure Explained

### The Main Directories

```
qurse/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth route group
│   ├── (search)/           # Homepage + conversation route group
│   ├── api/                # API routes (backend)
│   └── layout.tsx          # Root layout (wraps everything)
│
├── components/             # React components
│   ├── auth/               # Auth-related components
│   ├── chat/               # Chat message components
│   ├── homepage/           # Homepage components
│   ├── layout/             # Header, footer, sidebar
│   └── ui/                 # Reusable UI components
│
├── lib/                    # Shared utilities and logic
│   ├── contexts/           # React Context providers
│   ├── supabase/           # Supabase clients + schema
│   ├── db/                 # Database query helpers
│   ├── tools/              # AI tools registry
│   └── types.ts            # TypeScript type definitions
│
├── ai/                     # AI-related code
│   ├── providers.ts         # AI provider abstraction
│   ├── models.ts           # Model configurations
│   └── config.ts           # Chat mode registry
│
└── styles/                 # CSS files
    ├── base.css            # Base styles
    ├── components/         # Component-specific styles
    └── layout.css          # Layout styles
```

### Key Files Explained

| File                                             | Purpose                 | When It Runs                 |
|------                                            |---------                |--------------                |
| `app/(search)/page.tsx`                          | Homepage                | On `/` route                 |
| `app/(search)/conversation/[id]/page.tsx`        | Conversation page       | On `/conversation/:id` route |
| `app/api/chat/route.ts`                          | AI streaming endpoint   | On POST to `/api/chat`       |
| `components/homepage/MainInput.tsx`              | Input field on homepage | Client-side (browser)        |
| `components/conversation/ConversationClient.tsx` | Chat interface          | Client-side (browser)        |
| `lib/contexts/AuthContext.tsx`                   | Auth state management   | On app load (client-side)    |
| `lib/db/queries.ts`                              | Database helpers        | When called by components    |
| `middleware.ts`                                  | Session refresh         | On every request             |

---

## 🔄 Common Flows Explained

### Flow 1: New User Signs In

```
1. Click "Sign in with GitHub"
   → components/auth/AuthButton.tsx
   ↓
2. Redirect to Supabase Auth
   → Supabase handles OAuth
   ↓
3. GitHub redirects back
   → app/auth/callback/route.ts
   ↓
4. Create user profile
   → Insert into users table
   ↓
5. Redirect to homepage
   → app/(search)/page.tsx
   ↓
6. AuthContext updates
   → lib/contexts/AuthContext.tsx
   ↓
7. UI shows logged-in state
   → components/layout/Header.tsx
```

### Flow 2: User Starts New Conversation

```
1. Type message on homepage
   → components/homepage/MainInput.tsx
   ↓
2. Click Send
   → handleSend() function
   ↓
3. Generate conversation ID
   → crypto.randomUUID()
   ↓
4. Save to database (if logged in)
   → lib/db/queries.ts → ensureConversation()
   ↓
5. Navigate to conversation page
   → router.push('/conversation/[id]')
   ↓
6. Page loads with message param
   → app/(search)/conversation/[id]/page.tsx
   ↓
7. ConversationClient auto-sends message
   → components/conversation/ConversationClient.tsx
   ↓
8. API streams response
   → app/api/chat/route.ts
   ↓
9. UI updates in real-time
   → useChat hook updates messages state
   ↓
10. Save to database when complete
    → onFinish callback in API route
```

### Flow 3: User Views Old Conversation

```
1. Click conversation in history
   → components/layout/history/HistorySidebar.tsx
   ↓
2. Navigate to conversation page
   → router.push('/conversation/[id]')
   ↓
3. Server component loads messages
   → app/(search)/conversation/[id]/page.tsx
   → lib/db/queries.server.ts → getMessagesServerSide()
   ↓
4. Pass to client component
   → <ConversationClient initialMessages={...} />
   ↓
5. Display messages
   → components/conversation/ConversationClient.tsx
   → components/chat/ChatMessage.tsx
```

---

## 🎯 Key Concepts to Remember

### 1. Server vs Client Components

**Server Components** (`app/` directory):
- Run on server before sending to browser
- Can access database directly
- Can't use hooks (useState, useEffect)
- Use `async/await` for async operations

**Client Components** (`'use client'` directive):
- Run in browser
- Can use hooks, event handlers
- Can't access database directly (must use API)
- Use `useEffect` for side effects

### 2. Authentication Flow

- **OAuth**: User → Provider → Callback → Session created
- **Session**: Stored in cookies, refreshed by middleware
- **Context**: AuthContext provides user state to all components

### 3. Database Flow

- **RLS**: Automatic security (users can only see their data)
- **Client queries**: Use `createClient()` from `lib/supabase/client.ts`
- **Server queries**: Use `createClient()` from `lib/supabase/server.ts`

### 4. AI Streaming Flow

- **useChat hook**: Client-side, manages message state
- **API route**: Server-side, streams from AI provider
- **SSE**: Server-Sent Events for real-time updates
- **Database**: Saves after stream completes

### 5. State Management

- **Context**: For global state (auth, theme, selected model)
- **Props**: For component-specific data
- **useState**: For local component state
- **useRef**: For values that don't trigger re-renders

---

## 💡 Tips for Understanding the Code

1. **Start with the flow**: Follow one user action from start to finish
2. **Read server components first**: They show what data is available
3. **Check context**: See what global state is available
4. **Follow the data**: Trace where data comes from and goes to
5. **Read error messages**: They often tell you what's wrong
6. **Use browser dev tools**: Network tab shows API calls
7. **Check console logs**: Code has helpful `console.log()` statements

---

## 🔍 Next Steps

Now that you understand the big picture:
1. Pick a specific feature you want to understand deeper
2. Follow one complete flow (like sending a message)
3. Read the actual code files mentioned in the flows
4. Try adding a console.log() to see when code runs
5. Use browser dev tools to see network requests

---

**Ready to dive deeper? Let me know what specific part you want to explore!**

