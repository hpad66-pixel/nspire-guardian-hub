import { useState, useRef, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tag...',
  className,
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !value.includes(normalizedTag) && value.length < maxTags) {
      onChange([...value, normalizedTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s.toLowerCase())
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={value.length >= maxTags ? 'Max tags reached' : placeholder}
            disabled={value.length >= maxTags}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || value.length >= maxTags}
            className="h-8 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 p-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto">
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions as chips when input is empty */}
      {!inputValue && suggestions.length > 0 && value.length < maxTags && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Suggested:</span>
          {suggestions
            .filter((s) => !value.includes(s.toLowerCase()))
            .slice(0, 5)
            .map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
