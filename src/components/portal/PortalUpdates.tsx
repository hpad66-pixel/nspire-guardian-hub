import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { format } from 'date-fns';

interface ClientUpdate {
  id: string;
  title: string;
  body: string;
  photo_url?: string | null;
  update_type?: string | null;
  created_at: string;
}

interface PortalUpdatesProps {
  updates: ClientUpdate[];
  isLoading?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  progress:  'Progress',
  milestone: 'Milestone',
  issue:     'Issue',
  general:   'Update',
};

export function PortalUpdates({ updates, isLoading }: PortalUpdatesProps) {
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden animate-pulse">
            <div className="aspect-video bg-white/5" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-white/5 rounded w-1/4" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-3 bg-white/5 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Camera size={28} className="text-slate-500" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">No updates yet</p>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Job site photos and progress updates appear here. Your contractor will post as work moves forward.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-bold text-white">Project Updates</h1>

      {updates.map((update, i) => (
        <motion.article
          key={update.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-white/[0.06] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {/* Photo */}
          {update.photo_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={update.photo_url}
                alt={update.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-4 space-y-2">
            {/* Date + type */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {format(new Date(update.created_at), 'MMMM d, yyyy')}
              </span>
              {update.update_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 font-medium uppercase tracking-wide">
                  {TYPE_LABELS[update.update_type] ?? update.update_type}
                </span>
              )}
            </div>

            {/* Title */}
            <h2 className="font-bold text-white text-base leading-snug">{update.title}</h2>

            {/* Body */}
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{update.body}</p>
          </div>
        </motion.article>
      ))}

      <div className="h-4" />
    </div>
  );
}
