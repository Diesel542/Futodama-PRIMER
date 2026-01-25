import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Observation } from '@shared/schema';
import type { TransitionPhase } from './CVTransition';
import { CodeScroll } from './CodeScroll';

interface AnalysisPanelProps {
  strengths: string;
  observations: Observation[];
  totalIssues: number;
  resolvedIssues: number;
  language: 'en' | 'da';
  onSelectObservation: (sectionId: string) => void;
  transitionEnabled?: boolean;
  phase?: TransitionPhase;
  analysisProgress?: number;
}

// HealthBar component for phase-aware progress/health display
interface HealthBarProps {
  enabled: boolean;
  phase: TransitionPhase;
  analysisProgress: number;
  healthProgress: number;
  language: 'en' | 'da';
}

function HealthBar({
  enabled,
  phase,
  analysisProgress,
  healthProgress,
  language
}: HealthBarProps) {
  const isAnalyzing = phase === 'idle' || phase === 'analyzing' || phase === 'pause';
  const showHealthLabels = !isAnalyzing;
  const skipMorph = !enabled && phase === 'complete';

  const t = {
    en: {
      analyzing: 'Analyzing CV...',
      complete: 'Analysis complete',
      start: 'Start',
      now: 'Now',
      goal: 'Goal',
    },
    da: {
      analyzing: 'Analyserer CV...',
      complete: 'Analyse færdig',
      start: 'Start',
      now: 'Nu',
      goal: 'Mål',
    }
  }[language];

  return (
    <div className="space-y-2">
      {/* Label */}
      <motion.div
        className="flex items-center gap-2"
        key={isAnalyzing ? 'analyzing' : 'complete'}
        initial={skipMorph ? false : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Leaf className="w-5 h-5 text-green-600 dark:text-green-500" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isAnalyzing ? t.analyzing : t.complete}
        </h1>
      </motion.div>

      {/* Bar */}
      <div className="relative pt-2">
        <div className={cn(
          "h-2 rounded-full overflow-hidden transition-all",
          skipMorph ? "" : "duration-300",
          isAnalyzing
            ? "bg-gray-200 dark:bg-gray-700"
            : "bg-gradient-to-r from-[#F4E8B3] via-[#D4E4A6] to-[#7BAF86]"
        )}>
          {/* Progress fill (during analysis) */}
          {isAnalyzing && (
            <motion.div
              className="h-full bg-green-500 dark:bg-green-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${analysisProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>

        {/* Now marker (after analysis) */}
        {!isAnalyzing && (
          <motion.div
            className="absolute top-1/2 mt-1 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-gray-200 border-2 border-gray-400 dark:border-gray-500 shadow-sm"
            initial={skipMorph ? { left: `${healthProgress * 100}%`, marginLeft: '-6px' } : { left: '0%', opacity: 0 }}
            animate={{
              left: `${healthProgress * 100}%`,
              opacity: 1,
              marginLeft: '-6px',
            }}
            transition={{ duration: skipMorph ? 0 : 0.3, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Axis labels */}
      <AnimatePresence>
        {showHealthLabels && (
          <motion.div
            className="flex justify-between text-xs text-gray-500 dark:text-gray-400"
            initial={skipMorph ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: skipMorph ? 0 : 0.1 }}
          >
            <span>{t.start}</span>
            <span>{t.now}</span>
            <span>{t.goal}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ImprovementCardProps {
  observation: Observation;
  onClick: () => void;
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
  onSelectObservation,
  transitionEnabled = false,
  phase = 'complete',
  analysisProgress = 0,
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

  const showContent = phase === 'complete';

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8">
        {/* ========== STATUS HEADER + HEALTH BAR ========== */}
        <section className="space-y-4">
          {/* Show "Analyzing CV..." header during analysis */}
          {!showContent && (
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600 dark:text-green-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {language === 'da' ? 'Analyserer CV...' : 'Analyzing CV...'}
              </h1>
            </div>
          )}

          {/* Show HealthBar after analysis completes */}
          {showContent && (
            <HealthBar
              enabled={transitionEnabled}
              phase={phase}
              analysisProgress={analysisProgress}
              healthProgress={healthProgress}
              language={language}
            />
          )}

          {/* Health Badge - only show when complete */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="flex items-center gap-2"
                initial={transitionEnabled ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: transitionEnabled ? 0.1 : 0 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Code Scroll - only show during analysis, centered vertically */}
          {!showContent && (
            <div className="flex items-center justify-center h-[70vh]">
              <CodeScroll />
            </div>
          )}
        </section>

        {/* ========== WHAT'S WORKING WELL ========== */}
        <AnimatePresence>
          {showContent && strengths && (
            <motion.section
              className="space-y-3"
              initial={transitionEnabled ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: transitionEnabled ? 0.2 : 0 }}
            >
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
            </motion.section>
          )}
        </AnimatePresence>

        {/* ========== PRIORITIZED IMPROVEMENTS ========== */}
        <AnimatePresence>
          {showContent && pendingObservations.length > 0 && (
            <motion.section
              className="space-y-3"
              initial={transitionEnabled ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: transitionEnabled ? 0.4 : 0 }}
            >
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
                      onClick={() => onSelectObservation(obs.sectionId)}
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
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
