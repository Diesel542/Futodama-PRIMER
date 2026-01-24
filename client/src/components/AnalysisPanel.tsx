import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Observation } from '@shared/schema';

interface AnalysisPanelProps {
  strengths: string;
  observations: Observation[];
  totalIssues: number;
  resolvedIssues: number;
  language: 'en' | 'da';
  onObservationClick?: (observationId: string) => void;
}

interface ImprovementCardProps {
  observation: Observation;
  onClick?: () => void;
}

function ImprovementCard({ observation, onClick }: ImprovementCardProps) {
  // Extract headline and explanation from observation
  const [headline, ...rest] = observation.message.split('. ');
  const explanation = rest.join('. ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl",
        "bg-[#FDFBF0] dark:bg-[#1F1E1A]",
        "border border-gray-200 dark:border-gray-700",
        "shadow-sm",
        "cursor-pointer hover:shadow-md transition-shadow"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Yellow temperature dot */}
          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#C9B56A] shrink-0" />

          <div className="space-y-1 min-w-0">
            {/* Headline */}
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {headline}
            </h3>

            {/* Explanation */}
            {explanation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {explanation}
              </p>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
      </div>
    </motion.div>
  );
}

export function AnalysisPanel({
  strengths,
  observations,
  totalIssues,
  resolvedIssues,
  language,
  onObservationClick,
}: AnalysisPanelProps) {
  // Filter to pending observations only, max 3
  const pendingObservations = useMemo(
    () =>
      observations
        .filter((o) => !['accepted', 'declined', 'locked'].includes(o.status))
        .slice(0, 3),
    [observations]
  );

  // Total pending count (for "+N more" display)
  const totalPending = useMemo(
    () => observations.filter((o) => !['accepted', 'declined', 'locked'].includes(o.status)).length,
    [observations]
  );

  // Calculate health progress (0 to 1)
  const healthProgress = useMemo(() => {
    if (totalIssues === 0) return 1;
    return resolvedIssues / totalIssues;
  }, [totalIssues, resolvedIssues]);

  // Determine health state
  const healthState = useMemo(() => {
    if (healthProgress >= 1) return 'healthy';
    if (healthProgress >= 0.5) return 'improving';
    return 'attention';
  }, [healthProgress]);

  const t = {
    en: {
      analysisComplete: 'Analysis complete',
      improving: 'CV coherence improving',
      healthy: 'CV in good shape',
      attention: 'Multiple areas need attention',
      start: 'Start',
      now: 'Now',
      goal: 'Goal',
      whatsWorking: "What's working well",
      improvements: 'Prioritized improvements',
      moreItems: 'more items',
    },
    da: {
      analysisComplete: 'Analyse faerdig',
      improving: 'CV-sammenhaeng forbedres',
      healthy: 'CV i god form',
      attention: 'Flere omrader kraever opmaerksomhed',
      start: 'Start',
      now: 'Nu',
      goal: 'Mal',
      whatsWorking: 'Hvad der fungerer godt',
      improvements: 'Prioriterede forbedringer',
      moreItems: 'flere punkter',
    },
  }[language];

  const healthBadgeText = {
    healthy: t.healthy,
    improving: t.improving,
    attention: t.attention,
  }[healthState];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8">
        {/* ========== STATUS HEADER ========== */}
        <section className="space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600 dark:text-green-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.analysisComplete}
            </h1>
          </div>

          {/* Health Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                healthState === 'healthy'
                  ? 'bg-[#E8F5E8] dark:bg-[#1A2F1C] text-green-700 dark:text-green-400'
                  : healthState === 'improving'
                    ? 'bg-[#E8F5E8] dark:bg-[#1A2F1C] text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  healthState === 'attention' ? 'bg-[#C9B56A]' : 'bg-green-500 dark:bg-green-400'
                )}
              />
              {healthBadgeText}
            </span>
          </div>

          {/* Health Trajectory Bar */}
          <div className="pt-2">
            <div className="relative">
              {/* Track */}
              <div className="h-2 rounded-full bg-gradient-to-r from-[#F4E8B3] via-[#D4E4A6] to-[#7BAF86] dark:from-[#4A4535] dark:via-[#3A4A35] dark:to-[#2A3F2E]" />

              {/* Now Marker */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                initial={false}
                animate={{ left: `${Math.min(healthProgress * 100, 100)}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ marginLeft: '-6px' }}
              >
                <div className="w-3 h-3 rounded-full bg-white dark:bg-gray-200 border-2 border-gray-400 dark:border-gray-500 shadow-sm" />
              </motion.div>
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t.start}</span>
              <span>{t.now}</span>
              <span>{t.goal}</span>
            </div>
          </div>
        </section>

        {/* ========== WHAT'S WORKING WELL ========== */}
        {strengths && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.whatsWorking}
              </h2>
            </div>

            {/* Narrative prose - split into paragraphs */}
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              {strengths.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {/* ========== PRIORITIZED IMPROVEMENTS ========== */}
        {pendingObservations.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">&#10023;</span>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.improvements}
              </h2>
            </div>

            {/* Improvement Cards */}
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {pendingObservations.map((obs) => (
                  <ImprovementCard
                    key={obs.id}
                    observation={obs}
                    onClick={() => onObservationClick?.(obs.id)}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Collapsed count */}
            {totalPending > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                +{totalPending - 3} {t.moreItems}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
