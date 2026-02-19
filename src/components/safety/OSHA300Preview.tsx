import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useOSHA300Data } from '@/hooks/useSafety';
import { incidentToOSHA300Row } from '@/utils/osha300Generator';
import { Printer } from 'lucide-react';

interface OSHA300PreviewProps {
  year: number;
  establishmentName?: string;
  city?: string;
  state?: string;
}

export function OSHA300Preview({ year, establishmentName, city, state }: OSHA300PreviewProps) {
  const { data: incidents = [] } = useOSHA300Data(year);
  const rows = incidents.map(incidentToOSHA300Row);

  const totals = {
    deaths: rows.filter(r => r.death).length,
    daysAway: rows.filter(r => r.daysAway).length,
    transfer: rows.filter(r => r.jobTransfer).length,
    other: rows.filter(r => r.otherRecordable).length,
    totalDaysAway: rows.reduce((s, r) => s + r.daysAwayCount, 0),
    totalTransfer: rows.reduce((s, r) => s + r.daysTransferCount, 0),
    injuries: rows.filter(r => r.injuryType === 'injury').length,
    skinDisorder: rows.filter(r => r.injuryType === 'skin_disorder').length,
    respiratory: rows.filter(r => r.injuryType === 'respiratory').length,
    poisoning: rows.filter(r => r.injuryType === 'poisoning').length,
    hearingLoss: rows.filter(r => r.injuryType === 'hearing_loss').length,
    otherIllness: rows.filter(r => r.injuryType === 'other_illness').length,
  };

  return (
    <div>
      {/* Print button — hidden in print */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Form — will be printed */}
      <div id="osha-300-form" className="bg-white text-black font-sans text-[10px]" style={{ minWidth: 900 }}>
        {/* Header */}
        <div className="border-2 border-black p-2 mb-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider">U.S. Department of Labor</p>
              <h1 className="text-base font-black mt-0.5">OSHA's Form 300</h1>
              <p className="font-semibold">Log of Work-Related Injuries and Illnesses</p>
              <p className="text-[9px] mt-1 max-w-[360px] text-gray-600">
                You must record information about every work-related death; every nonfatal work-related illness; and those work-related injuries that involve loss of consciousness, restricted work activity or job transfer, days away from work, or medical treatment beyond first aid.
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[9px] font-bold">Year: {year}</p>
              <p className="text-[9px]">Form approved OMB no. 1218-0176</p>
            </div>
          </div>

          {/* Establishment info */}
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] font-semibold">Establishment name</p>
              <div className="border-b border-black pb-0.5 mt-0.5">
                <p>{establishmentName ?? '________________________________'}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold">City</p>
              <div className="border-b border-black pb-0.5 mt-0.5">
                <p>{city ?? '________________________'}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold">State</p>
              <div className="border-b border-black pb-0.5 mt-0.5">
                <p>{state ?? '____'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-1 py-1 text-left w-12" rowSpan={2}>A<br /><span className="font-normal">Case No.</span></th>
              <th className="border border-black px-1 py-1 text-left w-28" rowSpan={2}>B<br /><span className="font-normal">Employee Name</span></th>
              <th className="border border-black px-1 py-1 text-left w-20" rowSpan={2}>C<br /><span className="font-normal">Job Title</span></th>
              <th className="border border-black px-1 py-1 text-left w-16" rowSpan={2}>D<br /><span className="font-normal">Date of Injury</span></th>
              <th className="border border-black px-1 py-1 text-left w-32" rowSpan={2}>E<br /><span className="font-normal">Where Event Occurred</span></th>
              <th className="border border-black px-1 py-1 text-left" rowSpan={2}>F<br /><span className="font-normal">Describe Injury or Illness</span></th>
              <th className="border border-black px-1 py-1 text-center" colSpan={4}>Classify the Case</th>
              <th className="border border-black px-1 py-1 text-center" colSpan={2}>Days</th>
              <th className="border border-black px-1 py-1 text-center" colSpan={6}>Injury or Illness Type</th>
            </tr>
            <tr className="bg-gray-100">
              <th className="border border-black px-1 py-1 text-center w-8">G<br /><span className="font-normal text-[8px]">Death</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">H<br /><span className="font-normal text-[8px]">Days Away</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">I<br /><span className="font-normal text-[8px]">Transfer</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">J<br /><span className="font-normal text-[8px]">Other</span></th>
              <th className="border border-black px-1 py-1 text-center w-10">K<br /><span className="font-normal text-[8px]">Away</span></th>
              <th className="border border-black px-1 py-1 text-center w-10">L<br /><span className="font-normal text-[8px]">Transfer</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M1<br /><span className="font-normal text-[8px]">Injury</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M2<br /><span className="font-normal text-[8px]">Skin</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M3<br /><span className="font-normal text-[8px]">Resp.</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M4<br /><span className="font-normal text-[8px]">Poison</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M5<br /><span className="font-normal text-[8px]">Hearing</span></th>
              <th className="border border-black px-1 py-1 text-center w-8">M6<br /><span className="font-normal text-[8px]">Other Ill.</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={18} className="border border-black px-2 py-4 text-center text-gray-500">
                  No OSHA recordable incidents for {year}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="border border-black px-1 py-1">{row.caseNo}</td>
                <td className="border border-black px-1 py-1">{row.employeeName}</td>
                <td className="border border-black px-1 py-1">{row.jobTitle}</td>
                <td className="border border-black px-1 py-1">
                  {row.dateOfInjury ? format(new Date(row.dateOfInjury), 'MM/dd') : ''}
                </td>
                <td className="border border-black px-1 py-1">{row.whereEvent}</td>
                <td className="border border-black px-1 py-1">{row.describeInjury}</td>
                <td className="border border-black px-1 py-1 text-center">{row.death ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.daysAway ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.jobTransfer ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.otherRecordable ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.daysAwayCount || ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.daysTransferCount || ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'injury' ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'skin_disorder' ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'respiratory' ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'poisoning' ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'hearing_loss' ? '✓' : ''}</td>
                <td className="border border-black px-1 py-1 text-center">{row.injuryType === 'other_illness' ? '✓' : ''}</td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="font-bold bg-gray-100">
              <td colSpan={6} className="border border-black px-1 py-1 text-right">Totals →</td>
              <td className="border border-black px-1 py-1 text-center">{totals.deaths || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.daysAway || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.transfer || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.other || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.totalDaysAway || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.totalTransfer || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.injuries || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.skinDisorder || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.respiratory || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.poisoning || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.hearingLoss || ''}</td>
              <td className="border border-black px-1 py-1 text-center">{totals.otherIllness || ''}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-[8px] text-gray-500 mt-2 px-1">
          Public reporting burden for this collection of information is estimated to average 14 minutes per response. Persons are not required to respond to the collection of information unless it displays a currently valid OMB control number. If you have any comments about these estimates or any other aspects of this data collection, contact: US Department of Labor, OSHA Office of Statistics, Room N-3644, 200 Constitution Ave., NW, Washington, DC 20210.
        </p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #osha-300-form, #osha-300-form * { visibility: visible; }
          #osha-300-form { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: landscape; margin: 0.5in; }
        }
      `}</style>
    </div>
  );
}
