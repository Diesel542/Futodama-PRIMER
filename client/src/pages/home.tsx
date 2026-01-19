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
                className="w-full h-full max-w-[500px] bg-white shadow-xl rounded-sm border border-gray-200 relative overflow-hidden flex flex-col"
              >
                {/* Document Mockup */}
                <div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
                  {/* CV Header */}
                  <div className="border-b border-gray-300 pb-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Alex Morgan</h1>
                    <div className="flex gap-4 text-xs text-gray-500 font-sans uppercase tracking-wide">
                      <span>San Francisco, CA</span>
                      <span>•</span>
                      <span>alex.morgan@example.com</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-sans">Professional Summary</h3>
                    <p className="text-[10px] leading-relaxed text-gray-600">
                      Senior Software Engineer with 7+ years of experience in distributed systems and cloud architecture. Proven track record of leading cross-functional teams and delivering scalable solutions, enhancing system reliability and reducing operational costs.
                    </p>
                  </div>

                  {/* Experience Section */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Experience</h3>
                    
                    {/* Job 1 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Senior Tech Lead</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2021 — Present</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">Nexus Cloud Solutions</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Spearheaded the migration of legacy monolith to microservices architecture.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Mentored 5 junior developers, fostering a culture of code quality.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Reduced deployment time by 60% through CI/CD optimization.</li>
                      </ul>
                    </div>

                    {/* Job 2 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Software Engineer</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2018 — 2021</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">DataFlow Systems</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Developed real-time data processing pipelines using Apache Kafka.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Collaborated with product teams to define API specifications.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Improved test coverage from 65% to 90% using Jest and Cypress.</li>
                      </ul>
                    </div>

                    {/* Job 3 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Junior Developer</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2016 — 2018</span>
                      </div>
                      <div className="text-[11px] text-gray-600 italic mb-2">StartUp Inc.</div>
                      <ul className="list-disc list-outside ml-3 space-y-1">
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Built responsive front-end components using React and Redux.</li>
                        <li className="text-[10px] leading-relaxed text-gray-600 pl-1">Assisted in database schema design and optimization.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Education Section */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Education</h3>
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-bold text-gray-800">B.S. Computer Science</h4>
                      <span className="text-[10px] text-gray-500 font-sans">2014 — 2018</span>
                    </div>
                    <div className="text-[11px] text-gray-600 italic mb-4">University of Technology, Seattle</div>
                    
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-bold text-gray-800">Cloud Architecture Certificate</h4>
                      <span className="text-[10px] text-gray-500 font-sans">2022</span>
                    </div>
                    <div className="text-[11px] text-gray-600 italic">AWS Certification Program</div>
                  </div>

                  {/* Projects Section */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Projects</h3>
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">OpenSource Contributor</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2020 — Present</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Active contributor to several popular React ecosystem libraries. Maintained documentation and implemented accessibility fixes.
                      </p>
                    </div>

                     <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Tech Blog Author</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2019 — Present</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Writing weekly articles about distributed systems, cloud architecture, and engineering leadership.
                      </p>
                    </div>
                  </div>

                  {/* Publications & Talks */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Publications & Talks</h3>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Scaling Microservices at Edge</h4>
                        <span className="text-[10px] text-gray-500 font-sans">KubeCon 2023</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600 italic">
                        Speaker at KubeCon NA, discussing strategies for deploying and managing stateful workloads at the edge.
                      </p>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">The Future of Serverless</h4>
                        <span className="text-[10px] text-gray-500 font-sans">QCon 2022</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600 italic">
                        Panel discussion on the evolving landscape of serverless computing and its impact on developer velocity.
                      </p>
                    </div>
                  </div>

                  {/* Volunteering */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">Volunteering</h3>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Code for America</h4>
                        <span className="text-[10px] text-gray-500 font-sans">2020 — 2022</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-gray-600">
                        Contributed to open-source civic tech projects to help improve government services.
                      </p>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-sm font-bold text-gray-800">Tech Mentorship Program</h4>
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
                   <div className="mt-8">
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
