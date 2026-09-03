import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProjectMentionCandidates, type ProjectMentionCandidate } from "@/hooks/useProjectTeam";

interface MentionTextareaProps {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MentionTextarea({
  projectId,
  value,
  onChange,
  onMentionsChange,
  placeholder,
  rows = 2,
  className,
  onKeyDown,
}: MentionTextareaProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, string>>(new Map()); // userId -> name
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [], isFetching } = useProjectMentionCandidates(projectId, mentionQuery);

  const getInitials = (name: string | null) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    const retainedMentions = new Map(
      Array.from(mentionedUsers.entries()).filter(([, name]) => newValue.includes(`@${name}`)),
    );
    if (retainedMentions.size !== mentionedUsers.size) {
      setMentionedUsers(retainedMentions);
      onMentionsChange?.(Array.from(retainedMentions.keys()));
    }

    // Check if we're in a mention context
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex >= 0) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only trigger if @ is at start or after whitespace, and no space in query
      if ((charBefore === " " || charBefore === "\n" || atIndex === 0) && !/\s/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(atIndex);
        setSelectedIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  }, [mentionedUsers, onChange, onMentionsChange]);

  const insertMention = useCallback((profile: ProjectMentionCandidate) => {
    const name = profile.full_name || profile.email || "Unknown";
    const before = value.slice(0, mentionStartIndex);
    const after = value.slice(mentionStartIndex + (mentionQuery?.length ?? 0) + 1);
    const newValue = `${before}@${name} ${after}`;
    onChange(newValue);
    setMentionQuery(null);

    const newMentioned = new Map(mentionedUsers);
    newMentioned.set(profile.user_id, name);
    setMentionedUsers(newMentioned);
    onMentionsChange?.(Array.from(newMentioned.keys()));

    // Refocus textarea
    setTimeout(() => {
      const pos = mentionStartIndex + name.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }, [value, mentionStartIndex, mentionQuery, onChange, mentionedUsers, onMentionsChange]);

  const handleKeyDownInternal = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  }, [mentionQuery, suggestions, selectedIndex, insertMention, onKeyDown]);

  // Reset mentioned users when value is cleared
  useEffect(() => {
    if (!value) {
      setMentionedUsers(new Map());
      onMentionsChange?.([]);
    }
  }, [value, onMentionsChange]);

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        rows={rows}
        className={cn("text-sm resize-none", className)}
      />

      {/* Mention dropdown */}
      {mentionQuery !== null && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full mb-1 left-0 w-full z-50 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          <div className="p-1">
            <p className="text-[10px] text-muted-foreground px-2 py-1 font-medium">Tag a team member</p>
            {isFetching && suggestions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Finding project team…</p>
            ) : suggestions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs font-medium">No project team member found</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Add them under People &amp; Team first, then tag them here.</p>
              </div>
            ) : suggestions.map((profile, i) => (
              <button
                key={profile.user_id}
                type="button"
                onClick={() => insertMention(profile)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors",
                  i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{profile.full_name || "Unnamed"}</p>
                  {profile.email && (
                    <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 text-[9px]">{profile.access_source}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mentioned users indicator */}
      {mentionedUsers.size > 0 && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Tagged:</span>
          {Array.from(mentionedUsers.values()).map((name, i) => (
            <span key={i} className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              @{name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
