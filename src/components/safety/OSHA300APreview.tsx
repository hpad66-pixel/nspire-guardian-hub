import { Button } from '@/components/ui/button';
import { useOSHA300ATotals } from '@/hooks/useSafety';
import { Printer } from 'lucide-react';

interface OSHA300APreviewProps {
  year: number;
  establishmentName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  avgEmployees?: number;
  totalHoursWorked?: number;
}

export function OSHA300APreview({
  year,
  establishmentName,
  address,
  city,
  state,
  zip,
  avgEmployees,
  totalHoursWorked,
}: OSHA300APreviewProps) {
  const totals = useOSHA300ATotals(year);

  const total = totals.totalDeaths + totals.totalDaysAway + totals.totalTransfer + totals.totalOtherRecordable;

  return (
    <div>
      {/* Print button */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div id="osha-300a-form" className="bg-white text-black font-sans text-sm max-w-[680px] mx-auto border-2 border-black p-6">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider">U.S. Department of Labor</p>
          <h1 className="text-xl font-black mt-1">OSHA's Form 300A</h1>
          <p className="font-bold text-sm">Summary of Work-Related Injuries and Illnesses</p>
          <p className="text-xs text-gray-600 mt-1">Year {year}</p>
        </div>

        {/* Establishment information */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-700">Establishment Information</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Company name</p>
              <p className="font-semibold border-b border-gray-300 pb-0.5">{establishmentName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Street</p>
              <p className="border-b border-gray-300 pb-0.5">{address ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">City</p>
              <p className="border-b border-gray-300 pb-0.5">{city ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">State</p>
              <p className="border-b border-gray-300 pb-0.5">{state ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Annual avg. # of employees</p>
              <p className="border-b border-gray-300 pb-0.5">{avgEmployees ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total hours worked by all employees</p>
              <p className="border-b border-gray-300 pb-0.5">{totalHoursWorked ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Summary totals */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-700">Summary Totals</p>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                { label: 'Total number of deaths', value: totals.totalDeaths },
                { label: 'Total number of cases with days away from work', value: totals.totalDaysAway },
                { label: 'Total number of cases with job transfer or restriction', value: totals.totalTransfer },
                { label: 'Total number of other recordable cases', value: totals.totalOtherRecordable },
                { label: 'Total number of cases (sum of above)', value: total, bold: true },
              ].map(row => (
                <tr key={row.label} className={row.bold ? 'border-t-2 border-black' : ''}>
                  <td className="border border-gray-300 px-3 py-1.5 text-left">{row.label}</td>
                  <td className={`border border-gray-300 px-3 py-1.5 text-center font-mono w-16 ${row.bold ? 'font-bold' : ''}`}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold mb-1">Number of days away from work</p>
              <p className="border border-gray-300 px-3 py-1.5 text-center font-mono text-sm">
                {totals.totalDaysAwayCount}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Number of days job transfer or restriction</p>
              <p className="border border-gray-300 px-3 py-1.5 text-center font-mono text-sm">
                {totals.totalTransferDays}
              </p>
            </div>
          </div>
        </div>

        {/* Injury and illness types */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-700">Injury and Illness Types</p>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                { label: 'Total number of injuries', value: totals.byType.injuries },
                { label: 'Total number of skin disorders', value: totals.byType.skinDisorder },
                { label: 'Total number of respiratory conditions', value: totals.byType.respiratory },
                { label: 'Total number of poisonings', value: totals.byType.poisoning },
                { label: 'Total number of hearing loss', value: totals.byType.hearingLoss },
                { label: 'Total number of all other illnesses', value: totals.byType.otherIllness },
              ].map(row => (
                <tr key={row.label}>
                  <td className="border border-gray-300 px-3 py-1.5 text-left">{row.label}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center font-mono w-16">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Certification */}
        <div className="border-t-2 border-black pt-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-700">Certification</p>
          <p className="text-xs text-gray-600 mb-4">
            I certify that I have examined this document and that to the best of my knowledge the entries are true, accurate, and complete.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Company executive</p>
              <div className="border-b border-gray-300 h-7 mt-1" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Title</p>
              <div className="border-b border-gray-300 h-7 mt-1" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <div className="border-b border-gray-300 h-7 mt-1" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <div className="border-b border-gray-300 h-7 mt-1" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Signature</p>
            <div className="border-b border-gray-300 h-10" />
          </div>
        </div>

        <p className="text-[9px] text-gray-400 mt-4">
          Post this Summary page from February 1 to April 30 of the year following the year covered by the form. Public reporting burden for this collection of information is estimated to average 58 minutes per response.
        </p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #osha-300a-form, #osha-300a-form * { visibility: visible; }
          #osha-300a-form { position: absolute; left: 0; top: 0; }
          @page { size: portrait; margin: 0.5in; }
        }
      `}</style>
    </div>
  );
}
