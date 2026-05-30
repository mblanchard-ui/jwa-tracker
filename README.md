# JWA Flight School — Student Progress Tracker

## Setup Guide (30–45 minutes, no coding required)

---

### Step 1: Create your Supabase project (free)

1. Go to https://supabase.com and click "Start your project"
2. Sign up with GitHub or email
3. Click "New project" → name it `jwa-tracker`
4. Choose a region close to Illinois (US East)
5. Set a database password and save it somewhere safe
6. Wait ~2 minutes for your project to spin up

---

### Step 2: Set up the database

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `schema.sql` from this folder
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (the green button)
6. You should see "Success. No rows returned"

---

### Step 3: Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy your **Project URL** (looks like https://xxxx.supabase.co)
3. Copy your **anon/public** key (long string starting with eyJ...)
4. Rename the file `.env.local.example` to `.env.local`
5. Paste your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

### Step 4: Create your Chief Pilot account

1. In Supabase, go to **Authentication → Users**
2. Click **Invite user** → enter your email
3. After you receive the invite email and set your password, go back to Supabase
4. Go to **Table Editor → profiles**
5. Find your user row and set `role` to `chief`

---

### Step 5: Add your CFIs

For each CFI:
1. In Supabase → **Authentication → Users → Invite user**
2. Enter their email address
3. Under "User metadata", paste: `{"full_name": "Their Name", "role": "cfi"}`
4. They receive an email to set their password

---

### Step 6: Deploy to Vercel (free)

1. Go to https://github.com and create a free account if you don't have one
2. Create a new repository called `jwa-tracker`
3. Upload all these files to that repository
4. Go to https://vercel.com and sign up with GitHub
5. Click **New Project → Import** your `jwa-tracker` repo
6. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
7. Click **Deploy**
8. In ~2 minutes your app is live at something like `jwa-tracker.vercel.app`

---

### Step 7: Share with your CFIs

Send your CFIs the URL (e.g. `https://jwa-tracker.vercel.app`).

They can:
- Bookmark it on their phone's home screen (Add to Home Screen in Safari/Chrome)
- Log in with the credentials from the invite email
- See only their own students
- Update any student's stage or notes

You log in with your chief pilot account to see everyone.

---

## How it works

| Role | Can do |
|------|--------|
| Chief Pilot | See all CFIs, all students, full dashboard, stage breakdown |
| CFI | See only their own students, update stage + notes |

## Stages
0. Presolo
1. Pre-towered solo
2. Cross country & night
3. Finishing minimums
4. Checkride prep
5. Checkride ready
