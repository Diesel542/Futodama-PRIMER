import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Loader2, ArrowRight, Wand2, TrendingUp, Target, Users, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type EditingLayer = 'nudge' | 'assist' | 'preview';

// Outcome pickers - no labels shown in UI, just icons
const OUTCOME_PICKERS = [
  {
    category: 'revenue' as const,
    icon: TrendingUp,
    label: { en: 'Revenue', da: 'Omsætning' },
    scaffold: { en: 'Contributed to revenue growth by ___', da: 'Bidrog til omsætningsvækst ved ___' },
  },
  {
    category: 'positioning' as const,
    icon: Target,
    label: { en: 'Positioning', da: 'Positionering' },
    scaffold: { en: 'Strengthened market position through ___', da: 'Styrkede markedsposition gennem ___' },
  },
  {
    category: 'team_growth' as const,
    icon: Users,
    label: { en: 'Team', da: 'Team' },
    scaffold: { en: 'Built and developed team capabilities in ___', da: 'Opbyggede teamkompetencer inden for ___' },
  },
  {
    category: 'delivery' as const,
    icon: Package,
    label: { en: 'Delivery', da: 'Levering' },
    scaffold: { en: 'Improved delivery outcomes by ___', da: 'Forbedrede leveringsresultater ved ___' },
  },
];

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
    actionType: 'rewrite' | 'add_info' | 'guided_edit';
    inputPrompt?: string;
    rewrittenContent?: string;
    status: string;
    guidedEdit?: {
      claimBlocks: string[];
      sentenceStarters: string[];
      representationStatus: 'too_short' | 'balanced' | 'too_long';
    };
  };
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onApply: (observationId: string, newContent: string) => void;
  onLock: (observationId: string) => void;
  onSubmitInput: (observationId: string, input: string) => Promise<void>;
  onApplyClaims?: (observationId: string, selectedClaims: string[], additionalText: string) => Promise<void>;
  onRequestGardenerDraft?: (observationId: string) => Promise<void>;
  t: (key: string) => string;
  language: string;
}

export function RoleCard({
  section,
  observation,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onApply,
  onLock,
  onSubmitInput,
  onApplyClaims,
  onRequestGardenerDraft,
  t,
  language
}: RoleCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;

  const [layer, setLayer] = useState<EditingLayer>('nudge');
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [additionalText, setAdditionalText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [starterIndex, setStarterIndex] = useState(0);

  // Layer 3 state
  const [showPowerTools, setShowPowerTools] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [selectedOutcomes, setSelectedOutcomes] = useState<Set<string>>(new Set());

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
    if (isExpanded) {
      setLayer('nudge');
      setSelectedClaims(new Set());
      setSelectedOutcomes(new Set());
      setAdditionalText('');
      setShowPowerTools(false);
    }
  };

  const hasPendingSuggestion = observation && !['accepted', 'declined', 'locked'].includes(observation.status);
  const isAccepted = observation?.status === 'accepted';
  const guidedEdit = observation?.guidedEdit;

  const currentStarter = useMemo(() => {
    if (!guidedEdit?.sentenceStarters?.length) return '';
    return guidedEdit.sentenceStarters[starterIndex % guidedEdit.sentenceStarters.length];
  }, [guidedEdit?.sentenceStarters, starterIndex]);

  const formatDate = (date?: string) => {
    if (!date) return t('date.present');
    return new Date(date).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const handleImproveClick = () => {
    setLayer('assist');
  };

  const handleClaimToggle = (claim: string) => {
    setSelectedClaims(prev => {
      const next = new Set(prev);
      if (next.has(claim)) {
        next.delete(claim);
      } else {
        next.add(claim);
      }
      return next;
    });
  };

  const handleGeneratePreview = async () => {
    if (!observation || (selectedClaims.size === 0 && selectedOutcomes.size === 0 && !additionalText.trim())) return;

    setIsProcessing(true);

    // Filter out unfilled placeholders from claims
    const cleanedClaims = Array.from(selectedClaims).filter(claim => !claim.includes('___'));

    // Get scaffold text for selected outcomes (these will be completed by AI)
    const outcomeScaffolds = OUTCOME_PICKERS
      .filter(p => selectedOutcomes.has(p.category))
      .map(p => p.scaffold[language as 'en' | 'da'] || p.scaffold.en);

    // Combine claims with outcome scaffolds
    const allClaims = [...cleanedClaims, ...outcomeScaffolds];

    const cleanedText = additionalText.includes('___')
      ? additionalText.split('\n').filter(line => !line.includes('___')).join('\n')
      : additionalText;

    if (onApplyClaims) {
      await onApplyClaims(observation.id, allClaims, cleanedText);
    } else {
      const combinedInput = [...allClaims, cleanedText].filter(Boolean).join('\n');
      await onSubmitInput(observation.id, combinedInput);
    }

    setIsProcessing(false);
    setLayer('preview');
  };

  const handleGardenerDraft = async () => {
    if (!observation || !onRequestGardenerDraft) return;
    setIsGeneratingDraft(true);
    await onRequestGardenerDraft(observation.id);
    setIsGeneratingDraft(false);
    setLayer('preview');
  };

  const handleOutcomeToggle = (category: string) => {
    setSelectedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!observation?.rewrittenContent) return;
    onApply(observation.id, observation.rewrittenContent);
    setLayer('nudge');
    setSelectedClaims(new Set());
    setSelectedOutcomes(new Set());
    setAdditionalText('');
    setInternalExpanded(false);
  };

  const handleLock = () => {
    if (!observation) return;
    onLock(observation.id);
    setLayer('nudge');
    setSelectedClaims(new Set());
    setSelectedOutcomes(new Set());
    setAdditionalText('');
    setInternalExpanded(false);
  };

  const handleBack = () => {
    if (layer === 'preview') {
      setLayer('assist');
    } else if (layer === 'assist') {
      setLayer('nudge');
      setInternalExpanded(false);
      onToggleExpand?.();
    }
  };

  const handleTextareaFocus = () => {
    if (guidedEdit?.sentenceStarters?.length) {
      setStarterIndex(prev => prev + 1);
    }
  };

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute -left-8 top-6 w-3 h-3 rounded-full border-2 bg-white dark:bg-gray-900",
          isAccepted
            ? "border-[#D7F1D6] dark:border-[#7BAF86]"
            : hasPendingSuggestion
              ? "border-[#F4E8B3] dark:border-[#C9B56A]"
              : "border-gray-300 dark:border-gray-600"
        )}
      />

      {/* Card */}
      <motion.div
        layout
        id={`section-${section.id}`}
        className={cn(
          "rounded-xl border transition-all duration-200",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
          "hover:shadow-[0_4px_6px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.04)]",
          "border-gray-200 dark:border-gray-700",
          isAccepted
            ? "bg-[#E8F5E8] dark:bg-[#1A1F1C] border-l-4 border-l-[#D7F1D6] dark:border-l-[#7BAF86]"
            : hasPendingSuggestion
              ? "bg-[#FAF6E8] dark:bg-[#1F1E1A] border-l-4 border-l-[#F4E8B3] dark:border-l-[#C9B56A]"
              : "bg-white dark:bg-[#1A1D1F]"
        )}
      >
        {/* Card Header */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {section.title}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
              {formatDate(section.startDate)} — {formatDate(section.endDate)}
            </span>
          </div>

          {section.organization && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {section.organization}
            </p>
          )}

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

          {/* Layer 1: Nudge */}
          {hasPendingSuggestion && layer === 'nudge' && !isExpanded && (
            <div className="mt-4 space-y-3">
              {/* Single calm observation sentence */}
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {observation.message}
              </p>

              <button
                onClick={() => {
                  handleToggle();
                  handleImproveClick();
                }}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{language === 'da' ? 'Forbedr denne rolle' : 'Improve this role'}</span>
              </button>
            </div>
          )}

          {/* Accepted indicator */}
          {isAccepted && (
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4" />
              <span>{t('suggestion.applied')}</span>
            </div>
          )}
        </div>

        {/* Layer 2: Assist */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && layer === 'assist' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-5 space-y-5">

                {/* Single calm sentence - replaces all headings */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {observation.message}
                </p>

                {/* Claim Blocks - visible as selectable tags */}
                {guidedEdit?.claimBlocks && guidedEdit.claimBlocks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {guidedEdit.claimBlocks.map((claim, i) => (
                      <button
                        key={i}
                        onClick={() => handleClaimToggle(claim)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-lg transition-all duration-150 border",
                          selectedClaims.has(claim)
                            ? "bg-[#E8F5E8] dark:bg-[#1A2F1C] border-green-200 dark:border-green-800 text-gray-800 dark:text-gray-200"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                        )}
                      >
                        {selectedClaims.has(claim) && (
                          <Check className="w-3.5 h-3.5 inline mr-1.5 text-green-600 dark:text-green-500" />
                        )}
                        {claim}
                      </button>
                    ))}
                  </div>
                )}

                {/* Text area - no label, just placeholder */}
                <textarea
                  value={additionalText}
                  onChange={(e) => setAdditionalText(e.target.value)}
                  onFocus={handleTextareaFocus}
                  placeholder={currentStarter}
                  className="w-full p-4 text-sm rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:italic border-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                  rows={3}
                  disabled={isProcessing}
                />

                {/* Power tools reveal - quiet affordance */}
                <AnimatePresence>
                  {showPowerTools && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-4">
                        {/* Outcome pickers - selectable tags like claim blocks */}
                        <div className="flex flex-wrap gap-2">
                          {OUTCOME_PICKERS.map((picker) => {
                            const Icon = picker.icon;
                            const isSelected = selectedOutcomes.has(picker.category);
                            return (
                              <button
                                key={picker.category}
                                onClick={() => handleOutcomeToggle(picker.category)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-150 border",
                                  isSelected
                                    ? "bg-[#E8F5E8] dark:bg-[#1A2F1C] border-green-200 dark:border-green-800 text-gray-700 dark:text-gray-300"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                                )}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-green-600 dark:text-green-500" />
                                )}
                                <Icon className="w-3.5 h-3.5" />
                                <span>{picker.label[language as 'en' | 'da'] || picker.label.en}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Gardener draft option */}
                        <button
                          onClick={handleGardenerDraft}
                          disabled={isGeneratingDraft}
                          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                        >
                          {isGeneratingDraft ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          <span>{language === 'da' ? 'Prøv et AI-udkast' : 'Try an AI draft'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  {/* "Need more help?" - quiet reveal trigger */}
                  <button
                    onClick={() => setShowPowerTools(!showPowerTools)}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                  >
                    {showPowerTools
                      ? (language === 'da' ? 'Skjul' : 'Hide')
                      : (language === 'da' ? 'Brug for mere hjælp?' : 'Need more help?')
                    }
                  </button>

                  <div className="flex items-center gap-4">
                    {/* Back as text link */}
                    <button
                      onClick={handleBack}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {language === 'da' ? 'Tilbage' : 'Back'}
                    </button>

                    {/* One primary action */}
                    <button
                      onClick={handleGeneratePreview}
                      disabled={(selectedClaims.size === 0 && selectedOutcomes.size === 0 && !additionalText.trim()) || isProcessing}
                      className="px-5 py-2 text-sm font-medium bg-[#1a3a2a] text-white rounded-lg hover:bg-[#2a4a3a] transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      <span>{language === 'da' ? 'Generer forslag' : 'Generate suggestion'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && layer === 'preview' && observation.rewrittenContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-5 space-y-4">
                {/* Preview content - no label */}
                <div className="p-4 bg-white dark:bg-gray-800 border-l-2 border-l-[#7BAF86] rounded-r-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {observation.rewrittenContent}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {/* Back as text link */}
                  <button
                    onClick={handleBack}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {language === 'da' ? 'Tilbage' : 'Back'}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleLock}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'da' ? 'Behold original' : 'Keep original'}</span>
                    </button>

                    <button
                      onClick={handleApply}
                      className="px-5 py-2 text-sm font-medium bg-[#1a3a2a] text-white rounded-lg hover:bg-[#2a4a3a] transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{language === 'da' ? 'Anvend' : 'Apply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
