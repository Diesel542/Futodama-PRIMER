import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Lock, Loader2, ArrowRight, Plus, Wand2, TrendingUp, Target, Users, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const OUTCOME_PICKERS = [
  {
    category: 'revenue' as const,
    icon: TrendingUp,
    label: { en: 'Revenue impact', da: 'Omsætningseffekt' },
    scaffold: { en: 'Contributed to revenue growth by ___', da: 'Bidrog til omsætningsvækst ved ___' },
  },
  {
    category: 'positioning' as const,
    icon: Target,
    label: { en: 'Market positioning', da: 'Markedspositionering' },
    scaffold: { en: 'Strengthened market position through ___', da: 'Styrkede markedsposition gennem ___' },
  },
  {
    category: 'team_growth' as const,
    icon: Users,
    label: { en: 'Team growth', da: 'Teamvækst' },
    scaffold: { en: 'Built and developed team capabilities in ___', da: 'Opbyggede og udviklede teamkompetencer inden for ___' },
  },
  {
    category: 'delivery' as const,
    icon: Package,
    label: { en: 'Delivery performance', da: 'Leveringsperformance' },
    scaffold: { en: 'Improved delivery outcomes by ___', da: 'Forbedrede leveringsresultater ved ___' },
  },
];

type EditingLayer = 'nudge' | 'assist' | 'preview';

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
  // Use controlled state if provided, otherwise internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;

  // Layer state
  const [layer, setLayer] = useState<EditingLayer>('nudge');

  // Selection state for Claim Blocks
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [additionalText, setAdditionalText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Current sentence starter index
  const [starterIndex, setStarterIndex] = useState(0);

  // Layer 3 state
  const [showPowerTools, setShowPowerTools] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
    // Reset layer when collapsing
    if (isExpanded) {
      setLayer('nudge');
      setSelectedClaims(new Set());
      setAdditionalText('');
    }
  };

  const hasPendingSuggestion = observation && !['accepted', 'declined', 'locked'].includes(observation.status);
  const isAccepted = observation?.status === 'accepted';
  const guidedEdit = observation?.guidedEdit;

  // Get current sentence starter
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
    if (!observation || (selectedClaims.size === 0 && !additionalText.trim())) return;

    setIsProcessing(true);

    if (onApplyClaims) {
      await onApplyClaims(observation.id, Array.from(selectedClaims), additionalText);
    } else {
      // Fallback to old input method
      const combinedInput = [...Array.from(selectedClaims), additionalText].filter(Boolean).join('\n');
      await onSubmitInput(observation.id, combinedInput);
    }

    setIsProcessing(false);
    setLayer('preview');
  };

  const handleApply = () => {
    if (!observation?.rewrittenContent) return;
    onApply(observation.id, observation.rewrittenContent);
    setLayer('nudge');
    setSelectedClaims(new Set());
    setAdditionalText('');
    setInternalExpanded(false);
  };

  const handleLock = () => {
    if (!observation) return;
    onLock(observation.id);
    setLayer('nudge');
    setSelectedClaims(new Set());
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

  // Cycle sentence starter on focus
  const handleTextareaFocus = () => {
    if (guidedEdit?.sentenceStarters?.length) {
      setStarterIndex(prev => prev + 1);
    }
  };

  // Layer 3: Gardener Draft handler
  const handleGardenerDraft = async () => {
    if (!observation || !onRequestGardenerDraft) return;

    setIsGeneratingDraft(true);
    try {
      await onRequestGardenerDraft(observation.id);
      setLayer('preview');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Layer 3: Outcome picker handler
  const handleOutcomeSelect = (scaffold: string) => {
    // Insert scaffold at cursor or append to additional text
    setAdditionalText(prev => {
      if (prev.trim()) {
        return prev + '\n' + scaffold;
      }
      return scaffold;
    });
  };

  // Representation status label
  const representationLabel = useMemo(() => {
    if (!guidedEdit?.representationStatus) return null;
    const labels = {
      too_short: language === 'da' ? 'Repræsentation: for kort' : 'Representation: too short',
      balanced: language === 'da' ? 'Repræsentation: balanceret' : 'Representation: balanced',
      too_long: language === 'da' ? 'Repræsentation: for lang' : 'Representation: too long',
    };
    return labels[guidedEdit.representationStatus];
  }, [guidedEdit?.representationStatus, language]);

  return (
    <div className="relative">
      {/* Timeline dot - temperature colors */}
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

          {/* ========== LAYER 1: NUDGE ========== */}
          {hasPendingSuggestion && layer === 'nudge' && !isExpanded && (
            <div className="mt-4 space-y-2">
              {/* Diagnostic message */}
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {observation.message}
              </p>

              {/* Single action button */}
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

        {/* ========== LAYER 2: ASSIST ========== */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && layer === 'assist' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 space-y-4">
                {/* Representation status */}
                {representationLabel && guidedEdit?.representationStatus !== 'balanced' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {representationLabel}
                  </div>
                )}

                {/* Claim Blocks */}
                {guidedEdit?.claimBlocks && guidedEdit.claimBlocks.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {language === 'da' ? 'Foreslåede elementer (klik for at tilføje)' : 'Suggested elements (click to add)'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {guidedEdit.claimBlocks.map((claim, i) => (
                        <button
                          key={i}
                          onClick={() => handleClaimToggle(claim)}
                          className={cn(
                            "px-3 py-1.5 text-sm rounded-full border transition-all",
                            selectedClaims.has(claim)
                              ? "bg-[#E8F5E8] dark:bg-[#1A2F1C] border-green-300 dark:border-green-700 text-green-800 dark:text-green-300"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                          )}
                        >
                          {selectedClaims.has(claim) && <Check className="w-3 h-3 inline mr-1" />}
                          {claim}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional text input with sentence starter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {language === 'da' ? 'Tilføj dine egne detaljer (valgfrit)' : 'Add your own details (optional)'}
                  </label>
                  <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    onFocus={handleTextareaFocus}
                    placeholder={currentStarter}
                    className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 placeholder:italic"
                    rows={3}
                    disabled={isProcessing}
                  />
                </div>

                {/* Layer 3: Power Tools */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <button
                    onClick={() => setShowPowerTools(!showPowerTools)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform",
                      showPowerTools && "rotate-180"
                    )} />
                    {showPowerTools
                      ? (language === 'da' ? 'Skjul power tools' : 'Hide power tools')
                      : (language === 'da' ? 'Vis power tools' : 'Show power tools')
                    }
                  </button>

                  <AnimatePresence>
                    {showPowerTools && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                          {/* Outcome Pickers */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {language === 'da' ? 'Udfaldsskabeloner' : 'Outcome scaffolds'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {OUTCOME_PICKERS.map((picker) => {
                                const Icon = picker.icon;
                                return (
                                  <button
                                    key={picker.category}
                                    onClick={() => handleOutcomeSelect(picker.scaffold[language as 'en' | 'da'] || picker.scaffold.en)}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                  >
                                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {picker.label[language as 'en' | 'da'] || picker.label.en}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Gardener Draft */}
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                              {language === 'da'
                                ? 'Eller spring valgene over:'
                                : 'Or skip the selections:'}
                            </p>
                            <button
                              onClick={handleGardenerDraft}
                              disabled={isGeneratingDraft || !onRequestGardenerDraft}
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                            >
                              {isGeneratingDraft ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Wand2 className="w-4 h-4" />
                              )}
                              {language === 'da' ? 'Lad AI skrive helt fra bunden' : 'Let AI write from scratch'}
                            </button>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-6">
                              {language === 'da'
                                ? 'AI foreslår en komplet tekst baseret på din nuværende rollebeskrivelse'
                                : 'AI proposes complete text based on your current role description'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {t('complete.back')}
                  </button>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={selectedClaims.size === 0 && !additionalText.trim() || isProcessing}
                    className="px-4 py-2 text-sm font-medium bg-[#1a3a2a] text-white rounded-lg hover:bg-[#2a4a3a] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {language === 'da' ? 'Genererer...' : 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {language === 'da' ? 'Byg fra mine valg' : 'Build from my selections'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== PREVIEW (post-assist) ========== */}
        <AnimatePresence>
          {isExpanded && hasPendingSuggestion && observation && layer === 'preview' && observation.rewrittenContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 space-y-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t('complete.suggestedChange')}
                </label>
                <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#D7F1D6] dark:border-l-[#7BAF86] rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {observation.rewrittenContent}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {language === 'da' ? 'Tilbage' : 'Back'}
                  </button>
                  <button
                    onClick={handleLock}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                  >
                    <Lock className="w-4 h-4" />
                    {t('complete.lock')}
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-4 py-2 text-sm font-medium bg-[#1a3a2a] text-white rounded-lg hover:bg-[#2a4a3a] transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {t('complete.apply')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
