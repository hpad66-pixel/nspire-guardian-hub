import { useMemo, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gallons, money } from '@/lib/water-intel';
import type { WaterBill, WaterServiceAccount } from '@/lib/water-intel';
import { WaterIntelBillPreview } from './WaterIntelBillPreview';

function fmt(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : '—';
}

export function WaterIntelBillLedger({
  bills,
  accounts,
}: {
  bills: WaterBill[];
  accounts: WaterServiceAccount[];
}) {
  const [source, setSource] = useState<'ocr' | 'all'>('ocr');
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const rows = useMemo(() => {
    const filtered = source === 'ocr'
      ? bills.filter((b) => b.source === 'ocr' || b.source === 'upload')
      : bills;
    return [...filtered].sort((a, b) => String(b.bill_period_start).localeCompare(String(a.bill_period_start)));
  }, [bills, source]);

  const preview = rows.find((b) => b.id === openId) ?? bills.find((b) => b.id === openId) ?? null;
  const ocrCount = bills.filter((b) => b.source === 'ocr' || b.source === 'upload').length;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dedbd1] bg-white shadow-sm" data-testid="water-bill-ledger">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#dedbd1] px-5 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Ingested statements</div>
          <h3 className="font-display text-2xl text-[#08271f]">Every bill on the ledger</h3>
          <p className="mt-1 text-sm text-[#5c6863]">
            {ocrCount} OCR/upload statements · {bills.length} total including trend-history months. Click any row for a quick view.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={source === 'ocr' ? 'default' : 'outline'} onClick={() => setSource('ocr')}>
            Latest cycle
          </Button>
          <Button size="sm" variant={source === 'all' ? 'default' : 'outline'} onClick={() => setSource('all')} data-testid="water-bills-show-all">
            All years
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#8a8478]">
          No statements in this filter. Upload a WASD PDF or switch to All years.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-[#F7F4EC] text-[11px] uppercase tracking-wide text-[#8a8478]">
              <tr>
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-3 py-3 font-semibold">Building / account</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 text-right font-semibold">Gallons</th>
                <th className="px-3 py-3 text-right font-semibold">Current</th>
                <th className="px-3 py-3 text-right font-semibold">Amount due</th>
                <th className="px-5 py-3 text-right font-semibold">View</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const acct = byId.get(b.account_id);
                return (
                  <tr key={b.id} className="border-t border-[#efe9da]">
                    <td className="px-5 py-3 font-mono text-xs">{fmt(b.bill_period_start)} – {fmt(b.bill_period_end)}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#08271f]">{acct?.building_label || acct?.service_address || 'Account'}</div>
                      <div className="font-mono text-xs text-[#8a8478]">{acct?.account_number}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        b.source === 'ocr' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#08271f]/5 text-[#08271f]'
                      }`}>
                        {b.source}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{gallons(b.consumption_gallons)}</td>
                    <td className="px-3 py-3 text-right font-mono">{money(b.current_charges, 2)}</td>
                    <td className="px-3 py-3 text-right font-mono">{money(b.amount_due, 2)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(b.id)}>
                        <FileSearch className="mr-1 h-4 w-4" /> Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(next) => { if (!next) setOpenId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Statement quick view</DialogTitle>
          </DialogHeader>
          {preview && (
            <WaterIntelBillPreview bill={preview} account={byId.get(preview.account_id)} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
