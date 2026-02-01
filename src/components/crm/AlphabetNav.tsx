import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AlphabetNavProps {
  availableLetters: string[];
  activeLetter: string | null;
  onLetterClick: (letter: string | null) => void;
}

export function AlphabetNav({
  availableLetters,
  activeLetter,
  onLetterClick,
}: AlphabetNavProps) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="flex flex-wrap gap-0.5 justify-center">
      <Button
        variant={activeLetter === null ? "default" : "ghost"}
        size="sm"
        className="h-7 w-8 text-xs font-medium"
        onClick={() => onLetterClick(null)}
      >
        All
      </Button>
      {alphabet.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        const isActive = activeLetter === letter;

        return (
          <Button
            key={letter}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 w-7 text-xs font-medium p-0",
              !isAvailable && "opacity-30 cursor-not-allowed"
            )}
            disabled={!isAvailable}
            onClick={() => onLetterClick(letter)}
          >
            {letter}
          </Button>
        );
      })}
    </div>
  );
}
