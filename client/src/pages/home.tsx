import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Check, ChevronRight, Sparkles, Loader2, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type AppState = "idle" | "scanning" | "complete";

type SuggestionStatus = "pending" | "accepted" | "declined";

interface Suggestion {
  id: string;
  title: string;
  proposal: string;
  sectionId?: string; // Link to CV section
}

// Mock Data
const MOCK_STRENGTHS_PARAGRAPHS = [
  "Alex demonstrates exceptional technical leadership, particularly in architecting and migrating complex distributed systems. His tenure at Nexus Cloud Solutions highlights a clear trajectory of increasing responsibility, culminating in a significant role where he spearheaded critical infrastructure changes that directly impacted business metrics like cost and uptime.",
  "Beyond technical execution, Alex shows a strong commitment to team growth and engineering culture. His involvement in mentoring junior developers, contributing to open source, and engaging with the wider tech community through speaking and writing evidences a well-rounded senior engineer who elevates those around him."
];

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "1",
    title: "Quantify the outcome of the cloud migration project.",
    proposal: "Add metrics: '...resulting in 40% cost reduction and 99.99% uptime.'",
    sectionId: "job-1"
  },
  {
    id: "2",
    title: "Condense the 'Skills' section to focus on core competencies.",
    proposal: "Group skills by category (Languages, Infrastructure, Tools) and remove outdated technologies.",
    sectionId: "skills"
  },
  {
    id: "3",
    title: "Clarify your specific role in the 2024 architecture overhaul.",
    proposal: "Specify: 'Designed and implemented the event-driven architecture using Kafka...'",
    sectionId: "job-1"
  },
  {
    id: "4",
    title: "Align terminology with standard industry role descriptions.",
    proposal: "Change 'Tech Lead' to 'Staff Software Engineer' to better reflect scope.",
    sectionId: "job-1"
  },
  {
    id: "5",
    title: "Add a brief summary statement at the top.",
    proposal: "Draft: 'Senior Engineer with 7+ years experience in distributed systems...'",
    sectionId: "summary"
  },
  {
    id: "6",
    title: "Highlight contribution to open source projects.",
    proposal: "Mention specific PRs or libraries maintained.",
    sectionId: "projects"
  },
  {
    id: "8",
    title: "Standardize formatting for early career roles.",
    proposal: "Ensure the 'Junior Developer' role follows the same bullet point structure as recent roles.",
    sectionId: "job-3"
  },
  {
    id: "9",
    title: "Add specific conference details.",
    proposal: "Include year and location for KubeCon talk.",
    sectionId: "publications"
  }
];

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

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [suggestionStates, setSuggestionStates] = useState<Record<string, SuggestionStatus>>({});
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const handleUpload = () => {
    setState("scanning");
  };

  const handleSuggestionClick = (id: string) => {
    setExpandedSuggestion(expandedSuggestion === id ? null : id);
  };

  const handleAction = (id: string, action: "accepted" | "declined", e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggestionStates(prev => ({ ...prev, [id]: action }));
    setExpandedSuggestion(null);
  };

  useEffect(() => {
    if (state === "scanning") {
      const timer = setTimeout(() => {
        setState("complete");
      }, 4500); // 4.5s scanning simulation
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Helper to get highlight class based on state
  const getHighlightClass = (type: 'warm' | 'cool' | 'neutral', sectionId?: string) => {
    if (state !== 'complete') return '';
    
    // Check if section has pending suggestions
    let effectiveType = type;
    
    if (sectionId) {
       // Find all suggestions related to this section
       const relatedSuggestions = MOCK_SUGGESTIONS.filter(s => s.sectionId === sectionId);
       
       if (relatedSuggestions.length > 0) {
         // Check if ANY related suggestion is accepted (could be ALL, but let's do ANY for immediate feedback)
         // Actually user requirement: "As I accept changes... yellow sections should change to green"
         // Logic: If ALL pending suggestions for this section are resolved (accepted), turn green.
         // If there are unhandled suggestions, stay yellow.
         
         const hasUnhandled = relatedSuggestions.some(s => {
           const status = suggestionStates[s.id];
           return !status || status === 'pending'; // If any are pending, keep original color
         });
         
         const hasAccepted = relatedSuggestions.some(s => suggestionStates[s.id] === 'accepted');

         if (!hasUnhandled && hasAccepted) {
            effectiveType = 'cool'; // Turn green if all tasks done
         }
       }
    }
    
    switch (effectiveType) {
      case 'warm': return 'bg-[#FDF6E3] -mx-4 px-4 py-4 rounded-sm transition-colors duration-1000 border border-transparent shadow-[0_0_15px_rgba(253,246,227,0.5)]';
      case 'cool': return 'bg-[#E8F5E9] -mx-4 px-4 py-4 rounded-sm transition-colors duration-1000 border border-transparent shadow-[0_0_15px_rgba(232,245,233,0.5)]';
      case 'neutral': return 'bg-transparent transition-colors duration-1000';
    }
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
                className="w-full h-full max-w-[750px] bg-white shadow-xl rounded-sm border border-gray-200 relative overflow-hidden flex flex-col"
              >
                {/* Document Mockup */}
                <div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
                  {/* CV Header */}
                  <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-600 mb-1">Alex Morgan</h1>
                      <div className="flex gap-4 text-xs text-gray-500 font-sans uppercase tracking-wide">
                        <span>San Francisco, CA</span>
                        <span>•</span>
                        <span>alex.morgan@example.com</span>
                      </div>
                    </div>
                    <DisCreadisLogo />
                  </div>

                  {/* Summary */}
                  <div className={`mb-6 ${getHighlightClass('neutral', 'summary')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-sans">Professional Summary</h3>
                    <p className="text-[10px] leading-relaxed text-gray-600">
                      Senior Software Engineer with 7+ years of experience in distributed systems and cloud architecture. Proven track record of leading cross-functional teams and delivering scalable solutions, enhancing system reliability and reducing operational costs.
                    </p>
                  </div>

                  {/* Experience Section */}
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans px-2">Experience</h3>
                    
                    {/* Job 1 - Warm Highlight (Key Relevance) */}
                    <div className={`mb-6 ${getHighlightClass('warm', 'job-1')}`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Senior Tech Lead</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2021 — Present</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">Nexus Cloud Solutions</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Spearheaded the migration of legacy monolith to microservices architecture.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Mentored 5 junior developers, fostering a culture of code quality.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Reduced deployment time by 60% through CI/CD optimization.</li>
                      </ul>
                    </div>

                    {/* Job 2 - Cool Highlight (Good Context) */}
                    <div className={`mb-6 ${getHighlightClass('cool')}`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Software Engineer</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2018 — 2021</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">DataFlow Systems</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Developed real-time data processing pipelines using Apache Kafka.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Collaborated with product teams to define API specifications.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Improved test coverage from 65% to 90% using Jest and Cypress.</li>
                      </ul>
                    </div>

                    {/* Job 3 - Warm Highlight */}
                    <div className={`mb-6 ${getHighlightClass('warm', 'job-3')}`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Junior Developer</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2016 — 2018</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">StartUp Inc.</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Built responsive front-end components using React and Redux.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Assisted in database schema design and optimization.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Education Section - Neutral */}
                  <div className={`mb-6 ${getHighlightClass('neutral')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Education</h3>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-bold text-gray-600">B.S. Computer Science</h4>
                      <span className="text-[10px] text-gray-500 font-sans">2014 — 2018</span>
                    </div>
                    <div className="text-[11px] text-gray-600 italic mb-4">University of Technology, Seattle</div>
                    
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-bold text-gray-600">Cloud Architecture Certificate</h4>
                      <span className="text-[10px] text-gray-500 font-sans">2022</span>
                    </div>
                    <div className="text-[11px] text-gray-600 italic">AWS Certification Program</div>
                  </div>

                  {/* Projects Section - Warm Highlight */}
                  <div className={`mb-8 ${getHighlightClass('warm', 'projects')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans px-2">Projects</h3>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">OpenSource Contributor</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2020 — Present</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Active contributor to several popular React ecosystem libraries. Maintained documentation and implemented accessibility fixes.
                      </p>
                    </div>

                     <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Tech Blog Author</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2019 — Present</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Writing weekly articles about distributed systems, cloud architecture, and engineering leadership.
                      </p>
                    </div>
                  </div>

                  {/* Publications & Talks - Warm Highlight */}
                  <div className={`mb-8 ${getHighlightClass('warm', 'publications')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans px-2">Publications & Talks</h3>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Scaling Microservices at Edge</h4>
                        <span className="text-[10px] text-gray-500 font-sans">KubeCon 2023</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600 italic">
                        Speaker at KubeCon NA, discussing strategies for deploying and managing stateful workloads at the edge.
                      </p>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">The Future of Serverless</h4>
                        <span className="text-[10px] text-gray-500 font-sans">QCon 2022</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600 italic">
                        Panel discussion on the evolving landscape of serverless computing and its impact on developer velocity.
                      </p>
                    </div>
                  </div>

                  {/* Volunteering - Cool Highlight */}
                  <div className={`mb-8 ${getHighlightClass('cool')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans px-2">Volunteering</h3>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Code for America</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2020 — 2022</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Contributed to open-source civic tech projects to help improve government services.
                      </p>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-600">Tech Mentorship Program</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2019 — Present</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Mentoring underrepresented students in computer science to help them land their first internships.
                      </p>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Languages</h3>
                    <div className="flex gap-4 text-[10px] text-gray-600">
                       <span>English (Native)</span>
                       <span className="text-gray-300">|</span>
                       <span>Spanish (Professional Working)</span>
                       <span className="text-gray-300">|</span>
                       <span>French (Basic)</span>
                    </div>
                  </div>

                   {/* Skills Section */}
                   <div className={`mt-8 ${getHighlightClass('neutral', 'skills')}`}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Skills</h3>
                    <div className="flex gap-2 flex-wrap text-[10px] text-gray-600 font-sans">
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">React</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">Node.js</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">AWS</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">Docker</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">Kubernetes</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">Go</span>
                      <span className="bg-gray-100 px-2 py-1 rounded-sm">PostgreSQL</span>
                    </div>
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
      <div className="w-[40%] h-screen overflow-y-auto bg-white">
        <div className="max-w-xl mx-auto p-12 pt-24">
          <AnimatePresence mode="wait">
            {state === "idle" ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-center max-w-lg mx-auto"
              >
                <div className="mb-16 text-center">
                   <div className="w-32 h-32 bg-green-50 rounded-3xl flex items-center justify-center mb-8 border border-green-100 mx-auto shadow-sm">
                      <Leaf className="w-16 h-16 text-green-400" />
                   </div>
                   <h2 className="text-4xl font-medium text-gray-900 mb-4 tracking-tight">CV Health Check</h2>
                   <p className="text-lg text-gray-500 leading-relaxed max-w-sm mx-auto">
                     Our automated analysis evaluates your CV against industry standards for clarity, impact, and role alignment.
                   </p>
                </div>

                <div className="space-y-6 max-w-md mx-auto w-full">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 font-sans text-center">Analysis Criteria</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "Impact & Metrics", desc: "Quantifiable achievements and results" },
                    { label: "Role Alignment", desc: "Consistency with target seniority level" },
                    { label: "Skills Relevance", desc: "Modern technology stack grouping" },
                    { label: "Visual Clarity", desc: "Scannability and professional formatting" }
                  ].map((item, idx) => (
                    <motion.div 
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex gap-4 p-4 rounded-lg bg-gray-50/50 border border-gray-100/50 items-start"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      <div className="text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-0.5">{item.label}</h4>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                  </div>
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
                  <div className="space-y-4">
                    {MOCK_STRENGTHS_PARAGRAPHS.map((paragraph, i) => (
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
                    {MOCK_SUGGESTIONS.map((item, i) => {
                      const status = suggestionStates[item.id] || "pending";
                      const isExpanded = expandedSuggestion === item.id;
                      const isHandled = status !== "pending";

                      if (status === "declined") return null;

                      return (
                        <motion.li 
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + (i * 0.1) }}
                          onClick={() => !isHandled && handleSuggestionClick(item.id)}
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
                              {item.title}
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
                                  <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-600 border border-gray-100 mb-3">
                                    {item.proposal}
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button 
                                      onClick={(e) => handleAction(item.id, "declined", e)}
                                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                    >
                                      Decline
                                    </button>
                                    <button 
                                      onClick={(e) => handleAction(item.id, "accepted", e)}
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
