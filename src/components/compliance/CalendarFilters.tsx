import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays, List } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'permit_renewal', label: 'Permit Renewal' },
  { value: 'license_expiry', label: 'License Expiry' },
  { value: 'inspection_due', label: 'Inspection Due' },
  { value: 'training_due', label: 'Training Due' },
  { value: 'certification_expiry', label: 'Certification Expiry' },
  { value: 'regulatory_deadline', label: 'Regulatory Deadline' },
  { value: 'reporting_deadline', label: 'Reporting Deadline' },
  { value: 'insurance_renewal', label: 'Insurance Renewal' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'waived', label: 'Waived' },
];

const AGENCIES = [
  { value: 'all', label: 'All Agencies' },
  { value: 'DERM', label: 'DERM' },
  { value: 'HUD', label: 'HUD' },
  { value: 'FDEP', label: 'FDEP' },
  { value: 'OSHA', label: 'OSHA' },
  { value: 'City', label: 'City' },
  { value: 'State Fire Marshal', label: 'State Fire Marshal' },
];

interface Props {
  filters: {
    propertyId?: string;
    category?: string;
    status?: string;
    agency?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  view: 'month' | 'list';
  onViewChange: (view: 'month' | 'list') => void;
}

export function CalendarFilters({ filters, onFilterChange, view, onViewChange }: Props) {
  const { data: properties = [] } = useProperties();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filters.propertyId || 'all'} onValueChange={v => onFilterChange('propertyId', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder="Property" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.category || 'all'} onValueChange={v => onFilterChange('category', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status || 'all'} onValueChange={v => onFilterChange('status', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex-1" />

      <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
        <Button
          size="sm"
          variant={view === 'month' ? 'secondary' : 'ghost'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onViewChange('month')}
        >
          <CalendarDays className="h-3.5 w-3.5 mr-1" />
          Month
        </Button>
        <Button
          size="sm"
          variant={view === 'list' ? 'secondary' : 'ghost'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onViewChange('list')}
        >
          <List className="h-3.5 w-3.5 mr-1" />
          List
        </Button>
      </div>
    </div>
  );
}
