// Client mirror of supabase/functions/_shared/ai-style-config.ts.
// Used to lint AI-generated text and flag banned tokens / em dashes for review.

export const BANNED_TOKENS: string[] = [
  "delve", "tapestry", "navigate the complexities", "in today's fast-paced world",
  "it's worth noting", "certainly!", "i'd be happy to", "robust", "leverage",
  "seamless", "game-changing", "unlock", "elevate", "embark",
];

export interface StyleViolation {
  token: string;
  kind: "banned-word" | "em-dash";
}

/** Scan plain text (strip HTML first) for banned tokens and em dashes. */
export function lintStyle(text: string): StyleViolation[] {
  const violations: StyleViolation[] = [];
  if (text.includes("—")) violations.push({ token: "—", kind: "em-dash" });
  const lower = text.toLowerCase();
  for (const t of BANNED_TOKENS) {
    if (lower.includes(t)) violations.push({ token: t, kind: "banned-word" });
  }
  return violations;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}
