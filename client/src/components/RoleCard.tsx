import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Check, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleCardProps {
  section: {
    id: string;
    title: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    content: string;
  };
  observation?: {
    id: string;
    message: string;
    actionType: 'rewrite' | 'add_info';
    inputPrompt?: string;
    rewrittenContent?: string;
    status: string;
  };
  onApply: (observationId: string, newContent: string) => void;
  onLock: (observationId: string) => void;
  onSubmitInput: (observationId: string, input: string) => Promise<void>;
  t: (key: string) => string;
  language: string;
}

export function RoleCard({
  section,
  observation,
  onApply,
  onLock,
  onSubmitInput,
  t,
  language
}: RoleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const hasPendingSuggestion = observation && !['accepted', 'declined', 'locked'].includes(observation.status);
  const isAccepted = observation?.status === 'accepted';

  const formatDate = (date?: string) => {
    if (!date) return t('date.present');
    return new Date(date).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSubmit = async () => {
    if (!observation || !userInput.trim()) return;
    setIsProcessing(true);
    await onSubmitInput(observation.id, userInput.trim());
    setUserInput('');
    setIsProcessing(false);
  };

  const handleApply = () => {
    if (!observation?.rewrittenContent) return;
    onApply(observation.id, observation.rewrittenContent);
    setIsExpanded(false);
  };

  const handleLock = () => {
    if (!observation) return;
    onLock(observation.id);
    setIsExpanded(false);
  };

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute -left-8 top-6 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900",
          isAccepted
            ? "border-green-500"
            : hasPendingSuggestion
              ? "border-amber-500"
              : "border-gray-300 dark:border-gray-600"
        )}
      />

      {/* Card */}
      <motion.div
        layout
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl border transition-shadow duration-200",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
          "hover:shadow-[0_4px_6px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.04)]",
          isAccepted
            ? "border-green-200 dark:border-green-800"
            : hasPendingSuggestion
              ? "border-amber-200 dark:border-amber-800"
              : "border-gray-200 dark:border-gray-700"
        )}
      >
        {/* Card Header */}
        <div className="p-5">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {section.title}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
              {formatDate(section.startDate)} — {formatDate(section.endDate)}
            </span>
          </div>

          {/* Organization */}
          {section.organization && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {section.organization}
            </p>
          )}

          {/* Content */}
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            {section.content.split('\n').filter(Boolean).map((line, i) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                return (
                  <div key={i} className="flex gap-2 pl-1">
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-[13px]">{trimmed.replace(/^[-•]\s*/, '')}</span>
                  </div>
                );
              }
              return <p key={i}>{trimmed}</p>;
            })}
          </div>

          {/* Suggestion Trigger */}
          {hasPendingSuggestion && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "mt-4 flex items-center gap-2 text-sm font-medium transition-colors",
                "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('complete.clickToView')}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>
          )}

          {/* Accepted indicator */}
          {isAccepted && (
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span>{t('suggestion.applied')}</span>
            </div>
          )}
        </div>

        {/* Inline Suggestion Panel */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
                {/* Observation message */}
                <div className="flex gap-3 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {observation.message}
                  </p>
                </div>

                {/* Add Info: Input needed */}
                {observation.actionType === 'add_info' && !observation.rewrittenContent && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {observation.inputPrompt}
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={t('input.placeholder')}
                      className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      rows={3}
                      disabled={isProcessing}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {t('complete.back')}
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!userInput.trim() || isProcessing}
                        className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('processing')}
                          </>
                        ) : (
                          t('submit')
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Rewrite or Add Info with generated content: Show preview */}
                {observation.rewrittenContent && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t('complete.suggestedChange')}
                    </label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {observation.rewrittenContent}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleLock}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                      >
                        <Lock className="w-4 h-4" />
                        {t('complete.lock')}
                      </button>
                      <button
                        onClick={handleApply}
                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {t('complete.apply')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
