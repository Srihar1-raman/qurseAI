# ✅ Supabase Setup Checklist

## Immediate Action Items

### 1. Set Up Supabase Project (15 minutes)

- [ ] Go to [supabase.com](https://supabase.com) and create/access project
- [ ] Navigate to **SQL Editor** in Supabase dashboard
- [ ] Copy entire contents of `/lib/supabase/schema.sql`
- [ ] Paste in SQL Editor and click **Run**
- [ ] Verify tables created: **Database > Tables** (should see `users`, `conversations`, `messages`)

### 2. Configure OAuth Providers (10 minutes per provider)

**GitHub:**
- [ ] Go to **Authentication > Providers** > Enable GitHub
- [ ] Go to GitHub Settings > Developer settings > OAuth Apps > New
- [ ] Set callback URL: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
- [ ] Copy Client ID and Client Secret to Supabase
- [ ] Save

**Google (Optional):**
- [ ] Enable Google provider in Supabase
- [ ] Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
- [ ] Use same callback URL pattern
- [ ] Copy credentials to Supabase

**Twitter (Optional):**
- [ ] Enable Twitter provider
- [ ] Follow Supabase instructions

### 3. Get Your Credentials (2 minutes)

- [ ] Go to **Settings > API** in Supabase dashboard
- [ ] Copy **Project URL** (starts with `https://`)
- [ ] Copy **anon public** key (starts with `eyJ`)

### 4. Create .env.local File (2 minutes)

In your project root (`/Users/sri/Desktop/qurse/`):

```bash
# Required for auth to work
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# Optional - for AI integration later
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GOOGLE_GENERATIVE_AI_API_KEY=
# GROQ_API_KEY=
```

- [ ] Created `.env.local`
- [ ] Added Supabase URL
- [ ] Added Supabase anon key
- [ ] **Never commit this file to git!**

### 5. Test Authentication (5 minutes)

```bash
cd /Users/sri/Desktop/qurse
pnpm run dev
```

- [ ] Dev server starts without errors
- [ ] Navigate to `http://localhost:3000/login`
- [ ] Click "GitHub" (or your enabled provider)
- [ ] Successfully redirect to provider
- [ ] Authorize the application
- [ ] Redirect back to homepage (logged in)
- [ ] Check Supabase **Authentication > Users** - your user appears
- [ ] Check Supabase **Database > Tables > users** - your profile exists
- [ ] Refresh page - still logged in
- [ ] Click sign out - successfully logs out

---

## Expected Results

### After Setup Complete:

✅ **Supabase Dashboard:**
- 3 tables in Database: `users`, `conversations`, `messages`
- Your user in Authentication > Users
- Your profile in Database > Tables > users

✅ **Local Dev:**
- No console errors
- Login/logout works smoothly
- Session persists across refreshes

✅ **Build:**
```bash
pnpm run build  # Should complete successfully
```

---

## If Something Goes Wrong

### "Invalid API key" error
→ Double-check `.env.local` has correct values  
→ No extra spaces or quotes  
→ Restart dev server

### OAuth redirect fails
→ Verify callback URL in provider settings  
→ Should be: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

### User not created in database
→ Check SQL Editor for errors when running schema  
→ Verify RLS policies enabled  
→ Check browser console for errors

### Need help?
→ Read `SUPABASE_SETUP.md` for detailed guide  
→ Check `AUTH_IMPLEMENTATION_SUMMARY.md` for architecture details  
→ Review `CONTEXT.md` for project overview

---

## Once Complete

You're ready for **Phase 3: AI Integration! 🚀**

Next steps:
1. Integrate Vercel AI SDK
2. Create AI API routes
3. Connect conversations to database
4. Implement streaming chat

All documented in `CONTEXT.md` under "Next Steps".

