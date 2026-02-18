import { useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Table as TableIcon, Image as ImageIcon, Highlighter, Minus,
  Sparkles, Loader2, Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Basic editor (backward-compatible) ─────────────────────────────────────

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

const BasicMenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
      <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="Bold"><Bold className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic"><Italic className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline"><UnderlineIcon className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} aria-label="Strike"><Strikethrough className="h-4 w-4" /></Toggle>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="H2"><Heading2 className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="H3"><Heading3 className="h-4 w-4" /></Toggle>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list"><List className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered list"><ListOrdered className="h-4 w-4" /></Toggle>
      <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Blockquote"><Quote className="h-4 w-4" /></Toggle>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <Toggle size="sm" onPressedChange={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} aria-label="Undo"><Undo className="h-4 w-4" /></Toggle>
      <Toggle size="sm" onPressedChange={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} aria-label="Redo"><Redo className="h-4 w-4" /></Toggle>
    </div>
  );
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder }),
      Underline,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-3 py-2',
      },
    },
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });

  return (
    <div className={cn('rounded-md border bg-background', className)}>
      {editable && <BasicMenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextViewer({ content, className }: { content: string; className?: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-sm dark:prose-invert max-w-none' },
    },
  });

  return (
    <div className={cn('rich-text-viewer', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Pro editor ──────────────────────────────────────────────────────────────

export interface ProRichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onAiComplete?: (context: string) => Promise<string>;
  isAiLoading?: boolean;
  minHeight?: string;
}

const TEXT_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#1e3a5f', '#2563EB', '#0EA5E9', '#06B6D4',
  '#059669', '#10B981', '#D97706', '#F59E0B',
  '#DC2626', '#EF4444', '#7C3AED', '#EC4899',
];

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#BBF7D0', '#BAE6FD', '#FBCFE8',
  '#FED7AA', '#DDD6FE', '#FECACA', '#E0E7FF',
];

function ColorPicker({
  editor,
  type,
  onClose,
}: {
  editor: Editor;
  type: 'text' | 'highlight';
  onClose: () => void;
}) {
  const colors = type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;
  return (
    <div className="p-2 grid grid-cols-4 gap-1 w-40">
      {colors.map(color => (
        <button
          key={color}
          className="w-7 h-7 rounded border border-border/40 hover:scale-110 transition-transform cursor-pointer"
          style={{ backgroundColor: color }}
          onClick={() => {
            if (type === 'text') editor.chain().focus().setColor(color).run();
            else editor.chain().focus().setHighlight({ color }).run();
            onClose();
          }}
          title={color}
        />
      ))}
      {type === 'text' && (
        <button
          className="col-span-4 text-xs text-muted-foreground hover:text-foreground mt-1 py-0.5"
          onClick={() => { editor.chain().focus().unsetColor().run(); onClose(); }}
        >
          Reset color
        </button>
      )}
      {type === 'highlight' && (
        <button
          className="col-span-4 text-xs text-muted-foreground hover:text-foreground mt-1 py-0.5"
          onClick={() => { editor.chain().focus().unsetHighlight().run(); onClose(); }}
        >
          Remove highlight
        </button>
      )}
    </div>
  );
}

function ProMenuBar({
  editor,
  onAiComplete,
  isAiLoading,
  onImageUpload,
}: {
  editor: Editor | null;
  onAiComplete?: () => void;
  isAiLoading?: boolean;
  onImageUpload?: () => void;
}) {
  const [openPicker, setOpenPicker] = useState<'text' | 'highlight' | null>(null);

  if (!editor) return null;

  const ToolBtn = ({
    active, onClick, disabled, children, label,
  }: {
    active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; label: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={!!active}
          onPressedChange={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn('h-7 w-7 p-0', active && 'bg-primary/10 text-primary')}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/20 sticky top-0 z-10">
      {/* Headings */}
      <ToolBtn label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Inline formatting */}
      <ToolBtn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Color pickers */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors',
                openPicker === 'text' && 'bg-muted'
              )}
              onClick={() => setOpenPicker(p => p === 'text' ? null : 'text')}
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Text Color</TooltipContent>
        </Tooltip>
        {openPicker === 'text' && (
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50">
            <ColorPicker editor={editor} type="text" onClose={() => setOpenPicker(null)} />
          </div>
        )}
      </div>

      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors',
                openPicker === 'highlight' && 'bg-muted'
              )}
              onClick={() => setOpenPicker(p => p === 'highlight' ? null : 'highlight')}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Highlight</TooltipContent>
        </Tooltip>
        {openPicker === 'highlight' && (
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-xl z-50">
            <ColorPicker editor={editor} type="highlight" onClose={() => setOpenPicker(null)} />
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Alignment */}
      <ToolBtn label="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Lists & blocks */}
      <ToolBtn label="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Table */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="h-7 px-1.5 flex items-center gap-1 rounded hover:bg-muted transition-colors"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-[11px]">Table</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Insert 3×3 Table</TooltipContent>
      </Tooltip>

      {/* Image */}
      {onImageUpload && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-7 px-1.5 flex items-center gap-1 rounded hover:bg-muted transition-colors"
              onClick={onImageUpload}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Image</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Insert Image</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {/* Undo / Redo */}
      <ToolBtn label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="h-3.5 w-3.5" />
      </ToolBtn>

      {/* AI Continue */}
      {onAiComplete && (
        <>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-7 px-2 flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onAiComplete}
                disabled={isAiLoading}
              >
                {isAiLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                <span>AI Continue</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">AI completes your current sentence or paragraph</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

export function ProRichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing…',
  className,
  editable = true,
  onAiComplete,
  isAiLoading,
  minHeight = '400px',
}: ProRichTextEditorProps) {
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {},
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-6 py-5',
          'prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight',
          'prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border',
          'prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3',
          'prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2',
          'prose-p:leading-7 prose-p:my-2 prose-p:text-foreground',
          'prose-li:my-0.5 prose-li:leading-7',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
          'prose-table:border-collapse prose-table:w-full',
          'prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2 prose-th:text-sm prose-th:font-semibold prose-th:text-left',
          'prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-td:text-sm prose-td:align-top',
          'prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto',
          'prose-strong:font-semibold prose-strong:text-foreground',
          'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono',
          'prose-hr:border-border',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });

  const handleAiComplete = useCallback(async () => {
    if (!editor || !onAiComplete) return;
    const { state } = editor;
    const { from } = state.selection;
    const fullText = state.doc.textBetween(0, from, ' ');
    const context = fullText.slice(-600).trim();
    if (!context) return;

    setIsAiProcessing(true);
    try {
      const continuation = await onAiComplete(context);
      if (continuation) {
        editor.chain().focus().insertContent(' ' + continuation).run();
      }
    } finally {
      setIsAiProcessing(false);
    }
  }, [editor, onAiComplete]);

  const handleImageUpload = () => { imageInputRef.current?.click(); };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <TooltipProvider>
      <div className={cn('rounded-lg border border-border bg-background flex flex-col overflow-hidden', className)}>
        {editable && (
          <ProMenuBar
            editor={editor}
            onAiComplete={onAiComplete ? handleAiComplete : undefined}
            isAiLoading={isAiLoading || isAiProcessing}
            onImageUpload={handleImageUpload}
          />
        )}
        <div style={{ minHeight }} className="overflow-y-auto flex-1">
          <EditorContent editor={editor} className="h-full" />
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </div>
    </TooltipProvider>
  );
}
