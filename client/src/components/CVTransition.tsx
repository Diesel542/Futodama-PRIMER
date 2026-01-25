import { cn } from '@/lib/utils';

export type TransitionPhase = 'idle' | 'analyzing' | 'pause' | 'morphing' | 'peeling' | 'complete';

interface CVTransitionProps {
  enabled: boolean;
  phase: TransitionPhase;
  scanProgress: number;
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

  // If disabled, show simple view switching (no animation)
  if (!enabled) {
    return (
      <div className="relative w-full h-full">
        {phase === 'complete' ? gardenerView : pdfPreview}
      </div>
    );
  }

  // SINGLE DOM STRUCTURE for all phases - control visibility with CSS only
  // This prevents any flash from DOM restructuring

  const showGardener = phase === 'peeling' || phase === 'complete';
  const showPdf = phase !== 'complete';
  const isPeeling = phase === 'peeling';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Layer 1: Gardener CV (beneath) - always in DOM, visibility controlled */}
      <div
        className={cn(
          "absolute inset-0 z-10 transition-opacity duration-100",
          showGardener ? "opacity-100" : "opacity-0"
        )}
      >
        {gardenerView}
      </div>

      {/* Layer 2: PDF Preview (on top) - always in DOM, clips during peel */}
      <div
        className={cn(
          "absolute inset-0 z-20 transition-opacity duration-100",
          showPdf ? "opacity-100" : "opacity-0"
        )}
        style={{
          clipPath: isPeeling ? `inset(${scanProgress}% 0 0 0)` : 'inset(0 0 0 0)',
        }}
      >
        <div className={cn(
          "w-full h-full",
          isPeeling && "filter saturate-50 blur-[0.5px]"
        )}>
          {pdfPreview}
        </div>
      </div>

      {/* Layer 3: Scan Line - only during peeling */}
      {isPeeling && scanProgress < 100 && (
        <div
          className="absolute left-0 right-0 z-30 h-1 pointer-events-none"
          style={{ top: `${scanProgress}%` }}
        >
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />
            <div
              className="absolute left-0 right-0 h-8 -top-8"
              style={{ background: 'linear-gradient(to top, rgba(74, 222, 128, 0.15), transparent)' }}
            />
            <div
              className="absolute left-0 right-0 h-8 top-1"
              style={{ background: 'linear-gradient(to bottom, rgba(74, 222, 128, 0.1), transparent)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
