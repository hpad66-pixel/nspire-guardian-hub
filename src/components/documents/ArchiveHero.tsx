import { motion } from 'framer-motion';
import { Archive, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ArchiveHeroProps {
  canUpload: boolean;
  onUpload: () => void;
  totalCount: number;
}

export function ArchiveHero({ canUpload, onUpload, totalCount }: ArchiveHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 mb-8"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 opacity-10">
        <Lock className="h-32 w-32 text-amber-400" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25"
            >
              <Archive className="h-7 w-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Property Archives</h1>
              <p className="text-slate-400">Permanent records. Always available.</p>
            </div>
          </div>

          {totalCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center"
            >
              <p className="text-3xl font-bold text-white">{totalCount}</p>
              <p className="text-xs text-slate-400">Total Documents</p>
            </motion.div>
          )}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-300 max-w-2xl mb-6"
        >
          Critical property documentation including as-built drawings, engineering specifications,
          equipment manuals, and official permits. These records are permanently retained and
          cannot be deleted.
        </motion.p>

        <div className="flex items-center gap-4 flex-wrap">
          {canUpload && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={onUpload}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 text-sm text-slate-400"
          >
            <Lock className="h-4 w-4" />
            <span>Permanent retention • No deletion</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
