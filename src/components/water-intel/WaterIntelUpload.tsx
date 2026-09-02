import { useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WaterServiceAccount } from '@/lib/water-intel';
import { useIngestWaterBill } from '@/hooks/useWaterIntelligence';

export function WaterIntelUpload({
  propertyId,
  accounts,
}: {
  propertyId: string;
  accounts: WaterServiceAccount[];
}) {
  const ingest = useIngestWaterBill(propertyId);
  const [accountId, setAccountId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchHint, setBatchHint] = useState<string | null>(null);

  return (
    <section className="rounded-3xl border border-dashed border-[#C4A35A]/70 bg-[#fffdf8] p-5" data-testid="water-intel-upload">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Auto ingest</div>
          <h3 className="font-display text-2xl text-[#08271f]">Drop the next PDF</h3>
          <p className="mt-1 max-w-xl text-sm text-[#5c6863]">
            Miami-Dade bills land here and update the executive ledger. Filenames like
            {' '}
            <span className="font-mono text-xs">BILL 06-2026 13235 ALEXANDRIA DR</span>
            {' '}
            auto-match the meter. Select more than one file to ingest a whole cycle.
          </p>
          {batchHint && <p className="mt-2 text-xs font-semibold text-[#08271f]">{batchHint}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">Auto-match account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.building_label || a.service_address} · {a.account_number}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length === 0) return;
                setFileName(files[0].name);
                setBatchHint(files.length > 1 ? `Ingesting ${files.length} bills…` : null);
                let ok = 0;
                let failed = 0;
                for (const file of files) {
                  try {
                    await ingest.mutateAsync({ file, accountId: accountId || null });
                    ok += 1;
                    setFileName(file.name);
                    if (files.length > 1) setBatchHint(`Ingested ${ok} of ${files.length}…`);
                  } catch {
                    failed += 1;
                  }
                }
                if (files.length > 1) {
                  setBatchHint(failed ? `${ok} ingested, ${failed} need an account match.` : `${ok} bills ingested.`);
                }
              }}
            />
            <Button asChild variant="outline" disabled={ingest.isPending}>
              <span>
                {ingest.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileUp className="mr-1.5 h-4 w-4" />}
                {fileName && ingest.isPending ? 'Ingesting…' : 'Upload bill PDFs'}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </section>
  );
}
