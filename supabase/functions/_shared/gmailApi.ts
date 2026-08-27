// Thin Gmail REST helpers used by gmail-sync: list thread ids for a query, fetch a
// full thread, and flatten a MIME message into the fields project_emails stores.
// All calls take a short-lived access token (see refreshAccessToken).

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function g<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`gmail ${path.split("?")[0]} failed: ${r.status} ${await r.text()}`);
  return await r.json() as T;
}

export interface GmailThreadRef { id: string; historyId?: string }

/** List thread ids matching a Gmail search query (one page; caller bounds with maxResults). */
export async function listThreads(token: string, query: string, maxResults = 50): Promise<GmailThreadRef[]> {
  const p = new URLSearchParams({ q: query, maxResults: String(Math.min(maxResults, 100)) });
  const d = await g<{ threads?: GmailThreadRef[] }>(token, `/threads?${p.toString()}`);
  return d.threads ?? [];
}

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string; // ms since epoch, as string
  payload?: GmailPart;
}
export interface GmailThread { id: string; historyId?: string; messages?: GmailMessage[] }

export async function getThread(token: string, id: string): Promise<GmailThread> {
  return await g<GmailThread>(token, `/threads/${id}?format=full`);
}

/** Add/remove Gmail labels on a whole thread (used to push a correction — e.g. the
 *  user moved a thread to the right project and wants Gmail to reflect it). */
export async function modifyThreadLabels(token: string, threadId: string, addLabelIds: string[], removeLabelIds: string[] = []): Promise<void> {
  const r = await fetch(`${API}/threads/${threadId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });
  if (!r.ok) throw new Error(`gmail label modify failed: ${r.status} ${await r.text()}`);
}

// ── Sending ─────────────────────────────────────────────────────────────────

export interface GmailSendAttachment {
  filename: string;
  contentBase64: string;
  contentType?: string;
}

export interface GmailSendInput {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: GmailSendAttachment[];
  threadId?: string | null;
  inReplyTo?: string | null;
}

export interface GmailSendResult {
  id: string;
  threadId: string;
  labelIds?: string[];
  rfcMessageId: string;
}

const utf8Base64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const b64urlEncode = (value: string): string =>
  utf8Base64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const headerValue = (value: string): string => {
  // Protect the raw RFC-2822 envelope from newline/header injection. Non-ASCII
  // values use RFC-2047 encoded words so project names remain readable.
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7E]*$/.test(clean) ? clean : `=?UTF-8?B?${utf8Base64(clean)}?=`;
};

const addressList = (addresses: string[] | undefined): string =>
  (addresses ?? []).map((x) => x.replace(/[\r\n,]+/g, "").trim()).filter(Boolean).join(", ");

const wrapBase64 = (value: string): string => value.replace(/\s+/g, "").match(/.{1,76}/g)?.join("\r\n") ?? "";

function buildRawMessage(input: GmailSendInput): { raw: string; rfcMessageId: string } {
  const mixed = `mixed_${crypto.randomUUID().replace(/-/g, "")}`;
  const alt = `alt_${crypto.randomUUID().replace(/-/g, "")}`;
  const rfcMessageId = `<${crypto.randomUUID()}@projos.ai>`;
  const hasAttachments = Boolean(input.attachments?.length);
  const headers = [
    `From: ${addressList([input.from])}`,
    `To: ${addressList(input.to)}`,
    ...(input.cc?.length ? [`Cc: ${addressList(input.cc)}`] : []),
    ...(input.bcc?.length ? [`Bcc: ${addressList(input.bcc)}`] : []),
    `Subject: ${headerValue(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${rfcMessageId}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${headerValue(input.inReplyTo)}`, `References: ${headerValue(input.inReplyTo)}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: ${hasAttachments ? `multipart/mixed; boundary=\"${mixed}\"` : `multipart/alternative; boundary=\"${alt}\"`}`,
  ];

  const alternative = [
    `--${alt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8Base64(input.bodyText ?? "")),
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(utf8Base64(input.bodyHtml ?? input.bodyText ?? "")),
    `--${alt}--`,
  ].join("\r\n");

  if (!hasAttachments) return { raw: [...headers, "", alternative].join("\r\n"), rfcMessageId };

  const parts = [
    ...headers,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary=\"${alt}\"`,
    "",
    alternative,
  ];
  for (const attachment of input.attachments ?? []) {
    const safeName = headerValue(attachment.filename || "attachment");
    parts.push(
      `--${mixed}`,
      `Content-Type: ${attachment.contentType || "application/octet-stream"}; name=\"${safeName}\"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename=\"${safeName}\"`,
      "",
      wrapBase64(attachment.contentBase64),
    );
  }
  parts.push(`--${mixed}--`);
  return { raw: parts.join("\r\n"), rfcMessageId };
}

/** Send from the connected user's own Gmail mailbox. Supplying threadId plus
 * In-Reply-To keeps the message in the same Gmail/project conversation. */
export async function sendMessage(token: string, input: GmailSendInput): Promise<GmailSendResult> {
  const built = buildRawMessage(input);
  const payload: Record<string, string> = { raw: b64urlEncode(built.raw) };
  if (input.threadId) payload.threadId = input.threadId;
  const r = await fetch(`${API}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`gmail send failed: ${r.status} ${await r.text()}`);
  const result = await r.json() as Omit<GmailSendResult, "rfcMessageId">;
  return { ...result, rfcMessageId: built.rfcMessageId };
}

// ── MIME flattening ──────────────────────────────────────────────────────────
const b64urlDecode = (data: string): string => {
  try {
    const s = data.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(s);
    // decode UTF-8 bytes → string
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch { return ""; }
};

const header = (msg: GmailMessage, name: string): string => {
  const h = msg.payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
};

// Parse "Name <email>" / "email" → { name, email }
export function parseAddress(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: raw.trim().toLowerCase() };
}
const parseList = (raw: string): string[] =>
  raw ? raw.split(",").map((s) => parseAddress(s).email).filter(Boolean) : [];

function walk(part: GmailPart | undefined, out: { text: string[]; html: string[]; atts: Array<{ filename: string; mimeType: string; size: number; gmail_attachment_id?: string }> }) {
  if (!part) return;
  const mt = (part.mimeType ?? "").toLowerCase();
  if (part.filename && (part.body?.attachmentId || (part.body?.size ?? 0) > 0)) {
    out.atts.push({ filename: part.filename, mimeType: part.mimeType ?? "application/octet-stream", size: part.body?.size ?? 0, gmail_attachment_id: part.body?.attachmentId });
  } else if (mt === "text/plain" && part.body?.data) {
    out.text.push(b64urlDecode(part.body.data));
  } else if (mt === "text/html" && part.body?.data) {
    out.html.push(b64urlDecode(part.body.data));
  }
  for (const c of part.parts ?? []) walk(c, out);
}

export interface FlatMessage {
  gmail_message_id: string;
  gmail_thread_id: string;
  message_id_header: string;   // RFC822 Message-Id
  in_reply_to: string;
  subject: string;
  from_email: string;
  from_name: string;
  to_emails: string[];
  cc_emails: string[];
  snippet: string;
  body_text: string;
  body_html: string;
  has_attachments: boolean;
  attachments: Array<{ filename: string; mimeType: string; size: number; gmail_attachment_id?: string }>;
  labels: string[];
  occurred_at: string;         // ISO
}

export function flattenMessage(msg: GmailMessage): FlatMessage {
  const acc = { text: [] as string[], html: [] as string[], atts: [] as FlatMessage["attachments"] };
  walk(msg.payload, acc);
  const from = parseAddress(header(msg, "From"));
  const ms = Number(msg.internalDate ?? 0);
  return {
    gmail_message_id: msg.id,
    gmail_thread_id: msg.threadId,
    message_id_header: header(msg, "Message-Id"),
    in_reply_to: header(msg, "In-Reply-To"),
    subject: header(msg, "Subject"),
    from_email: from.email,
    from_name: from.name,
    to_emails: parseList(header(msg, "To")),
    cc_emails: parseList(header(msg, "Cc")),
    snippet: (msg.snippet ?? "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
    body_text: acc.text.join("\n\n").trim(),
    body_html: acc.html.join("\n").trim(),
    has_attachments: acc.atts.length > 0,
    attachments: acc.atts,
    labels: msg.labelIds ?? [],
    occurred_at: ms ? new Date(ms).toISOString() : new Date().toISOString(),
  };
}
