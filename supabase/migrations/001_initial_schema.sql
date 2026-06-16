-- ============================================================
-- AdCommand Agency Dashboard — Supabase Schema
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- BRANDS
-- ============================================================
create table if not exists brands (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  niche         text,
  shopify_url   text,
  meta_account_id text,
  pixel_id      text,
  monthly_budget numeric(12,2) default 0,
  target_roas   numeric(5,2) default 3.0,
  contract_start date,
  agency_mrr    numeric(10,2) default 0,
  color         text default '#185fa5',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- AD PERFORMANCE (daily snapshots per brand)
-- ============================================================
create table if not exists ad_performance (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  date          date not null,
  spend         numeric(12,2) default 0,
  impressions   bigint default 0,
  clicks        bigint default 0,
  reach         bigint default 0,
  frequency     numeric(6,2) default 0,
  cpm           numeric(10,4) default 0,
  ctr           numeric(8,4) default 0,
  cpc           numeric(10,4) default 0,
  purchases     int default 0,
  revenue       numeric(12,2) default 0,
  roas          numeric(8,4) default 0,
  add_to_carts  int default 0,
  checkouts     int default 0,
  cpp           numeric(10,4) default 0,
  unique constraint (brand_id, date)
);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table if not exists campaigns (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  meta_campaign_id text,
  name          text not null,
  status        text default 'ACTIVE', -- ACTIVE | PAUSED | ARCHIVED
  objective     text,
  daily_budget  numeric(10,2),
  lifetime_budget numeric(10,2),
  created_at    timestamptz default now()
);

create table if not exists campaign_stats (
  id          uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  date        date not null,
  spend       numeric(12,2) default 0,
  impressions bigint default 0,
  clicks      bigint default 0,
  purchases   int default 0,
  revenue     numeric(12,2) default 0,
  roas        numeric(8,4) default 0,
  cpp         numeric(10,4) default 0,
  unique constraint (campaign_id, date)
);

-- ============================================================
-- CREATIVES
-- ============================================================
create table if not exists creatives (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  name          text not null,
  format        text, -- static | video | ugc | carousel
  hook_type     text,
  offer_type    text,
  funnel_stage  text, -- TOF | MOF | BOF
  meta_ad_id    text,
  thumbnail_url text,
  asset_url     text,
  status        text default 'active', -- active | paused | archived
  label         text, -- winner | loser | null
  created_at    timestamptz default now()
);

create table if not exists creative_stats (
  id            uuid primary key default uuid_generate_v4(),
  creative_id   uuid references creatives(id) on delete cascade,
  date          date not null,
  spend         numeric(12,2) default 0,
  impressions   bigint default 0,
  clicks        bigint default 0,
  purchases     int default 0,
  revenue       numeric(12,2) default 0,
  roas          numeric(8,4) default 0,
  ctr           numeric(8,4) default 0,
  cpp           numeric(10,4) default 0,
  frequency     numeric(6,2) default 0,
  hook_rate     numeric(6,4) default 0,
  hold_rate     numeric(6,4) default 0,
  unique constraint (creative_id, date)
);

-- ============================================================
-- AB TESTS
-- ============================================================
create table if not exists ab_tests (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  name          text not null,
  hypothesis    text,
  variants      text,
  result        text,
  next_action   text,
  status        text default 'running', -- running | complete
  started_at    date,
  ended_at      date,
  created_at    timestamptz default now()
);

-- ============================================================
-- ALERTS
-- ============================================================
create table if not exists alerts (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  type          text not null, -- roas_drop | creative_fatigue | budget_pace | spend_alert
  severity      text default 'warning', -- warning | critical | info
  title         text not null,
  message       text,
  is_read       boolean default false,
  triggered_at  timestamptz default now(),
  resolved_at   timestamptz
);

-- ============================================================
-- TASKS
-- ============================================================
create table if not exists tasks (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  title         text not null,
  description   text,
  status        text default 'todo', -- todo | in_progress | done
  priority      text default 'medium', -- low | medium | high
  assignee      text,
  due_date      date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- CREATIVE REQUESTS (pipeline)
-- ============================================================
create table if not exists creative_requests (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  brief_title   text not null,
  format        text,
  stage         text default 'brief', -- brief | in_production | review | live
  assignee      text,
  due_date      date,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- MONTHLY REPORTS
-- ============================================================
create table if not exists monthly_reports (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  month         text not null, -- YYYY-MM
  total_spend   numeric(12,2),
  total_revenue numeric(12,2),
  roas          numeric(8,4),
  mer           numeric(8,4),
  executive_summary text,
  wins          text,
  opportunities text,
  generated_at  timestamptz default now(),
  unique constraint (brand_id, month)
);

-- ============================================================
-- CLAUDE AI CHAT LOGS
-- ============================================================
create table if not exists claude_logs (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  user_message  text not null,
  claude_reply  text,
  context_snapshot jsonb,
  created_at    timestamptz default now()
);

-- ============================================================
-- COMPETITOR INTEL
-- ============================================================
create table if not exists competitors (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  name          text not null,
  notes         text,
  last_updated  date
);

-- ============================================================
-- WEEKLY STANDUPS
-- ============================================================
create table if not exists standups (
  id            uuid primary key default uuid_generate_v4(),
  brand_id      uuid references brands(id) on delete cascade,
  week_of       date not null,
  done          text,
  planned       text,
  blockers      text,
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
create index if not exists idx_ad_perf_brand_date on ad_performance(brand_id, date desc);
create index if not exists idx_campaign_stats_date on campaign_stats(campaign_id, date desc);
create index if not exists idx_creative_stats_date on creative_stats(creative_id, date desc);
create index if not exists idx_alerts_brand_unread on alerts(brand_id, is_read, triggered_at desc);
create index if not exists idx_tasks_brand_status on tasks(brand_id, status);

-- ============================================================
-- ROW LEVEL SECURITY (enable for production)
-- ============================================================
alter table brands enable row level security;
alter table ad_performance enable row level security;
alter table campaigns enable row level security;
alter table campaign_stats enable row level security;
alter table creatives enable row level security;
alter table creative_stats enable row level security;
alter table ab_tests enable row level security;
alter table alerts enable row level security;
alter table tasks enable row level security;
alter table creative_requests enable row level security;
alter table monthly_reports enable row level security;
alter table claude_logs enable row level security;
alter table competitors enable row level security;
alter table standups enable row level security;

-- Allow all operations for authenticated users (tighten per role in production)
create policy "auth_all_brands" on brands for all using (auth.role() = 'authenticated');
create policy "auth_all_ad_perf" on ad_performance for all using (auth.role() = 'authenticated');
create policy "auth_all_campaigns" on campaigns for all using (auth.role() = 'authenticated');
create policy "auth_all_campaign_stats" on campaign_stats for all using (auth.role() = 'authenticated');
create policy "auth_all_creatives" on creatives for all using (auth.role() = 'authenticated');
create policy "auth_all_creative_stats" on creative_stats for all using (auth.role() = 'authenticated');
create policy "auth_all_ab_tests" on ab_tests for all using (auth.role() = 'authenticated');
create policy "auth_all_alerts" on alerts for all using (auth.role() = 'authenticated');
create policy "auth_all_tasks" on tasks for all using (auth.role() = 'authenticated');
create policy "auth_all_creative_reqs" on creative_requests for all using (auth.role() = 'authenticated');
create policy "auth_all_reports" on monthly_reports for all using (auth.role() = 'authenticated');
create policy "auth_all_claude_logs" on claude_logs for all using (auth.role() = 'authenticated');
create policy "auth_all_competitors" on competitors for all using (auth.role() = 'authenticated');
create policy "auth_all_standups" on standups for all using (auth.role() = 'authenticated');
