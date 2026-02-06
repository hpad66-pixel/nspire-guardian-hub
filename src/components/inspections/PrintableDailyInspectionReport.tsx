import { forwardRef } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DailyInspection, DailyInspectionItem, WEATHER_OPTIONS } from '@/hooks/useDailyInspections';
import { Asset, ASSET_TYPE_LABELS } from '@/hooks/useAssets';
import { cn } from '@/lib/utils';

interface PrintableDailyInspectionReportProps {
  inspection: DailyInspection;
  items: DailyInspectionItem[];
  assets: Asset[];
  propertyName: string;
  inspectorName: string;
  id?: string;
}

export const PrintableDailyInspectionReport = forwardRef<
  HTMLDivElement,
  PrintableDailyInspectionReportProps
>(({ inspection, items, assets, propertyName, inspectorName, id }, ref) => {
  const weather = WEATHER_OPTIONS.find(w => w.value === inspection.weather);
  
  const okCount = items.filter(i => i.status === 'ok').length;
  const attentionCount = items.filter(i => i.status === 'needs_attention').length;
  const defectCount = items.filter(i => i.status === 'defect_found').length;

  const getAssetName = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.name || 'Unknown Asset';
  };

  const getAssetType = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return '';
    return ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ok':
        return { 
          label: 'OK', 
          bgColor: 'bg-emerald-50', 
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          Icon: CheckCircle2 
        };
      case 'needs_attention':
        return { 
          label: 'Needs Attention', 
          bgColor: 'bg-amber-50', 
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          Icon: AlertTriangle 
        };
      case 'defect_found':
        return { 
          label: 'Defect Found', 
          bgColor: 'bg-red-50', 
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          Icon: XCircle 
        };
      default:
        return { 
          label: 'Unknown', 
          bgColor: 'bg-gray-50', 
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          Icon: CheckCircle2 
        };
    }
  };

  const reportId = inspection.id.slice(0, 8).toUpperCase();
  const inspectionDate = parseISO(inspection.inspection_date);
  const completedAt = inspection.completed_at ? parseISO(inspection.completed_at) : new Date();

  return (
    <div
      ref={ref}
      id={id}
      className="bg-white text-gray-900 p-8 max-w-4xl mx-auto"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              DAILY GROUNDS INSPECTION
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Report #{reportId}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {propertyName}
            </div>
            <div className="text-sm text-gray-500">
              {format(inspectionDate, 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Inspector
          </p>
          <p className="font-semibold text-gray-900">{inspectorName}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Date
          </p>
          <p className="font-semibold text-gray-900">
            {format(inspectionDate, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Weather
          </p>
          <p className="font-semibold text-gray-900">
            {weather ? `${weather.icon} ${weather.label}` : 'Not recorded'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Completed
          </p>
          <p className="font-semibold text-gray-900">
            {format(completedAt, 'h:mm a')}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Inspection Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-emerald-600">{okCount}</p>
            <p className="text-sm font-medium text-emerald-700 mt-1">OK</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-amber-600">{attentionCount}</p>
            <p className="text-sm font-medium text-amber-700 mt-1">Needs Attention</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-red-600">{defectCount}</p>
            <p className="text-sm font-medium text-red-700 mt-1">Defects Found</p>
          </div>
        </div>
      </div>

      {/* Asset Checks */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Asset Checks ({items.length})
        </h2>
        <div className="space-y-3">
          {items.map((item) => {
            const config = getStatusConfig(item.status);
            const { Icon } = config;
            
            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-4',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.textColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">
                        {getAssetName(item.asset_id)}
                      </span>
                      <span className={cn('text-sm font-medium', config.textColor)}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{getAssetType(item.asset_id)}</p>
                    
                    {item.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-medium">Notes:</span> {item.notes}
                      </p>
                    )}
                    
                    {item.defect_description && (
                      <p className="text-sm text-red-700 mt-2">
                        <span className="font-medium">Defect:</span> {item.defect_description}
                      </p>
                    )}

                    {item.photo_urls && item.photo_urls.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {item.photo_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* General Notes */}
      {inspection.general_notes && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            General Notes
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            {inspection.general_notes_html ? (
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: inspection.general_notes_html }} 
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{inspection.general_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Attachments */}
      {inspection.attachments && inspection.attachments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Attachments ({inspection.attachments.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {inspection.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
              >
                Attachment {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-200 pt-6 mt-8">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-500 mb-1">Submitted</p>
            <p className="text-sm font-medium text-gray-900">
              {format(completedAt, 'MMMM d, yyyy • h:mm a')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-4">Inspector Signature</p>
            <div className="border-b border-gray-400 w-48 mb-1"></div>
            <p className="text-sm text-gray-600">{inspectorName}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintableDailyInspectionReport.displayName = 'PrintableDailyInspectionReport';
