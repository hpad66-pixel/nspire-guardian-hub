// Shared Notion OAuth helpers for the Proj OS public Notion connection.
// The browser only receives an authorization URL and safe status metadata. The
// access/refresh tokens stay in edge functions and the database service role.

const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
const timingSafe = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export interface NotionStateData {
  t: string;
  u: string;
  r?: string;
  o?: string;
}

export interface NotionTokenResponse {
  access_token: string;
  refresh_token?: string;
  bot_id: string;
  duplicated_template_id?: string | null;
  owner?: Record<string, unknown>;
  workspace_icon?: string | null;
  workspace_id: string;
  workspace_name?: string | null;
  token_type?: string;
  expires_in?: number;
}

export const NOTION_VERSION = "2022-06-28";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();

export function redirectUri(): string {
  return `${env("SUPABASE_URL")}/functions/v1/notion-oauth-callback`;
}

export async function signState(secret: string, data: NotionStateData): Promise<string> {
  const nonce = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const payload = { ...data, n: nonce, e: Date.now() + 10 * 60 * 1000 };
  const b = b64url(JSON.stringify(payload));
  return `${b}.${await hmacHex(secret, b)}`;
}

export async function verifyState(secret: string, state: string | null): Promise<NotionStateData | null> {
  if (!state) return null;
  const dot = state.lastIndexOf(".");
  if (dot < 1) return null;
  const b = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  if (!timingSafe(await hmacHex(secret, b), sig)) return null;
  try {
    const p = JSON.parse(unb64url(b));
    if (!p.e || Date.now() > p.e || !p.t || !p.u) return null;
    return {
      t: p.t,
      u: p.u,
      r: typeof p.r === "string" ? p.r : undefined,
      o: typeof p.o === "string" ? p.o : undefined,
    };
  } catch {
    return null;
  }
}

const ALLOWED_ORIGINS = [
  "https://projos.ai",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:4178",
  "http://localhost:4178",
];

export function safeOrigin(o?: string | null): string {
  const t = (o ?? "").trim();
  if (t && ALLOWED_ORIGINS.includes(t)) return t;
  return "https://projos.ai";
}

export function safeReturnPath(r?: string): string {
  if (!r || !r.startsWith("/") || r.startsWith("//")) return "/";
  return r;
}

export function authorizeUrl(state: string): string {
  const base = env("NOTION_OAUTH_AUTH_URL") || "https://api.notion.com/v1/oauth/authorize";
  const url = new URL(base);
  url.searchParams.set("owner", "user");
  url.searchParams.set("client_id", env("NOTION_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuth(): string {
  return btoa(`${env("NOTION_OAUTH_CLIENT_ID")}:${env("NOTION_OAUTH_CLIENT_SECRET")}`);
}

export async function exchangeCode(code: string): Promise<NotionTokenResponse> {
  const r = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
  });
  if (!r.ok) throw new Error(`Notion token exchange failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<NotionTokenResponse> {
  const r = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!r.ok) throw new Error(`Notion token refresh failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

export async function notionGetMe(accessToken: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.notion.com/v1/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
    },
  });
  if (!response.ok) throw new Error(`Notion user check failed: ${response.status}`);
  return await response.json();
}

export function titleFromNotionObject(item: Record<string, unknown>): string {
  const properties = item.properties as Record<string, any> | undefined;
  if (properties) {
    for (const value of Object.values(properties)) {
      if (value?.type === "title" && Array.isArray(value.title)) {
        const title = value.title.map((part: any) => part?.plain_text ?? "").join("").trim();
        if (title) return title;
      }
    }
  }
  const title = (item as any).title;
  if (Array.isArray(title)) {
    const text = title.map((part: any) => part?.plain_text ?? "").join("").trim();
    if (text) return text;
  }
  return "Untitled Notion source";
}
