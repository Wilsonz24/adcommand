// src/App.jsx
// Main dashboard — reads all data from Supabase, renders the full agency UI

import { useState, useEffect, useRef } from 'react'
import { supabase, getBrands, getAdSummary, getAlerts, getAllAlerts, getTasks, getCreatives, getCampaigns, getABTests, logClaudeInteraction, subscribeToAlerts } from './lib/supabase'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function App() {
  const [brands, setBrands] = useState([])
  const [activeBrand, setActiveBrand] = useState(null)
  const [page, setPage] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [allAlerts, setAllAlerts] = useState([])
  const [tasks, setTasks] = useState([])
  const [creatives, setCreatives] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [abTests, setAbTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [claudeOpen, setClaudeOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hey! I'm your media buying copilot. I have live access to all your brand data. Ask me anything. 🎯" }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [dateRange, setDateRange] = useState(30)
  const msgsRef = useRef(null)

  // Load brands on mount
  useEffect(() => {
    getBrands().then(data => {
      setBrands(data)
      if (data.length) setActiveBrand(data[0])
    })
    getAllAlerts().then(setAllAlerts)
    setLoading(false)
  }, [])

  // Load brand-specific data when brand or date range changes
  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    Promise.all([
      getAdSummary(activeBrand.id, { days: dateRange }),
      getAlerts(activeBrand.id),
      getTasks(activeBrand.id),
      getCreatives(activeBrand.id),
      getCampaigns(activeBrand.id),
      getABTests(activeBrand.id),
    ]).then(([sum, alts, tsks, crtv, camps, tests]) => {
      setSummary(sum)
      setAlerts(alts)
      setTasks(tsks)
      setCreatives(crtv)
      setCampaigns(camps)
      setAbTests(tests)
      setLoading(false)
    })

    // Real-time alerts
    const sub = subscribeToAlerts(activeBrand.id, (payload) => {
      setAlerts(prev => [payload.new, ...prev])
      setAllAlerts(prev => [payload.new, ...prev])
    })
    return () => { supabase.removeChannel(sub) }
  }, [activeBrand, dateRange])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, typing])

  // Claude chat — calls the Supabase Edge Function
  async function sendClaude(text) {
    if (!text.trim() || !activeBrand) return
    const userMsg = { role: 'user', content: text }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setTyping(true)

    const context = buildContext()
    let reply = ''

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: newHistory.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          brandContext: context
        })
      })

      if (!res.ok) throw new Error('Edge function error')

      // Stream the response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      setTyping(false)
      let assistantMsg = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta') {
              reply += parsed.delta?.text || ''
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: reply }
                return updated
              })
            }
          } catch {}
        }
      }

      // Log to Supabase
      await logClaudeInteraction({
        brand_id: activeBrand.id,
        user_message: text,
        claude_reply: reply,
        context_snapshot: context,
      })

    } catch (err) {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Make sure your Edge Function is deployed.` }])
    }
  }

  function buildContext() {
    if (!activeBrand || !summary) return { name: activeBrand?.name }
    const today = new Date().getDate()
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const idealPct = Math.round(today / daysInMonth * 100)
    const actualPct = activeBrand.monthly_budget > 0 ? Math.round(summary.spend / activeBrand.monthly_budget * 100) : 0
    const sortedCreatives = [...creatives].sort((a, b) => {
      const ra = a.creative_stats?.reduce((s, x) => s + Number(x.roas), 0) / (a.creative_stats?.length || 1)
      const rb = b.creative_stats?.reduce((s, x) => s + Number(x.roas), 0) / (b.creative_stats?.length || 1)
      return rb - ra
    })
    return {
      name: activeBrand.name, niche: activeBrand.niche,
      target_roas: activeBrand.target_roas, monthly_budget: activeBrand.monthly_budget,
      days_remaining: daysInMonth - today, day_of_month: today,
      spend: summary.spend?.toFixed(0), revenue: summary.revenue?.toFixed(0),
      roas: summary.roas?.toFixed(2), budget_pacing: actualPct, ideal_pacing: idealPct,
      cpm: summary.cpm?.toFixed(2), ctr: summary.ctr?.toFixed(2),
      cpc: summary.cpc?.toFixed(2), cpp: summary.cpp?.toFixed(2),
      frequency: summary.daily?.[summary.daily.length - 1]?.frequency,
      campaigns: campaigns.slice(0, 6).map(c => ({
        name: c.name, roas: c.campaign_stats?.[0]?.roas?.toFixed(2) || '—',
        total_spend: c.campaign_stats?.reduce((s, x) => s + Number(x.spend), 0)?.toFixed(0),
        purchases: c.campaign_stats?.reduce((s, x) => s + Number(x.purchases), 0),
        cpp: c.campaign_stats?.[0]?.cpp?.toFixed(0) || '—',
      })),
      top_creatives: sortedCreatives.slice(0, 3).map(c => ({
        name: c.name, format: c.format, funnel_stage: c.funnel_stage,
        roas: c.creative_stats?.[0]?.roas?.toFixed(2) || '—',
        ctr: ((c.creative_stats?.[0]?.ctr || 0) * 100).toFixed(2),
        frequency: c.creative_stats?.[0]?.frequency,
        spend: c.creative_stats?.reduce((s, x) => s + Number(x.spend), 0)?.toFixed(0),
      })),
      bottom_creatives: sortedCreatives.slice(-2).map(c => ({
        name: c.name, roas: c.creative_stats?.[0]?.roas?.toFixed(2) || '—',
        ctr: ((c.creative_stats?.[0]?.ctr || 0) * 100).toFixed(2),
        frequency: c.creative_stats?.[0]?.frequency,
      })),
      alerts: alerts.filter(a => !a.is_read).map(a => ({ severity: a.severity, title: a.title, message: a.message })),
      funnel: {
        impressions: summary.impressions,
        clicks: summary.clicks,
        atc: summary.add_to_carts,
        checkouts: summary.checkouts,
        purchases: summary.purchases,
      }
    }
  }

  function roasColor(roas, target) {
    if (roas >= target) return '#3b6d11'
    if (roas >= target * 0.9) return '#854f0b'
    return '#a32d2d'
  }

  function roasBadgeClass(roas, target) {
    if (roas >= target) return 'badge-green'
    if (roas >= target * 0.9) return 'badge-amber'
    return 'badge-red'
  }

  if (!brands.length && !loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
      <p style={{ fontSize: 18, marginBottom: 12 }}>No brands found</p>
      <p>Run the seed SQL in your Supabase dashboard to add sample data.</p>
    </div>
  )

  const roasChartData = {
    labels: summary?.daily?.map(d => new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })) || [],
    datasets: [
      {
        label: 'Daily ROAS',
        data: summary?.daily?.map(d => Number(d.roas).toFixed(2)) || [],
        borderColor: activeBrand?.color || '#185fa5',
        backgroundColor: (activeBrand?.color || '#185fa5') + '22',
        fill: true, tension: 0.4, pointRadius: 2,
      },
      {
        label: 'Target',
        data: summary?.daily?.map(() => activeBrand?.target_roas) || [],
        borderColor: '#888780', borderDash: [6, 3], pointRadius: 0, borderWidth: 1.5,
      }
    ]
  }

  const CHIPS = [
    "Why is my ROAS dropping this week?",
    "Which creatives should I kill right now?",
    "Write 5 new ad hooks based on my best angle",
    "Summarize for a client call",
    "Scale recommendations for my top campaign",
    "Draft my monthly report executive summary",
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', fontSize: 14, background: '#f5f5f3', color: '#1a1a18' }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, background: '#fff', borderRight: '0.5px solid #e0dfd8', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '16px', borderBottom: '0.5px solid #e0dfd8', fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          📊 AdCommand
        </div>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: '#888', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Agency</div>
          {['overview', 'alerts'].map(p => (
            <div key={p} onClick={() => setPage(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', cursor: 'pointer', background: page === p ? '#f0f0ec' : 'transparent', fontWeight: page === p ? 500 : 400, fontSize: 13, color: page === p ? '#1a1a18' : '#555' }}>
              {p === 'overview' ? '🏠' : '🔔'} {p.charAt(0).toUpperCase() + p.slice(1)}
              {p === 'alerts' && allAlerts.filter(a => !a.is_read).length > 0 &&
                <span style={{ marginLeft: 'auto', background: '#fcebeb', color: '#a32d2d', fontSize: 10, padding: '1px 6px', borderRadius: 20 }}>
                  {allAlerts.filter(a => !a.is_read).length}
                </span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: '#888', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Brands</div>
          {brands.map(b => (
            <div key={b.id} onClick={() => { setActiveBrand(b); setPage('campaigns') }}
              style={{ margin: '2px 8px', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: activeBrand?.id === b.id ? '#e6f1fb' : 'transparent', color: activeBrand?.id === b.id ? '#185fa5' : '#555', fontWeight: activeBrand?.id === b.id ? 500 : 400 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
              {b.name}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 11, color: '#888', padding: '8px 16px 4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Brand Pages</div>
          {['campaigns', 'creatives', 'funnel', 'budget', 'team', 'reports'].map(p => (
            <div key={p} onClick={() => setPage(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', cursor: 'pointer', background: page === p ? '#f0f0ec' : 'transparent', fontWeight: page === p ? 500 : 400, fontSize: 13, color: page === p ? '#1a1a18' : '#555' }}>
              {{ campaigns: '📣', creatives: '🖼️', funnel: '🔽', budget: '💰', team: '👥', reports: '📄' }[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOPBAR */}
        <div style={{ height: 56, background: '#fff', borderBottom: '0.5px solid #e0dfd8', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
          <div style={{ flex: 1, fontWeight: 500, fontSize: 15 }}>
            {page === 'overview' ? 'Agency Overview' : activeBrand?.name}
            <span style={{ fontWeight: 400, fontSize: 12, color: '#888', marginLeft: 6 }}>
              {page === 'overview' ? `— ${brands.length} active brands` : `— ${activeBrand?.niche}`}
            </span>
          </div>
          <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))}
            style={{ fontSize: 12, border: '0.5px solid #ccc', borderRadius: 8, padding: '5px 10px', background: '#f5f5f3', cursor: 'pointer' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <div style={{ cursor: 'pointer', padding: 6 }} onClick={() => setPage('alerts')}>
            🔔 {allAlerts.filter(a => !a.is_read).length > 0 && <span style={{ background: '#e24b4a', color: '#fff', borderRadius: '50%', fontSize: 10, padding: '0 4px' }}>{allAlerts.filter(a => !a.is_read).length}</span>}
          </div>
          <button onClick={() => setClaudeOpen(o => !o)}
            style={{ background: '#185fa5', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16 }}>
            🤖
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div>}

          {/* OVERVIEW */}
          {!loading && page === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                {brands.map(b => {
                  const roas = b._roas || 0
                  return (
                    <div key={b.id} onClick={() => { setActiveBrand(b); setPage('campaigns') }}
                      style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>{b.niche}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 20, fontWeight: 500 }}>—</span>
                        <span style={{ fontSize: 11, background: '#eaf3de', color: '#3b6d11', padding: '2px 8px', borderRadius: 20 }}>Active</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Budget: ${(b.monthly_budget/1000).toFixed(0)}K/mo · MRR ${b.agency_mrr?.toLocaleString()}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 14 }}>Active alerts</div>
                {allAlerts.slice(0, 4).map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #e0dfd8' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: a.severity === 'critical' ? '#fcebeb' : a.severity === 'info' ? '#e6f1fb' : '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                      {a.severity === 'critical' ? '📉' : a.severity === 'info' ? 'ℹ️' : '⚠️'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13 }}><strong>{a.brands?.name}</strong> — {a.title}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{a.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CAMPAIGNS */}
          {!loading && page === 'campaigns' && activeBrand && (
            <>
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    ['Spend', `$${(summary.spend/1000).toFixed(1)}K`],
                    ['Revenue', `$${(summary.revenue/1000).toFixed(1)}K`],
                    ['ROAS', `${summary.roas?.toFixed(2)}x`],
                    ['Purchases', summary.purchases],
                    ['CPP', `$${summary.cpp?.toFixed(0)}`],
                    ['CTR', `${summary.ctr?.toFixed(2)}%`],
                    ['CPM', `$${summary.cpm?.toFixed(2)}`],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: '#f5f5f3', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 500, color: label === 'ROAS' ? roasColor(summary.roas, activeBrand.target_roas) : 'inherit' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 14 }}>ROAS trend — {dateRange} days</div>
                <div style={{ height: 200 }}>
                  <Line data={roasChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, ticks: { callback: v => v + 'x' } } } }} />
                </div>
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 14 }}>Campaigns</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{['Campaign', 'Status', 'Objective'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#888' }}>{h}</th>)}</tr></thead>
                  <tbody>{campaigns.map(c => (
                    <tr key={c.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8' }}>{c.name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8' }}>
                        <span style={{ background: c.status === 'ACTIVE' ? '#eaf3de' : '#f5f5f3', color: c.status === 'ACTIVE' ? '#3b6d11' : '#888', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{c.status}</span>
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8', color: '#888' }}>{c.objective}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {/* CREATIVES */}
          {!loading && page === 'creatives' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
                {creatives.map(c => (
                  <div key={c.id} style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ height: 100, background: '#f5f5f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {{ ugc: '🎬', static: '🖼️', video: '📹', carousel: '📸' }[c.format] || '🖼️'}
                    </div>
                    <div style={{ padding: 10 }}>
                      {c.label === 'winner' && <div style={{ display: 'inline-block', background: '#eaf3de', color: '#3b6d11', fontSize: 10, padding: '1px 6px', borderRadius: 20, marginBottom: 4 }}>⭐ Winner</div>}
                      {c.label === 'loser' && <div style={{ display: 'inline-block', background: '#fcebeb', color: '#a32d2d', fontSize: 10, padding: '1px 6px', borderRadius: 20, marginBottom: 4 }}>✕ Underperformer</div>}
                      <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{c.format?.toUpperCase()} · {c.funnel_stage}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 14 }}>A/B test log</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{['Test', 'Hypothesis', 'Result', 'Next action', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8', fontSize: 11, textTransform: 'uppercase', color: '#888' }}>{h}</th>)}</tr></thead>
                  <tbody>{abTests.map(t => (
                    <tr key={t.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8', fontWeight: 500 }}>{t.name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8', color: '#555' }}>{t.hypothesis}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8' }}>{t.result || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8' }}>{t.next_action || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #e0dfd8' }}>
                        <span style={{ background: t.status === 'running' ? '#e6f1fb' : '#eaf3de', color: t.status === 'running' ? '#185fa5' : '#3b6d11', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>{t.status}</span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {/* FUNNEL */}
          {!loading && page === 'funnel' && summary && (
            <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 16 }}>Conversion funnel — {dateRange} days</div>
              {[
                { label: 'Impressions', val: summary.impressions, color: '#378add' },
                { label: 'Clicks', val: summary.clicks, color: '#1d9e75' },
                { label: 'Add to cart', val: summary.add_to_carts, color: '#ef9f27' },
                { label: 'Initiate checkout', val: summary.checkouts, color: '#d85a30' },
                { label: 'Purchases', val: summary.purchases, color: '#639922' },
              ].map((s, i, arr) => {
                const pct = Math.round(s.val / arr[0].val * 100)
                const drop = i > 0 ? Math.round((1 - s.val / arr[i - 1].val) * 100) : 0
                return (
                  <div key={s.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span>{s.label}</span>
                      <span style={{ color: '#888' }}>{s.val?.toLocaleString()} {i > 0 && <span style={{ color: '#a32d2d', fontSize: 10 }}>–{drop}%</span>}</span>
                    </div>
                    <div style={{ height: 28, background: '#f5f5f3', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11, color: '#fff', fontWeight: 500 }}>{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* BUDGET */}
          {!loading && page === 'budget' && (
            <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 16 }}>Budget pacing — current month</div>
              {brands.map(b => {
                const dayOfMonth = new Date().getDate()
                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                const idealPct = Math.round(dayOfMonth / daysInMonth * 100)
                return (
                  <div key={b.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{b.name}</span>
                      <span style={{ color: '#888' }}>Budget: ${(b.monthly_budget / 1000).toFixed(0)}K/mo</span>
                    </div>
                    <div style={{ position: 'relative', height: 14, background: '#f5f5f3', borderRadius: 5, overflow: 'visible' }}>
                      <div style={{ height: 14, width: `${idealPct}%`, background: '#639922', borderRadius: 5 }} />
                      <div style={{ position: 'absolute', top: 0, left: `${idealPct}%`, width: 2, height: 14, background: '#555' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 2 }}>
                      <span>Ideal pace: {idealPct}% (day {dayOfMonth}/{daysInMonth})</span>
                      <span>MRR: ${b.agency_mrr?.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TEAM */}
          {!loading && page === 'team' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {['todo', 'in_progress', 'done'].map(status => (
                <div key={status} style={{ background: '#f5f5f3', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#888', marginBottom: 10 }}>
                    {{ todo: 'To-do', in_progress: 'In progress', done: 'Done' }[status]}
                  </div>
                  {tasks.filter(t => t.status === status).map(t => (
                    <div key={t.id} style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 4 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8 }}>
                        <span style={{ color: { high: '#a32d2d', medium: '#854f0b', low: '#3b6d11' }[t.priority] }}>● {t.priority}</span>
                        {t.due_date && <span>Due {new Date(t.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                        {t.assignee && <span>{t.assignee}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* REPORTS */}
          {!loading && page === 'reports' && activeBrand && (
            <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 500 }}>Monthly report — {activeBrand.name}</div>
                <button onClick={() => { setClaudeOpen(true); setInput('Draft my monthly report executive summary'); }}
                  style={{ background: '#185fa5', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
                  🤖 Generate with Claude
                </button>
              </div>
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                  {[['Spend', `$${(summary.spend/1000).toFixed(1)}K`], ['Revenue', `$${(summary.revenue/1000).toFixed(1)}K`], ['ROAS', `${summary.roas?.toFixed(2)}x`], ['Purchases', summary.purchases]].map(([l, v]) => (
                    <div key={l} style={{ background: '#f5f5f3', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ border: '0.5px dashed #ccc', borderRadius: 8, padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>
                🤖 Click "Generate with Claude" to auto-write the executive summary, campaign breakdown, and next-month recommendations using your live data.
              </div>
            </div>
          )}

          {/* ALERTS */}
          {!loading && page === 'alerts' && (
            <div style={{ background: '#fff', border: '0.5px solid #e0dfd8', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 14 }}>All alerts</div>
              {allAlerts.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #e0dfd8' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: a.severity === 'critical' ? '#fcebeb' : a.severity === 'info' ? '#e6f1fb' : '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                    {a.severity === 'critical' ? '📉' : a.severity === 'info' ? 'ℹ️' : '⚠️'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{new Date(a.triggered_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* CLAUDE PANEL */}
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', borderLeft: '0.5px solid #e0dfd8', zIndex: 300, display: 'flex', flexDirection: 'column', transform: claudeOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .25s ease' }}>
        <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e0dfd8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e6f1fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Claude — Media Buying Copilot</div>
            <div style={{ fontSize: 11, color: '#888' }}>Scoped to {activeBrand?.name || 'agency'}</div>
          </div>
          <div onClick={() => setClaudeOpen(false)} style={{ marginLeft: 'auto', cursor: 'pointer', padding: 4, borderRadius: 8, fontSize: 18 }}>✕</div>
        </div>
        <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5, maxWidth: '90%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#185fa5' : '#f5f5f3', color: m.role === 'user' ? '#fff' : '#1a1a18', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          ))}
          {typing && (
            <div style={{ padding: '10px 12px', borderRadius: 12, background: '#f5f5f3', alignSelf: 'flex-start', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#888', animation: `blink 1.2s ${i * .2}s infinite` }} />)}
            </div>
          )}
        </div>
        <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '0.5px solid #e0dfd8' }}>
          {CHIPS.map(chip => (
            <div key={chip} onClick={() => sendClaude(chip)}
              style={{ fontSize: 11, border: '0.5px solid #ccc', borderRadius: 20, padding: '4px 10px', cursor: 'pointer', background: '#f5f5f3', color: '#555', whiteSpace: 'nowrap' }}>
              {chip}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid #e0dfd8', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendClaude(input) } }}
            placeholder="Ask anything about your brands..."
            style={{ flex: 1, border: '0.5px solid #ccc', borderRadius: 12, padding: '8px 12px', fontSize: 13, resize: 'none', minHeight: 36, maxHeight: 100, fontFamily: 'inherit', background: '#f5f5f3' }} rows={1} />
          <button onClick={() => sendClaude(input)}
            style={{ width: 32, height: 32, borderRadius: '50%', background: '#185fa5', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            ➤
          </button>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setClaudeOpen(o => !o)}
        style={{ position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: '50%', background: '#185fa5', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 22, boxShadow: '0 2px 12px rgba(24,95,165,.35)', zIndex: 200 }}>
        🤖
      </button>

      <style>{`@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
    </div>
  )
}
