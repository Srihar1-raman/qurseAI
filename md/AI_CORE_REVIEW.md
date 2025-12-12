## AI Core Review (Qurse Rebuild)

**Scope**: Providers, models, chat pipeline, modes, tool readiness, persistence, rate limiting. Goal is to stress‑test the current foundation for future modes/agents (web search, finance, Reddit/Twitter, math, scientific/ArXiv, maps/geo, etc.) using the AI SDK as the orchestration layer.

---

### What’s Strong Already
- **Provider abstraction** (`ai/providers.ts`): Single `qurse` provider with middleware-based reasoning wrapping; easy to add models; clean separation from config.
- **Model registry** (`ai/models.ts`): Central metadata (access, reasoning, provider options, parameters); helper accessors used by API for gating and providerOptions; caching with Map.
- **Chat API pipeline** (`app/api/chat/route.ts`): Zod validation, auth/pro enforcement, hybrid rate limiting, guest vs auth persistence, streaming via `createUIMessageStream` and `streamText`, background assistant save, title gen hook, error sanitization.
- **Modes registry** (`ai/config.ts`): Registry pattern ready for multiple modes with tool allowlists.
- **Rate-limit stack** (`lib/services/rate-limiting*.ts`, `lib/db/rate-limits.server.ts`, `lib/redis/rate-limit.ts`): Dual-layer guest limits (Upstash IP + DB session hash) and DB limits for auth (Pro bypass to tracking).
- **Supabase integration**: Shared server/client clients, RLS on tables, guest staging tables with transfer/cleanup functions (`migration_rate_limiting_hybrid.sql`), message parts persisted, conversation title updates.
- **Auth caching** (`lib/supabase/auth-utils.ts`, `lib/contexts/AuthContext.tsx`): Single getUser, Pro status caching, corruption detection.

---

### Gaps / Risks for Future Agents & Modes
1) **Tools not persisted or audited**
- Tool calls are allowed via AI SDK but are not saved to DB; only user/assistant roles are stored. Tool invocation/results will be invisible in history, debugging, and rate accounting.
- No tool usage limits or per-tool auth/pro gating.

2) **Mode enforcement is minimal**
- `ai/config.ts` only has the default `chat` mode; mode metadata (requiresPro, max tools, safety rules, search config, system templates) is not enforced in `/api/chat`.
- Request validation trusts client-provided `chatMode`; no per-mode provider guardrails or tool allowlist checks.

3) **Provider robustness & fallbacks**
- No gateway/fallback routing when a provider fails or rate-limits; only a TODO comment.
- Provider key/config validation is deferred to runtime; missing keys can surface as 500s mid-stream.

4) **Token accounting and billing hooks**
- Token usage is read from AI SDK finish metadata but not recorded to DB or rate-limit state; cannot enforce per-model/token budgets or show usage in UI.

5) **Reasoning visibility control**
- `reasoningConfig` exists in model configs, but the stream always requests reasoning for models with `reasoning: true`; no per-mode override or user toggle; reasoning text not filtered for guests.

6) **Tool execution safety**
- No sandboxing/timeout/logging around tool execution; AI SDK tool functions are not wrapped for metrics or circuit-breakers.
- Future external tools (web, finance, social) will need per-provider rate limits and request signing; no adapters exist yet.

7) **Streaming error surfaces**
- Errors in background saves (`after`) are logged only; no retry/backoff or dead-letter. If assistant save fails, history diverges from UI.
- No backpressure or cancellation handling (client disconnects, aborted fetch).

8) **Schema alignment for agents**
- Messages table stores `parts` but lacks explicit columns for tool name/output, invocation cost, or trace IDs. This limits building transcripts for complex agent runs.

9) **Configuration discoverability**
- Model list is hardcoded; no feature flags or remote config to disable unstable models or modes quickly.

10) **Env/secret guarantees**
- `SESSION_HMAC_SECRET` is required at import time (`lib/utils/session-hash.ts`); missing env will crash any route import. Providers also accept empty keys silently (e.g., Anannas uses `''`); better to hard-fail at boot.

---

### Recommendations (Production-Ready Path)

#### A. Tooling & Mode Enforcement
- Add a **tool invocation persistence layer**:
  - File: `lib/db/messages.server.ts` and `lib/db/queries.ts`  
  - Store `role: 'tool'` messages with metadata `{ tool_name, args, result, latency_ms, error? }`.
  - Expose helper `saveToolMessage` and call it from chat route when `tool` parts are emitted.
- Enforce **mode allowlists** in `/api/chat`:
  - After loading `modeConfig`, filter requested tools to `enabledTools`; reject others with 400.
  - Add optional `requiresPro`, `maxToolsPerTurn`, `reasoningEnabled` to `ChatModeConfig`.
  - Strengthen validation: extend `chatRequestSchema` to validate `chatMode` against registry and to forbid custom tool IDs.
- Introduce **tool registry with policies**:
  - New file: `src/lib/tools/registry.ts` to register tools with `id`, `description`, `authLevel`, `rateLimit`, `timeoutMs`.
  - Wrap tool functions with a guard that enforces per-tool limits and logs metrics.

#### B. Provider Reliability & Fallbacks
- Implement a **gateway wrapper** in `ai/providers.ts`:
  - Add `gateway(modelId, [primary, secondary])` that attempts providers with graceful downgrades on 429/5xx/timeouts.
  - Centralize provider option defaults and env validation; fail fast on missing keys during startup (export `assertProviderEnv()` called from `next.config` or an init module).
- Add **provider health telemetry** and structured error mapping to surface to Sentry with model/provider tags.

#### C. Token & Usage Accounting
- Persist **usage events** after streaming:
  - File: `app/api/chat/route.ts` -> `after` block to insert a `usage` row (or augment `messages` row) with `input_tokens`, `output_tokens`, `total_tokens`, `model`, `completion_time`.
  - Use this data for both UI usage display and rate limiting (token-based instead of count-only).

#### D. Reasoning Controls
- Add per-mode/per-user **reasoning toggle**:
  - Mode config: `reasoningEnabled` default true.
  - Request schema: optional `sendReasoning` boolean; enforce false for guests or sensitive modes.
  - In stream merge, condition on both model and mode/user flags.

#### E. Tool Safety & Observability
- Wrap tool handlers with:
  - Timeouts, max payload size, and circuit-breakers.
  - Structured logs (`tool_id`, `latency_ms`, `success`, `error_type`).
  - Optional redaction for PII before logging.
- For external agents (web/Twitter/Reddit/finance/maps), add **adapter services** under `src/features/tools/{provider}/service.ts` with retry/backoff and per-tool rate limits (use Upstash buckets keyed by user/tool).

#### F. Message Persistence Robustness
- Add **retry/backoff** for background assistant saves; on repeated failure, enqueue to a lightweight queue (e.g., Supabase function or log for replay) instead of dropping silently.
- Ensure **conversation_id** is returned in headers even for guest-created conversations so the client can hydrate history reliably.

#### G. Schema Enhancements for Agents
- Extend `messages` to include:
  - `tool_name TEXT`, `tool_call_id TEXT`, `tool_latency_ms INTEGER`, `error TEXT`.
  - Add GIN index on `parts` plus `tool_name` for audit/search.
- Add `agent_runs` table for multi-step agents: `id`, `conversation_id`, `mode`, `status`, `started_at`, `ended_at`, `steps JSONB`.

#### H. Config & Feature Flags
- Add a **remote model/mode allowlist** (e.g., Supabase table `feature_flags` or static JSON served via edge cache) to disable unstable models without redeploy.

#### I. Env & Boot Guardrails
- Create `lib/config/validate-env.ts` to assert presence of `SESSION_HMAC_SECRET`, provider keys (Groq/XAI/Anannas), and Upstash credentials. Import once in server bootstrap (e.g., `middleware.ts` or `app/layout.tsx` on server side).

---

### Concrete Change Map
- **ai/config.ts**: Expand `ChatModeConfig` (requiresPro, reasoningEnabled, maxToolsPerTurn), add multiple modes, enforce defaults.
- **lib/validation/chat-schema.ts**: Validate mode against registry; forbid unknown tools once tool IDs are passed; add optional `sendReasoning`.
- **app/api/chat/route.ts**: 
  - Enforce mode tool allowlist; attach `sendReasoning`; conditionally pass reasoning to `toUIMessageStream`.
  - Persist tool calls and usage data; add retry/backoff for assistant save; surface conversation id header consistently.
- **lib/tools/**: Add registry with per-tool policies and wrappers; implement adapters for first external tools (web search via Tavily/Exa, Reddit/Twitter API wrappers, math via Desmos API, arXiv).
- **lib/db/messages.server.ts**: Add helpers `saveToolMessage`, `saveUsage`; ensure schema columns exist (migration).
- **lib/supabase/schema.sql + migration**: Add tool columns and `agent_runs`; add indexes; keep RLS consistent (tool messages tied to conversations).
- **ai/providers.ts**: Add gateway/fallback wrapper, provider env validation, per-provider defaults (timeouts, maxRetries).
- **lib/utils/logger.ts** (or new `lib/utils/metrics.ts`): Add structured event logging for tools/providers/agents.
- **lib/utils/session-hash.ts**: Move env assertion to a boot validator to avoid import-time crashes.

---

### Priority Order to Harden Core
1. Mode/tool enforcement + tool persistence (minimal migration + chat route changes).
2. Provider env validation and gateway fallback.
3. Usage/token recording to DB and align rate limiting to tokens.
4. Reasoning toggle and guest safeguards.
5. Tool safety wrappers and per-tool rate limits for external agents.
6. Schema for agent runs and tool audit; background save retry path.
7. Feature flags/remote config for models/modes.

---

### Bottom Line
The current foundation is clean and extensible: registry patterns, AI SDK streaming, hybrid rate limiting, and Supabase persistence are solid. To be production-ready for rich agentic modes (web/finance/social/math/science/maps), tighten mode/tool enforcement, add observability and persistence for tool calls and usage, harden provider fallbacks, and evolve the schema for agent traces and token-aware limits. These steps keep the core lean while making it safe and scalable for the planned feature set.

---

## Addendum: AI SDK Tooling & Multi-Step Calls (from `aisdk_doc.md`)

**Doc highlights**
- Tool calls are emitted as `tool-call` parts; AI SDK can loop tools when `stopWhen`/`stepCountIs(n)` is set, enabling the model to summarize after tool use.
- Tools define `description`, Zod `inputSchema`, and `execute`; the SDK appends tool-call messages and invokes `execute` automatically.
- UI is expected to render tool-call parts (e.g., `tool-addResource`, `tool-getInformation`) so users see tool invocations and args while streaming.

**Gaps vs doc**
- `/api/chat` doesn’t use `stopWhen`/multi-step; generations may stop at the tool-call without the follow-up answer.
- Tool-call/result parts aren’t persisted or rendered; agent traces are lost for history/debugging and auditing.
- No central tool registry with Zod schemas/policies; adding future agents (web/finance/social/math/science/maps) is harder and riskier.
- Reasoning/prompt scoping isn’t mode-aware; instructions like “only respond with tool info” aren’t enforced per mode.
- Tool execution lacks timeouts/retries/metrics; doc examples assume happy path.

**Actions to align**
- Add `stopWhen: stepCountIs(4–6)` in `streamText` and loop tool results back so the assistant can summarize.
- Persist `tool-call` and `tool` result messages with `tool_name/args/result/latency/error`; render them distinctly in `ConversationClient`.
- Build a tool registry (`lib/tools/registry.ts`) with Zod schemas, descriptions, per-tool rate limits/timeouts, and auth/pro flags; wire to modes’ `enabledTools`.
- Wrap tool execution with timeout + retry + structured logs (`tool_id`, latency, error_type); sanitize errors before sending to the model.
- Mode-aware prompting/reasoning: allow modes to disable reasoning/tool loops; inject system text mirroring doc guidance (“only respond using tool results; otherwise say you don’t know”).

---

## Additional Architecture & Safety Observations (structure, scalability, optimization)

**What’s good**
- Feature-based layout is consistent; AI, services, db, validation, contexts are separated.
- Server-only utilities (`lib/services/*`) respect server boundaries; streaming path already uses `after` for background work.
- Hybrid rate limiting, guest staging, and RLS give a solid safety baseline.

**Gaps / risks**
- Env validation is scattered (e.g., `SESSION_HMAC_SECRET` throws on import). Missing provider keys fail at runtime, not boot.
- No request-level timeouts for providers/tools; long hangs can tie up server resources.
- Error handling: background saves log-only; no retries or dead-letter. Provider errors aren’t normalized for metrics.
- Observability: minimal structured logs/metrics for tools, providers, rate-limit decisions, and streaming cancellations.
- Streaming cancellation/backpressure: route doesn’t react to client disconnect; no early stop to save DB/LLM cost.
- Validation coverage: Chat schema doesn’t cap total token/parts length per request; modes/tools not validated together.
- Folder enforcement: Tools are in `lib/tools/` but registry/policies are missing; modes still single-file with TODOs.

**Improvements**
- Add a boot-time env validator (`lib/config/validate-env.ts`) invoked once from server entry (middleware/layout) to fail fast on missing secrets and provider keys.
- Wrap providers and tools with timeouts and per-call abort signals; propagate to AI SDK `streamText` via `AbortSignal`.
- Add retries/backoff for background DB writes and provider calls; on repeated failure, enqueue to a lightweight queue or log for replay.
- Normalize errors and add structured logging fields: `{ span: 'tool|provider|rate-limit', model, tool_id, latency_ms, error_type }`; send to Sentry.
- Handle client disconnect: watch `req.signal` and abort upstream calls/DB work early.
- Tighten validation: add maximum parts/text length per message, total payload cap, and mode/tool cross-validation (tool must be allowed for the mode).
- Create `lib/tools/registry.ts` with per-tool policy metadata and keep mode definitions in `ai/config.ts` small, pulling tool allowlists from the registry.
- Consider a lightweight metrics helper for latency/throughput of provider calls, tool execs, and rate-limit checks; feed into dashboards.

---

## Additional Edge Cases & Production Readiness Notes

- **Idempotency & retries**: Ensure DB writes in `/api/chat` (user/assistant/tool messages) are idempotent on retry. Use deterministic IDs for tool-call rows or guard with unique `(conversation_id, tool_call_id)` to avoid dupes when clients reconnect/retry.
- **Race conditions**: Concurrent sends on the same conversation could reorder title generation or message saves. Use `updated_at` bump plus an ordered insert; consider optimistic locking on title updates.
- **Cold-start & provider quotas**: Add lightweight provider health check and exponential backoff on 429/5xx. Swap to fallback model automatically when primary is throttled; emit header indicating downgrade.
- **Streaming truncation**: If upstream returns partial chunks, ensure `onError` or `onFinish` still persists assistant message with a `partial: true` flag to avoid dangling conversations with no assistant turn.
- **Content safety & PII**: Before logging tool inputs/outputs, run a redaction helper to remove emails/phones/access tokens. Keep a `sensitive` flag on tools to skip logging payloads.
- **Payload limits**: Enforce max total request size (messages length, parts count, JSON bytes) to avoid abuse and to keep latency predictable.
- **Circuit breaking**: Per-tool and per-provider circuit breakers to avoid cascading failures during provider outages. Integrate with Upstash or in-memory counters with decay.
- **Timeout budgets**: Define SLA budgets per route (e.g., 25–30s) and pass them down to providers/tools; fail fast with a friendly error if budget exceeded.
- **Schema evolution**: When adding `tool_name`/`tool_call_id` columns, ensure existing RLS policies include the new columns and backfill defaults to avoid policy failures.
- **Client cancel UX**: If client disconnects mid-stream, stop upstream calls and avoid saving partial assistant messages; optionally mark the conversation as `aborted` to help UI reconcile.
- **Test coverage**: Add focused tests for chat validation (mode/tool cross-check), rate-limit branches (guest/auth/pro), and tool execution wrapper (timeout/retry/sanitize).

---

## Playbook: Adding New Chat Modes, Agents, and Tools (Scalable Structure)

**Folder structure (stay consistent)**
- `ai/`
  - `config.ts`: register chat modes (id, name, description, systemPrompt, enabledTools, defaultModel, requiresPro?, reasoningEnabled?, maxToolsPerTurn?).
  - `models.ts`: add model metadata once; providers already wired in `ai/providers.ts`.
- `lib/tools/`
  - `registry.ts`: central registry of tools with `id`, `description`, Zod `inputSchema`, `execute`, `authLevel`, `rateLimit`, `timeoutMs`, `tags`. Export `getToolsByIds`.
  - `{provider|domain}/`: adapters for external services (web search, Reddit/Twitter, finance, math, arXiv, maps), each with a small service file and shared error/timeout wrapper.
- `app/api/chat/route.ts`: single orchestration point. Enforce mode + tool allowlist, run `stopWhen`, stream, persist messages/tool calls/usage, and apply rate limits.
- `lib/db/`: migrations and server/client helpers; add tool-call columns (`tool_name`, `tool_call_id`, `tool_latency_ms`, `error`, `parts` already exist) and optional `agent_runs` for multi-step traces.
- `lib/services/`: domain services (rate limiting, subscription, preferences, etc.) kept pure server-only.
- `lib/validation/chat-schema.ts`: validate `chatMode` against registry and (if passed) tool ids against mode allowlist; cap payload sizes.

**Steps to add a new tool**
1) Implement adapter in `lib/tools/{domain}/{toolId}.ts` with:
   - Zod `inputSchema`
   - `execute` using provider SDK/fetch, with timeout, retries, sanitized errors.
   - Optionally a per-tool rate limiter (Upstash) keyed by user/tool.
2) Register in `lib/tools/registry.ts`:
   ```ts
   registerTool({
     id: 'web_search',
     description: 'Search the web via Tavily/Exa',
     inputSchema: webSearchInputSchema,
     execute: webSearchExecute,
     authLevel: 'guest|auth|pro',
     timeoutMs: 8000,
     rateLimit: { limit: 10, windowHours: 1 },
   });
   ```
3) Allowlist the tool in chat modes that need it (`ai/config.ts`, `enabledTools: ['web_search']`).
4) In `/api/chat`, when building `tools`, call `getToolsByIds(mode.enabledTools)`; persist tool-call/result messages to DB (`role: 'tool'`, metadata).

**Steps to add a new chat mode**
1) In `ai/config.ts`, register:
   ```ts
   registerChatMode({
     id: 'finance',
     name: 'Finance',
     description: 'Equities/ETF/company lookups with web + filings',
     systemPrompt: 'You are a finance assistant. Use tools to fetch current data. If tools fail, state that you cannot fetch.',
     enabledTools: ['web_search', 'company_filings'],
     defaultModel: 'openai/gpt-oss-120b',
     requiresPro: true,
     reasoningEnabled: true,
     maxToolsPerTurn: 3,
   });
   ```
2) Update any mode metadata you need (icon/color can live alongside id if desired).
3) No code changes in the route if the registry + validation is already enforced; the mode will pick up allowlisted tools and default model automatically.

**Steps to add an agent (multi-step orchestrations)**
1) If using simple tool-calling (AI SDK handles loop), set `stopWhen: stepCountIs(n)` in `/api/chat` and rely on tool registry entries.
2) For orchestrated agents (custom planning), add `lib/features/agents/{agentId}.ts`:
   - Compose steps (plan → tool calls → synthesis), reuse tool registry for execution.
   - Expose `runAgent({ messages, mode, tools })` and invoke from `/api/chat` when `chatMode` matches.
3) Persist agent trace to `agent_runs` with steps JSON for debugging.

**Prompting differences (mode-aware)**
- Keep systemPrompt per mode in `ai/config.ts`.
- Add optional `reasoningEnabled` and `toolOnly` flags; in `/api/chat`, if `toolOnly` then inject guidance (“only respond using tool results; otherwise say you don’t know”).
- Allow request-level `sendReasoning` but clamp based on mode/user (e.g., disable for guests).

**Persistence pattern**
- Save user message first (after ensureConversation/guest conversation).
- Save tool-call (`role: 'tool'`, `tool_call_id`, args) and tool-result messages.
- Save assistant message on finish (with `partial` flag if stream aborted).
- Save usage row (tokens, model, completion_time) for metering.

**Safety & SLAs**
- Enforce payload caps in validation; enforce per-tool and per-provider timeouts.
- Rate-limit per user/tool/mode as needed (guests stricter).
- Abort upstream work on client disconnect (`req.signal`).
- Redact PII in logs; structured logging for providers/tools.

**Repeatability**
- One place to add modes (`ai/config.ts`), one place to add tools (`lib/tools/registry.ts` + adapter), one place to orchestrate (`/api/chat`). Minimal cross-file edits to introduce new capability; leverage registry patterns to keep additions additive, not invasive.

---

## AI SDK Doc Pull-Ins (ensure we match official patterns)

- **Multi-step loops**: Use `stopWhen`/`stepCountIs(n)` so tool calls are followed by model synthesis; keeps parity with doc guidance.
- **Tool-call robustness**: Handle AI SDK tool-call errors (`ToolCallRepairError`, etc.) and surface clean errors to the user. Consider the custom tool-call parser middleware if a model lacks native tool support.
- **UI surfacing**: Render tool-call parts distinctly (`tool-*`) so users see when tools are invoked (doc expectation).
- **Structured outputs**: AI SDK supports structured output; future modes (e.g., finance summaries) can use `structuredOutput` with Zod schemas to reduce post-processing.
- **Metrics hooks**: Leverage AI SDK spans (`ai.toolCall`) for tracing; map them into structured logs/Sentry for per-tool/per-provider visibility.
- **Client tools (on the UI side)**: If any tools run client-side (e.g., local cache/search), wire `useChat`’s `onToolCall` callback to execute and feed results back—mirrors doc’s chatbot-with-tools flow.
- **Non-native tool models**: For models without native tool-calling, use the tool-call parser middleware noted in docs to normalize `tool-call` parts (keeps the same registry but broadens model support).
- **Streaming shape**: Stick to `convertToModelMessages`/`toUIMessageStreamResponse` (or current `createUIMessageStream`) and ensure `maxDuration` is set to prevent long-hanging requests, as in doc examples.
- **Error messaging parity**: Follow the doc pattern of prompting “respond only with tool results; otherwise say you don’t know” and ensure errors sent to the client are sanitized but explicit (rate limit, tool failure, provider auth).

