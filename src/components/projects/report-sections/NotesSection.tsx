import { useState, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';

const QUICK_FORMAT_CHIPS = [
  { label: '☐ Action Item', template: '<li><strong>[ACTION ITEM]</strong> — </li>' },
  { label: '❓ Owner RFI', template: '<li><strong>[OWNER RFI]</strong> — </li>' },
  { label: '🔨 Punch Item', template: '<li><strong>[PUNCH ITEM]</strong> — </li>' },
  { label: '📌 Follow-up Required', template: '<li><strong>[FOLLOW-UP REQUIRED]</strong> — </li>' },
  { label: 'ℹ️ For Information Only', template: '<li><strong>[FYI]</strong> — </li>' },
];

interface NotesSectionProps {
  open: boolean;
  onClose: () => void;
  notesHtml: string;
  notesPlain: string;
  allPhotos: string[];
  onChange: (html: string, plain: string) => void;
  projectId: string;
}

export function NotesSection({ open, onClose, notesHtml, notesPlain, allPhotos, onChange, projectId }: NotesSectionProps) {
  const [content, setContent] = useState(notesHtml);
  const [photos, setPhotos] = useState<{ id: string; url: string; caption?: string; timestamp: Date }[]>(
    allPhotos.map(url => ({ id: url, url, timestamp: new Date() }))
  );

  const handleChange = (html: string) => {
    setContent(html);
    const div = document.createElement('div');
    div.innerHTML = html;
    onChange(html, div.textContent || div.innerText || '');
  };

  const handleVoice = useCallback((transcript: string) => {
    const appended = content ? `${content}<p>${transcript}</p>` : `<p>${transcript}</p>`;
    handleChange(appended);
  }, [content]);

  const appendChip = (template: string) => {
    const ul = content.includes('<ul>') ? content.replace('</ul>', `${template}</ul>`) : `${content}<ul>${template}</ul>`;
    handleChange(ul);
  };

  const handleDone = () => {
    onChange(content, (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || d.innerText || ''; })());
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-semibold">📝 Notes & Open Items</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={handleDone}><Check className="h-4 w-4 mr-1" /> Done</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2">
            <VoiceDictation onTranscript={handleVoice} />
            <span className="text-sm text-muted-foreground">Voice dictation</span>
          </div>

          <RichTextEditor content={content} onChange={handleChange} placeholder="General notes, action items, follow-ups..." />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Format</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_FORMAT_CHIPS.map(chip => (
                <button key={chip.label} type="button" onClick={() => appendChip(chip.template)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted transition-colors">
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {allPhotos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photo Gallery — All Report Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {allPhotos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
