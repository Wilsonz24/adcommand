import { useState, useEffect, useRef } from 'react'
import { supabase, isMisconfigured, getBrands, getAdSummary, getAlerts, getAllAlerts, getTasks, getCreatives, getCampaigns, getABTests, logClaudeInteraction, subscribeToAlerts, createBrand, updateBrand, createTask, updateTask, deleteTask } from './lib/supabase'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const S = {
  overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
  modal: { background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' },
  label: { display:'block',fontSize:12,color:'#666',marginBottom:4,fontWeight:500 },
  input: { width:'100%',border:'0.5px solid #ccc',borderRadius:8,padding:'8px 10px',fontSize:13,marginBottom:14,boxSizing:'border-box',fontFamily:'inherit',background:'#fafafa' },
  btn: { background:'#185fa5',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:13,fontWeight:500 },
  btnGhost: { background:'transparent',color:'#666',border:'0.5px solid #ccc',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:13,marginRight:8 },
  btnRed: { background:'#fcebeb',color:'#a32d2d',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:13 },
  h2: { fontSize:17,fontWeight:600,marginBottom:18 },
  row: { display:'flex',gap:8,marginBottom:14 },
}

function Modal({ title, onClose, children }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
          <div style={S.h2}>{title}</div>
          <div onClick={onClose} style={{ cursor:'pointer',fontSize:20,color:'#888' }}>✕</div>
        </div>
        {children}
      </div>
    </div>
  )
}

function BrandModal({ brand, onClose, onSave }) {
  const [form, setForm] = useState(brand || { name:'', niche:'', shopify_url:'', meta_account_id:'', monthly_budget:'', target_roas:'', agency_mrr:'', color:'#185fa5' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) return alert('Brand name required')
    brand ? await updateBrand(brand.id, form) : await createBrand(form)
    onSave()
  }
  return (
    <Modal title={brand ? 'Edit brand' : 'Add new brand'} onClose={onClose}>
      <label style={S.label}>Brand name *</label>
      <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. LuxeGlow Beauty" />
      <label style={S.label}>Niche</label>
      <input style={S.input} value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="e.g. Skincare / Beauty" />
      <label style={S.label}>Shopify URL</label>
      <input style={S.input} value={form.shopify_url} onChange={e => set('shopify_url', e.target.value)} placeholder="yourstore.myshopify.com" />
      <label style={S.label}>Meta Ad Account ID</label>
      <input style={S.input} value={form.meta_account_id} onChange={e => set('meta_account_id', e.target.value)} placeholder="act_123456789" />
      <div style={S.row}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Monthly budget ($)</label>
          <input style={{ ...S.input, marginBottom:0 }} type="number" value={form.monthly_budget} onChange={e => set('monthly_budget', e.target.value)} placeholder="50000" />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Target ROAS</label>
          <input style={{ ...S.input, marginBottom:0 }} type="number" step="0.1" value={form.target_roas} onChange={e => set('target_roas', e.target.value)} placeholder="3.5" />
        </div>
      </div>
      <div style={{ height:14 }} />
      <label style={S.label}>Agency MRR ($)</label>
      <input style={S.input} type="number" value={form.agency_mrr} onChange={e => set('agency_mrr', e.target.value)} placeholder="4500" />
      <label style={S.label}>Brand color</label>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
        <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ width:40,height:36,border:'none',cursor:'pointer',borderRadius:6 }} />
        <span style={{ fontSize:12,color:'#888' }}>{form.color}</span>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btn} onClick={save}>Save brand</button>
      </div>
    </Modal>
  )
}

function TaskModal({ brandId, task, onClose, onSave }) {
  const [form, setForm] = useState(task || { title:'', description:'', status:'todo', priority:'medium', assignee:'', due_date:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.title.trim()) return alert('Task title required')
    task ? await updateTask(task.id, form) : await createTask({ ...form, brand_id: brandId })
    onSave()
  }
  return (
    <Modal title={task ? 'Edit task' : 'Add task'} onClose={onClose}>
      <label style={S.label}>Title *</label>
      <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" />
      <label style={S.label}>Description</label>
      <textarea style={{ ...S.input, minHeight:70,resize:'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details..." />
      <div style={S.row}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Status</label>
          <select style={{ ...S.input, marginBottom:0 }} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="todo">To-do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Priority</label>
          <select style={{ ...S.input, marginBottom:0 }} value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div style={{ height:14 }} />
      <div style={S.row}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Assignee</label>
          <input style={{ ...S.input, marginBottom:0 }} value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="Name" />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Due date</label>
          <input type="date" style={{ ...S.input, marginBottom:0 }} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
      </div>
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:18 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btn} onClick={save}>Save task</button>
      </div>
    </Modal>
  )
}

function ReportModal({ brandId, summary, onClose, onSave }) {
  const month = new Date().toISOString().slice(0,7)
  const [form, setForm] = useState({
    brand_id: brandId, month,
    total_spend: summary?.spend?.toFixed(0) || '',
    total_revenue: summary?.revenue?.toFixed(0) || '',
    roas: summary?.roas?.toFixed(2) || '',
    executive_summary: '', wins: '', opportunities: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    const { error } = await supabase.from('monthly_reports').upsert([form], { onConflict: 'brand_id,month' })
    if (error) return alert(error.message)
    onSave()
  }
  return (
    <Modal title="Save monthly report" onClose={onClose}>
      <label style={S.label}>Month</label>
      <input style={S.input} type="month" value={form.month} onChange={e => set('month', e.target.value)} />
      <div style={S.row}>
        <div style={{ flex:1 }}>
          <label style={S.label}>Total spend ($)</label>
          <input style={{ ...S.input, marginBottom:0 }} type="number" value={form.total_spend} onChange={e => set('total_spend', e.target.value)} />
        </div>
        <div style={{ flex:1 }}>
          <label style={S.label}>Total revenue ($)</label>
          <input style={{ ...S.input, marginBottom:0 }} type="number" value={form.total_revenue} onChange={e => set('total_revenue', e.target.value)} />
        </div>
      </div>
      <div style={{ height:14 }} />
      <label style={S.label}>ROAS</label>
      <input style={S.input} type="number" step="0.01" value={form.roas} onChange={e => set('roas', e.target.value)} />
      <label style={S.label}>Executive summary</label>
      <textarea style={{ ...S.input, minHeight:90,resize:'vertical' }} value={form.executive_summary} onChange={e => set('executive_summary', e.target.value)} placeholder="Write or paste Claude's generated summary here..." />
      <label style={S.label}>Wins this month</label>
      <textarea style={{ ...S.input, minHeight:70,resize:'vertical' }} value={form.wins} onChange={e => set('wins', e.target.value)} placeholder="• What worked&#10;• Creative wins&#10;• ROAS improvements" />
      <label style={S.label}>Opportunities / next month</label>
      <textarea style={{ ...S.input, minHeight:70,resize:'vertical' }} value={form.opportunities} onChange={e => set('opportunities', e.target.value)} placeholder="• What to test&#10;• What to scale&#10;• What to cut" />
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btn} onClick={save}>Save report</button>
      </div>
    </Modal>
  )
}

function PerformanceModal({ brandId, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ brand_id:brandId, date:today, spend:'', revenue:'', purchases:'', impressions:'', clicks:'', add_to_carts:'', checkouts:'', roas:'', cpm:'', ctr:'', cpc:'', cpp:'', reach:'', frequency:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.spend) return alert('Spend is required')
    const cleaned = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, v === '' ? 0 : v]))
    if (!cleaned.roas && cleaned.spend > 0 && cleaned.revenue > 0) cleaned.roas = (cleaned.revenue / cleaned.spend).toFixed(4)
    if (!cleaned.cpp && cleaned.spend > 0 && cleaned.purchases > 0) cleaned.cpp = (cleaned.spend / cleaned.purchases).toFixed(4)
    const { error } = await supabase.from('ad_performance').upsert([cleaned], { onConflict: 'brand_id,date' })
    if (error) return alert(error.message)
    onSave()
  }
  return (
    <Modal title="Log ad performance" onClose={onClose}>
      <label style={S.label}>Date</label>
      <input type="date" style={S.input} value={form.date} onChange={e => set('date', e.target.value)} />
      <div style={S.row}>
        <div style={{ flex:1 }}><label style={S.label}>Spend ($) *</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.spend} onChange={e => set('spend', e.target.value)} placeholder="0" /></div>
        <div style={{ flex:1 }}><label style={S.label}>Revenue ($)</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.revenue} onChange={e => set('revenue', e.target.value)} placeholder="0" /></div>
      </div>
      <div style={{ height:14 }} />
      <div style={S.row}>
        <div style={{ flex:1 }}><label style={S.label}>Purchases</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.purchases} onChange={e => set('purchases', e.target.value)} placeholder="0" /></div>
        <div style={{ flex:1 }}><label style={S.label}>Impressions</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.impressions} onChange={e => set('impressions', e.target.value)} placeholder="0" /></div>
      </div>
      <div style={{ height:14 }} />
      <div style={S.row}>
        <div style={{ flex:1 }}><label style={S.label}>Clicks</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.clicks} onChange={e => set('clicks', e.target.value)} placeholder="0" /></div>
        <div style={{ flex:1 }}><label style={S.label}>Add to carts</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.add_to_carts} onChange={e => set('add_to_carts', e.target.value)} placeholder="0" /></div>
      </div>
      <div style={{ height:14 }} />
      <div style={S.row}>
        <div style={{ flex:1 }}><label style={S.label}>Reach</label><input style={{ ...S.input, marginBottom:0 }} type="number" value={form.reach} onChange={e => set('reach', e.target.value)} placeholder="0" /></div>
        <div style={{ flex:1 }}><label style={S.label}>Frequency</label><input style={{ ...S.input, marginBottom:0 }} type="number" step="0.01" value={form.frequency} onChange={e => set('frequency', e.target.value)} placeholder="0" /></div>
      </div>
      <div style={{ fontSize:11,color:'#888',marginTop:14,marginBottom:6 }}>ROAS and CPP auto-calculated if left blank</div>
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:8 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btn} onClick={save}>Save performance</button>
      </div>
    </Modal>
  )
}

function AlertModal({ brandId, onClose, onSave }) {
  const [form, setForm] = useState({ brand_id:brandId, type:'roas_drop', severity:'warning', title:'', message:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.title.trim()) return alert('Title required')
    const { error } = await supabase.from('alerts').insert([form])
    if (error) return alert(error.message)
    onSave()
  }
  return (
    <Modal title="Create alert" onClose={onClose}>
      <label style={S.label}>Type</label>
      <select style={S.input} value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="roas_drop">ROAS drop</option>
        <option value="creative_fatigue">Creative fatigue</option>
        <option value="budget_pace">Budget pacing</option>
        <option value="spend_alert">Spend alert</option>
        <option value="other">Other</option>
      </select>
      <label style={S.label}>Severity</label>
      <select style={S.input} value={form.severity} onChange={e => set('severity', e.target.value)}>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
      <label style={S.label}>Title *</label>
      <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. ROAS dropped below target" />
      <label style={S.label}>Message</label>
      <textarea style={{ ...S.input, minHeight:80,resize:'vertical' }} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Details about this alert..." />
      <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btn} onClick={save}>Create alert</button>
      </div>
    </Modal>
  )
}

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
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [claudeOpen, setClaudeOpen] = useState(false)
  const [messages, setMessages] = useState([{ role:'assistant', content:"Hey! I'm your media buying copilot. Ask me anything about your brands. 🎯" }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [dateRange, setDateRange] = useState(30)
  const [modal, setModal] = useState(null) // 'brand'|'editBrand'|'task'|'editTask'|'report'|'perf'|'alert'
  const [editTarget, setEditTarget] = useState(null)
  const msgsRef = useRef(null)

  const closeModal = () => { setModal(null); setEditTarget(null) }

  const refresh = async () => {
    const b = await getBrands()
    setBrands(b)
    if (!activeBrand && b.length) setActiveBrand(b[0])
    if (activeBrand) {
      const found = b.find(x => x.id === activeBrand.id)
      if (found) setActiveBrand(found)
    }
    getAllAlerts().then(setAllAlerts).catch(() => {})
  }

  const refreshBrand = async () => {
    if (!activeBrand) return
    const [sum, alts, tsks, crtv, camps, tests, rpts] = await Promise.all([
      getAdSummary(activeBrand.id, { days: dateRange }),
      getAlerts(activeBrand.id),
      getTasks(activeBrand.id),
      getCreatives(activeBrand.id),
      getCampaigns(activeBrand.id),
      getABTests(activeBrand.id),
      supabase.from('monthly_reports').select('*').eq('brand_id', activeBrand.id).order('month', { ascending: false }).then(r => r.data || [])
    ])
    setSummary(sum)
    setAlerts(alts)
    setTasks(tsks)
    setCreatives(crtv)
    setCampaigns(camps)
    setAbTests(tests)
    setReports(rpts)
    setLoading(false)
  }

  if (isMisconfigured) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f3',fontFamily:'system-ui,sans-serif',padding:24 }}>
      <div style={{ maxWidth:480,background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:16,padding:32 }}>
        <div style={{ fontSize:32,marginBottom:12 }}>⚙️</div>
        <h1 style={{ fontSize:18,fontWeight:600,marginBottom:12 }}>Connect Supabase</h1>
        <p style={{ color:'#666',fontSize:14,lineHeight:1.7,marginBottom:20 }}>Add these two environment variables to Netlify → Site configuration → Environment variables, then redeploy:</p>
        <div style={{ background:'#f5f5f3',borderRadius:10,padding:16,fontFamily:'monospace',fontSize:13 }}>
          <div style={{ color:'#185fa5',fontWeight:600 }}>VITE_SUPABASE_URL</div>
          <div style={{ color:'#888',marginBottom:12,fontSize:12 }}>https://your-project.supabase.co</div>
          <div style={{ color:'#185fa5',fontWeight:600 }}>VITE_SUPABASE_ANON_KEY</div>
          <div style={{ color:'#888',fontSize:12 }}>eyJhbGci...</div>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    getBrands().then(b => { setBrands(b); if (b.length) setActiveBrand(b[0]); else setLoading(false) }).catch(e => { setLoadError(e.message); setLoading(false) })
    getAllAlerts().then(setAllAlerts).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeBrand) return
    setLoading(true)
    refreshBrand()
    const sub = subscribeToAlerts(activeBrand.id, p => { setAlerts(prev => [p.new, ...prev]); setAllAlerts(prev => [p.new, ...prev]) })
    return () => supabase.removeChannel(sub)
  }, [activeBrand, dateRange])

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages, typing])

  async function sendClaude(text) {
    if (!text.trim() || !activeBrand) return
    const userMsg = { role:'user', content:text }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setTyping(true)
    let reply = ''
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-chat`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: newHistory.map(m => ({ role:m.role, content:m.content })), brandContext: buildContext() })
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      setTyping(false)
      setMessages(prev => [...prev, { role:'assistant', content:'' }])
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try { const p = JSON.parse(line.slice(6)); if (p.type === 'content_block_delta') { reply += p.delta?.text || ''; setMessages(prev => { const u=[...prev]; u[u.length-1]={role:'assistant',content:reply}; return u }) } } catch {}
        }
      }
      logClaudeInteraction({ brand_id:activeBrand.id, user_message:text, claude_reply:reply, context_snapshot:buildContext() })
    } catch(err) {
      setTyping(false)
      setMessages(prev => [...prev, { role:'assistant', content:`⚠️ Claude chat needs the Edge Function deployed. Error: ${err.message}` }])
    }
  }

  function buildContext() {
    if (!activeBrand || !summary) return { name: activeBrand?.name }
    const today = new Date().getDate(), dim = new Date(new Date().getFullYear(), new Date().getMonth()+1,0).getDate()
    return {
      name:activeBrand.name, niche:activeBrand.niche, target_roas:activeBrand.target_roas,
      monthly_budget:activeBrand.monthly_budget, days_remaining:dim-today,
      spend:summary.spend?.toFixed(0), revenue:summary.revenue?.toFixed(0), roas:summary.roas?.toFixed(2),
      budget_pacing:activeBrand.monthly_budget>0?Math.round(summary.spend/activeBrand.monthly_budget*100):0,
      cpm:summary.cpm?.toFixed(2), ctr:summary.ctr?.toFixed(2), cpp:summary.cpp?.toFixed(2),
      alerts:alerts.filter(a=>!a.is_read).map(a=>({severity:a.severity,title:a.title})),
      funnel:{ impressions:summary.impressions, clicks:summary.clicks, atc:summary.add_to_carts, checkouts:summary.checkouts, purchases:summary.purchases }
    }
  }

  function roasColor(r, t) { return r>=t?'#3b6d11':r>=t*.9?'#854f0b':'#a32d2d' }

  const roasChart = {
    labels: summary?.daily?.map(d => new Date(d.date).toLocaleDateString('en',{month:'short',day:'numeric'})) || [],
    datasets: [
      { label:'ROAS', data:summary?.daily?.map(d=>Number(d.roas).toFixed(2))||[], borderColor:activeBrand?.color||'#185fa5', backgroundColor:(activeBrand?.color||'#185fa5')+'22', fill:true, tension:.4, pointRadius:2 },
      { label:'Target', data:summary?.daily?.map(()=>activeBrand?.target_roas)||[], borderColor:'#888', borderDash:[6,3], pointRadius:0, borderWidth:1.5 }
    ]
  }

  const CHIPS = ["Why is my ROAS dropping?","Which creatives to kill?","Write 5 new ad hooks","Summarize for client call","Scale recommendations","Draft monthly report summary"]

  if (loadError) return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f3',fontFamily:'system-ui,sans-serif' }}>
      <div style={{ maxWidth:440,background:'#fff',borderRadius:16,padding:32,border:'0.5px solid #e0dfd8' }}>
        <div style={{ fontSize:32,marginBottom:12 }}>❌</div>
        <h2 style={{ fontWeight:600,marginBottom:8 }}>Connection failed</h2>
        <p style={{ color:'#666',fontSize:13,marginBottom:16 }}>{loadError}</p>
        <p style={{ color:'#666',fontSize:13 }}>Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify env vars, then redeploy.</p>
        <button style={{ ...S.btn,marginTop:16 }} onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  )

  const unreadCount = allAlerts.filter(a=>!a.is_read).length

  return (
    <div style={{ display:'flex',height:'100vh',fontFamily:'system-ui,sans-serif',fontSize:14,background:'#f5f5f3',color:'#1a1a18' }}>

      {/* SIDEBAR */}
      <div style={{ width:220,background:'#fff',borderRight:'0.5px solid #e0dfd8',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto' }}>
        <div style={{ padding:'16px',borderBottom:'0.5px solid #e0dfd8',fontWeight:500,fontSize:15 }}>📊 AdCommand</div>
        <div style={{ padding:'8px 0' }}>
          <div style={{ fontSize:11,color:'#888',padding:'8px 16px 4px',textTransform:'uppercase',letterSpacing:'.06em' }}>Agency</div>
          {['overview','alerts'].map(p => (
            <div key={p} onClick={() => setPage(p)} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 16px',cursor:'pointer',background:page===p?'#f0f0ec':'transparent',fontWeight:page===p?500:400,fontSize:13,color:page===p?'#1a1a18':'#555' }}>
              {p==='overview'?'🏠':'🔔'} {p.charAt(0).toUpperCase()+p.slice(1)}
              {p==='alerts'&&unreadCount>0&&<span style={{ marginLeft:'auto',background:'#fcebeb',color:'#a32d2d',fontSize:10,padding:'1px 6px',borderRadius:20 }}>{unreadCount}</span>}
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 0' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 4px' }}>
            <span style={{ fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'.06em' }}>Brands</span>
            <span onClick={() => setModal('brand')} style={{ fontSize:18,color:'#185fa5',cursor:'pointer',lineHeight:1 }} title="Add brand">+</span>
          </div>
          {brands.map(b => (
            <div key={b.id} onClick={() => { setActiveBrand(b); setPage('campaigns') }}
              style={{ margin:'2px 8px',padding:'6px 10px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:13,background:activeBrand?.id===b.id?'#e6f1fb':'transparent',color:activeBrand?.id===b.id?'#185fa5':'#555',fontWeight:activeBrand?.id===b.id?500:400 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:b.color||'#185fa5',flexShrink:0 }} />
              <span style={{ flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{b.name}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'8px 0' }}>
          <div style={{ fontSize:11,color:'#888',padding:'8px 16px 4px',textTransform:'uppercase',letterSpacing:'.06em' }}>Brand Pages</div>
          {['campaigns','creatives','funnel','budget','team','reports'].map(p => (
            <div key={p} onClick={() => setPage(p)} style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 16px',cursor:'pointer',background:page===p?'#f0f0ec':'transparent',fontWeight:page===p?500:400,fontSize:13,color:page===p?'#1a1a18':'#555' }}>
              {{'campaigns':'📣','creatives':'🖼️','funnel':'🔽','budget':'💰','team':'👥','reports':'📄'}[p]} {p.charAt(0).toUpperCase()+p.slice(1)}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>

        {/* TOPBAR */}
        <div style={{ height:56,background:'#fff',borderBottom:'0.5px solid #e0dfd8',display:'flex',alignItems:'center',gap:12,padding:'0 20px',flexShrink:0 }}>
          <div style={{ flex:1,fontWeight:500,fontSize:15 }}>
            {page==='overview'?'Agency Overview':activeBrand?.name}
            <span style={{ fontWeight:400,fontSize:12,color:'#888',marginLeft:6 }}>{page==='overview'?`— ${brands.length} brands`:`— ${activeBrand?.niche||''}`}</span>
          </div>
          {activeBrand && page!=='overview' && (
            <button onClick={() => { setEditTarget(activeBrand); setModal('editBrand') }} style={{ ...S.btnGhost,padding:'5px 12px',fontSize:12 }}>✏️ Edit brand</button>
          )}
          <select value={dateRange} onChange={e=>setDateRange(Number(e.target.value))} style={{ fontSize:12,border:'0.5px solid #ccc',borderRadius:8,padding:'5px 10px',background:'#f5f5f3',cursor:'pointer' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <div style={{ cursor:'pointer',padding:6,position:'relative' }} onClick={()=>setPage('alerts')}>
            🔔{unreadCount>0&&<span style={{ position:'absolute',top:2,right:2,background:'#e24b4a',color:'#fff',borderRadius:'50%',fontSize:9,padding:'0 4px',lineHeight:'14px' }}>{unreadCount}</span>}
          </div>
          <button onClick={()=>setClaudeOpen(o=>!o)} style={{ background:'#185fa5',color:'#fff',border:'none',borderRadius:'50%',width:36,height:36,cursor:'pointer',fontSize:16 }}>🤖</button>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1,overflowY:'auto',padding:20 }}>
          {loading&&<div style={{ textAlign:'center',padding:60,color:'#888' }}>⏳ Loading...</div>}

          {/* OVERVIEW */}
          {!loading&&page==='overview'&&(
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ fontWeight:500 }}>All brands</div>
                <button style={S.btn} onClick={()=>setModal('brand')}>+ Add brand</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20 }}>
                {brands.map(b=>(
                  <div key={b.id} style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:14 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontWeight:500,marginBottom:2 }}>{b.name}</div>
                        <div style={{ fontSize:11,color:'#888',marginBottom:10 }}>{b.niche}</div>
                      </div>
                      <button onClick={()=>{setEditTarget(b);setModal('editBrand')}} style={{ background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#888' }}>✏️</button>
                    </div>
                    <div style={{ fontSize:11,color:'#888' }}>Budget: ${(b.monthly_budget/1000).toFixed(0)}K · Target: {b.target_roas}x · MRR ${b.agency_mrr?.toLocaleString()}</div>
                    <button onClick={()=>{setActiveBrand(b);setPage('campaigns')}} style={{ marginTop:10,...S.btn,padding:'5px 12px',fontSize:12,width:'100%' }}>View dashboard →</button>
                  </div>
                ))}
                <div onClick={()=>setModal('brand')} style={{ background:'#f5f5f3',border:'1px dashed #ccc',borderRadius:12,padding:14,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#888',fontSize:13,minHeight:100 }}>
                  + Add brand
                </div>
              </div>
              <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                  <div style={{ fontWeight:500 }}>Active alerts</div>
                  <button style={{ ...S.btn,padding:'5px 12px',fontSize:12 }} onClick={()=>{if(activeBrand)setModal('alert')}}>+ Add alert</button>
                </div>
                {allAlerts.length===0&&<div style={{ color:'#888',fontSize:13 }}>No alerts yet ✅</div>}
                {allAlerts.slice(0,5).map(a=>(
                  <div key={a.id} style={{ display:'flex',gap:10,padding:'10px 0',borderBottom:'0.5px solid #e0dfd8' }}>
                    <div style={{ width:28,height:28,borderRadius:8,background:a.severity==='critical'?'#fcebeb':a.severity==='info'?'#e6f1fb':'#faeeda',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      {a.severity==='critical'?'📉':a.severity==='info'?'ℹ️':'⚠️'}
                    </div>
                    <div><div style={{ fontSize:13,fontWeight:500 }}>{a.title}</div><div style={{ fontSize:11,color:'#888' }}>{a.message}</div></div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CAMPAIGNS */}
          {!loading&&page==='campaigns'&&activeBrand&&(
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ fontWeight:500 }}>Performance — {activeBrand.name}</div>
                <button style={S.btn} onClick={()=>setModal('perf')}>+ Log performance</button>
              </div>
              {summary&&(
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20 }}>
                  {[['Spend',`$${(summary.spend/1000).toFixed(1)}K`],['Revenue',`$${(summary.revenue/1000).toFixed(1)}K`],['ROAS',`${summary.roas?.toFixed(2)}x`],['Purchases',summary.purchases],['CPP',`$${summary.cpp?.toFixed(0)}`],['CTR',`${summary.ctr?.toFixed(2)}%`],['CPM',`$${summary.cpm?.toFixed(2)}`]].map(([l,v])=>(
                    <div key={l} style={{ background:'#f5f5f3',borderRadius:8,padding:14 }}>
                      <div style={{ fontSize:11,color:'#888',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:6 }}>{l}</div>
                      <div style={{ fontSize:20,fontWeight:500,color:l==='ROAS'?roasColor(summary.roas,activeBrand.target_roas):'inherit' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {summary?.daily?.length>0&&(
                <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16,marginBottom:16 }}>
                  <div style={{ fontWeight:500,marginBottom:14 }}>ROAS trend</div>
                  <div style={{ height:200 }}><Line data={roasChart} options={{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,ticks:{callback:v=>v+'x'}}} }} /></div>
                </div>
              )}
              <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
                <div style={{ fontWeight:500,marginBottom:14 }}>Campaigns</div>
                {campaigns.length===0?<div style={{ color:'#888',fontSize:13 }}>No campaigns yet.</div>:(
                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                    <thead><tr>{['Campaign','Status','Objective'].map(h=><th key={h} style={{ textAlign:'left',padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8',fontSize:11,textTransform:'uppercase',color:'#888' }}>{h}</th>)}</tr></thead>
                    <tbody>{campaigns.map(c=>(
                      <tr key={c.id}>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8' }}>{c.name}</td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8' }}><span style={{ background:c.status==='ACTIVE'?'#eaf3de':'#f5f5f3',color:c.status==='ACTIVE'?'#3b6d11':'#888',fontSize:11,padding:'2px 8px',borderRadius:20 }}>{c.status}</span></td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8',color:'#888' }}>{c.objective||'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* CREATIVES */}
          {!loading&&page==='creatives'&&(
            <>
              <div style={{ fontWeight:500,marginBottom:14 }}>Creative library — {activeBrand?.name}</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12,marginBottom:20 }}>
                {creatives.map(c=>(
                  <div key={c.id} style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,overflow:'hidden' }}>
                    <div style={{ height:90,background:'#f5f5f3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26 }}>
                      {{'ugc':'🎬','static':'🖼️','video':'📹','carousel':'📸'}[c.format]||'🖼️'}
                    </div>
                    <div style={{ padding:10 }}>
                      {c.label==='winner'&&<div style={{ display:'inline-block',background:'#eaf3de',color:'#3b6d11',fontSize:10,padding:'1px 6px',borderRadius:20,marginBottom:4 }}>⭐ Winner</div>}
                      {c.label==='loser'&&<div style={{ display:'inline-block',background:'#fcebeb',color:'#a32d2d',fontSize:10,padding:'1px 6px',borderRadius:20,marginBottom:4 }}>✕ Underperformer</div>}
                      <div style={{ fontWeight:500,fontSize:12,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize:11,color:'#888' }}>{c.format?.toUpperCase()} · {c.funnel_stage}</div>
                    </div>
                  </div>
                ))}
                {creatives.length===0&&<div style={{ color:'#888',fontSize:13,gridColumn:'1/-1' }}>No creatives yet. Add them via Supabase table editor.</div>}
              </div>
              <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
                <div style={{ fontWeight:500,marginBottom:14 }}>A/B test log</div>
                {abTests.length===0?<div style={{ color:'#888',fontSize:13 }}>No tests logged yet.</div>:(
                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                    <thead><tr>{['Test','Hypothesis','Result','Next action','Status'].map(h=><th key={h} style={{ textAlign:'left',padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8',fontSize:11,textTransform:'uppercase',color:'#888' }}>{h}</th>)}</tr></thead>
                    <tbody>{abTests.map(t=>(
                      <tr key={t.id}>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8',fontWeight:500 }}>{t.name}</td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8',color:'#555' }}>{t.hypothesis}</td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8' }}>{t.result||'—'}</td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8' }}>{t.next_action||'—'}</td>
                        <td style={{ padding:'8px 10px',borderBottom:'0.5px solid #e0dfd8' }}><span style={{ background:t.status==='running'?'#e6f1fb':'#eaf3de',color:t.status==='running'?'#185fa5':'#3b6d11',fontSize:11,padding:'2px 8px',borderRadius:20 }}>{t.status}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* FUNNEL */}
          {!loading&&page==='funnel'&&summary&&(
            <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
              <div style={{ fontWeight:500,marginBottom:16 }}>Conversion funnel</div>
              {[{label:'Impressions',val:summary.impressions,color:'#378add'},{label:'Clicks',val:summary.clicks,color:'#1d9e75'},{label:'Add to cart',val:summary.add_to_carts,color:'#ef9f27'},{label:'Checkout',val:summary.checkouts,color:'#d85a30'},{label:'Purchases',val:summary.purchases,color:'#639922'}].map((s,i,arr)=>{
                const pct=arr[0].val>0?Math.round(s.val/arr[0].val*100):0
                const drop=i>0&&arr[i-1].val>0?Math.round((1-s.val/arr[i-1].val)*100):0
                return(
                  <div key={s.label} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3 }}>
                      <span>{s.label}</span>
                      <span style={{ color:'#888' }}>{s.val?.toLocaleString()} {i>0&&drop>0&&<span style={{ color:'#a32d2d',fontSize:10 }}>–{drop}%</span>}</span>
                    </div>
                    <div style={{ height:28,background:'#f5f5f3',borderRadius:4,overflow:'hidden' }}>
                      <div style={{ height:'100%',width:`${Math.max(pct,2)}%`,background:s.color,borderRadius:4,display:'flex',alignItems:'center',padding:'0 8px',fontSize:11,color:'#fff',fontWeight:500 }}>{pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* BUDGET */}
          {!loading&&page==='budget'&&(
            <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
                <div style={{ fontWeight:500 }}>Budget & finance</div>
                <button style={{ ...S.btn,padding:'5px 12px',fontSize:12 }} onClick={()=>{setEditTarget(activeBrand);setModal('editBrand')}}>✏️ Edit budget</button>
              </div>
              {brands.map(b=>{
                const day=new Date().getDate(),dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()
                const ideal=Math.round(day/dim*100)
                return(
                  <div key={b.id} style={{ marginBottom:20 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13 }}>
                      <span style={{ fontWeight:500 }}>{b.name}</span>
                      <span style={{ color:'#888' }}>${(b.monthly_budget/1000).toFixed(0)}K budget · ${b.agency_mrr?.toLocaleString()} MRR</span>
                    </div>
                    <div style={{ position:'relative',height:14,background:'#f5f5f3',borderRadius:5 }}>
                      <div style={{ height:14,width:`${ideal}%`,background:'#639922',borderRadius:5 }} />
                      <div style={{ position:'absolute',top:0,left:`${ideal}%`,width:2,height:14,background:'#555' }} />
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#888',marginTop:2 }}>
                      <span>Ideal: {ideal}% (day {day}/{dim})</span><span>Target ROAS: {b.target_roas}x</span>
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop:20,borderTop:'0.5px solid #e0dfd8',paddingTop:16 }}>
                <div style={{ fontWeight:500,marginBottom:12 }}>Agency summary</div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
                  {[['Total MRR',`$${brands.reduce((s,b)=>s+Number(b.agency_mrr||0),0).toLocaleString()}`],['Brands',brands.length],['Projected ARR',`$${(brands.reduce((s,b)=>s+Number(b.agency_mrr||0),0)*12).toLocaleString()}`]].map(([l,v])=>(
                    <div key={l} style={{ background:'#f5f5f3',borderRadius:8,padding:12 }}>
                      <div style={{ fontSize:11,color:'#888',marginBottom:4 }}>{l}</div>
                      <div style={{ fontWeight:500,fontSize:18 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEAM */}
          {!loading&&page==='team'&&(
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ fontWeight:500 }}>Task board — {activeBrand?.name}</div>
                <button style={S.btn} onClick={()=>setModal('task')}>+ Add task</button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16 }}>
                {['todo','in_progress','done'].map(status=>(
                  <div key={status} style={{ background:'#f5f5f3',borderRadius:12,padding:12 }}>
                    <div style={{ fontSize:12,fontWeight:500,textTransform:'uppercase',letterSpacing:'.05em',color:'#888',marginBottom:10 }}>
                      {{'todo':'To-do','in_progress':'In progress','done':'Done'}[status]}
                    </div>
                    {tasks.filter(t=>t.status===status).map(t=>(
                      <div key={t.id} style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:8,padding:10,marginBottom:8 }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                          <div style={{ fontWeight:500,fontSize:12,marginBottom:4,flex:1 }}>{t.title}</div>
                          <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                            <span onClick={()=>{setEditTarget(t);setModal('editTask')}} style={{ cursor:'pointer',fontSize:11,color:'#888' }}>✏️</span>
                            <span onClick={async()=>{ await deleteTask(t.id); refreshBrand() }} style={{ cursor:'pointer',fontSize:11,color:'#a32d2d' }}>✕</span>
                          </div>
                        </div>
                        <div style={{ fontSize:11,color:'#888',display:'flex',gap:8 }}>
                          <span style={{ color:{high:'#a32d2d',medium:'#854f0b',low:'#3b6d11'}[t.priority] }}>● {t.priority}</span>
                          {t.due_date&&<span>Due {new Date(t.due_date).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>}
                          {t.assignee&&<span>{t.assignee}</span>}
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t=>t.status===status).length===0&&<div style={{ fontSize:12,color:'#aaa',padding:'8px 0' }}>Empty</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* REPORTS */}
          {!loading&&page==='reports'&&activeBrand&&(
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ fontWeight:500 }}>Monthly reports — {activeBrand.name}</div>
                <div style={{ display:'flex',gap:8 }}>
                  <button style={{ ...S.btnGhost,fontSize:12,padding:'5px 12px' }} onClick={()=>{setClaudeOpen(true);setInput('Draft my monthly report executive summary')}}>🤖 Generate with Claude</button>
                  <button style={{ ...S.btn,fontSize:12,padding:'5px 12px' }} onClick={()=>setModal('report')}>+ Save report</button>
                </div>
              </div>
              {reports.length===0&&(
                <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:32,textAlign:'center',color:'#888' }}>
                  No reports saved yet. Click "Generate with Claude" then "Save report" to log your first one.
                </div>
              )}
              {reports.map(r=>(
                <div key={r.id} style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16,marginBottom:12 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                    <div style={{ fontWeight:500 }}>{r.month}</div>
                    <div style={{ display:'flex',gap:16,fontSize:12,color:'#888' }}>
                      <span>Spend: ${Number(r.total_spend||0).toLocaleString()}</span>
                      <span>Revenue: ${Number(r.total_revenue||0).toLocaleString()}</span>
                      <span style={{ fontWeight:500,color:roasColor(r.roas,activeBrand.target_roas) }}>ROAS: {Number(r.roas||0).toFixed(2)}x</span>
                    </div>
                  </div>
                  {r.executive_summary&&<div style={{ fontSize:13,color:'#555',lineHeight:1.6,marginBottom:8 }}>{r.executive_summary}</div>}
                  {r.wins&&<div style={{ fontSize:12,marginBottom:6 }}><strong>Wins:</strong> {r.wins}</div>}
                  {r.opportunities&&<div style={{ fontSize:12 }}><strong>Next month:</strong> {r.opportunities}</div>}
                </div>
              ))}
            </>
          )}

          {/* ALERTS */}
          {!loading&&page==='alerts'&&(
            <>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                <div style={{ fontWeight:500 }}>All alerts</div>
                {activeBrand&&<button style={S.btn} onClick={()=>setModal('alert')}>+ Create alert</button>}
              </div>
              <div style={{ background:'#fff',border:'0.5px solid #e0dfd8',borderRadius:12,padding:16 }}>
                {allAlerts.length===0&&<div style={{ color:'#888',fontSize:13 }}>No alerts yet.</div>}
                {allAlerts.map(a=>(
                  <div key={a.id} style={{ display:'flex',gap:10,padding:'10px 0',borderBottom:'0.5px solid #e0dfd8',alignItems:'flex-start' }}>
                    <div style={{ width:28,height:28,borderRadius:8,background:a.severity==='critical'?'#fcebeb':a.severity==='info'?'#e6f1fb':'#faeeda',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      {a.severity==='critical'?'📉':a.severity==='info'?'ℹ️':'⚠️'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:500 }}>{a.title}</div>
                      <div style={{ fontSize:12,color:'#555',marginTop:2 }}>{a.message}</div>
                      <div style={{ fontSize:11,color:'#888',marginTop:2 }}>{new Date(a.triggered_at).toLocaleString()}</div>
                    </div>
                    <span onClick={async()=>{ await supabase.from('alerts').update({is_read:true}).eq('id',a.id); getAllAlerts().then(setAllAlerts) }} style={{ fontSize:11,color:'#888',cursor:'pointer',flexShrink:0 }}>✓ dismiss</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CLAUDE PANEL */}
      <div style={{ position:'fixed',right:0,top:0,bottom:0,width:400,background:'#fff',borderLeft:'0.5px solid #e0dfd8',zIndex:300,display:'flex',flexDirection:'column',transform:claudeOpen?'translateX(0)':'translateX(100%)',transition:'transform .25s ease' }}>
        <div style={{ padding:'14px 16px',borderBottom:'0.5px solid #e0dfd8',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:'#e6f1fb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>🤖</div>
          <div><div style={{ fontWeight:500,fontSize:14 }}>Claude Copilot</div><div style={{ fontSize:11,color:'#888' }}>{activeBrand?.name||'Agency view'}</div></div>
          <div onClick={()=>setClaudeOpen(false)} style={{ marginLeft:'auto',cursor:'pointer',fontSize:18,color:'#888' }}>✕</div>
        </div>
        <div ref={msgsRef} style={{ flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:8 }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ padding:'10px 12px',borderRadius:12,fontSize:13,lineHeight:1.5,maxWidth:'90%',alignSelf:m.role==='user'?'flex-end':'flex-start',background:m.role==='user'?'#185fa5':'#f5f5f3',color:m.role==='user'?'#fff':'#1a1a18',whiteSpace:'pre-wrap' }}>{m.content}</div>
          ))}
          {typing&&<div style={{ padding:'10px 12px',borderRadius:12,background:'#f5f5f3',alignSelf:'flex-start',display:'flex',gap:4 }}>{[0,1,2].map(i=><span key={i} style={{ width:6,height:6,borderRadius:'50%',background:'#888',display:'inline-block',animation:`blink 1.2s ${i*.2}s infinite` }} />)}</div>}
        </div>
        <div style={{ padding:'8px 14px',display:'flex',flexWrap:'wrap',gap:6,borderTop:'0.5px solid #e0dfd8' }}>
          {CHIPS.map(c=><div key={c} onClick={()=>sendClaude(c)} style={{ fontSize:11,border:'0.5px solid #ccc',borderRadius:20,padding:'4px 10px',cursor:'pointer',background:'#f5f5f3',color:'#555',whiteSpace:'nowrap' }}>{c}</div>)}
        </div>
        <div style={{ padding:'10px 14px',borderTop:'0.5px solid #e0dfd8',display:'flex',gap:8,alignItems:'flex-end' }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendClaude(input)}}} placeholder="Ask anything..." style={{ flex:1,border:'0.5px solid #ccc',borderRadius:12,padding:'8px 12px',fontSize:13,resize:'none',minHeight:36,maxHeight:100,fontFamily:'inherit',background:'#f5f5f3' }} rows={1} />
          <button onClick={()=>sendClaude(input)} style={{ width:32,height:32,borderRadius:'50%',background:'#185fa5',color:'#fff',border:'none',cursor:'pointer',fontSize:14,flexShrink:0 }}>➤</button>
        </div>
      </div>

      <button onClick={()=>setClaudeOpen(o=>!o)} style={{ position:'fixed',bottom:24,right:24,width:48,height:48,borderRadius:'50%',background:'#185fa5',color:'#fff',border:'none',cursor:'pointer',fontSize:22,boxShadow:'0 2px 12px rgba(24,95,165,.35)',zIndex:200 }}>🤖</button>

      {/* MODALS */}
      {modal==='brand'&&<BrandModal onClose={closeModal} onSave={()=>{closeModal();refresh()}} />}
      {modal==='editBrand'&&<BrandModal brand={editTarget} onClose={closeModal} onSave={()=>{closeModal();refresh()}} />}
      {modal==='task'&&<TaskModal brandId={activeBrand?.id} onClose={closeModal} onSave={()=>{closeModal();refreshBrand()}} />}
      {modal==='editTask'&&<TaskModal brandId={activeBrand?.id} task={editTarget} onClose={closeModal} onSave={()=>{closeModal();refreshBrand()}} />}
      {modal==='report'&&<ReportModal brandId={activeBrand?.id} summary={summary} onClose={closeModal} onSave={()=>{closeModal();refreshBrand()}} />}
      {modal==='perf'&&<PerformanceModal brandId={activeBrand?.id} onClose={closeModal} onSave={()=>{closeModal();refreshBrand()}} />}
      {modal==='alert'&&<AlertModal brandId={activeBrand?.id} onClose={closeModal} onSave={()=>{closeModal();refresh()}} />}

      <style>{`@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}input,textarea,select{outline:none;}input:focus,textarea:focus,select:focus{border-color:#185fa5!important;}`}</style>
    </div>
  )
}
