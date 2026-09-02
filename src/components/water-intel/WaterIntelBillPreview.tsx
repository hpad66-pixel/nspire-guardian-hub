import { gallons, money } from '@/lib/water-intel';
import type { WaterBill, WaterServiceAccount } from '@/lib/water-intel';
import { statementDocumentPath } from '@/lib/water-intel/glorietaArchive';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function WaterIntelBillPreview({
  bill,
  account,
}: {
  bill: WaterBill;
  account?: WaterServiceAccount;
}) {
  const doc = bill.document_url || statementDocumentPath(account?.account_number ?? '', bill.bill_period_start);
  const rows: Array<[string, string]> = [
    ['Account', account?.account_number ?? '—'],
    ['Meter', account?.meter_number ?? '—'],
    ['Service address', account?.service_address ?? '—'],
    ['Building', account?.building_label ?? '—'],
    ['Period', `${fmtDate(bill.bill_period_start)} – ${fmtDate(bill.bill_period_end)}`],
    ['Billing date', fmtDate(bill.billing_date)],
    ['Due date', fmtDate(bill.due_date)],
    ['Previous balance', money(bill.previous_balance, 2)],
    ['Current charges', money(bill.current_charges, 2)],
    ['Amount due', money(bill.amount_due, 2)],
    ['Amount paid', money(bill.amount_paid, 2)],
    ['Water', money(bill.water_charges, 2)],
    ['Sewer', money(bill.sewer_charges, 2)],
    ['Other fees', money(bill.other_fees, 2)],
    ['Consumption', gallons(bill.consumption_gallons)],
    ['Readings', `${bill.prior_reading ?? '—'} → ${bill.current_reading ?? '—'}`],
    ['Days of service', String(bill.days_of_service ?? '—')],
    ['Source', String(bill.source ?? '—')],
    ['Status', String(bill.status ?? '—')],
    ['Estimated', bill.is_estimated ? 'Yes' : 'No'],
  ];

  return (
    <div className="space-y-4" data-testid="water-bill-preview">
      <div className="rounded-2xl bg-[#08271f] px-5 py-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d5aa52]">
          Miami-Dade WASD · statement
        </div>
        <div className="mt-1 font-display text-2xl">
          {account?.building_label || account?.service_address || 'Service account'}
        </div>
        <div className="mt-1 font-mono text-sm text-[#b8c5c0]">{account?.account_number}</div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[#8a8478]">{k}</dt>
            <dd className="font-medium text-[#08271f]">{v}</dd>
          </div>
        ))}
      </dl>
      {bill.notes && <p className="text-sm text-[#5c6863]">{bill.notes}</p>}
      {doc && (
        <a
          href={doc}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm font-semibold text-[#1D6FE8] underline"
        >
          Open statement backup
        </a>
      )}
    </div>
  );
}
