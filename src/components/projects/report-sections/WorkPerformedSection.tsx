import { useState, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Mic } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';

const QUICK_SNIPPETS: Record<string, string> = {
  'Excavation': '<li>Excavation: </li>',
  'Installation': '<li>Installation: </li>',
  'Backfill/Compaction': '<li>Backfill and compaction: </li>',
  'Testing': '<li>Testing: </li>',
  'Inspection Passed': '<li>Inspection passed: </li>',
  'Concrete Pour': '<li>Concrete pour: </li>',
  'Framing': '<li>Framing: </li>',
  'Tie-in': '<li>Tie-in at: </li>',
  'Survey': '<li>Survey: </li>',
  'Cleanup': '<li>Site cleanup: </li>',
};

const PLACEHOLDERS: Record<string, string> = {
  water_sewer: 'Installed 120 LF of 8" PVC pipe from Sta. 10+00 to 11+20. Completed tie-in at manhole MH-4. Pressure tested Zone 2 — passed at 150 PSI...',
  building: 'Framed second floor east wing, 8 units. Set 24 window headers. Poured 40 CY of concrete for slab on grade, south bay...',
  electrical: 'Pulled 600A service conduit in Bldg C. Terminated panels E-3 and E-4. Rough-in complete for floors 2-4, units 201-220...',
  stormwater: 'Excavated and installed 200 LF of 24" RCP from Structure S-7 to S-8. Installed headwall at outfall. Seeded disturbed area — 0.3 acres...',
  dredging: 'Dredged 450 CY in Zone B, north quadrant. Spoil transported to Cell 3. Bathymetric survey complete — meeting depth requirements in Zones A and B...',
  consulting: 'Site visit to assess drainage improvements at Building 4. Reviewed as-builts with owner\'s rep. Documented 12 punchlist items...',
  default: 'Describe the work performed today. Include locations, quantities, and any notable progress...',
};

const PROJECT_TYPE_HINT: Record<string, string> = {
  water_sewer: 'Water & Sewer project — document pipe installation, tie-ins, testing, backfill, etc.',
  building: 'Building project — document framing, concrete, MEP rough-in, finishes, etc.',
  electrical: 'Electrical project — document conduit, wiring, panel work, inspections, etc.',
  stormwater: 'Stormwater project — document pipe, structures, grading, seeding, etc.',
  dredging: 'Dredging project — document volumes, zones, transport, bathymetric surveys, etc.',
  consulting: 'Consulting — document site visits, reviews, documentation, recommendations, etc.',
};

interface WorkPerformedSectionProps {
  open: boolean;
  onClose: () => void;
  html: string;
  plainText: string;
  projectType?: string;
  onChange: (html: string, plainText: string) => void;
}

export function WorkPerformedSection({ open, onClose, html, plainText, projectType, onChange }: WorkPerformedSectionProps) {
  const [content, setContent] = useState(html);

  const handleChange = (newHtml: string) => {
    setContent(newHtml);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHtml;
    onChange(newHtml, tempDiv.textContent || tempDiv.innerText || '');
  };

  const handleVoice = useCallback((transcript: string) => {
    const appended = content ? `${content}<p>${transcript}</p>` : `<p>${transcript}</p>`;
    handleChange(appended);
  }, [content]);

  const appendSnippet = (snippet: string) => {
    const ul = content.includes('<ul>') ? content.replace('</ul>', `${snippet}</ul>`) : `${content}<ul>${snippet}</ul>`;
    handleChange(ul);
  };

  const hint = projectType ? PROJECT_TYPE_HINT[projectType] : null;
  const placeholder = PLACEHOLDERS[projectType ?? 'default'] ?? PLACEHOLDERS.default;

  const handleDone = () => {
    onChange(content, (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || d.innerText || ''; })());
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">📋 Work Performed Today</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={handleDone}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {hint && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
              {hint}
            </div>
          )}

          {/* Voice dictation */}
          <div className="flex items-center gap-2">
            <VoiceDictation onTranscript={handleVoice} />
            <span className="text-sm text-muted-foreground">Voice dictation — appends to editor</span>
          </div>

          {/* Rich text editor */}
          <RichTextEditor
            content={content}
            onChange={handleChange}
            placeholder={placeholder}
          />

          {/* Quick add chips */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Add</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(QUICK_SNIPPETS).map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => appendSnippet(QUICK_SNIPPETS[label])}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted transition-colors"
                >
                  + {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
