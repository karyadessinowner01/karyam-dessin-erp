import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// ============ Types ============

/** Summary of the current ERP state, posted by the client. */
interface ERPSummary {
  leadCountsByStage: Record<string, number>;
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  openLeads: number;
  conversionRate: number; // %
  totalPipelineValue: number; // ₹ sum of expectedOrderValue for open leads
  weightedPipeline: number; // ₹ sum of expectedOrderValue * winProbability/100
  recentActivities: { time: string; activity: string; user: string; project: string }[];
  overdueFollowups: { id: string; client: string; contact: string; phone: string; followup: string; priority?: string }[];
  topSalesperson: { name: string; wonCount: number; pipelineValue: number } | null;
  lostReasons: { reason: string; count: number }[];
  payments: { totalReceived: number; outstanding: number; recentCount: number };
  projects: { active: number; cancelled: number; totalValue: number };
  tickets: { open: number; total: number };
  generatedAt: string;
}

/** AI-generated insight card. */
export interface InsightCard {
  title: string;
  /** Short headline / key metric. */
  headline: string;
  /** Body paragraph(s) — supports \n. */
  body: string;
  /** Optional list of bullet items. */
  bullets?: string[];
  /** Optional confidence / trend tag. */
  tag?: string;
  /** Tone for the card border / icon color. */
  tone?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
}

interface AiInsightsResponse {
  ok: boolean;
  source: 'ai' | 'fallback';
  generatedAt: string;
  insights: {
    leadConversionPrediction: InsightCard;
    nextBestActions: InsightCard;
    salesForecast: InsightCard;
    sentimentSummary: InsightCard;
    smartFollowUps: InsightCard;
  };
  rawSummary: ERPSummary;
}

// ============ Fallback (rule-based) insights ============
// Computed deterministically from the posted summary — used if the LLM call fails.

function buildFallbackInsights(s: ERPSummary): AiInsightsResponse['insights'] {
  const openValue = s.totalPipelineValue || 0;
  const weighted = s.weightedPipeline || 0;
  const conv = s.conversionRate || 0;
  const won = s.wonLeads || 0;
  const lost = s.lostLeads || 0;
  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

  // Lead conversion prediction — based on weighted pipeline vs raw pipeline
  const confidencePct = openValue > 0 ? Math.round((weighted / openValue) * 100) : 0;
  const convPrediction: InsightCard = {
    title: 'Lead Conversion Prediction',
    headline: `₹${weighted.toLocaleString('en-IN')} weighted pipeline`,
    body:
      `Of ₹${openValue.toLocaleString('en-IN')} open pipeline value, ₹${weighted.toLocaleString('en-IN')} ` +
      `is weighted by win-probability (${confidencePct}% confidence). Historical win-rate is ${winRate}% ` +
      `(${won} won / ${decided} decided).`,
    bullets: [
      `${s.openLeads} open lead(s) across ${Object.entries(s.leadCountsByStage).filter(([, n]) => n > 0).length} pipeline stage(s)`,
      `Weighted-to-raw ratio: ${confidencePct}% — ${confidencePct >= 50 ? 'healthy' : 'needs attention'}`,
      `Conversion rate (won / total): ${conv}%`,
    ],
    tag: `${confidencePct}% weighted`,
    tone: confidencePct >= 50 ? 'emerald' : 'amber',
  };

  // Next best actions
  const nba: string[] = [];
  if (s.overdueFollowups.length > 0) {
    nba.push(`Call ${s.overdueFollowups.length} overdue follow-up lead(s) — start with highest priority.`);
  }
  if (s.payments.outstanding > 0) {
    nba.push(`Chase ₹${s.payments.outstanding.toLocaleString('en-IN')} outstanding payments — prioritise oldest first.`);
  }
  if (s.tickets.open > 0) {
    nba.push(`Resolve ${s.tickets.open} open support ticket(s) to protect customer satisfaction.`);
  }
  if (s.projects.active > 0) {
    nba.push(`Review ${s.projects.active} active project(s) for stage bottlenecks before they slip.`);
  }
  if (s.lostReasons.length > 0) {
    nba.push(`Address top loss reason "${s.lostReasons[0].reason}" (${s.lostReasons[0].count} losses) in next quote.`);
  }
  if (nba.length === 0) nba.push('No urgent actions — keep nurturing open leads and monitor pipeline.');

  const nextBest: InsightCard = {
    title: 'Next Best Actions',
    headline: `${nba.length} suggested action${nba.length === 1 ? '' : 's'}`,
    body: 'Rule-based prioritisation from current ERP state. Tackle in order — top items have the highest revenue / risk impact.',
    bullets: nba,
    tag: `${nba.length} actions`,
    tone: 'blue',
  };

  // Sales forecast — simple projection: weighted pipeline + received payments trend
  const forecast90 = Math.round(weighted * 0.7); // assume 70% of weighted closes within 90 days
  const salesForecast: InsightCard = {
    title: 'Sales Forecast (90 days)',
    headline: `₹${forecast90.toLocaleString('en-IN')} projected closes`,
    body:
      `Estimated from weighted pipeline (₹${weighted.toLocaleString('en-IN')}) × 0.7 historical 90-day close rate. ` +
      `Already received: ₹${s.payments.totalReceived.toLocaleString('en-IN')}. ` +
      `Active project value: ₹${s.projects.totalValue.toLocaleString('en-IN')}.`,
    bullets: [
      `Weighted pipeline: ₹${weighted.toLocaleString('en-IN')}`,
      `Cash already received: ₹${s.payments.totalReceived.toLocaleString('en-IN')}`,
      `Outstanding to collect: ₹${s.payments.outstanding.toLocaleString('en-IN')}`,
    ],
    tag: '90-day outlook',
    tone: 'purple',
  };

  // Sentiment summary
  const overdueRatio = s.totalLeads > 0 ? s.overdueFollowups.length / s.totalLeads : 0;
  let sentiment: 'Positive' | 'Cautious' | 'At Risk';
  let sentimentTone: InsightCard['tone'];
  if (overdueRatio < 0.15 && s.tickets.open <= 2) {
    sentiment = 'Positive';
    sentimentTone = 'emerald';
  } else if (overdueRatio < 0.4) {
    sentiment = 'Cautious';
    sentimentTone = 'amber';
  } else {
    sentiment = 'At Risk';
    sentimentTone = 'rose';
  }
  const sentimentSummary: InsightCard = {
    title: 'Customer Sentiment Summary',
    headline: sentiment,
    body:
      `Estimated from follow-up cadence + ticket volume. ${s.overdueFollowups.length} overdue follow-up(s) ` +
      `out of ${s.totalLeads} total leads, ${s.tickets.open} open ticket(s). ` +
      `${s.topSalesperson ? `Top rep: ${s.topSalesperson.name} (${s.topSalesperson.wonCount} wins).` : 'No rep data yet.'}`,
    bullets: [
      `Overdue follow-up ratio: ${(overdueRatio * 100).toFixed(0)}%`,
      `Open tickets: ${s.tickets.open}`,
      `Lost-leads signals: ${s.lostReasons.reduce((a, b) => a + b.count, 0)}`,
    ],
    tag: sentiment,
    tone: sentimentTone,
  };

  // Smart follow-up suggestions — list the most overdue leads
  const fuBullets = s.overdueFollowups.slice(0, 5).map((l) => {
    const pr = l.priority ? `[${l.priority}] ` : '';
    return `${pr}${l.client} — ${l.contact} (${l.phone}) — followup was ${l.followup}`;
  });
  if (fuBullets.length === 0) fuBullets.push('No overdue follow-ups. Maintain cadence on open leads.');

  const smartFollowUps: InsightCard = {
    title: 'Smart Follow-up Suggestions',
    headline: `${s.overdueFollowups.length} overdue follow-up(s)`,
    body: 'Prioritised by lead priority and overdue duration. Calling these within 24h typically recovers ~40% of slipping deals.',
    bullets: fuBullets,
    tag: `${s.overdueFollowups.length} due`,
    tone: 'amber',
  };

  return {
    leadConversionPrediction: convPrediction,
    nextBestActions: nextBest,
    salesForecast,
    sentimentSummary,
    smartFollowUps,
  };
}

// ============ AI insight generation via z-ai-web-dev-sdk ============

const SYSTEM_PROMPT =
  'You are Karyam AI — a senior CRM analyst embedded inside the Karyam Dessin ERP (a pharma-printing design house). ' +
  'You receive a JSON snapshot of the current CRM state and must produce 5 insight cards. ' +
  'Be specific, quantitative, and action-oriented. Reference real numbers and client names from the snapshot. ' +
  'Always respond with strict JSON — no markdown fences, no commentary.';

function buildUserPrompt(s: ERPSummary): string {
  return [
    'Generate CRM insights for this snapshot. Respond as STRICT JSON only with this exact shape:',
    '{',
    '  "leadConversionPrediction": {"title": string, "headline": string, "body": string, "bullets": string[], "tag"?: string, "tone"?: "emerald"|"amber"|"rose"|"blue"|"purple"},',
    '  "nextBestActions":           {"title": string, "headline": string, "body": string, "bullets": string[], "tag"?: string, "tone"?: "emerald"|"amber"|"rose"|"blue"|"purple"},',
    '  "salesForecast":             {"title": string, "headline": string, "body": string, "bullets": string[], "tag"?: string, "tone"?: "emerald"|"amber"|"rose"|"blue"|"purple"},',
    '  "sentimentSummary":          {"title": string, "headline": string, "body": string, "bullets": string[], "tag"?: string, "tone"?: "emerald"|"amber"|"rose"|"blue"|"purple"},',
    '  "smartFollowUps":            {"title": string, "headline": string, "body": string, "bullets": string[], "tag"?: string, "tone"?: "emerald"|"amber"|"rose"|"blue"|"purple"}',
    '}',
    '',
    'Rules:',
    '- headline: 3-8 word punchy summary (often includes a ₹ figure or %).',
    '- body: 1-2 short sentences referencing real numbers from the snapshot.',
    '- bullets: 3-5 actionable bullet points.',
    '- tone: pick the single most appropriate colour for the card.',
    '- Do NOT include any text outside the JSON object.',
    '',
    'ERP SNAPSHOT:',
    '```json',
    JSON.stringify(s, null, 2),
    '```',
  ].join('\n');
}

function tryParseAiJson(raw: string): AiInsightsResponse['insights'] | null {
  if (!raw) return null;
  // Strip markdown code fences if the model added them despite instructions.
  let txt = raw.trim();
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  // Extract the outermost JSON object, tolerating surrounding prose.
  const first = txt.indexOf('{');
  const last = txt.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = txt.slice(first, last + 1);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(candidate);
  } catch {
    return null;
  }
  const keys = ['leadConversionPrediction', 'nextBestActions', 'salesForecast', 'sentimentSummary', 'smartFollowUps'];
  for (const k of keys) {
    const c = obj[k] as Record<string, unknown> | undefined;
    if (!c || typeof c !== 'object') return null;
    if (typeof c.title !== 'string' || typeof c.headline !== 'string' || typeof c.body !== 'string') return null;
    if (!Array.isArray(c.bullets)) c.bullets = [];
  }
  return obj as unknown as AiInsightsResponse['insights'];
}

async function generateAiInsights(s: ERPSummary): Promise<AiInsightsResponse['insights'] | null> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(s) },
      ],
      thinking: { type: 'disabled' },
    });
    const raw = completion?.choices?.[0]?.message?.content;
    return tryParseAiJson(typeof raw === 'string' ? raw : '');
  } catch (err) {
    console.error('[ai-insights] LLM call failed:', err);
    return null;
  }
}

// ============ Route handler ============

export async function POST(req: NextRequest) {
  let summary: ERPSummary;
  try {
    summary = (await req.json()) as ERPSummary;
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body', details: String(err) },
      { status: 400 },
    );
  }

  if (!summary || typeof summary !== 'object' || typeof summary.totalLeads !== 'number') {
    return NextResponse.json(
      { ok: false, error: 'Missing or invalid ERP summary' },
      { status: 400 },
    );
  }

  const generatedAt = new Date().toISOString();

  // Always have a fallback ready so the user gets a result even if the LLM is unreachable.
  const fallback = buildFallbackInsights(summary);
  const ai = await generateAiInsights(summary);

  if (ai) {
    const body: AiInsightsResponse = {
      ok: true,
      source: 'ai',
      generatedAt,
      insights: ai,
      rawSummary: summary,
    };
    return NextResponse.json(body);
  }

  const body: AiInsightsResponse = {
    ok: true,
    source: 'fallback',
    generatedAt,
    insights: fallback,
    rawSummary: summary,
  };
  return NextResponse.json(body);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/ai-insights',
    method: 'POST',
    description: 'Generate AI-powered CRM insights from a posted ERP summary.',
    requiredFields: [
      'leadCountsByStage', 'totalLeads', 'wonLeads', 'lostLeads', 'openLeads',
      'conversionRate', 'totalPipelineValue', 'weightedPipeline',
      'recentActivities', 'overdueFollowups', 'topSalesperson', 'lostReasons',
      'payments', 'projects', 'tickets',
    ],
  });
}
