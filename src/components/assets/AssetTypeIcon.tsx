import { Wrench, Circle, Zap, Droplets, Home } from 'lucide-react';
import { AssetType } from '@/hooks/useAssets';
import { cn } from '@/lib/utils';

interface AssetTypeIconProps {
  type: AssetType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap = {
  cleanout: Wrench,
  catch_basin: Circle,
  lift_station: Zap,
  retention_pond: Droplets,
  general_grounds: Home,
};

const colorMap = {
  cleanout: 'text-orange-500 bg-orange-100',
  catch_basin: 'text-gray-600 bg-gray-100',
  lift_station: 'text-yellow-600 bg-yellow-100',
  retention_pond: 'text-blue-500 bg-blue-100',
  general_grounds: 'text-green-600 bg-green-100',
};

const sizeMap = {
  sm: 'h-8 w-8 p-1.5',
  md: 'h-10 w-10 p-2',
  lg: 'h-14 w-14 p-3',
};

const iconSizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

export function AssetTypeIcon({ type, className, size = 'md' }: AssetTypeIconProps) {
  const Icon = iconMap[type] || Circle;
  
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center',
      colorMap[type] || 'text-slate-600 bg-slate-100',
      sizeMap[size],
      className
    )}>
      <Icon className={iconSizeMap[size]} />
    </div>
  );
}
