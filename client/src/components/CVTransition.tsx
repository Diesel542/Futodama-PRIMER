import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type TransitionPhase = 'idle' | 'analyzing' | 'pause' | 'morphing' | 'peeling' | 'complete';

interface CVTransitionProps {
  enabled: boolean; // Feature toggle
  phase: TransitionPhase;
  scanProgress: number; // 0-100
  pdfPreview: React.ReactNode;
  gardenerView: React.ReactNode;
}

export function CVTransition({
  enabled,
  phase,
  scanProgress,
  pdfPreview,
  gardenerView
}: CVTransitionProps) {

  // If disabled, show simple view switching
  if (!enabled) {
    return (
      <div className="relative w-full h-full">
        {phase === 'complete' ? gardenerView : pdfPreview}
      </div>
    );
  }

  const showPdf = phase !== 'complete';
  const showGardener = phase === 'peeling' || phase === 'complete';
  const showScanLine = phase === 'peeling' && scanProgress < 100;

  return (
    <div className="relative w-full h-full overflow-hidden">

      {/* Layer 1: Gardener CV (beneath) */}
      <motion.div
        className="absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{
          opacity: showGardener ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {gardenerView}
      </motion.div>

      {/* Layer 2: PDF Preview (on top, clips away) */}
      <AnimatePresence>
        {showPdf && (
          <motion.div
            className="absolute inset-0 z-20"
            initial={{ opacity: 1 }}
            animate={{
              opacity: phase === 'complete' ? 0 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              clipPath: phase === 'peeling'
                ? `inset(0 0 ${100 - scanProgress}% 0)`
                : 'inset(0 0 0 0)',
            }}
          >
            {/* PDF with progressive desaturation/blur */}
            <div
              className={cn(
                "w-full h-full transition-all duration-300",
                phase === 'peeling' && "filter saturate-50 blur-[0.5px]"
              )}
            >
              {pdfPreview}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 3: Scan Line (visible glow) */}
      <AnimatePresence>
        {showScanLine && (
          <motion.div
            className="absolute left-0 right-0 z-30 h-1 pointer-events-none"
            style={{
              top: `${scanProgress}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {/* Glow effect */}
            <div className="relative w-full h-full">
              {/* Main line */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

              {/* Soft glow above */}
              <div
                className="absolute left-0 right-0 h-8 -top-8"
                style={{
                  background: 'linear-gradient(to top, rgba(74, 222, 128, 0.15), transparent)',
                }}
              />

              {/* Soft glow below */}
              <div
                className="absolute left-0 right-0 h-8 top-1"
                style={{
                  background: 'linear-gradient(to bottom, rgba(74, 222, 128, 0.1), transparent)',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
