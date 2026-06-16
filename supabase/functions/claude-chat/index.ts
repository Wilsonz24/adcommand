// supabase/functions/claude-chat/index.ts
// Deploy with: supabase functions deploy claude-chat
// Set secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, brandContext } = await req.json()

    if (!brandContext || !messages?.length) {
      return new Response(JSON.stringify({ error: 'Missing messages or brandContext' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build dynamic system prompt from live brand data
    const systemPrompt = buildSystemPrompt(brandContext)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    })

    // Stream back to client
    return new Response(anthropicRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildSystemPrompt(ctx: any): string {
  return `You are a world-class Facebook/Meta media buying expert embedded in an agency dashboard as an AI copilot. You have LIVE access to the following brand data:

BRAND: ${ctx.name} | Niche: ${ctx.niche}
Target ROAS: ${ctx.target_roas}x | Monthly Budget: $${ctx.monthly_budget?.toLocaleString()} | Days remaining this month: ${ctx.days_remaining}
Current Spend: $${ctx.spend?.toLocaleString()} | Revenue: $${ctx.revenue?.toLocaleString()} | ROAS: ${ctx.roas}x
Budget pacing: ${ctx.budget_pacing}% spent (ideal: ${ctx.ideal_pacing}% on day ${ctx.day_of_month})

CAMPAIGNS (last 30 days):
${ctx.campaigns?.map((c: any) => `• ${c.name}: spend $${c.total_spend?.toLocaleString()}, ROAS ${c.roas}x, ${c.purchases} purchases, CPP $${c.cpp}`).join('\n') || 'No campaign data'}

CREATIVES — Top performers:
${ctx.top_creatives?.map((c: any) => `• ${c.name} (${c.format?.toUpperCase()}, ${c.funnel_stage}): ROAS ${c.roas}x, CTR ${c.ctr}%, freq ${c.frequency}, spend $${c.spend}`).join('\n') || 'No creative data'}

CREATIVES — Underperformers:
${ctx.bottom_creatives?.map((c: any) => `• ${c.name}: ROAS ${c.roas}x, CTR ${c.ctr}%, freq ${c.frequency}`).join('\n') || 'None'}

ACTIVE ALERTS:
${ctx.alerts?.map((a: any) => `• [${a.severity?.toUpperCase()}] ${a.title}: ${a.message}`).join('\n') || 'No active alerts'}

FUNNEL (current month):
Awareness: ${ctx.funnel?.impressions?.toLocaleString()} impressions → Traffic: ${ctx.funnel?.clicks?.toLocaleString()} clicks → ATC: ${ctx.funnel?.atc} → IC: ${ctx.funnel?.checkouts} → Purchase: ${ctx.funnel?.purchases}

KEY METRICS: CPM $${ctx.cpm} | CTR ${ctx.ctr}% | CPC $${ctx.cpc} | CPP $${ctx.cpp} | Avg freq ${ctx.frequency}

Be specific, data-driven, and actionable. Reference real numbers from the data. Keep responses focused and practical — you are a media buying expert, not a generalist AI. Use bullet points for recommendations. Be direct about what to cut, scale, or test.`
}
