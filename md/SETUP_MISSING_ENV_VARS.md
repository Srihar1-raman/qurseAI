# 🔧 Environment Variables Guide

## ⚠️ IMPORTANT UPDATE

**This file is now OUTDATED.** The architecture was refactored to NOT require `SUPABASE_SERVICE_ROLE_KEY`.

See `ARCHITECTURE_FIX.md` for the full explanation of why service role is no longer needed.

---

## ✅ What You Actually Need

Your `.env.local` should have:

1. ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
3. ✅ `GROQ_API_KEY` - For GPT OSS 120B (free model)
4. ✅ `ANANNAS_API_KEY` - For Kimi K2 (free model)
5. ⚠️ `XAI_API_KEY` - (OPTIONAL) Only if you want Grok models

## ✅ Fix Instructions

### 1. Get Supabase Service Role Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **`service_role` key** (not the anon key!)
5. **⚠️ WARNING:** This key bypasses RLS - keep it secret!

### 2. Get xAI API Key (for Grok models)

1. Go to https://console.x.ai
2. Sign in with your X/Twitter account
3. Navigate to **API Keys**
4. Create a new API key
5. Copy the key

### 3. Update Your `.env.local` File

Open `/Users/sri/Desktop/qurse/.env.local` and add these two lines:

```bash
# Supabase Service Role Key (for server-side operations, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# xAI API Key (for Grok models)
XAI_API_KEY=your_actual_xai_api_key_here
```

### 4. Restart Your Dev Server

```bash
# Kill the old server (Ctrl+C in terminal)
# Then restart:
pnpm run dev
```

---

## Your Current `.env.local` Should Look Like:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # ← ADD THIS

# AI Providers
GROQ_API_KEY=xxx
ANANNAS_API_KEY=xxx
XAI_API_KEY=xxx  # ← ADD THIS
```

---

## ✅ What Was Also Fixed:

### 1. RLS Policy Error
- **Problem**: Server-side API route couldn't insert into database due to RLS
- **Solution**: Created `lib/db/server-queries.ts` with admin client (bypasses RLS)

### 2. History Sidebar Loading Forever
- **Problem**: Loading state never reset when user had 0 conversations
- **Solution**: Added explicit loading state reset

### 3. Model Selector Still Using Old UI Models
- **Problem**: Dropdown showed hardcoded models from `constants.ts`
- **Solution**: Completely rebuilt `ModelSelector.tsx` to use real models from `ai/models.ts`

---

## 🎯 New Model Selector Features:

✅ **Auto-updates** when you add new models to `ai/models.ts`  
✅ **Smart filtering** based on auth status (guest vs logged-in)  
✅ **Shows reasoning icon** 🧠 for reasoning models  
✅ **Shows vision icon** 👁️ for models with image support  
✅ **Category grouping** (Free, Pro, Premium)  
✅ **Color-coded tags** (fast, smart, new, reasoning)  
✅ **Auth badges** 🔒 for models requiring login  
✅ **Search functionality** across model names, descriptions, providers, tags

---

## 📝 After Setting Up:

1. ✅ Add the two missing environment variables
2. ✅ Restart the dev server
3. ✅ Test the flow:
   - Homepage → Type message → Send
   - Should redirect to `/conversation/[id]`
   - AI response should stream in
   - Check history sidebar (should work now!)
   - Try the new model selector (shows 3 real models)

---

## 🐛 If You Still See Errors:

Check the terminal output and look for:

```
Supabase environment variables:
  url: SET
  serviceKey: MISSING  ← This should say "SET"
```

If it says `MISSING`, the env vars aren't loading. Try:

1. Double-check the variable names (exact spelling)
2. No spaces around `=` sign
3. Restart the dev server
4. Clear `.next` cache: `rm -rf .next && pnpm run dev`

---

**Need help?** Check the terminal logs for the exact error message.

