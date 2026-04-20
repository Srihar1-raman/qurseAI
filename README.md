# Qurse

**Qurse** is a full-featured AI chat platform built with Next.js 15. It supports multiple AI providers and models, ten distinct chat modes with specialized tooling, real-time web search, code execution, academic research, financial data, flight tracking, and much more. It is live at **[https://www.qurse.site](https://www.qurse.site)**.

---

## Table of Contents

- [Features](#features)
- [Chat Modes](#chat-modes)
- [AI Models](#ai-models)
- [Tools & Integrations](#tools--integrations)
- [Third-Party Services](#third-party-services)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Rate Limiting](#rate-limiting)
- [Authentication](#authentication)
- [Subscriptions & Payments](#subscriptions--payments)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Deployment](#deployment)

---

## Features

- **Guest mode** — Try without signing up. Rate-limited by IP via Upstash Redis (10 requests/day per IP).
- **Conversation history** — Conversations are persisted per user in Supabase. Supports pinning, renaming, deleting, and searching.
- **Conversation sharing** — Share any conversation publicly via a unique token link.
- **Message branching** — Branch off from any message in a conversation to explore alternate threads.
- **File attachments** — Upload images (for vision models), PDFs, and DOCX files. PDFs and DOCX are parsed server-side into text. Audio files are transcribed via the transcription API.
- **Reasoning/thinking** — Supported models stream their internal reasoning steps as a collapsible block above the response.
- **Custom system prompt** — Users can set a personal system prompt injected into every conversation.
- **Default model preference** — Users can set their preferred default model in settings.
- **Supermemory integration** — Long-term AI memory per authenticated user. Previous conversations are semantically indexed; relevant context is injected automatically.
- **Dark / Light / Auto theme** — System-level theme preference with no flash on load.
- **Rich rendering** — LaTeX math (KaTeX), syntax-highlighted code blocks (Shiki), Mermaid diagrams, PlantUML diagrams, Excalidraw whiteboards, Vega-Lite charts, Spotify and YouTube embeds, PDF viewer, interactive Desmos graphs.
- **QR code generation** — AI can generate QR codes for any text or URL on request.
- **Real-time streaming** — All AI responses stream token-by-token using Vercel AI SDK v5.
- **Error tracking** — Sentry is integrated for both client and server error reporting.
- **Analytics** — Vercel Analytics and Speed Insights track real-world performance.

---

## Chat Modes

Each mode has a specialized system prompt and a curated set of enabled tools.

| Mode | Description | Key Tools |
|---|---|---|
| **Chat** | General-purpose conversation | QR code |
| **Web Search** | Live web search, news, weather, flights, movies | Exa web search, weather (current & historical), flight status/search/radar, airport/airline info, movie lookup, Wolfram Alpha, GitHub search, QR code |
| **Finance** | Stock quotes, crypto, forex, company data | Stock quote/history/search, company info, crypto price, forex rate, Wolfram Alpha |
| **Education** | Tutoring, homework, learning resources | Web search, Wolfram Alpha, academic PDF search, arXiv search, Desmos |
| **Science & Math** | Computations, formulas, unit conversion | Wolfram Alpha, Desmos |
| **arXiv** | Search and explore preprint papers from arXiv | arXiv search, arXiv paper detail, academic PDF search, Wolfram Alpha, Desmos |
| **Scopus** | Search 50M+ peer-reviewed papers from Scopus | Scopus search, Scopus paper detail, academic PDF search, Wolfram Alpha, Desmos |
| **Code** | Write, debug, and execute code in a sandbox | Daytona code execution (Python, JS/TS, C, C++, Bash), GitHub search, web search, Wolfram Alpha, Desmos |

---

## AI Models

Models are declared in `ai/models.ts` and instantiated in `ai/providers.ts`.

| Model | Provider | Access | Vision | Reasoning | Context |
|---|---|---|---|---|---|
| **Grok 3 Mini** | xAI | Free (no auth required) | No | Yes (hidden) | 131K |
| **Kimi K2** (moonshotai/kimi-k2-instruct) | Anannas (OpenAI-compatible) | Free (auth required) | No | No | 131K |
| **GPT OSS 120B** (openai/gpt-oss-120b) | Groq | Pro only | No | Yes (streaming) | 131K |
| **GPT-5 Nano** (gpt-5-nano-2025-08-07) | OpenAI (native) | Pro only | Yes | Yes (native) | 400K |

**Reasoning middleware**: Most reasoning models use `extractReasoningMiddleware` from the AI SDK, which strips `<think>` blocks out of the streamed text and surfaces them as a separate reasoning field rendered in a collapsible UI block.

**Anannas**: An OpenAI-compatible gateway that provides access to several models at reduced cost. Configured via `ANANNAS_API_KEY`.

---

## Tools & Integrations

All tools live in `lib/tools/` and are registered per chat mode in `ai/config.ts`.

| Tool | File | External API |
|---|---|---|
| `web_search` | `lib/tools/web-search.ts` | Exa AI |
| `weather` | `lib/tools/weather.ts` | wttr.in (free, no key) |
| `weather_history` | `lib/tools/weather-history.ts` | Open-Meteo (free, no key) |
| `flight_status` | `lib/tools/flight-status.ts` | AirLabs API |
| `flight_search` | `lib/tools/flight-search.ts` | AirLabs API |
| `flight_radar` | `lib/tools/flight-radar.ts` | AirLabs API |
| `airport_info` | `lib/tools/airport-info.ts` | AirLabs API |
| `airline_info` | `lib/tools/airline-info.ts` | AirLabs API |
| `movie_info` | `lib/tools/movie.ts` | TMDB API |
| `wolfram` | `lib/tools/wolfram.ts` | Wolfram Alpha API |
| `desmos` | `lib/tools/desmos.ts` | Desmos (client-side embed, no key) |
| `qr_code` | `lib/tools/qr-code.ts` | `qrcode-generator` (local) |
| `stock_quote` / `stock_history` / `company_info` / `crypto_price` / `forex_rate` / `stock_search` | `lib/tools/finance.ts` | Yahoo Finance / Alpha Vantage |
| `arxiv_search` / `arxiv_paper` | `lib/tools/arxiv.ts` | arXiv public API (no key) |
| `scopus_search` / `scopus_paper` | `lib/tools/scopus.ts` | Elsevier Scopus API |
| `academic_pdf_search` | `lib/tools/academic-pdf-search.ts` | arXiv & Scopus APIs |
| `github_search` | `lib/tools/github-search.ts` | GitHub search API |
| `daytona_code` | `lib/tools/daytona-code.ts` | Daytona SDK |

### Rich UI Components

Tool results render as specialized cards in `components/chat/`:

- **WeatherCard** — Current weather with icons and metrics
- **FlightStatusCard / FlightSearchCard / FlightRadarCard** — Real-time flight info
- **AirportInfoCard / AirlineInfoCard** — Aviation reference data
- **StockCard / StockChart** — Financial data with Recharts graphs
- **MovieCard** — Movie metadata with poster
- **ArxivCard** — Paper with abstract and PDF link
- **ScopusCard** — Peer-reviewed paper with citations
- **AcademicPdfCard** — Unified academic result card
- **WolframCard** — Wolfram Alpha answer with images
- **DesmosCard** — Embedded interactive Desmos calculator/grapher
- **GitHubCard** — Repository preview
- **QRCodeCard** — Rendered QR code image
- **CompanyInfoCard** — Company fundamentals

### Embeds

Components in `components/embeds/` handle rich content rendering:

- **YouTubeEmbed** — Detects YouTube URLs in AI output and embeds players
- **SpotifyEmbed** — Embeds Spotify tracks, albums, playlists
- **PdfEmbed** — PDF viewer using `react-pdf` / `pdfjs-dist`
- **PlantUMLEmbed** — Renders PlantUML diagrams via `plantuml-encoder`
- **VegaLiteEmbed** — Renders Vega-Lite JSON specs as charts
- **excalidraw-init** — Lazy-loads Excalidraw for whiteboard diagrams

---

## Third-Party Services

### Supabase
- **What it does**: PostgreSQL database, authentication, and row-level security.
- **Used for**: Storing users, conversations, messages, preferences, subscriptions, and rate limit records. All auth (Google OAuth, GitHub OAuth, email/password magic links) is handled by Supabase Auth.
- **Where**: `lib/supabase/`, `lib/db/`, `lib/contexts/AuthContext.tsx`, `middleware.ts`
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Upstash Redis
- **What it does**: Serverless Redis used for guest IP-based rate limiting.
- **Used for**: Two sliding-window rate limiters — standard IPs get 10 requests/day, unknown IPs get 3/day.
- **Where**: `lib/redis/client.ts`, `lib/redis/rate-limit.ts`
- **Env vars**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### Exa AI
- **What it does**: Neural and keyword web search with content extraction.
- **Used for**: The `web_search` tool in Web Search, Education, Code, and other modes. Supports search type (`auto`, `neural`, `keyword`, `fast`, `deep`), category filtering, and date-range filtering.
- **Where**: `lib/tools/web-search.ts`
- **Env vars**: `EXA_API_KEY`

### Wolfram Alpha
- **What it does**: Computational knowledge engine for math, science, unit conversions, and factual queries.
- **Used for**: The `wolfram` tool across Science & Math, Web Search, Education, Finance, arXiv, Scopus, and Code modes.
- **Where**: `lib/tools/wolfram.ts`
- **Env vars**: `WOLFRAM_APP_ID`

### Dodo Payments
- **What it does**: Payment processing for the Pro subscription.
- **Used for**: Checkout sessions, customer portal (manage/cancel subscription), and webhook handling to update subscription status in Supabase.
- **Where**: `lib/dodo-client.ts`, `lib/services/dodo-subscriptions.ts`, `app/api/payments/`
- **Env vars**: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_SECRET`, `DODO_PAYMENTS_ENVIRONMENT` (`test_mode` | `live_mode`), `DODO_PAYMENTS_TEST_PRODUCT_ID`, `DODO_PAYMENTS_LIVE_PRODUCT_ID`

### Supermemory
- **What it does**: AI-native memory layer. Stores conversation history semantically and returns relevant context for each new message.
- **Used for**: Injecting personalized context into the system prompt for authenticated users (when enabled in preferences).
- **Where**: `lib/services/supermemory.service.ts`
- **Env vars**: `SUPERMEMORY_API_KEY`

### Sentry
- **What it does**: Error tracking and performance monitoring for both server and client.
- **Used for**: Capturing unhandled exceptions, request errors, and performance traces. Integrated as a Next.js plugin in `next.config.ts`. Client-side init in `instrumentation-client.ts`, server-side in `instrumentation.ts`.
- **Where**: `instrumentation.ts`, `instrumentation-client.ts`, `next.config.ts`, `app/global-error.tsx`
- **Env vars**: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `NEXT_PUBLIC_SENTRY_RELEASE`

### Vercel Analytics & Speed Insights
- **What it does**: Real-user performance data (Web Vitals) and page-view analytics.
- **Used for**: Monitoring the production site. Both components are injected at the root layout level.
- **Where**: `app/layout.tsx`
- **No extra env vars required** — automatically activated on Vercel.

### Daytona
- **What it does**: Ephemeral sandbox environments for secure code execution.
- **Used for**: The `daytona_code` tool in Code mode. Creates a fresh isolated container per run, executes code, returns output, then destroys the sandbox.
- **Where**: `lib/tools/daytona-code.ts`, `app/api/daytona/sandbox/route.ts`
- **Env vars**: `DAYTONA_API_KEY`

### AirLabs
- **What it does**: Real-time aviation data API (flight status, radar, airport/airline info).
- **Used for**: All five flight-related tools (`flight_status`, `flight_search`, `flight_radar`, `airport_info`, `airline_info`).
- **Where**: `lib/tools/flight-*.ts`, `lib/tools/airport-info.ts`, `lib/tools/airline-info.ts`
- **Env vars**: `AIRLABS_API_KEY`

### Elsevier Scopus
- **What it does**: Academic paper search across 50M+ peer-reviewed publications.
- **Used for**: `scopus_search` and `scopus_paper` tools in the Scopus mode.
- **Where**: `lib/tools/scopus.ts`
- **Env vars**: `SCOPUS_API_KEY`

### TMDB (The Movie Database)
- **What it does**: Movie and TV show metadata.
- **Used for**: `movie_info` tool in Web Search mode.
- **Where**: `lib/tools/movie.ts`, `app/api/movie/route.ts`
- **Env vars**: `TMDB_API_KEY`

### Anannas AI
- **What it does**: OpenAI-compatible API gateway providing access to models like Kimi K2 at lower cost.
- **Used for**: Serving the `moonshotai/kimi-k2-instruct` model.
- **Where**: `ai/providers.ts`
- **Env vars**: `ANANNAS_API_KEY`

### Groq
- **What it does**: Ultra-fast LLM inference.
- **Used for**: GPT OSS 120B (Pro) and Llama 3.1 8B Instant (internal title generation).
- **Where**: `ai/providers.ts`
- **Env vars**: `GROQ_API_KEY`

### xAI
- **What it does**: xAI's inference API.
- **Used for**: Grok 3 Mini (free tier default model).
- **Where**: `ai/providers.ts`
- **Env vars**: `XAI_API_KEY`

### OpenAI
- **What it does**: Native OpenAI API.
- **Used for**: GPT-5 Nano (Pro, with vision and native reasoning).
- **Where**: `ai/providers.ts`
- **Env vars**: `OPENAI_API_KEY`

---

## Architecture

```
qurseAI/
├── ai/                         # AI provider and model configuration
│   ├── config.ts               # Chat mode registry (system prompts, enabled tools per mode)
│   ├── models.ts               # Model metadata, capabilities, access control
│   └── providers.ts            # Unified provider (Groq, xAI, Anannas, OpenAI)
│
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login and signup pages
│   ├── (search)/               # Main chat UI and conversation pages
│   ├── api/                    # API routes (chat, payments, user, guest, shared, etc.)
│   ├── checkout/               # Post-checkout success/cancel pages
│   ├── info/                   # About/info page
│   ├── pricing/                # Pricing page
│   ├── settings/               # User settings page
│   └── shared/[token]/         # Public shared conversation viewer
│
├── components/                 # React components
│   ├── auth/                   # Auth UI (login/signup forms)
│   ├── chat/                   # Chat message rendering and tool result cards
│   ├── conversation/           # Conversation thread, input, context indicator
│   ├── embeds/                 # Rich embeds (YouTube, Spotify, PDF, PlantUML, Vega-Lite, Excalidraw)
│   ├── guest/                  # Guest save nudge
│   ├── homepage/               # Hero, model selector, main input, recent chats
│   ├── icons/                  # SVG icon components (auto-generated, themed)
│   ├── info/                   # Info/about page components
│   ├── layout/                 # Header, navigation, sidebar, history sidebar
│   ├── pricing/                # Free/Pro plan cards
│   ├── settings/               # Settings panels (profile, preferences, billing)
│   └── ui/                     # Generic UI primitives (toaster, etc.)
│
├── hooks/                      # Custom React hooks
│
├── lib/                        # Shared utilities and services
│   ├── contexts/               # React contexts (Auth, Theme, RateLimit, Sidebar, etc.)
│   ├── db/                     # Database query functions (Supabase)
│   ├── redis/                  # Upstash Redis client and rate limiters
│   ├── services/               # Business logic services
│   │   ├── chat-database.service.ts        # Save conversations/messages post-stream
│   │   ├── context-manager.service.ts      # Trim messages to fit context window
│   │   ├── message-processing.service.ts   # Prepare messages (attachments, vision)
│   │   ├── prompt-builder.service.ts       # Build final system prompt
│   │   ├── rate-limit-check.service.ts     # Orchestrate rate limit checks
│   │   ├── rate-limiting.ts                # Hybrid rate limiter (guest + auth)
│   │   ├── rate-limiting-auth.ts           # DB-based rate limiting for users
│   │   ├── rate-limiting-guest.ts          # Redis + DB rate limiting for guests
│   │   ├── stream-config.service.ts        # Build streamText config per mode/model
│   │   ├── subscription.ts                 # Check Pro subscription status
│   │   ├── supermemory.service.ts          # Long-term memory (Supermemory)
│   │   ├── title-generation.service.ts     # Auto-generate conversation titles
│   │   ├── transcription.service.ts        # Audio file transcription
│   │   └── user-preferences.ts             # Load user preferences
│   ├── supabase/               # Supabase client, server client, auth utils, migrations, schema
│   ├── tools/                  # AI tool implementations
│   ├── types/                  # TypeScript type declarations
│   ├── utils/                  # Utility functions (logger, error handler, token counter, etc.)
│   └── validation/             # Zod schemas for API request validation
│
├── public/                     # Static assets (icons, favicons, images, legal docs)
├── scripts/                    # One-off utility scripts
├── styles/                     # CSS files (base, layout, component-level)
└── types/                      # Root-level type declarations
```

### Request flow for a chat message

1. **Client** sends `POST /api/chat` with `{ messages, conversationId, model, chatMode, userLocation, attachments }`.
2. **Middleware** (`middleware.ts`) refreshes the Supabase session if needed.
3. **Route handler** (`app/api/chat/route.ts`):
   - Authenticates the user (lightweight check then full user lookup).
   - Validates the request body with Zod.
   - Checks model access (`canUseModel`): guest vs. auth, Free vs. Pro.
   - Processes attachments (image bytes for vision, text extraction for PDF/DOCX).
   - Runs rate limit checks (Redis for guests, DB for auth users).
   - Loads user preferences and builds the system prompt.
   - Fetches Supermemory context if enabled.
   - Trims the context window to fit the model's limits.
   - Calls `streamText` via Vercel AI SDK with the model, tools, and system prompt.
   - Converts the stream to SSE and pipes to the client.
   - After streaming completes: saves the conversation/messages to Supabase and triggers async title generation if it's a new conversation.

---

## Database Schema

Managed in `lib/supabase/schema.sql` and incremental migrations in `lib/supabase/migrations/`.

| Table | Purpose |
|---|---|
| `users` | User profiles (extends Supabase Auth) |
| `conversations` | Chat sessions per user, with title, pin, and share fields |
| `messages` | Individual messages with role, content, parts (JSONB), model, token counts, and completion time |
| `user_preferences` | Theme, language, default model, custom system prompt, auto-save, Supermemory opt-in |
| `subscriptions` | Plan (free/pro), status (active/cancelled/expired/trial), billing period |
| `rate_limits` | Per-user daily usage counters (for DB-layer rate limiting) |

All tables have Row Level Security (RLS) enabled. Users can only read and write their own data.

---

## Rate Limiting

Qurse uses a two-layer hybrid rate limiting system.

**Guests (unauthenticated users)**:
- Layer 1 — Upstash Redis sliding window by IP: 10 requests/day (standard IPs), 3/day (unknown/null IPs).
- Layer 2 — Supabase DB by session hash (a hashed fingerprint stored in a cookie): additional per-session tracking.
- Redis is the primary enforcement layer; DB tracking adds a secondary circuit breaker.
- If Redis is unavailable, the system degrades gracefully (allows the request with a warning).

**Authenticated free users**:
- DB-based daily message limits.

**Pro users**:
- Higher limits (or effectively unlimited, depending on model).

**`freeUnlimited` models** (e.g., Kimi K2 for auth users):
- These models bypass per-user rate limits entirely via the `shouldBypassRateLimits` helper.

**Dev/staging bypass**: Set `RATE_LIMIT_BYPASS=true` in your `.env.local` to skip all rate limits during development.

---

## Authentication

Supabase Auth handles all authentication flows:

- **Google OAuth** — One-click sign-in via Google.
- **GitHub OAuth** — One-click sign-in via GitHub.
- **Email/password** — Standard email registration with email confirmation.

The auth callback route (`app/auth/callback/route.ts`) exchanges the PKCE code for a session. The middleware refreshes sessions on each request. Client-side auth state is managed via `AuthContext`.

Protected routes:
- `/settings` — Requires authentication; unauthenticated users are redirected to `/`.
- `/login`, `/signup` — Authenticated users are redirected to `/`.

---

## Subscriptions & Payments

Handled by **Dodo Payments**.

- **Free plan**: Default for all registered users. Grants access to free models with standard rate limits.
- **Pro plan**: Unlocks Pro-only models (GPT OSS 120B, GPT-5 Nano) and higher usage limits.

Flow:
1. User clicks upgrade on the pricing page.
2. `POST /api/payments/checkout` creates a Dodo checkout session and redirects.
3. On payment success, user is redirected to `/checkout/success`.
4. Dodo fires a webhook to `POST /api/payments/webhook`, which verifies the signature (`DODO_PAYMENTS_WEBHOOK_SECRET`) and upserts the user's subscription in Supabase.
5. `GET /api/payments/customer-portal` returns a portal URL so users can manage or cancel.

The `DODO_PAYMENTS_ENVIRONMENT` variable (`test_mode` / `live_mode`) switches between sandbox and production payment processing.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- A [Supabase](https://supabase.com) project
- An [Upstash](https://upstash.com) Redis database
- API keys for the AI providers and tools you want to use (see [Environment Variables](#environment-variables))

### Clone and install

```bash
git clone https://github.com/Srihar1-raman/qurseAI.git
cd qurseAI
bun install
```

### Configure environment

Copy the example below into `.env.local` and fill in your keys:

```bash
cp .env.example .env.local  # or create it manually
```

See the full list of environment variables in the next section.

### Set up the database

1. Create a new Supabase project.
2. Open the SQL editor and run `lib/supabase/schema.sql` — this creates all tables, indexes, functions, triggers, and RLS policies.
3. Run any migration files in `lib/supabase/migrations/` in order if you are upgrading from a previous schema version.
4. Enable Google and/or GitHub OAuth providers in your Supabase project's Auth settings.

### Run locally

```bash
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
bun run build   # Production build
bun run start   # Start production server
bun run lint    # Run ESLint
bun run test    # Run Vitest (watch mode)
bun run test:run  # Run Vitest once
```

---

## Environment Variables

All secrets go in `.env.local`. Never commit this file.

```bash
# ── Supabase ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Server-only, never expose

# ── Upstash Redis (rate limiting) ───────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ── AI Providers ────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
OPENAI_API_KEY=sk-...
ANANNAS_API_KEY=your-anannas-key    # Anannas AI gateway

# ── Web Search ──────────────────────────────────────────────────────────────
EXA_API_KEY=your-exa-key            # Exa AI (web search)

# ── Computation ─────────────────────────────────────────────────────────────
WOLFRAM_APP_ID=your-wolfram-app-id  # Wolfram Alpha

# ── Aviation ────────────────────────────────────────────────────────────────
AIRLABS_API_KEY=your-airlabs-key

# ── Academic Research ───────────────────────────────────────────────────────
SCOPUS_API_KEY=your-scopus-key      # Elsevier Scopus

# ── Entertainment ───────────────────────────────────────────────────────────
TMDB_API_KEY=your-tmdb-key          # The Movie Database

# ── Code Execution ──────────────────────────────────────────────────────────
DAYTONA_API_KEY=your-daytona-key

# ── Payments ────────────────────────────────────────────────────────────────
DODO_PAYMENTS_API_KEY=your-dodo-key
DODO_PAYMENTS_WEBHOOK_SECRET=your-webhook-secret
DODO_PAYMENTS_ENVIRONMENT=test_mode    # or live_mode in production
DODO_PAYMENTS_TEST_PRODUCT_ID=your-test-product-id
DODO_PAYMENTS_LIVE_PRODUCT_ID=your-live-product-id

# ── Memory ──────────────────────────────────────────────────────────────────
SUPERMEMORY_API_KEY=your-supermemory-key

# ── Error Tracking (optional) ───────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0    # optional, for release tracking

# ── Development ─────────────────────────────────────────────────────────────
RATE_LIMIT_BYPASS=true   # Skip rate limits in local development (never use in production)
```

**Minimum required** to run locally with basic chat:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- At least one AI provider key (`XAI_API_KEY` for the free Grok 3 Mini default)

All other keys are optional — the relevant features/tools will simply be unavailable or will throw a configuration error if called.

---

## Project Structure

```
.
├── ai/                  # AI provider abstractions and model registry
├── app/                 # Next.js App Router pages and API routes
├── components/          # React UI components
├── hooks/               # Custom hooks
├── lib/                 # Core business logic, services, DB, utilities
│   ├── contexts/        # React context providers
│   ├── db/              # Supabase query functions
│   ├── redis/           # Upstash Redis client and rate limiters
│   ├── services/        # Service layer (chat, rate-limiting, subscriptions, memory, etc.)
│   ├── supabase/        # Supabase client setup, schema SQL, migration files
│   ├── tools/           # AI tool implementations
│   ├── utils/           # Shared utilities
│   └── validation/      # Zod request validation schemas
├── public/              # Static assets (favicons, icons, images, legal markdown)
│   ├── favicon-dark/    # Favicon set for dark theme
│   ├── favicon-light/   # Favicon set for light theme
│   ├── icon/            # Dark-theme SVG icons
│   ├── icon_light/      # Light-theme SVG icons
│   └── images/          # OG images and screenshots
├── scripts/             # Utility scripts (one-off database backfill, etc.)
├── styles/              # CSS (base, layout, per-component)
└── types/               # Global TypeScript type declarations
```

---

## Deployment

The project is deployed on **Vercel**. The `vercel.json` configures bun as the package manager:

```json
{
  "installCommand": "bun install",
  "buildCommand": "bun run build"
}
```

Sentry source maps are uploaded automatically during `next build` when `NEXT_PUBLIC_SENTRY_DSN` is set. Set `SENTRY_AUTH_TOKEN` in your Vercel environment to enable upload.

For the webhook to work in production, configure your Dodo Payments dashboard to send events to `https://www.qurse.site/api/payments/webhook`.

Configure your Supabase project's Auth callback URL to include:
```
https://www.qurse.site/auth/callback
```

---

## License

Source available for reference. See repository settings for license details.
