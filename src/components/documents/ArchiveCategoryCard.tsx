import { motion } from 'framer-motion';
import {
  FileType,
  Compass,
  FileCode,
  BookOpen,
  Stamp,
  MapPin,
  Shield,
  Scale,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  FileType,
  Compass,
  FileCode,
  BookOpen,
  Stamp,
  MapPin,
  Shield,
  Scale,
};

interface ArchiveCategoryCardProps {
  id: string;
  label: string;
  icon: string;
  description: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function ArchiveCategoryCard({
  id,
  label,
  icon,
  description,
  count,
  isSelected,
  onClick,
  index,
}: ArchiveCategoryCardProps) {
  const Icon = iconMap[icon] || FileType;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        'relative p-5 rounded-2xl border text-left transition-all duration-200 w-full',
        isSelected
          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
          : 'bg-card hover:bg-muted/50 border-border hover:border-primary/30'
      )}
    >
      <Icon
        className={cn(
          'h-7 w-7 mb-3',
          isSelected ? 'text-primary-foreground' : 'text-primary'
        )}
      />
      <p className="font-semibold text-sm leading-tight mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{count}</span>
        <span
          className={cn(
            'text-xs',
            isSelected ? 'text-primary-foreground/75' : 'text-muted-foreground'
          )}
        >
          documents
        </span>
      </div>
    </motion.button>
  );
}
