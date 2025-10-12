# Supabase Setup Guide for Qurse

This guide will walk you through setting up Supabase authentication and database for your Qurse project.

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- Your Supabase project URL and anon key

## Step 1: Create/Access Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in
2. Either create a new project or use an existing one
3. Wait for the project to be fully initialized

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, navigate to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the entire contents of `/lib/supabase/schema.sql`
4. Click **"Run"** to execute the schema
5. Verify tables were created in **Database** > **Tables**:
   - `users`
   - `conversations`
   - `messages`

## Step 3: Configure OAuth Providers

### GitHub OAuth

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Enable **GitHub** provider
3. Follow the instructions to create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase
4. Save settings

### Google OAuth

1. Enable **Google** provider in Supabase
2. Follow instructions to create Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase
3. Save settings

### Twitter (X) OAuth (Optional)

1. Enable **Twitter** provider in Supabase
2. Follow instructions to create Twitter OAuth App
3. Copy credentials to Supabase

## Step 4: Get Your Supabase Credentials

1. Go to **Settings** > **API** in Supabase dashboard
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## Step 5: Configure Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI API Keys (add as needed)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
GROQ_API_KEY=your-groq-key
```

3. Save the file
4. **Never commit `.env.local` to version control!**

## Step 6: Test the Setup

### Start Development Server

```bash
pnpm run dev
```

### Test Authentication Flow

1. Navigate to `http://localhost:3000/login`
2. Click on one of the OAuth providers (GitHub recommended)
3. Authorize the application
4. You should be redirected back to the homepage
5. Check your Supabase dashboard:
   - Go to **Authentication** > **Users** - you should see your user
   - Go to **Database** > **Tables** > **users** - your profile should be there

### Verify Session Persistence

1. Refresh the page - you should stay logged in
2. Open DevTools Console - you should see "Auth state changed: INITIAL_SESSION" or similar
3. Click sign out - you should be logged out

### Test Database Operations (Later)

Once you integrate the conversation functionality:

1. Create a new conversation
2. Check **Database** > **Tables** > **conversations** - it should appear
3. Send a message
4. Check **messages** table - message should be stored

## Step 7: Configure Site URL (For Production)

When deploying to production:

1. Go to **Authentication** > **URL Configuration**
2. Add your production domain to **Site URL**
3. Add your production domain to **Redirect URLs**

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file has the correct values
- Make sure there are no extra spaces
- Restart your dev server after changing env vars

### OAuth redirect fails
- Verify OAuth callback URL is correct: `http://localhost:3000/auth/callback` (dev) or `https://yourdomain.com/auth/callback` (prod)
- Check OAuth provider settings match Supabase requirements

### User not created in users table
- Check browser console for errors
- Verify RLS policies are enabled
- Check SQL Editor for any constraint errors

### Session not persisting
- Clear browser cookies and try again
- Check that middleware is running (should see network requests refreshing session)
- Verify Supabase URL and key are correct

## Architecture Overview

### Files Created

```
lib/
├── supabase/
│   ├── schema.sql          # Database schema
│   ├── client.ts           # Browser Supabase client
│   └── server.ts           # Server Supabase client
├── contexts/
│   └── AuthContext.tsx     # Auth state management
└── db/
    └── queries.ts          # Database query helpers

app/
└── auth/
    └── callback/
        └── route.ts        # OAuth callback handler

middleware.ts               # Session refresh middleware
```

### How It Works

1. **User clicks "Sign in with GitHub"**
   - `AuthButton` calls `supabase.auth.signInWithOAuth()`
   - User is redirected to GitHub
   
2. **User authorizes on GitHub**
   - GitHub redirects to `/auth/callback?code=...`
   - Callback handler exchanges code for session
   - User profile is created in `users` table
   - User is redirected to homepage

3. **AuthContext manages session**
   - Initializes auth state on mount
   - Listens for auth state changes (prevents race conditions)
   - Provides user data to entire app via React Context

4. **Middleware refreshes session**
   - Runs on every request
   - Refreshes expired sessions automatically
   - Ensures Server Components have fresh auth state

## Next Steps

✅ Auth is now fully functional!

Next, you can:
1. Integrate AI models and chat functionality
2. Connect conversations to the database
3. Add real-time features with Supabase subscriptions
4. Implement file uploads using Supabase Storage

## Support

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

