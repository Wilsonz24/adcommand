# AdCommand — Agency Dashboard

Full-stack FB/Meta ads agency tracker with Claude AI copilot, backed by Supabase.

---

## Stack

- **Frontend**: React + Vite
- **Database + Auth**: Supabase (PostgreSQL + Row Level Security)
- **AI**: Anthropic Claude (claude-sonnet-4-6) via Supabase Edge Function
- **Charts**: Chart.js + react-chartjs-2

---

## Setup — Step by Step

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to you
3. Save your database password somewhere safe

### 2. Run the database migrations

In your Supabase dashboard → **SQL Editor**:

1. Open `supabase/migrations/001_initial_schema.sql` → paste → Run
2. Open `supabase/migrations/002_seed_data.sql` → paste → Run

This creates all tables, indexes, RLS policies, and loads 3 sample brands with 30 days of ad performance data.

### 3. Get your API keys

In Supabase dashboard → **Settings → API**:

- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Deploy the Claude Edge Function

Install the Supabase CLI:
```bash
npm install -g supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set your Anthropic API key as a secret (never in .env):
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
```

Deploy the Edge Function:
```bash
supabase functions deploy claude-chat
```

### 6. Install dependencies and run

```bash
npm install
npm run dev
```

Open http://localhost:5173 — you should see the dashboard with 3 brands.

---

## Deploy to production

### Option A: Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Add environment variables in Vercel dashboard → Settings → Environment Variables.

### Option B: Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Option C: Supabase hosting (coming soon)

Supabase will support static hosting natively. For now, use Vercel or Netlify.

---

## Database schema overview

| Table | Purpose |
|---|---|
| `brands` | Brand profiles, budgets, targets, agency fees |
| `ad_performance` | Daily metrics per brand (spend, ROAS, purchases, etc.) |
| `campaigns` | Campaign list per brand |
| `campaign_stats` | Daily stats per campaign |
| `creatives` | Creative library per brand |
| `creative_stats` | Daily stats per creative |
| `ab_tests` | A/B test log |
| `alerts` | Active alerts (ROAS drops, fatigue, budget pacing) |
| `tasks` | Kanban tasks per brand |
| `creative_requests` | Creative production pipeline |
| `monthly_reports` | Generated monthly reports |
| `claude_logs` | Audit trail of all Claude interactions |
| `competitors` | Competitor intel per brand |
| `standups` | Weekly standup notes |

---

## Connecting live data (optional)

### Meta Ads API
1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
2. Add `act_{your_ad_account_id}` to the brand's `meta_account_id` field
3. Create a Supabase Edge Function that calls the Meta Graph API and upserts into `ad_performance` + `campaign_stats`
4. Schedule it daily via Supabase's pg_cron or a cron job

### Shopify
1. Install a Shopify private app with read_orders permission
2. Create an Edge Function that pulls orders and upserts revenue data
3. Compare against Meta reported revenue for attribution analysis

---

## Security notes

- **Anthropic API key**: stored as a Supabase secret, NEVER in frontend code or .env
- **RLS policies**: all tables have Row Level Security enabled — only authenticated users can read/write
- **Client key**: the Supabase `anon` key is safe to expose — it's rate-limited and scoped by RLS
- For multi-user with role-based access, add a `users` table and tighten RLS policies per role

---

## Adding a new brand

In Supabase SQL Editor:
```sql
insert into brands (name, niche, monthly_budget, target_roas, agency_mrr, color)
values ('My New Brand', 'Fashion', 20000, 3.0, 2500, '#7f77dd');
```

Or via the dashboard UI (add a "New Brand" form to `App.jsx`).

---

## File structure

```
adcommand/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx              ← Main dashboard component
│   └── lib/
│       └── supabase.js      ← All DB queries + real-time subscriptions
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   └── 002_seed_data.sql
    └── functions/
        └── claude-chat/
            └── index.ts     ← Claude AI Edge Function (server-side)
```
