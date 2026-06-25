// Shared style guard for ALL AI-generated text across the platform.
// Edge functions import STYLE_RULES into their system prompt; the client mirrors
// BANNED_TOKENS for a post-generation lint. Keep the two lists in sync with
// src/lib/ai/styleGuard.ts.

export const BANNED_TOKENS: string[] = [
  "delve", "tapestry", "navigate the complexities", "in today's fast-paced world",
  "it's worth noting", "certainly!", "i'd be happy to", "robust", "leverage",
  "seamless", "game-changing", "unlock", "elevate", "embark",
];

// Hard rules injected verbatim into the system prompt of every generation call.
export const STYLE_RULES = `STRICT WRITING STYLE (follow exactly):
- Write in a professional, declarative, engineer's voice. Short, confident sentences.
- NO em dashes. Use periods or commas instead.
- No filler or hedging. Never use these words or phrases: ${BANNED_TOKENS.join(", ")}.
- Avoid ChatGPT-style sentence structures: no "It's not just X, it's Y", no tricolon padding, no "From X to Y to Z" listing cliche.
- Every number includes its unit.
- Plain, specific, client-facing language. State scope, deliverables, price, schedule, and terms directly.`;

/** True if the text contains a banned token (case-insensitive) or an em dash. */
export function hasStyleViolations(text: string): boolean {
  if (text.includes("—")) return true; // em dash
  const lower = text.toLowerCase();
  return BANNED_TOKENS.some((t) => lower.includes(t));
}
