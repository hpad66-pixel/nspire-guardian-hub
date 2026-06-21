/**
 * TypedSignaturePad — sign by typing your name; it renders in a handwriting font
 * (ink-on-paper look) and emits a PNG data URL via onChange, ready to stamp into
 * the document. No drawing.
 */
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIGNATURE_FONTS, renderTypedSignature, ensureSignatureFont } from "@/lib/changeOrder/typedSignature";

export function TypedSignaturePad({
  defaultName = "",
  onChange,
  onNameChange,
}: {
  defaultName?: string;
  /** Emits the rendered signature PNG data URL (or null when empty). */
  onChange: (dataUrl: string | null) => void;
  onNameChange?: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [fontId, setFontId] = useState(SIGNATURE_FONTS[0].id);
  const font = SIGNATURE_FONTS.find((f) => f.id === fontId) ?? SIGNATURE_FONTS[0];

  useEffect(() => { ensureSignatureFont(font.family); }, [font.family]);
  useEffect(() => { if (defaultName) setName(defaultName); }, [defaultName]);

  // Re-render the signature image whenever the name or font changes.
  useEffect(() => {
    let cancelled = false;
    if (!name.trim()) { onChange(null); return; }
    const t = setTimeout(async () => {
      const url = await renderTypedSignature(name.trim(), font.family);
      if (!cancelled) onChange(url);
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [name, font.family, onChange]);

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Type your full name</Label>
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); onNameChange?.(e.target.value); }}
          placeholder="e.g. Hardeep Anand"
          autoComplete="name"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Style:</span>
        {SIGNATURE_FONTS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFontId(f.id)}
            className={`px-2 py-0.5 rounded text-xs border transition-colors ${fontId === f.id ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/10 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Ink-on-paper preview */}
      <div className="rounded-md border bg-white px-4 h-[90px] flex items-center">
        {name.trim() ? (
          <span style={{ fontFamily: `"${font.family}", cursive`, fontSize: 44, color: "#0a1a3a", lineHeight: 1 }}>{name}</span>
        ) : (
          <span className="text-muted-foreground text-sm">Your signature will appear here</span>
        )}
      </div>
    </div>
  );
}
