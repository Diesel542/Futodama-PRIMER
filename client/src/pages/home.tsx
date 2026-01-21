import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, ChevronRight, Sparkles, Loader2, Leaf, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CV, Observation, AnalyzeResponse, CVSection } from "@shared/schema";

// Types
type AppState = "idle" | "scanning" | "complete";

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
  const [state, setState] = useState<AppState>("idle");
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Real data state
  const [cvData, setCvData] = useState<CV | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setState("scanning");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/cv/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data: AnalyzeResponse = await response.json();

      setCvData(data.cv);
      setObservations(data.observations);
      setStrengths(data.strengths);
      setState("complete");

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      setState("idle");
    }
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

    const relatedObservations = observations.filter(o => o.sectionId === sectionId);

    if (relatedObservations.length === 0) {
      return 'bg-transparent';
    }

    const allResolved = relatedObservations.every(o => o.status !== 'pending');
    const hasAccepted = relatedObservations.some(o => o.status === 'accepted');

    const baseClasses = "-mx-4 px-4 py-4 rounded-sm transition-colors duration-1000 border border-transparent";

    if (allResolved && hasAccepted) {
      return `${baseClasses} bg-[#E8F5E9] shadow-[0_0_15px_rgba(232,245,233,0.5)]`; // Green - resolved
    }

    return `${baseClasses} bg-[#FDF6E3] shadow-[0_0_15px_rgba(253,246,227,0.5)]`; // Yellow - pending
  };

  // Helper to get pending observation for a section
  const getPendingObservation = (sectionId: string) => {
    return observations.find(o => o.sectionId === sectionId && o.status === 'pending');
  };

  const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pending = getPendingObservation(sectionId);
    if (pending) {
      setActiveSection(activeSection === sectionId ? null : sectionId);
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveSection(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const SuggestionPopover = ({ sectionId }: { sectionId: string }) => {
    const observation = getPendingObservation(sectionId);
    if (!observation) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex gap-3 items-start">
           <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
           <p className="text-xs font-medium text-gray-700 leading-relaxed font-sans">
             {observation.message}
           </p>
        </div>

        <div className="p-4 bg-white">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">SUGGESTED CHANGE</span>
              <button onClick={() => setActiveSection(null)} className="text-gray-400 hover:text-gray-600">
                <span className="text-[10px] font-sans">Back</span>
              </button>
           </div>

           {observation.proposal && (
             <div className="bg-amber-50/50 p-3 rounded text-xs text-gray-800 leading-relaxed mb-4 border border-amber-100/50 font-serif">
               {observation.proposal}
             </div>
           )}

           <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={(e) => {
                   handleAction(observation.id, "declined", e);
                   setActiveSection(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors font-sans border border-gray-200"
              >
                <Lock className="w-3 h-3" />
                Lock as is
              </button>
              <button
                onClick={(e) => {
                   handleAction(observation.id, "accepted", e);
                   setActiveSection(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-[#4A6763] hover:bg-[#3d5552] rounded transition-colors shadow-sm font-sans"
              >
                <Check className="w-3 h-3" />
                Apply Change
              </button>
           </div>
        </div>
      </motion.div>
    );
  };

  // Find which section a line belongs to (for highlighting)
  const findSectionForLine = (lineIndex: number): CVSection | null => {
    if (!cvData) return null;

    // Simple heuristic: check if line contains section title
    const lines = cvData.rawText.split('\n');
    const line = lines[lineIndex]?.trim();
    if (!line) return null;

    for (const section of cvData.sections) {
      if (section.title && line.includes(section.title.substring(0, 30))) {
        return section;
      }
    }
    return null;
  };

  // Render CV as original document - preserving PDF layout
  const renderCVSections = () => {
    if (!cvData) {
      return (
        <>
          <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-600 mb-1">Document Preview</h1>
              <div className="flex gap-4 text-xs text-gray-500 font-sans uppercase tracking-wide">
                <span>Uploaded CV</span>
              </div>
            </div>
            <DisCreadisLogo />
          </div>
          <p className="text-sm text-gray-500">CV content will appear here after analysis.</p>
        </>
      );
    }

    // Create a map of section start positions for highlighting
    const sectionHighlights = new Map<string, { start: number; end: number; section: CVSection }>();

    // Find positions of each section in rawText for highlighting
    cvData.sections.forEach((section) => {
      const startPos = cvData.rawText.indexOf(section.title);
      if (startPos !== -1) {
        // Find end of this section (start of next section or end of text)
        let endPos = cvData.rawText.length;
        cvData.sections.forEach((other) => {
          if (other.id !== section.id) {
            const otherStart = cvData.rawText.indexOf(other.title);
            if (otherStart > startPos && otherStart < endPos) {
              endPos = otherStart;
            }
          }
        });
        sectionHighlights.set(section.id, { start: startPos, end: endPos, section });
      }
    });

    // Render raw text with section highlighting
    const renderHighlightedText = () => {
      const text = cvData.rawText;
      const lines = text.split('\n');

      // Build a map of line index to section
      const lineToSection = new Map<number, CVSection>();
      let charIndex = 0;

      lines.forEach((line, lineIndex) => {
        const lineStart = charIndex;
        const lineEnd = charIndex + line.length;

        sectionHighlights.forEach(({ start, end, section }) => {
          if (lineStart >= start && lineStart < end) {
            lineToSection.set(lineIndex, section);
          }
        });

        charIndex = lineEnd + 1; // +1 for newline
      });

      // Render lines with highlighting
      return lines.map((line, index) => {
        const section = lineToSection.get(index);
        const hasPending = section ? !!getPendingObservation(section.id) : false;
        const highlightClass = section ? getHighlightClass(section.id) : '';

        // Check if this is a section title line
        const isTitle = section && line.trim() === section.title;

        return (
          <div
            key={index}
            className={cn(
              "relative",
              highlightClass && !isTitle ? highlightClass : "",
              hasPending ? "cursor-pointer" : ""
            )}
            onClick={(e) => section && hasPending && handleSectionClick(section.id, e)}
          >
            <span className={cn(
              "block",
              isTitle ? "font-bold text-gray-800" : ""
            )}>
              {line || '\u00A0'}
            </span>
            {section && activeSection === section.id && index === lines.findIndex(l => l.trim() === section.title) && (
              <SuggestionPopover sectionId={section.id} />
            )}
          </div>
        );
      });
    };

    return (
      <>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-600 mb-1">
              {cvData.fileName.replace(/\.(pdf|docx?)$/i, '')}
            </h1>
            <div className="text-xs text-gray-500 font-sans">
              Uploaded {new Date(cvData.uploadedAt).toLocaleDateString()}
            </div>
          </div>
          <DisCreadisLogo />
        </div>

        {/* Raw document content - preserving original layout */}
        <div className="text-[11px] leading-relaxed text-gray-700 font-serif">
          {renderHighlightedText()}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-gray-200">
      {/* Left Pane: CV Preview */}
      <div className="w-[60%] h-screen p-8 border-r border-border flex flex-col relative overflow-hidden bg-gray-50/50">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
             <div className="w-2 h-2 rounded-full bg-gray-400" />
             CV Health Check
          </div>
          {state !== "idle" && cvData && (
            <div className="text-xs text-gray-400 font-mono">
              {cvData.fileName}
            </div>
          )}
        </header>

        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {state === "idle" ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-md"
              >
                <div
                  onClick={handleUpload}
                  className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-400 hover:bg-white transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Upload CV</h3>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Drag and drop or click to select<br/>
                    <span className="text-xs opacity-70">PDF or DOCX supported</span>
                  </p>
                  {uploadError && (
                    <p className="text-sm text-red-600 mb-4 text-center">{uploadError}</p>
                  )}
                  <button
                    className="px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    data-testid="button-choose-file"
                  >
                    Choose File
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full max-w-[750px] bg-white shadow-xl rounded-sm border border-gray-200 relative overflow-hidden flex flex-col"
              >
                {/* Document Content */}
                <div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
                  {renderCVSections()}
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
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Right Pane: Analysis Results */}
      <div className="w-[40%] h-screen overflow-y-auto bg-white">
        <div className={cn(
          "max-w-xl mx-auto p-12 transition-all duration-500",
          state === "idle" ? "h-full flex flex-col justify-center" : "pt-24"
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
                   <h2 className="text-4xl font-medium text-gray-900 mb-4 tracking-tight">CV Health Check</h2>
                   <p className="text-lg text-gray-500 leading-relaxed max-w-sm mx-auto">This automated caretaker evaluates a CV and suggests improvements aligned to the CREADIS Quality Standard.</p>
                </div>

                <div className="space-y-6 max-w-md mx-auto w-full">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 font-sans text-center">ASSESSMENT | SUGGESTION | GROWTH</h3>
                </div>
              </motion.div>
            ) : state === "scanning" ? (
              <div className="space-y-12 pt-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing structure and content...
                    </div>
                    {/* Skeletons */}
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.2 }}
                        className="h-24 rounded-lg bg-gray-50 border border-gray-100"
                      />
                    ))}
                 </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-10"
              >
                {/* Header */}
                <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                  <Leaf className="w-6 h-6 text-[#6FC295]" strokeWidth={1.5} />
                  <h1 className="text-xl font-medium text-gray-900 tracking-tight">Analysis Complete</h1>
                </div>

                {/* Section 1: Strengths */}
                <section>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-gray-400" />
                    What's working well
                  </motion.h2>
                  <div className="space-y-4">
                    {strengths.map((paragraph, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="text-sm text-gray-700 leading-relaxed border-l-2 border-gray-100 pl-4"
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
                    className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                    Suggestions for improvement
                  </motion.h2>
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
                              ? "bg-green-50 border-green-100 text-green-800 cursor-default"
                              : "bg-white border-transparent hover:bg-gray-50 cursor-pointer hover:border-gray-200 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "absolute left-2 top-4 w-1.5 h-1.5 rounded-full",
                            isHandled ? "bg-green-500" : "bg-amber-400"
                          )} />

                          <div className="flex justify-between items-start gap-4">
                            <span className={cn(isHandled && "font-medium")}>
                              {observation.message}
                            </span>
                            {isHandled && <Check className="w-4 h-4 text-green-600 mt-0.5" />}
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
                                    <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600 border border-gray-100 mb-3">
                                      {observation.proposal}
                                    </div>
                                  )}
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={(e) => handleAction(observation.id, "declined", e)}
                                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      Decline
                                    </button>
                                    <button
                                      onClick={(e) => handleAction(observation.id, "accepted", e)}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded transition-colors shadow-sm"
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
                </section>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0 }}
                  className="pt-8 pb-12"
                >
                  <button className="group flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all px-6 py-3 rounded-md shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    Suggest role alignment draft
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
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
