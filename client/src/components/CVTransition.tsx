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

  // During early phases, just show PDF statically to prevent flashing
  if (phase === 'idle' || phase === 'analyzing' || phase === 'pause' || phase === 'morphing') {
    return (
      <div className="relative w-full h-full overflow-hidden">
        {pdfPreview}
      </div>
    );
  }

  // During peeling and complete, show the layered transition
  const showScanLine = phase === 'peeling' && scanProgress < 100;

  return (
    <div className="relative w-full h-full overflow-hidden">

      {/* Layer 1: Gardener CV (beneath) - always visible during peeling/complete */}
      <div className="absolute inset-0 z-10">
        {gardenerView}
      </div>

      {/* Layer 2: PDF Preview (on top, clips away during peeling) */}
      {phase === 'peeling' && (
        <div
          className="absolute inset-0 z-20"
          style={{
            clipPath: `inset(0 0 ${100 - scanProgress}% 0)`,
          }}
        >
          <div className={cn(
            "w-full h-full",
            "filter saturate-50 blur-[0.5px]"
          )}>
            {pdfPreview}
          </div>
        </div>
      )}

      {/* Layer 3: Scan Line (visible glow) */}
      {showScanLine && (
        <div
          className="absolute left-0 right-0 z-30 h-1 pointer-events-none transition-opacity duration-100"
          style={{
            top: `${scanProgress}%`,
          }}
        >
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
        </div>
      )}

    </div>
  );
}
