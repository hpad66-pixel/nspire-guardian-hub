import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCheckOut, useCheckIn, EquipmentAsset } from '@/hooks/useEquipment';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface CheckOutSheetProps {
  asset: EquipmentAsset;
  mode: 'checkout' | 'checkin';
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const CONDITION_OPTIONS = [
  { value: 'same', label: 'Same as before', icon: <CheckCircle2 className="h-5 w-5" />, className: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600' },
  { value: 'minor_issue', label: 'Minor issue', icon: <AlertTriangle className="h-5 w-5" />, className: 'border-amber-500/30 bg-amber-500/5 text-amber-600' },
  { value: 'damaged', label: 'Damaged', icon: <XCircle className="h-5 w-5" />, className: 'border-destructive/30 bg-destructive/5 text-destructive' },
];

export function CheckOutSheet({ asset, mode, open, onOpenChange, onSuccess }: CheckOutSheetProps) {
  const { user } = useAuth();
  const { currentRole } = useUserPermissions();
  const { data: profiles = [] } = useProfiles();
  const checkOut = useCheckOut();
  const checkIn = useCheckIn();
  const isManager = ['admin', 'owner', 'manager'].includes(currentRole ?? '');

  const [checkedOutBy, setCheckedOutBy] = useState(user?.id ?? '');
  const [destination, setDestination] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [conditionOnReturn, setConditionOnReturn] = useState('same');
  const [returnNotes, setReturnNotes] = useState('');

  const activeCheckout = asset.active_checkout;
  const isOverdue = activeCheckout?.expected_return
    ? isPast(parseISO(activeCheckout.expected_return + 'T23:59:59'))
    : false;

  const handleCheckOut = async () => {
    await checkOut.mutateAsync({
      asset_id: asset.id,
      workspace_id: asset.workspace_id,
      checked_out_by: checkedOutBy || (user?.id ?? ''),
      expected_return: expectedReturn || null,
      purpose: purpose || null,
      destination: destination || null,
    });
    onSuccess?.();
    onOpenChange(false);
  };

  const handleCheckIn = async () => {
    if (!activeCheckout) return;
    await checkIn.mutateAsync({
      checkout_id: activeCheckout.id,
      asset_id: asset.id,
      condition_on_return: conditionOnReturn,
      return_notes: returnNotes || null,
    });
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === 'checkout' ? `Check Out ${asset.name}` : `Return ${asset.name}`}
          </SheetTitle>
        </SheetHeader>

        {mode === 'checkout' ? (
          <div className="space-y-5 mt-6">
            {/* Checked out by */}
            <div className="space-y-1.5">
              <Label>Checked out by</Label>
              {isManager ? (
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={checkedOutBy}
                  onChange={e => setCheckedOutBy(e.target.value)}
                >
                  {profiles.map(p => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.full_name ?? p.email ?? p.user_id}
                      {p.user_id === user?.id ? ' (me)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {user?.user_metadata?.full_name?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user?.user_metadata?.full_name ?? user?.email}</span>
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label>Where is it going? <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Riverside project, Site inspection..."
              />
            </div>

            {/* Expected return */}
            <div className="space-y-1.5">
              <Label>Expected return <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="date"
                value={expectedReturn}
                onChange={e => setExpectedReturn(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCheckOut}
              disabled={checkOut.isPending}
            >
              {checkOut.isPending ? 'Checking out...' : 'Check Out'}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 mt-6">
            {/* Current checkout summary */}
            {activeCheckout && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={activeCheckout.checked_out_profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {activeCheckout.checked_out_profile?.full_name?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {activeCheckout.checked_out_profile?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Since {format(parseISO(activeCheckout.checked_out_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {activeCheckout.purpose && (
                  <p className="text-xs text-muted-foreground">Purpose: {activeCheckout.purpose}</p>
                )}
                {activeCheckout.expected_return && (
                  <p className={cn('text-xs font-medium', isOverdue ? 'text-red-600' : 'text-muted-foreground')}>
                    Expected back: {format(parseISO(activeCheckout.expected_return), 'MMM d, yyyy')}
                    {isOverdue && ' — Overdue'}
                  </p>
                )}
              </div>
            )}

            {/* Condition on return */}
            <div className="space-y-2">
              <Label>Condition on return</Label>
              <div className="grid grid-cols-3 gap-2">
                {CONDITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setConditionOnReturn(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium text-center transition-all',
                      conditionOnReturn === opt.value
                        ? opt.className + ' border-current'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue description if not same */}
            {conditionOnReturn !== 'same' && (
              <div className="space-y-1.5">
                <Label>Describe the issue briefly</Label>
                <Textarea
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  rows={3}
                  placeholder="What happened to the equipment?"
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleCheckIn}
              disabled={checkIn.isPending}
            >
              {checkIn.isPending ? 'Returning...' : 'Return Equipment'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
