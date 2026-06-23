/**
 * EditorToolsBar — Find & Replace + a custom dictionary for the TipTap ProRichText
 * editor. Native browser spell-check (red underlines, right-click suggestions, and
 * "Add to Dictionary") is enabled on the editor itself; this bar adds find/replace
 * and a saved-terms glossary you can quick-insert and reuse across meetings.
 */
import { useCallback, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Replace, BookMarked, ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { toast } from "sonner";

const DICT_KEY = "buildos-minutes-dictionary";
const readDict = (): string[] => { try { return JSON.parse(localStorage.getItem(DICT_KEY) || "[]"); } catch { return []; } };
const writeDict = (w: string[]) => { try { localStorage.setItem(DICT_KEY, JSON.stringify(w)); } catch { /* ignore */ } };

type Match = { from: number; to: number };

export function EditorToolsBar({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [idx, setIdx] = useState(0);
  const [dict, setDict] = useState<string[]>(readDict);
  const [term, setTerm] = useState("");

  const findMatches = useCallback((q: string): Match[] => {
    const out: Match[] = [];
    if (!editor || !q) return out;
    const needle = q.toLowerCase();
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const hay = node.text.toLowerCase();
        let i = hay.indexOf(needle);
        while (i !== -1) { out.push({ from: pos + i, to: pos + i + q.length }); i = hay.indexOf(needle, i + q.length); }
      }
      return true;
    });
    return out;
  }, [editor]);

  // Re-derives on each editor transaction (ProRichTextEditor re-renders on update).
  const matches = useMemo(() => findMatches(query), [findMatches, query, editor?.state?.doc?.content?.size]);

  const goTo = (i: number) => {
    const m = findMatches(query);
    if (!editor || !m.length) return;
    const n = ((i % m.length) + m.length) % m.length;
    setIdx(n);
    editor.chain().setTextSelection({ from: m[n].from, to: m[n].to }).scrollIntoView().run();
  };

  const replaceOne = () => {
    if (!editor) return;
    const m = findMatches(query);
    if (!m.length) { toast.info("No matches"); return; }
    const cur = m[Math.min(idx, m.length - 1)];
    editor.chain().insertContentAt({ from: cur.from, to: cur.to }, replaceText).run();
  };

  const replaceAll = () => {
    if (!editor) return;
    const m = findMatches(query);
    if (!m.length) { toast.info("No matches"); return; }
    const chain = editor.chain();
    for (let i = m.length - 1; i >= 0; i--) chain.insertContentAt({ from: m[i].from, to: m[i].to }, replaceText); // last→first keeps positions valid
    chain.run();
    toast.success(`Replaced ${m.length} occurrence${m.length === 1 ? "" : "s"}.`);
  };

  const addTerm = () => {
    const t = term.trim();
    if (!t) return;
    if (!dict.some((x) => x.toLowerCase() === t.toLowerCase())) {
      const next = [...dict, t].sort((a, b) => a.localeCompare(b));
      setDict(next); writeDict(next);
    }
    setTerm("");
  };
  const removeTerm = (t: string) => { const next = dict.filter((x) => x !== t); setDict(next); writeDict(next); };
  const insertTerm = (t: string) => editor?.chain().focus().insertContent(t + " ").run();

  if (!editor) return null;

  return (
    <div className="border-b bg-muted/20">
      <div className="flex items-center gap-1 px-2 py-1">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen((o) => !o)}>
          <Search className="h-3.5 w-3.5 mr-1" /> Find &amp; Replace
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <BookMarked className="h-3.5 w-3.5 mr-1" /> Dictionary{dict.length > 0 && <span className="ml-1 text-muted-foreground">({dict.length})</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <p className="text-xs text-muted-foreground mb-2">
              Saved terms you reuse across minutes — click to insert. Tip: right-click a red-underlined word and choose
              <strong> "Add to Dictionary"</strong> to teach your browser for spell-check.
            </p>
            <div className="flex gap-1 mb-2">
              <Input value={term} onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTerm(); } }}
                placeholder="Add a term…" className="h-8" />
              <Button size="sm" className="h-8" onClick={addTerm}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {dict.length === 0 && <p className="text-xs text-muted-foreground">No saved terms yet.</p>}
              {dict.map((t) => (
                <div key={t} className="flex items-center justify-between text-sm group">
                  <button type="button" className="hover:underline text-left flex-1 truncate" onClick={() => insertTerm(t)}>{t}</button>
                  <button type="button" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTerm(t)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setIdx(0); }} placeholder="Find" className="h-8 w-40" />
          <span className="text-xs text-muted-foreground w-14 text-center">{matches.length ? `${Math.min(idx + 1, matches.length)}/${matches.length}` : "0/0"}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(idx - 1)} disabled={!matches.length}><ChevronUp className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goTo(idx + 1)} disabled={!matches.length}><ChevronDown className="h-4 w-4" /></Button>
          <Input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with" className="h-8 w-40" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={replaceOne} disabled={!matches.length}>Replace</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={replaceAll} disabled={!matches.length}><Replace className="h-3.5 w-3.5 mr-1" />All</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
