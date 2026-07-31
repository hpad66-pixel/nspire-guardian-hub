import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { F } from '../shared';

export function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label="Product demo video"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          style={{ background: 'rgba(10,9,7,0.88)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: -44, right: 0, background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(245,241,232,0.7)', display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: F.sans, fontSize: 14,
              }}
            >
              <X size={18} /> Close
            </button>
            <video
              src="/proj-os-demo.mp4"
              className="w-full rounded-xl shadow-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              controls autoPlay playsInline
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
