import React, { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { SectionSheet } from './shared/SectionSheet';
import { VoiceButton } from './shared/VoiceButton';
import { useSectionDraft } from './shared/useSectionDraft';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotesSectionState {
  content: string;
  photos: string[];
}

interface NotesSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** All photos from the day (across all sections) */
  allDayPhotos?: string[];
  onComplete?: () => void;
}

export function NotesSection({ open, onOpenChange, propertyId, allDayPhotos = [], onComplete }: NotesSectionProps) {
  const { state, setState } = useSectionDraft<NotesSectionState>('notes', propertyId, {
    content: '<h2>Today\'s Notes</h2><p></p>',
    photos: [],
  });

  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing today's notes…" }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: state.content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      setState(s => ({ ...s, content: editor.getHTML() }));
    },
  });

  const appendVoiceTranscript = (text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(' ' + text).run();
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop();
        const path = `${user?.id}/notes/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('inspection-photos').upload(path, file);
        if (error) { toast.error('Upload failed'); continue; }
        const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(path);
        // Insert image into editor
        editor?.chain().focus().setImage({ src: publicUrl }).run();
        setState(s => ({ ...s, photos: [...s.photos, publicUrl] }));
      }
    } finally {
      setUploading(false);
    }
  };

  const allPhotos = [...new Set([...allDayPhotos, ...state.photos])];

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Notes & Photos" emoji="📝">
      <div className="flex flex-col h-full">
        {/* Mini toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
          <Toggle size="sm" pressed={editor?.isActive('bold')}
            onPressedChange={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('italic')}
            onPressedChange={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('bulletList')}
            onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle size="sm" pressed={editor?.isActive('orderedList')}
            onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </Toggle>

          <div className="flex-1" />

          {/* Photo insert */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            {uploading
              ? <div className="w-3.5 h-3.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <ImageIcon className="h-3.5 w-3.5" />}
            Insert Photo
          </button>

          {/* Voice */}
          <VoiceButton onTranscript={appendVoiceTranscript} size="sm" />
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto bg-white">
          <EditorContent editor={editor} />
        </div>

        {/* All-day photos grid */}
        {allPhotos.length > 0 && (
          <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              All Photos Today ({allPhotos.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allPhotos.map((url, i) => (
                <img key={i} src={url} alt=""
                  className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-slate-200" />
              ))}
            </div>
          </div>
        )}

        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple
          className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
      </div>
    </SectionSheet>
  );
}
