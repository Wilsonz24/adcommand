// src/lib/supabase.js
// Replace the values below with your Supabase project URL and anon key
// Found at: https://supabase.com/dashboard → your project → Settings → API

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Brands ────────────────────────────────────────────────────────────────────
export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export async function createBrand(brand) {
  const { data, error } = await supabase.from('brands').insert([brand]).select().single()
  if (error) throw error
  return data
}

export async function updateBrand(id, updates) {
  const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Ad Performance ────────────────────────────────────────────────────────────
export async function getAdPerformance(brandId, { days = 30 } = {}) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('ad_performance')
    .select('*')
    .eq('brand_id', brandId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export async function getAdSummary(brandId, { days = 30 } = {}) {
  const rows = await getAdPerformance(brandId, { days })
  if (!rows.length) return null
  const sum = rows.reduce((acc, r) => ({
    spend:     acc.spend     + Number(r.spend),
    revenue:   acc.revenue   + Number(r.revenue),
    purchases: acc.purchases + Number(r.purchases),
    impressions: acc.impressions + Number(r.impressions),
    clicks:    acc.clicks    + Number(r.clicks),
    add_to_carts: acc.add_to_carts + Number(r.add_to_carts),
    checkouts: acc.checkouts + Number(r.checkouts),
  }), { spend:0, revenue:0, purchases:0, impressions:0, clicks:0, add_to_carts:0, checkouts:0 })
  sum.roas = sum.spend > 0 ? sum.revenue / sum.spend : 0
  sum.cpm  = sum.impressions > 0 ? (sum.spend / sum.impressions) * 1000 : 0
  sum.ctr  = sum.impressions > 0 ? (sum.clicks / sum.impressions) * 100 : 0
  sum.cpc  = sum.clicks > 0 ? sum.spend / sum.clicks : 0
  sum.cpp  = sum.purchases > 0 ? sum.spend / sum.purchases : 0
  sum.daily = rows
  return sum
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export async function getCampaigns(brandId) {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`*, campaign_stats(spend, revenue, roas, purchases, cpp, date)`)
    .eq('brand_id', brandId)
    .order('created_at')
  if (error) throw error
  return data
}

// ── Creatives ─────────────────────────────────────────────────────────────────
export async function getCreatives(brandId) {
  const { data, error } = await supabase
    .from('creatives')
    .select(`*, creative_stats(spend, revenue, roas, ctr, cpp, frequency, date)`)
    .eq('brand_id', brandId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function updateCreativeLabel(id, label) {
  const { data, error } = await supabase.from('creatives').update({ label }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export async function getAlerts(brandId, { unreadOnly = false } = {}) {
  let q = supabase.from('alerts').select('*').eq('brand_id', brandId).order('triggered_at', { ascending: false })
  if (unreadOnly) q = q.eq('is_read', false)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getAllAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, brands(name, color)')
    .order('triggered_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function markAlertRead(id) {
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function getTasks(brandId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data, error } = await supabase.from('tasks').insert([task]).select().single()
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Reports ───────────────────────────────────────────────────────────────────
export async function getReports(brandId) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('brand_id', brandId)
    .order('month', { ascending: false })
  if (error) throw error
  return data
}

export async function saveReport(report) {
  const { data, error } = await supabase
    .from('monthly_reports')
    .upsert([report], { onConflict: 'brand_id,month' })
    .select().single()
  if (error) throw error
  return data
}

// ── AB Tests ──────────────────────────────────────────────────────────────────
export async function getABTests(brandId) {
  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Claude Logs ───────────────────────────────────────────────────────────────
export async function logClaudeInteraction({ brand_id, user_message, claude_reply, context_snapshot }) {
  const { error } = await supabase.from('claude_logs').insert([{
    brand_id, user_message, claude_reply,
    context_snapshot: context_snapshot || null
  }])
  if (error) console.warn('Failed to log Claude interaction:', error.message)
}

// ── Creative Requests ─────────────────────────────────────────────────────────
export async function getCreativeRequests(brandId) {
  const { data, error } = await supabase
    .from('creative_requests')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Real-time subscriptions ───────────────────────────────────────────────────
export function subscribeToAlerts(brandId, callback) {
  return supabase
    .channel(`alerts:${brandId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `brand_id=eq.${brandId}`
    }, callback)
    .subscribe()
}

export function subscribeToPerformance(brandId, callback) {
  return supabase
    .channel(`ad_perf:${brandId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ad_performance',
      filter: `brand_id=eq.${brandId}`
    }, callback)
    .subscribe()
}
