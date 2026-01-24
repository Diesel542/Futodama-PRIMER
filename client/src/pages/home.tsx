import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, ChevronRight, Sparkles, Loader2, Leaf, Lock, FileText } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import { cn } from "@/lib/utils";
import { useSettings } from "../contexts/SettingsContext";
import { SettingsDropdown } from "../components/SettingsDropdown";
import { RoleCard } from "../components/RoleCard";
import { AnalysisPanel } from "../components/AnalysisPanel";
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // PDF preview state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Real data state
  const [cvData, setCvData] = useState<CV | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);

  // Set total when analysis completes
  useEffect(() => {
    if (observations.length > 0 && totalIssues === 0) {
      setTotalIssues(observations.length);
    }
  }, [observations, totalIssues]);

  // Calculate resolved count
  const resolvedIssues = useMemo(
    () => observations.filter((o) => ['accepted', 'declined', 'locked'].includes(o.status)).length,
    [observations]
  );

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

  // Handlers for RoleCard
  const handleApply = (observationId: string, newContent: string) => {
    const obs = observations.find(o => o.id === observationId);
    if (!obs) return;

    // Update CV content
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === obs.sectionId
            ? { ...section, content: newContent }
            : section
        ),
      };
    });

    // Mark as accepted
    setObservations(prev => prev.map(o =>
      o.id === observationId ? { ...o, status: 'accepted' } : o
    ));
  };

  const handleLock = (observationId: string) => {
    setObservations(prev => prev.map(o =>
      o.id === observationId ? { ...o, status: 'locked' } : o
    ));
  };

  const handleSubmitInput = async (observationId: string, input: string) => {
    const obs = observations.find(o => o.id === observationId);
    if (!obs || !cvData) return;

    const section = cvData.sections.find(s => s.id === obs.sectionId);
    if (!section) return;

    const response = await fetch('/api/cv/process-input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Language': language,
      },
      body: JSON.stringify({
        observationId,
        sectionId: obs.sectionId,
        userInput: input,
        section,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();

    setObservations(prev => prev.map(o =>
      o.id === observationId
        ? { ...o, rewrittenContent: data.rewrittenContent, proposal: data.proposal }
        : o
    ));
  };

  // Render section group with timeline
  const renderSectionGroup = (title: string, sections: CVSection[]) => {
    if (sections.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-4 pl-1">
          {title}
        </h2>
        <div className="relative">
          {/* Timeline spine */}
          <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Section cards */}
          <div className="space-y-4 pl-8">
            {sections.map(section => {
              const obs = observations.find(o => o.sectionId === section.id);
              return (
                <RoleCard
                  key={section.id}
                  section={section}
                  observation={obs}
                  onApply={handleApply}
                  onLock={handleLock}
                  onSubmitInput={handleSubmitInput}
                  t={t}
                  language={language}
                />
              );
            })}
          </div>
        </div>
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
    const jobs = cvData.sections.filter(s => s.type === 'job');
    const education = cvData.sections.filter(s => s.type === 'education');
    const otherSections = cvData.sections.filter(s => !['job', 'education'].includes(s.type));

    return (
      <>
        {renderSectionGroup(t('section.experience'), jobs)}
        {renderSectionGroup(t('section.education'), education)}
        {renderSectionGroup(t('section.other'), otherSections)}
      </>
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
                className="flex-1 overflow-y-auto"
              >
                <div className="max-w-[680px] mx-auto py-8 px-6">
                  {/* CV Header */}
                  {cvData && (
                    <div className="mb-8">
                      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        {decodeFilename(cvData.fileName).replace(/\.[^/.]+$/, '')}
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('analyzed')} {new Date(cvData.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Timeline + Cards */}
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
                  <h3 className="text-xs font-bold text-gray-400 mb-6 font-sans text-center">Assessment | Suggestion | Growth</h3>
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
                className="h-full -m-12"
              >
                <AnalysisPanel
                  strengths={strengths.join('\n\n')}
                  observations={observations}
                  totalIssues={totalIssues}
                  resolvedIssues={resolvedIssues}
                  language={language}
                  onObservationClick={handleSuggestionClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
