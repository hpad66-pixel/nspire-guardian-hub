import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useSearchProfiles, Profile } from '@/hooks/useProfiles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

export function MentionInput({ value, onChange, onKeyDown, placeholder, className }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, Profile>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { data: profiles = [] } = useSearchProfiles(searchTerm);
  
  // Extract mentioned user IDs from current value
  const extractMentionedUserIds = useCallback((text: string): string[] => {
    const userIds: string[] = [];
    mentionedUsers.forEach((profile, displayName) => {
      if (text.includes(`@${displayName}`)) {
        userIds.push(profile.user_id);
      }
    });
    return userIds;
  }, [mentionedUsers]);
  
  // Find the @ trigger position
  const findMentionTrigger = (text: string, cursor: number): { start: number; query: string } | null => {
    let start = cursor - 1;
    while (start >= 0 && text[start] !== '@' && text[start] !== ' ' && text[start] !== '\n') {
      start--;
    }
    
    if (start >= 0 && text[start] === '@') {
      const query = text.slice(start + 1, cursor);
      // Don't trigger if there's a space before @ (unless it's the start)
      if (start === 0 || text[start - 1] === ' ' || text[start - 1] === '\n') {
        return { start, query };
      }
    }
    return null;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPosition(cursor);
    
    const trigger = findMentionTrigger(newValue, cursor);
    
    if (trigger) {
      setSearchTerm(trigger.query);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
    
    onChange(newValue, extractMentionedUserIds(newValue));
  };
  
  const insertMention = (profile: Profile) => {
    const displayName = profile.full_name || profile.email || 'Unknown';
    const trigger = findMentionTrigger(value, cursorPosition);
    
    if (trigger) {
      const before = value.slice(0, trigger.start);
      const after = value.slice(cursorPosition);
      const newValue = `${before}@${displayName} ${after}`;
      
      // Track this mention
      const newMentionedUsers = new Map(mentionedUsers);
      newMentionedUsers.set(displayName, profile);
      setMentionedUsers(newMentionedUsers);
      
      onChange(newValue, [...extractMentionedUserIds(newValue), profile.user_id]);
      setShowSuggestions(false);
      
      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = trigger.start + displayName.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    }
  };
  
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && profiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % profiles.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + profiles.length) % profiles.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(profiles[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    
    onKeyDown?.(e);
  };
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        className={cn("min-h-[60px] resize-none", className)}
      />
      
      {showSuggestions && profiles.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute bottom-full left-0 mb-1 w-full max-h-48 overflow-y-auto bg-popover border rounded-md shadow-lg z-50"
        >
          <div className="p-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Tag a user</p>
            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => insertMention(profile)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left hover:bg-accent",
                  index === selectedIndex && "bg-accent"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(profile.full_name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.full_name || 'Unknown'}
                  </p>
                  {profile.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
