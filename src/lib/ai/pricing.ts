// Frontend mirror of the edge-function AI price table (per 1,000,000 tokens).
// Keep in sync with supabase/functions/_shared/aiUsage.ts. Used by the AI Usage
// analytics dashboard for the pricing-reference table and any recompute.

export interface ModelPrice { in: number; out: number; cacheRead: number; cacheWrite: number }

export const MODEL_PRICING: Record<string, ModelPrice> = {
  'claude-opus-4-8':   { in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-opus-4-6':   { in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-5':   { in: 3,  out: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4-6': { in: 3,  out: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4-5':  { in: 1,  out: 5,  cacheRead: 0.1, cacheWrite: 1.25 },
};

// Friendly display names for models + a tier label.
export const MODEL_LABELS: Record<string, { name: string; tier: 'Opus' | 'Sonnet' | 'Haiku' }> = {
  'claude-opus-4-8':   { name: 'Opus 4.8',   tier: 'Opus' },
  'claude-opus-4-6':   { name: 'Opus 4.6',   tier: 'Opus' },
  'claude-sonnet-5':   { name: 'Sonnet 5',   tier: 'Sonnet' },
  'claude-sonnet-4-6': { name: 'Sonnet 4.6', tier: 'Sonnet' },
  'claude-haiku-4-5':  { name: 'Haiku 4.5',  tier: 'Haiku' },
};

export function modelLabel(model: string): string {
  return MODEL_LABELS[model]?.name ?? model;
}

// Human-readable names for each instrumented AI feature (skill key).
export const SKILL_LABELS: Record<string, string> = {
  meeting_agenda: 'Meeting agenda',
  action_items_extract: 'Meeting → action items',
  consulting_client_update: 'Client progress update',
  proposal_scopes_extract: 'Proposal → scopes',
  punch_list_draft: 'Punch list draft',
  assistant_chat: 'AI assistant chat',
  progress_report: 'Progress report',
  client_update: 'Client update',
  polish_text: 'Text polish / rewrite',
  tracker_ai: 'Project tracker AI',
  risk_radar: 'Risk radar',
  change_order_draft: 'Change-order draft',
  extract_document: 'Document extraction',
  payapp_lines_extract: 'Pay-app line extraction',
  transcript_issues: 'Transcript → issues',
  regulatory_review: 'Regulatory case review',
};

export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

export const MODEL_ORDER = ['claude-opus-4-8', 'claude-opus-4-6', 'claude-sonnet-5', 'claude-sonnet-4-6', 'claude-haiku-4-5'];

// Brand-ish colors for charts, keyed by tier.
export const TIER_COLOR: Record<string, string> = {
  Opus: '#1D6FE8',    // sapphire
  Sonnet: '#C4A35A',  // gold
  Haiku: '#10B981',   // emerald
};

export function modelColor(model: string): string {
  const tier = MODEL_LABELS[model]?.tier;
  return (tier && TIER_COLOR[tier]) || '#878581';
}

export const CHART_PALETTE = ['#1D6FE8', '#C4A35A', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#0EA5E9', '#84CC16'];

export function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(5)}`;
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
