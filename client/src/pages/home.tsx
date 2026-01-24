import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, ChevronRight, Sparkles, Loader2, Leaf, Lock, FileText } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import { cn } from "@/lib/utils";
import { useSettings } from "../contexts/SettingsContext";
import { SettingsDropdown } from "../components/SettingsDropdown";
import type { CV, Observation, AnalyzeResponse, CVSection } from "@shared/schema";

/**
 * Decode filename that may have been incorrectly encoded
 * Handles common encoding issues with Nordic/European characters
 */
function decodeFilename(filename: string): string {
  try {
    // First, try to fix mojibake (UTF-8 interpreted as Latin-1)
    // This handles cases like "RÃ¦kby" → "Rækby"
    const fixed = filename
      .replace(/Ã¦/g, 'æ')
      .replace(/Ã¸/g, 'ø')
      .replace(/Ã¥/g, 'å')
      .replace(/Ã†/g, 'Æ')
      .replace(/Ã˜/g, 'Ø')
      .replace(/Ã…/g, 'Å')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã¤/g, 'ä')
      .replace(/ÃŸ/g, 'ß')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã®/g, 'î')
      .replace(/Ã´/g, 'ô')
      .replace(/Ã»/g, 'û')
      .replace(/Ã§/g, 'ç')
      .replace(/Ã±/g, 'ñ');

    return fixed;
  } catch {
    return filename;
  }
}

// Types
type AppState = "idle" | "previewing" | "scanning" | "complete";

// Logo Component
const DisCreadisLogo = () => (
  <div className="flex flex-col gap-[0.5px]">
    <div className="flex gap-[0.5px]">
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">D</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">I</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">S</div>
    </div>
    <div className="flex gap-[0.5px]">
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">C</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">R</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">E</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">A</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">D</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">I</div>
      <div className="w-3 h-3 bg-[#1a3a2a] text-white flex items-center justify-center text-[5px] font-bold font-sans">S</div>
    </div>
  </div>
);

// Helper function for date formatting
const formatDateRange = (start?: string, end?: string): string => {
  if (!start) return '';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const startFormatted = formatDate(start);

  // Check if end date is very recent or missing - treat as "Present"
  if (!end) {
    return `${startFormatted} — Present`;
  }

  const endDate = new Date(end);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - endDate.getFullYear()) * 12 + (now.getMonth() - endDate.getMonth());

  if (monthsDiff <= 1) {
    return `${startFormatted} — Present`;
  }

  return `${startFormatted} — ${formatDate(end)}`;
};

export default function Home() {
  const { t, language } = useSettings();
  const [state, setState] = useState<AppState>("idle");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // PDF preview state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Real data state
  const [cvData, setCvData] = useState<CV | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);

  // PDF Viewer Component
  const PDFViewer = ({ url }: { url: string }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [containerWidth, setContainerWidth] = useState<number>(600);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (containerRef.current) {
        const updateWidth = () => {
          if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth - 48); // Account for padding
          }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
      }
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    };

    return (
      <div ref={containerRef} className="w-full">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-red-500">
              Failed to load PDF
            </div>
          }
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={containerWidth}
              className="mb-4 shadow-sm"
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ))}
        </Document>
      </div>
    );
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Store the file for preview
    setPdfFile(file);

    // Create URL for PDF viewer
    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    // Transition to preview state (don't analyze yet)
    setState("previewing");
  };

  const handleAnalyze = async () => {
    if (!pdfFile) return;

    setState("scanning");

    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const response = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: {
          'X-Language': language,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }

      const data: AnalyzeResponse = await response.json();

      setCvData(data.cv);
      setObservations(data.observations);
      setStrengths(data.strengths);
      setState("complete");

      // Clean up the PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Analysis failed");
      setState("previewing"); // Go back to preview, not idle
    }
  };

  const handleCancel = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfFile(null);
    setPdfUrl(null);
    setCvData(null);
    setObservations([]);
    setStrengths([]);
    setState("idle");
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.doc";
    input.onchange = handleFileSelect as unknown as (event: Event) => void;
    input.click();
  };

  const handleSuggestionClick = (id: string) => {
    setExpandedSuggestion(expandedSuggestion === id ? null : id);
  };

  const handleAction = async (id: string, action: "accepted" | "declined", e: React.MouseEvent) => {
    e.stopPropagation();

    if (!cvData) return;

    try {
      await fetch(`/api/cv/${cvData.id}/observation/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: action }),
      });

      setObservations(prev =>
        prev.map(o => o.id === id ? { ...o, status: action } : o)
      );
    } catch (error) {
      console.error("Failed to update observation:", error);
    }

    setExpandedSuggestion(null);
  };

  // Helper to get highlight class based on observation state
  const getHighlightClass = (sectionId: string) => {
    if (state !== 'complete' || !observations.length) return '';

    const observation = observations.find(o => o.sectionId === sectionId);

    if (!observation) return '';

    if (observation.status === 'accepted') {
      return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400';
    }

    if (observation.status === 'declined' || observation.status === 'locked') {
      return ''; // No highlight for declined or locked
    }

    // Pending, awaiting_input, or processing
    return 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400';
  };

  // Helper to get pending observation for a section (now handles all active states)
  const getPendingObservation = (sectionId: string) => {
    return observations.find(o =>
      o.sectionId === sectionId &&
      !['accepted', 'declined', 'locked'].includes(o.status)
    );
  };

  const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation(); // Prevent window listener from firing
    const pending = getPendingObservation(sectionId);
    if (pending) {
      setActiveSection(activeSection === sectionId ? null : sectionId);
    }
  };

  // Close popover when clicking outside (but not on section cards or popovers)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a section card or the popover itself
      if (target.closest('[data-section-card]') || target.closest('[data-suggestion-popover]')) {
        return;
      }
      setActiveSection(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const SuggestionPopover = ({ sectionId }: { sectionId: string }) => {
    const observation = observations.find(o =>
      o.sectionId === sectionId &&
      !['accepted', 'declined', 'locked'].includes(o.status)
    );
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!observation) return null;

    const handleSubmitInput = async () => {
      if (!userInput.trim() || !cvData) return;

      setIsProcessing(true);

      // Find the section
      const section = cvData.sections.find(s => s.id === observation.sectionId);
      if (!section) {
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch('/api/cv/process-input', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Language': language,
          },
          body: JSON.stringify({
            observationId: observation.id,
            sectionId: observation.sectionId,
            userInput: userInput.trim(),
            section: section,
          }),
        });

        if (!response.ok) throw new Error('Failed to process');

        const data = await response.json();

        // Update observation with generated content
        setObservations(prev => prev.map(o =>
          o.id === observation.id
            ? { ...o, rewrittenContent: data.rewrittenContent, proposal: data.proposal }
            : o
        ));

        setUserInput('');

      } catch (error) {
        console.error('Failed to process input:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleApply = () => {
      if (!observation.rewrittenContent || !cvData) return;

      // Update the CV section content
      setCvData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map(section =>
            section.id === observation.sectionId
              ? { ...section, content: observation.rewrittenContent! }
              : section
          ),
        };
      });

      // Mark observation as accepted
      setObservations(prev => prev.map(o =>
        o.id === observation.id ? { ...o, status: 'accepted' as const } : o
      ));

      setActiveSection(null);
    };

    const handleLock = () => {
      setObservations(prev => prev.map(o =>
        o.id === observation.id ? { ...o, status: 'locked' as const } : o
      ));
      setActiveSection(null);
    };

    const handleDecline = () => {
      setObservations(prev => prev.map(o =>
        o.id === observation.id ? { ...o, status: 'declined' as const } : o
      ));
      setActiveSection(null);
    };

    // Render based on action type and state
    const renderContent = () => {
      // ADD_INFO: Needs user input first (and no rewrittenContent yet)
      if (observation.actionType === 'add_info' && !observation.rewrittenContent) {
        return (
          <>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <div className="flex gap-3 items-start">
                <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                  {observation.message}
                </p>
              </div>
            </div>

            <div className="p-4 dark:bg-gray-900">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
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
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActiveSection(null)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {t('complete.back')}
                </button>
                <button
                  onClick={handleSubmitInput}
                  disabled={!userInput.trim() || isProcessing}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('submit')
                  )}
                </button>
              </div>
            </div>
          </>
        );
      }

      // REWRITE or ADD_INFO with generated content: Show preview
      return (
        <>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-3 items-start">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                {observation.message}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {t('complete.suggestedChange')}
              </span>
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-[10px]">{t('complete.back')}</span>
              </button>
            </div>

            {/* Preview of new content */}
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {observation.rewrittenContent}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLock}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
              >
                <Lock className="w-3 h-3" />
                {t('complete.lock')}
              </button>
              <button
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Check className="w-3 h-3" />
                {t('complete.apply')}
              </button>
            </div>
          </div>
        </>
      );
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        data-suggestion-popover
        className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {renderContent()}
      </motion.div>
    );
  };

  // Helper to format content with basic structure
  const formatContent = (content: string) => {
    // Split into paragraphs/lines
    const lines = content.split(/\n+/).filter(line => line.trim());

    return (
      <div className="space-y-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          // Detect bullet points
          if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
            return (
              <div key={i} className="flex gap-2 text-[11px] text-gray-600">
                <span className="text-gray-400 shrink-0">•</span>
                <span>{trimmed.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={i} className="text-[11px] leading-relaxed text-gray-600">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  // Improved section rendering
  const renderSection = (section: CVSection) => {
    const hasPending = !!getPendingObservation(section.id);
    const highlightClass = getHighlightClass(section.id);

    return (
      <div
        key={section.id}
        data-section-card
        className={cn(
          "relative mb-6 p-4 rounded-lg transition-all duration-300",
          highlightClass,
          hasPending && "cursor-pointer hover:shadow-md",
          !highlightClass && "bg-white"
        )}
        onClick={(e) => hasPending && handleSectionClick(section.id, e)}
      >
        {/* Section Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-800">{section.title}</h4>
            {section.organization && (
              <p className="text-xs text-gray-500 mt-0.5">{section.organization}</p>
            )}
          </div>
          {(section.startDate || section.endDate) && (
            <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded shrink-0 ml-4">
              {formatDateRange(section.startDate, section.endDate)}
            </span>
          )}
        </div>

        {/* Section Content */}
        <div className="mt-3">
          {formatContent(section.content)}
        </div>

        {/* Observation indicator */}
        {hasPending && (
          <div className="mt-3 flex items-center gap-2 text-amber-600">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-medium">Click to view suggestion</span>
          </div>
        )}

        {activeSection === section.id && <SuggestionPopover sectionId={section.id} />}
      </div>
    );
  };

  // Main CV Preview component structure
  const renderCVSections = () => {
    if (!cvData || !cvData.sections.length) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>No CV content to display</p>
        </div>
      );
    }

    // Group sections by type
    const summary = cvData.sections.find(s => s.type === 'summary');
    const jobs = cvData.sections.filter(s => s.type === 'job');
    const education = cvData.sections.filter(s => s.type === 'education');
    const skills = cvData.sections.filter(s => s.type === 'skill');
    const projects = cvData.sections.filter(s => s.type === 'project');
    const other = cvData.sections.filter(s => s.type === 'other');

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {decodeFilename(cvData.fileName.replace(/\.(pdf|docx?)$/i, '').replace(/_/g, ' '))}
          </h1>
          <p className="text-xs text-gray-400">
            Analyzed {new Date(cvData.uploadedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Summary */}
        {summary && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-400 rounded-full" />
              {t('section.summary')}
            </h3>
            {renderSection(summary)}
          </section>
        )}

        {/* Experience */}
        {jobs.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-green-400 rounded-full" />
              {t('section.experience')}
            </h3>
            <div className="space-y-4">
              {jobs.map(renderSection)}
            </div>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-400 rounded-full" />
              {t('section.education')}
            </h3>
            <div className="space-y-4">
              {education.map(renderSection)}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-400 rounded-full" />
              {t('section.projects')}
            </h3>
            <div className="space-y-4">
              {projects.map(renderSection)}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-400 rounded-full" />
              {t('section.skills')}
            </h3>
            <div className="space-y-4">
              {skills.map(renderSection)}
            </div>
          </section>
        )}

        {/* Other */}
        {other.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-gray-400 rounded-full" />
              {t('section.other')}
            </h3>
            <div className="space-y-4">
              {other.map(renderSection)}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-gray-200 dark:selection:bg-gray-700">
      {/* Left Pane: CV Preview */}
      <div className="w-[60%] h-screen p-8 border-r border-border flex flex-col relative overflow-hidden bg-gray-50/50 dark:bg-gray-900">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
             <div className="w-2 h-2 rounded-full bg-gray-400" />
             {t('app.title')}
          </div>
          <div className="flex items-center gap-4">
            {state !== "idle" && (pdfFile || cvData) && (
              <div className="text-xs text-gray-400 font-mono">
                {decodeFilename(pdfFile?.name || cvData?.fileName || '')}
              </div>
            )}
            <SettingsDropdown />
          </div>
        </header>

        <div className="flex-1 relative flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {state === "idle" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="w-full max-w-md">
                  <div
                    onClick={handleUpload}
                    className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{t('upload.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                      {t('upload.subtitle')}<br/>
                      <span className="text-xs opacity-70">{t('upload.formats')}</span>
                    </p>
                    {uploadError && (
                      <p className="text-sm text-red-600 mb-4 text-center">{uploadError}</p>
                    )}
                    <button
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      data-testid="button-choose-file"
                    >
                      {t('upload.button')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : state === "previewing" || state === "scanning" ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col max-w-[750px] mx-auto w-full bg-white shadow-xl rounded-sm border border-gray-200 relative overflow-hidden"
              >
                {/* PDF or Parsed Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {state === "previewing" && pdfFile ? (
                    pdfFile.type === "application/pdf" && pdfUrl ? (
                      <PDFViewer url={pdfUrl} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <FileText className="w-16 h-16 mb-4 text-gray-300" />
                        <p className="text-sm font-medium">{pdfFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">DOCX preview not available</p>
                        <p className="text-xs text-gray-400">Click "Analyze CV" to process</p>
                      </div>
                    )
                  ) : state === "scanning" && pdfFile?.type === "application/pdf" && pdfUrl ? (
                    <PDFViewer url={pdfUrl} />
                  ) : state === "scanning" ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      <p className="text-sm mt-4">Processing document...</p>
                    </div>
                  ) : (
                    renderCVSections()
                  )}
                </div>

                {/* Scanning Overlay */}
                {state === "scanning" && (
                  <motion.div
                    initial={{ top: "-10%" }}
                    animate={{ top: "110%" }}
                    transition={{
                      duration: 3,
                      ease: "linear",
                      repeat: Infinity,
                      repeatDelay: 0.5
                    }}
                    className="absolute left-0 right-0 h-2 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-[1px] z-10"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-blue-500/50" />
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col max-w-[750px] mx-auto w-full bg-white shadow-xl rounded-sm border border-gray-200 relative overflow-hidden"
              >
                <div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
                  {renderCVSections()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Right Pane: Analysis Results */}
      <div className="w-[40%] h-screen overflow-y-auto bg-white dark:bg-gray-950">
        <div className={cn(
          "max-w-xl mx-auto p-12 transition-all duration-500",
          (state === "idle" || state === "previewing") ? "h-full flex flex-col justify-center" : "pt-24"
        )}>
          <AnimatePresence mode="wait">
            {state === "idle" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-lg mx-auto"
              >
                <div className="mb-16 text-center">
                   <div className="mb-8 flex justify-center">
                      <Leaf className="w-24 h-24 text-[#6FC295]" strokeWidth={1.5} />
                   </div>
                   <h2 className="text-4xl font-medium text-gray-900 dark:text-gray-100 mb-4 tracking-tight">{t('app.title')}</h2>
                   <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">This automated caretaker evaluates a CV and suggests improvements aligned to the CREADIS Quality Standard.</p>
                </div>

                <div className="space-y-6 max-w-md mx-auto w-full">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 font-sans text-center">ASSESSMENT | SUGGESTION | GROWTH</h3>
                </div>
              </motion.div>
            ) : state === "previewing" ? (
              <motion.div
                key="previewing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-lg mx-auto"
              >
                <div className="mb-12 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{t('preview.title')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {pdfFile?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {pdfFile && `${(pdfFile.size / 1024).toFixed(1)} KB`}
                  </p>
                </div>

                <div className="space-y-4 max-w-sm mx-auto">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                    {t('preview.description')}
                  </p>

                  <button
                    onClick={handleAnalyze}
                    className="w-full px-6 py-3 bg-[#1a3a2a] text-white font-medium rounded-lg hover:bg-[#2a4a3a] transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('preview.analyze')}
                  </button>

                  <button
                    onClick={handleCancel}
                    className="w-full px-6 py-3 text-gray-500 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    {t('preview.cancel')}
                  </button>
                </div>
              </motion.div>
            ) : state === "scanning" ? (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 pt-8"
              >
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('scanning.title')}
                    </div>
                    {/* Skeletons */}
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.2 }}
                        className="h-24 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                      />
                    ))}
                 </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-10"
              >
                {/* Header */}
                <div className="flex items-center gap-3 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <Leaf className="w-6 h-6 text-[#6FC295]" strokeWidth={1.5} />
                  <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 tracking-tight">{t('complete.title')}</h1>
                </div>

                {/* Section 1: Strengths */}
                <section>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-gray-400" />
                    {t('complete.strengths')}
                  </motion.h2>
                  <div className="space-y-4">
                    {strengths.map((paragraph, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-l-2 border-gray-100 dark:border-gray-700 pl-4"
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </div>
                </section>

                {/* Section 2: Observations/Suggestions */}
                <section>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                    {t('complete.suggestions')}
                  </motion.h2>

                  {observations.filter(o => o.status !== 'declined').length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-sm text-gray-500 dark:text-gray-400 italic"
                    >
                      {t('complete.noSuggestions')}
                    </motion.p>
                  ) : (
                  <ul className="space-y-3">
                    {observations.filter(o => o.status !== 'declined').map((observation, i) => {
                      const isExpanded = expandedSuggestion === observation.id;
                      const isHandled = observation.status !== 'pending';

                      return (
                        <motion.li
                          key={observation.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + (i * 0.1) }}
                          onClick={() => !isHandled && handleSuggestionClick(observation.id)}
                          className={cn(
                            "text-sm relative pl-6 pr-4 py-3 rounded-md transition-all border",
                            isHandled
                              ? "bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800 text-green-800 dark:text-green-200 cursor-default"
                              : "bg-white dark:bg-gray-800 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "absolute left-2 top-4 w-1.5 h-1.5 rounded-full",
                            isHandled ? "bg-green-500" : "bg-amber-400"
                          )} />

                          <div className="flex justify-between items-start gap-4">
                            <span className={cn("text-gray-700 dark:text-gray-200", isHandled && "font-medium")}>
                              {observation.message}
                            </span>
                            {isHandled && <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />}
                          </div>

                          <AnimatePresence>
                            {isExpanded && !isHandled && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-3 pb-1">
                                  {observation.proposal && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600 mb-3">
                                      {observation.proposal}
                                    </div>
                                  )}
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={(e) => handleAction(observation.id, "declined", e)}
                                      className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      onClick={(e) => handleAction(observation.id, "accepted", e)}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 rounded transition-colors shadow-sm"
                                    >
                                      Accept Change
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      );
                    })}
                  </ul>
                  )}
                </section>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0 }}
                  className="pt-8 pb-12"
                >
                  <button className="group flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all px-6 py-3 rounded-md shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    {t('complete.roleAlignment')}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
