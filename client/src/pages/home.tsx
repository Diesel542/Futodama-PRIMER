import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type AppState = "idle" | "scanning" | "complete";

// Mock Data
const MOCK_STRENGTHS = [
  "Strong technical leadership in distributed systems.",
  "Clear progression of responsibility over 5 years.",
  "Effective use of metrics to demonstrate impact.",
  "Consistent history of mentoring junior engineers.",
  "Excellent communication of cross-functional projects.",
];

const MOCK_SUGGESTIONS = [
  "Quantify the outcome of the cloud migration project.",
  "Condense the 'Skills' section to focus on core competencies.",
  "Clarify your specific role in the 2024 architecture overhaul.",
  "Align terminology with standard industry role descriptions.",
  "Add a brief summary statement at the top.",
];

const REWRITE_SAMPLE = {
  label: "Experience: Tech Lead",
  content: "Led a cross-functional team of 8 engineers in migrating legacy infrastructure to AWS, resulting in a 40% reduction in operational costs and 99.99% uptime.",
};

export default function Home() {
  const [state, setState] = useState<AppState>("idle");

  const handleUpload = () => {
    setState("scanning");
  };

  useEffect(() => {
    if (state === "scanning") {
      const timer = setTimeout(() => {
        setState("complete");
      }, 4500); // 4.5s scanning simulation
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-gray-200">
      {/* Left Pane: CV Preview */}
      <div className="w-1/2 h-screen p-8 border-r border-border flex flex-col relative overflow-hidden bg-gray-50/50">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
             <div className="w-2 h-2 rounded-full bg-gray-400" />
             CV Health Check
          </div>
          {state !== "idle" && (
            <div className="text-xs text-gray-400 font-mono">
              DOCX • 2.4MB
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
                  <button className="px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Choose File
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full max-w-[500px] bg-white shadow-lg rounded-sm border border-gray-200 relative overflow-hidden"
              >
                {/* Mock CV Content - Abstract Representation */}
                <div className="p-8 space-y-6 opacity-60 grayscale">
                  <div className="w-24 h-24 rounded-full bg-gray-200 mb-6" />
                  <div className="h-6 bg-gray-200 w-2/3 mb-2" />
                  <div className="h-4 bg-gray-100 w-1/3 mb-8" />
                  
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="h-4 bg-gray-100 w-5/6" />
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <div className="h-5 bg-gray-200 w-1/4 mb-2" />
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="h-4 bg-gray-100 w-4/5" />
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="h-5 bg-gray-200 w-1/4 mb-2" />
                    <div className="h-4 bg-gray-100 w-full" />
                    <div className="h-4 bg-gray-100 w-full" />
                  </div>
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
      <div className="w-1/2 h-screen overflow-y-auto bg-white">
        <div className="max-w-xl mx-auto p-12 pt-24">
          <AnimatePresence mode="wait">
            {state === "idle" ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center text-gray-300 space-y-4 pt-32"
              >
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Ready for analysis</p>
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
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                  <h1 className="text-xl font-medium text-gray-900 tracking-tight">Analysis Complete</h1>
                  <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                    Process finished
                  </span>
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
                    Strengths Observed
                  </motion.h2>
                  <ul className="space-y-3">
                    {MOCK_STRENGTHS.map((item, i) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        className="text-sm text-gray-700 pl-4 border-l-2 border-gray-100 flex items-start leading-relaxed"
                      >
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </section>

                {/* Section 2: Suggestions */}
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
                    {MOCK_SUGGESTIONS.map((item, i) => (
                      <motion.li 
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + (i * 0.1) }}
                        className="text-sm text-gray-700 pl-4 border-l-2 border-blue-100/50 flex items-start leading-relaxed"
                      >
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </section>

                {/* Section 3: Rewrite Sample */}
                <section>
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4"
                  >
                    Optional Rewrite Sample
                  </motion.h2>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="bg-gray-50 rounded-lg p-5 border border-gray-200/60"
                  >
                    <div className="text-xs text-gray-400 mb-2 font-mono uppercase tracking-wider">{REWRITE_SAMPLE.label}</div>
                    <p className="font-mono text-xs text-gray-600 leading-relaxed">
                      {REWRITE_SAMPLE.content}
                    </p>
                  </motion.div>
                </section>

                {/* CTA */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0 }}
                  className="pt-8"
                >
                  <button className="group flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-md hover:bg-gray-50 -ml-4">
                    Suggest role alignment draft
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
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
