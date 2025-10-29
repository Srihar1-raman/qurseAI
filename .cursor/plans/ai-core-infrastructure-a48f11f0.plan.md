<!-- a48f11f0-65aa-4f9d-a3ae-50b424de6b83 d5d3dffd-7ba4-445e-9bce-d738eb832e1c -->
# AI Core Infrastructure Implementation

## Overview

Upgrade Qurse's AI infrastructure to production-ready, scalable architecture with:

- Multi-format reasoning extraction & streaming
- Provider-specific configurations for all providers
- Parallel async operations for 3x faster responses
- Proper error handling with retries
- Industry-standard SSE streaming with AI SDK

---

## Phase 1: Reasoning System Infrastructure

### 1.1 Expand Provider Layer (ai/providers.ts)

**Add Multiple Reasoning Middleware Types**

```typescript
// Support different reasoning formats for different models
const reasoningMiddleware = {
  think: extractReasoningMiddleware({ tagName: 'think' }),
  thinkWithStart: extractReasoningMiddleware({ 
    tagName: 'think', 
    startWithReasoning: true 
  }),
  // Infrastructure for future formats
  // anthropic: native thinking support
  // openai: o1 reasoning format
  // google: thinking config
};
```

**Update Model Wrapping**

- Identify which models need `thinkWithStart` (currently none, but ready)
- Keep existing models with standard middleware
- Add clear comments for future reasoning model additions

### 1.2 Extend Model Configuration (ai/models.ts)

**Add Reasoning Configuration to ModelConfig Interface**

```typescript
export interface ModelConfig {
  // ... existing fields ...
  
  // NEW: Reasoning configuration
  reasoningConfig?: {
    middleware: 'think' | 'thinkWithStart' | 'native' | 'none';
    streamable: boolean;
    format?: 'hidden' | 'visible';
  };
  
  // NEW: Provider configuration
  providerConfig?: {
    groq?: GroqOptions;
    xai?: XaiOptions;
    anannas?: OpenAIOptions;
  };
}
```

**Update Existing Models**

- Add reasoningConfig to gpt-oss-120b (middleware: 'think', streamable: true)
- Add reasoningConfig to grok-3-mini (middleware: 'think', streamable: true)
- Add reasoningConfig to kimi-k2 (middleware: 'none', streamable: false)

### 1.3 Create Type Definitions (lib/types.ts)

**Add Stream Message Types**

```typescript
export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  isComplete: boolean;
}

export interface StreamMetadata {
  model: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  completionTime: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  metadata?: StreamMetadata;
  timestamp?: string;
}
```

---

## Phase 2: Provider Configuration System

### 2.1 Add Provider Option Types (ai/models.ts)

**Define Provider-Specific Options**

```typescript
// Groq provider options
interface GroqOptions {
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  reasoningFormat?: 'visible' | 'hidden';
  parallelToolCalls?: boolean;
  structuredOutputs?: boolean;
}

// XAI provider options
interface XaiOptions {
  parallel_tool_calls?: boolean;
}

// Anannas (OpenAI-compatible) options
interface AnannasOptions {
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  parallelToolCalls?: boolean;
}
```

### 2.2 Create Provider Config Helper (ai/models.ts)

**Add getProviderOptions Function**

```typescript
export function getProviderOptions(modelValue: string): {
  groq?: GroqOptions;
  xai?: XaiOptions;
  openai?: AnannasOptions;
} {
  const model = getModelConfig(modelValue);
  if (!model?.providerConfig) return {};
  
  // Return provider-specific configs
  const options: any = {};
  
  if (model.provider === 'groq' && model.providerConfig.groq) {
    options.groq = model.providerConfig.groq;
  }
  
  if (model.provider === 'xai' && model.providerConfig.xai) {
    options.xai = model.providerConfig.xai;
  }
  
  if (model.provider === 'anannas' && model.providerConfig.anannas) {
    options.openai = model.providerConfig.anannas;
  }
  
  return options;
}
```

### 2.3 Add Provider Configs to Models (ai/models.ts)

**Update Model Configurations**

For `openai/gpt-oss-120b`:

```typescript
providerConfig: {
  groq: {
    reasoningEffort: 'high',
    reasoningFormat: 'hidden',
    parallelToolCalls: false,
    structuredOutputs: true,
  }
}
```

For `grok-3-mini`:

```typescript
providerConfig: {
  xai: {
    parallel_tool_calls: false,
  }
}
```

---

## Phase 3: API Route Upgrade & Performance

### 3.1 Upgrade Streaming Architecture (app/api/chat/route.ts)

**Replace toTextStreamResponse with createUIMessageStream**

Current code (~line 174-224):

```typescript
const result = streamText({ ... });
return result.toTextStreamResponse({ ... });
```

New implementation:

```typescript
import { createUIMessageStream } from 'ai';

const stream = createUIMessageStream<ChatMessage>({
  execute: async ({ writer: dataStream }) => {
    const startTime = Date.now();
    
    const result = streamText({
      model: qurse.languageModel(model),
      messages,
      system: modeConfig.systemPrompt,
      maxRetries: 5,
      ...getModelParameters(model),
      providerOptions: getProviderOptions(model),
      tools,
    });
    
    result.consumeStream();
    
    dataStream.merge(
      result.toUIMessageStream({
        sendReasoning: true,
        messageMetadata: ({ part }) => {
          if (part.type === 'finish') {
            return {
              model,
              completionTime: Date.now() - startTime,
              totalTokens: part.totalUsage?.totalTokens ?? null,
              inputTokens: part.totalUsage?.inputTokens ?? null,
              outputTokens: part.totalUsage?.outputTokens ?? null,
            };
          }
        },
      })
    );
  },
  onError: (error) => {
    console.error('Stream error:', error);
    return 'An error occurred while generating the response.';
  },
  onFinish: async ({ messages }) => {
    // Save messages after streaming completes
    if (user && convId) {
      const assistantMessage = messages.find(m => m.role === 'assistant');
      if (assistantMessage) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          content: assistantMessage.content,
          role: 'assistant',
        });
      }
    }
  },
});

return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
```

**Import JsonToSseTransformStream**:

```typescript
import { JsonToSseTransformStream } from 'ai';
```

### 3.2 Refactor to Parallel Operations (app/api/chat/route.ts)

**Current Sequential Flow** (~lines 23-138):

```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// ... then parse request
// ... then access control
// ... then conversation management
```

**New Parallel Flow**:

```typescript
export async function POST(req: Request) {
  try {
    // Stage 1: Fast authentication check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Stage 2: Parse request body
    const body = await req.json();
    const {
      messages,
      conversationId,
      model = 'openai/gpt-oss-120b',
      chatMode = 'chat',
    } = body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }
    
    // Stage 3: Parallel data fetching (critical path)
    const [accessCheck, modeConfig] = await Promise.all([
      // Access control check
      (async () => {
        const isPro = false; // TODO: Get from subscription
        return canUseModel(model, user, isPro);
      })(),
      // Chat mode config
      getChatMode(chatMode),
    ]);
    
    // Check access
    if (!accessCheck.canUse) {
      const statusCode = accessCheck.reason === 'Authentication required' ? 401 : 403;
      throw new ModelAccessError(accessCheck.reason || 'Access denied', statusCode);
    }
    
    if (!modeConfig) {
      throw new ChatModeError(`Chat mode '${chatMode}' not found`);
    }
    
    // Stage 4: Conversation management (only if user authenticated)
    let convId = conversationId;
    if (user) {
      convId = await handleConversationCreation(user, conversationId, messages, supabase);
    }
    
    // Stage 5: Stream response
    return await streamResponse({
      user,
      convId,
      model,
      messages,
      modeConfig,
      supabase,
    });
    
  } catch (error) {
    // ... error handling
  }
}
```

### 3.3 Extract Helper Functions (app/api/chat/route.ts)

**Add Conversation Handler**:

```typescript
async function handleConversationCreation(
  user: any,
  conversationId: string | undefined,
  messages: any[],
  supabase: any
): Promise<string> {
  let convId = conversationId;
  const userMessage = messages[messages.length - 1]?.content || '';
  const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
  
  if (convId) {
    // Check if conversation exists
    const { data: existingConv, error: checkError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', convId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking conversation:', checkError);
    }
    
    if (!existingConv || existingConv.user_id !== user.id) {
      // Create new conversation
      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: convId, user_id: user.id, title })
        .select()
        .maybeSingle();
      
      if (convError && convError.code !== '23505') {
        throw new Error('Failed to create conversation');
      }
    }
  } else {
    // Create new conversation without ID
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    
    if (convError) {
      throw new Error('Failed to create conversation');
    }
    
    convId = conversation.id;
  }
  
  // Save user message
  await supabase.from('messages').insert({
    conversation_id: convId,
    content: userMessage,
    role: 'user',
  });
  
  return convId;
}
```

### 3.4 Add Background Operations (app/api/chat/route.ts)

**Import after from Next.js**:

```typescript
import { after } from 'next/server';
```

**Use for non-critical operations**:

```typescript
// In streamResponse or onFinish callback
after(async () => {
  try {
    // Non-critical operations that don't block response
    console.log('Background cleanup completed');
  } catch (error) {
    console.error('Background operation failed:', error);
  }
});
```

---

## Phase 4: Client-Side Migration to AI SDK

### 4.1 Update Conversation Page (app/(search)/conversation/[id]/page.tsx)

**Replace Raw Fetch with useChat Hook**

Remove current implementation (~lines 242-307):

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... raw fetch + TextDecoder logic
};
```

New implementation:

```typescript
'use client';

import { useChat } from 'ai/react';

export default function ConversationPage({ params }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    id: conversationId,
    body: {
      model: selectedModel,
      chatMode,
      conversationId,
    },
    onFinish: (message) => {
      // Message finished streaming
      console.log('Message completed:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });
  
  // ... rest of component uses messages from useChat
}
```

**Update Message Rendering**:

- `useChat` provides messages with proper types
- Reasoning will be in `message.annotations` or separate reasoning field
- Metadata will be in `message.metadata`

### 4.2 Add Reasoning Display Support (app/(search)/conversation/[id]/page.tsx)

**Update Message Rendering to Handle Reasoning**:

```typescript
{messages.map((message) => (
  <div key={message.id}>
    <ChatMessage
      content={message.content}
      isUser={message.role === 'user'}
    />
    {message.reasoning && (
      <div className="reasoning-section">
        {/* Reasoning content - you'll style this later */}
        <details>
          <summary>View reasoning</summary>
          <pre>{message.reasoning}</pre>
        </details>
      </div>
    )}
  </div>
))}
```

---

## Phase 5: Error Handling Enhancement

### 5.1 Expand Error Classes (lib/errors.ts)

**Add New Error Types**:

```typescript
export class StreamingError extends Error {
  statusCode: number = 500;
  
  constructor(
    message: string,
    public phase: 'initialization' | 'streaming' | 'completion'
  ) {
    super(message);
    this.name = 'StreamingError';
    Object.setPrototypeOf(this, StreamingError.prototype);
  }
}

export class ProviderError extends Error {
  statusCode: number = 502;
  
  constructor(
    message: string,
    public provider: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'ProviderError';
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}
```

### 5.2 Update Error Handling (app/api/chat/route.ts)

**Add Retry Configuration to streamText**:

```typescript
streamText({
  // ... other config
  maxRetries: 5,
  onError: (error) => {
    console.error('Stream error:', error);
    if (error.message.includes('API key')) {
      throw new ProviderError('Provider authentication failed', model.provider, false);
    }
  },
});
```

**Enhanced Catch Block**:

```typescript
} catch (error) {
  console.error('Chat API Error:', error);
  
  // Handle custom errors
  if (error instanceof ModelAccessError || 
      error instanceof ChatModeError ||
      error instanceof StreamingError ||
      error instanceof ProviderError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  
  // Generic fallback
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## Phase 6: Testing & Validation

### 6.1 Manual Testing Checklist

**Test Reasoning Models**:

1. Send message to `openai/gpt-oss-120b`
2. Verify reasoning streams in real-time
3. Check reasoning is saved to database
4. Verify metadata (tokens, timing) is present

**Test Non-Reasoning Models**:

1. Send message to `moonshotai/kimi-k2-instruct`
2. Verify no reasoning section appears
3. Check normal streaming works

**Test Error Handling**:

1. Test with invalid model ID → Should get ModelAccessError
2. Test with invalid chat mode → Should get ChatModeError
3. Test without authentication (for Pro model) → Should get 401

**Test Performance**:

1. Check browser DevTools Network tab
2. Measure time from request → first chunk
3. Should be ~50ms faster than before (parallel operations)

### 6.2 Console Testing Commands

**In app/api/chat/route.ts, add timing logs**:

```typescript
const requestStartTime = Date.now();
console.log('⏱️  Request started');

// After parallel operations
console.log(`⏱️  Setup complete: ${Date.now() - requestStartTime}ms`);

// Before streaming
console.log(`⏱️  Time to stream: ${Date.now() - requestStartTime}ms`);
```

### 6.3 Linter Check

Run after all changes:

```bash
npm run lint
```

Fix any TypeScript errors that appear.

---

## Files Modified

1. **ai/providers.ts** - Add reasoning middleware types
2. **ai/models.ts** - Add provider configs, reasoning configs, helper functions
3. **lib/types.ts** - Add stream message types
4. **lib/errors.ts** - Add new error classes
5. **app/api/chat/route.ts** - Complete refactor (streaming, parallel ops, error handling)
6. **app/(search)/conversation/[id]/page.tsx** - Migrate to useChat hook

---

## Success Criteria

- ✅ Reasoning streams in real-time to client
- ✅ Provider-specific options applied correctly
- ✅ API response time reduced by 30%+
- ✅ All models work (reasoning and non-reasoning)
- ✅ Proper error messages for all failure cases
- ✅ Metadata (tokens, timing) visible in stream
- ✅ No TypeScript errors
- ✅ Client properly parses SSE stream with useChat

---

## Gateway Pattern (TODO for Later)

Add this comment in ai/providers.ts for future implementation:

```typescript
// TODO: Gateway pattern for provider fallbacks
// When implemented, replace direct provider calls with:
// 'model-id': gateway('provider/model-name')
// This enables automatic fallbacks when providers fail
```

### To-dos

- [ ] Phase 1: Implement reasoning infrastructure (middleware types, model configs, type definitions)
- [ ] Phase 2: Add provider configuration system (option types, helper functions, model configs)
- [ ] Phase 3: Upgrade API route (createUIMessageStream, parallel operations, background tasks)
- [ ] Phase 4: Migrate client to useChat hook (replace raw fetch, add reasoning display)
- [ ] Phase 5: Enhance error handling (new error types, retry logic, better catch blocks)
- [ ] Phase 6: Test all functionality (reasoning streaming, performance, error cases, linting)