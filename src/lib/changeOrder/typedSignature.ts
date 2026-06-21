/**
 * Typed e-signature — renders a name in a handwriting font to a PNG the same way
 * a drawn signature would be, so it stamps into the document/PDF identically.
 * No drawing required; it reads like ink on paper.
 */

export interface SignatureFont {
  id: string;
  label: string;
  family: string;
}

export const SIGNATURE_FONTS: SignatureFont[] = [
  { id: "dancing", label: "Flowing", family: "Dancing Script" },
  { id: "greatvibes", label: "Elegant", family: "Great Vibes" },
  { id: "sacramento", label: "Casual", family: "Sacramento" },
];

let linkInjected = false;
function injectFontLink() {
  if (linkInjected || typeof document === "undefined") return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap";
  document.head.appendChild(l);
  linkInjected = true;
}

export async function ensureSignatureFont(family: string): Promise<void> {
  injectFontLink();
  try {
    if ("fonts" in document) {
      await (document as any).fonts.load(`48px "${family}"`);
      await (document as any).fonts.ready;
    }
  } catch {
    /* fall back to a generic cursive if the webfont can't load */
  }
}

/** Render the typed name in a handwriting font and return a PNG data URL. */
export async function renderTypedSignature(name: string, family: string): Promise<string> {
  await ensureSignatureFont(family);
  const w = 460, h = 150, dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0a1a3a";
  ctx.textBaseline = "middle";

  let size = 70;
  do {
    ctx.font = `${size}px "${family}", cursive`;
    if (ctx.measureText(name || " ").width <= w - 48) break;
    size -= 2;
  } while (size > 22);

  ctx.fillText(name, 24, h / 2 + 4);
  return canvas.toDataURL("image/png");
}
