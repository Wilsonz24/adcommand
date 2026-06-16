-- ============================================================
-- AdCommand — Seed Data (3 sample brands + 30 days of metrics)
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Brands
insert into brands (id, name, niche, shopify_url, meta_account_id, pixel_id, monthly_budget, target_roas, contract_start, agency_mrr, color)
values
  ('11111111-1111-1111-1111-111111111111', 'LuxeGlow Beauty',   'Skincare / Beauty',   'luxeglow.myshopify.com',   'act_111222333', '111222333444', 50000, 3.5, '2024-01-01', 4686, '#185fa5'),
  ('22222222-2222-2222-2222-222222222222', 'Peak Performance',  'Fitness / Supplements','peak-perf.myshopify.com',  'act_222333444', '222333444555', 35000, 2.5, '2024-03-01', 3646, '#3b6d11'),
  ('33333333-3333-3333-3333-333333333333', 'NovaNest Home',     'Home Décor',           'novanest.myshopify.com',   'act_333444555', '333444555666', 25000, 2.0, '2024-06-01', 2797, '#854f0b');

-- Campaigns — LuxeGlow
insert into campaigns (brand_id, name, status, objective) values
  ('11111111-1111-1111-1111-111111111111', 'Prospecting — TOF Video',   'ACTIVE', 'CONVERSIONS'),
  ('11111111-1111-1111-1111-111111111111', 'Retargeting — BOF Dynamic', 'ACTIVE', 'CONVERSIONS'),
  ('11111111-1111-1111-1111-111111111111', 'Lookalike 3% — Static',     'ACTIVE', 'CONVERSIONS'),
  ('11111111-1111-1111-1111-111111111111', 'Interest — MOF UGC',        'ACTIVE', 'CONVERSIONS');

-- Campaigns — Peak
insert into campaigns (brand_id, name, status, objective) values
  ('22222222-2222-2222-2222-222222222222', 'TOF — Interest Fitness',  'ACTIVE', 'CONVERSIONS'),
  ('22222222-2222-2222-2222-222222222222', 'Retargeting — BOF Offer', 'ACTIVE', 'CONVERSIONS'),
  ('22222222-2222-2222-2222-222222222222', 'Lookalike 1% Athletes',   'ACTIVE', 'CONVERSIONS'),
  ('22222222-2222-2222-2222-222222222222', 'TOF — Broad Video',       'PAUSED', 'CONVERSIONS');

-- Campaigns — NovaNest
insert into campaigns (brand_id, name, status, objective) values
  ('33333333-3333-3333-3333-333333333333', 'TOF — Home Interest', 'ACTIVE', 'CONVERSIONS'),
  ('33333333-3333-3333-3333-333333333333', 'Retargeting BOF',     'ACTIVE', 'CONVERSIONS'),
  ('33333333-3333-3333-3333-333333333333', 'Lookalike 5%',        'ACTIVE', 'CONVERSIONS'),
  ('33333333-3333-3333-3333-333333333333', 'Broad TOF Static',    'PAUSED', 'CONVERSIONS');

-- Ad performance — 30 days for LuxeGlow (good ROAS ~3.5–4.2)
insert into ad_performance (brand_id, date, spend, impressions, clicks, reach, frequency, cpm, ctr, cpc, purchases, revenue, roas, add_to_carts, checkouts, cpp)
select
  '11111111-1111-1111-1111-111111111111',
  current_date - (30 - gs)::int,
  1350 + (random()*200-100)::numeric(10,2),
  75000 + (random()*10000)::bigint,
  1350 + (random()*200)::bigint,
  62000 + (random()*8000)::bigint,
  (2.0 + random()*0.4)::numeric(6,2),
  (17.5 + random()*2)::numeric(10,4),
  (1.7 + random()*0.3)::numeric(8,4),
  (0.95 + random()*0.15)::numeric(10,4),
  (10 + random()*4)::int,
  (5000 + random()*1500)::numeric(12,2),
  (3.5 + random()*0.8)::numeric(8,4),
  (60 + random()*20)::int,
  (20 + random()*8)::int,
  (130 + random()*20)::numeric(10,4)
from generate_series(1, 30) gs;

-- Ad performance — 30 days for Peak Performance (ROAS ~2.2–2.8)
insert into ad_performance (brand_id, date, spend, impressions, clicks, reach, frequency, cpm, ctr, cpc, purchases, revenue, roas, add_to_carts, checkouts, cpp)
select
  '22222222-2222-2222-2222-222222222222',
  current_date - (30 - gs)::int,
  900 + (random()*150-75)::numeric(10,2),
  58000 + (random()*8000)::bigint,
  835 + (random()*150)::bigint,
  48000 + (random()*6000)::bigint,
  (1.7 + random()*0.3)::numeric(6,2),
  (15.5 + random()*1.5)::numeric(10,4),
  (1.4 + random()*0.2)::numeric(8,4),
  (1.05 + random()*0.2)::numeric(10,4),
  (6 + random()*3)::int,
  (2200 + random()*600)::numeric(12,2),
  (2.3 + random()*0.5)::numeric(8,4),
  (34 + random()*12)::int,
  (11 + random()*5)::int,
  (148 + random()*25)::numeric(10,4)
from generate_series(1, 30) gs;

-- Ad performance — 30 days for NovaNest (ROAS ~1.4–1.9, declining)
insert into ad_performance (brand_id, date, spend, impressions, clicks, reach, frequency, cpm, ctr, cpc, purchases, revenue, roas, add_to_carts, checkouts, cpp)
select
  '33333333-3333-3333-3333-333333333333',
  current_date - (30 - gs)::int,
  650 + (random()*100-50)::numeric(10,2),
  39000 + (random()*5000)::bigint,
  476 + (random()*80)::bigint,
  33000 + (random()*4000)::bigint,
  (2.2 + random()*0.4)::numeric(6,2),
  (16.2 + random()*1.8)::numeric(10,4),
  (1.2 + random()*0.2)::numeric(8,4),
  (1.32 + random()*0.2)::numeric(10,4),
  (3 + random()*2)::int,
  (1000 + random()*300)::numeric(12,2),
  (1.4 + (gs::float/30)*0.2 + random()*0.2 - 0.3)::numeric(8,4),
  (21 + random()*8)::int,
  (6 + random()*3)::int,
  (195 + random()*30)::numeric(10,4)
from generate_series(1, 30) gs;

-- Creatives — LuxeGlow
insert into creatives (brand_id, name, format, funnel_stage, label, status) values
  ('11111111-1111-1111-1111-111111111111', 'Summer Glow UGC v2',    'ugc',      'TOF', null,     'active'),
  ('11111111-1111-1111-1111-111111111111', 'Before/After Static',   'static',   'BOF', 'winner', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Founder Story Video',   'video',    'TOF', 'winner', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Carousel — Routine',    'carousel', 'MOF', null,     'active'),
  ('11111111-1111-1111-1111-111111111111', 'Testimonial Collage',   'static',   'BOF', 'loser',  'active'),
  ('11111111-1111-1111-1111-111111111111', 'Hook "Derm-Approved"',  'video',    'TOF', null,     'active');

-- Creatives — Peak
insert into creatives (brand_id, name, format, funnel_stage, label, status) values
  ('22222222-2222-2222-2222-222222222222', '30-Day Challenge Video',    'video',    'TOF', 'winner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Results Comparison Static', 'static',   'BOF', 'winner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Ingredient Deep-Dive UGC',  'ugc',      'MOF', null,     'active'),
  ('22222222-2222-2222-2222-222222222222', 'Limited Offer Carousel',    'carousel', 'BOF', 'loser',  'active');

-- Creatives — NovaNest
insert into creatives (brand_id, name, format, funnel_stage, label, status) values
  ('33333333-3333-3333-3333-333333333333', 'Room Reveal Video',    'video',    'TOF', null,     'active'),
  ('33333333-3333-3333-3333-333333333333', 'Style Guide Carousel', 'carousel', 'MOF', 'loser',  'active'),
  ('33333333-3333-3333-3333-333333333333', 'Sale Offer Static',    'static',   'BOF', 'winner', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'UGC Room Tour',        'ugc',      'TOF', 'loser',  'active');

-- Alerts
insert into alerts (brand_id, type, severity, title, message) values
  ('33333333-3333-3333-3333-333333333333', 'roas_drop',       'critical', 'ROAS below target 4 days', 'NovaNest ROAS 1.6x vs 2.0x target for 4 consecutive days.'),
  ('11111111-1111-1111-1111-111111111111', 'creative_fatigue', 'warning', 'Creative fatigue detected', 'Summer Glow UGC v2 frequency 4.2 (threshold 3.5). CTR dropped 1.8% → 1.1% WoW.'),
  ('22222222-2222-2222-2222-222222222222', 'budget_pace',     'warning', 'Budget pacing behind',     'Peak Performance 18% behind ideal daily pace. $4,200 at risk of being unspent.'),
  ('11111111-1111-1111-1111-111111111111', 'spend_alert',     'info',    'CPM spike detected',       'LuxeGlow CPM up 32% WoW ($18.40 → $24.30). Q3 auction pressure.');

-- Tasks — LuxeGlow
insert into tasks (brand_id, title, status, priority, assignee, due_date) values
  ('11111111-1111-1111-1111-111111111111', 'Launch Q3 TOF campaign',         'todo',        'high',   null,    current_date + 3),
  ('11111111-1111-1111-1111-111111111111', 'Monthly report — LuxeGlow',      'in_progress', 'high',   'Sara',  current_date),
  ('11111111-1111-1111-1111-111111111111', 'Scale top ad sets LuxeGlow',     'done',        'high',   null,    current_date - 2);

-- Tasks — Peak
insert into tasks (brand_id, title, status, priority, assignee, due_date) values
  ('22222222-2222-2222-2222-222222222222', 'A/B test new hooks (Peak)',   'in_progress', 'medium', 'James', current_date + 2),
  ('22222222-2222-2222-2222-222222222222', 'Peak client check-in call',  'done',        'medium', null,    current_date - 4);

-- Tasks — NovaNest
insert into tasks (brand_id, title, status, priority, assignee, due_date) values
  ('33333333-3333-3333-3333-333333333333', 'Review NovaNest creative fatigue', 'todo', 'high', null,    current_date + 1),
  ('33333333-3333-3333-3333-333333333333', 'Brief new UGC creator',            'todo', 'medium', null,  current_date + 5),
  ('33333333-3333-3333-3333-333333333333', 'Competitor intel audit',           'done', 'low',  null,    current_date - 3);

-- Creative requests
insert into creative_requests (brand_id, brief_title, format, stage, assignee, due_date) values
  ('11111111-1111-1111-1111-111111111111', 'Summer skin transformation UGC', 'video',    'in_production', null,    current_date + 3),
  ('22222222-2222-2222-2222-222222222222', 'Pre-workout comparison static',  'static',   'review',        null,    current_date + 1),
  ('33333333-3333-3333-3333-333333333333', 'Room refresh carousel',          'carousel', 'live',          null,    null);

-- AB tests
insert into ab_tests (brand_id, name, hypothesis, variants, result, next_action, status) values
  ('11111111-1111-1111-1111-111111111111', 'Hook A/B',    'Curiosity gap vs bold claim',  'v1 vs v2',     'v2 +18% CTR',        'Scale v2',         'complete'),
  ('11111111-1111-1111-1111-111111111111', 'Format test', 'UGC vs static BOF',            '3 creatives',  'Static wins ROAS',   'Cut UGC BOF',      'complete'),
  ('22222222-2222-2222-2222-222222222222', 'Offer test',  'Free shipping vs 20% off',     '2 variants',   '20% off +12% CVR',   'Expand 20% offer', 'complete'),
  ('33333333-3333-3333-3333-333333333333', 'Audience test','Broad vs narrow interest',    '2 ad sets',    'Inconclusive',       'Extend 7 days',    'running');
