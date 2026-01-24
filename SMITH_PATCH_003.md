# PATCH 003: Two-Step Upload with PDF Preview
## Priority: HIGH — Major UX improvement

---

## Overview

Currently, uploading a CV immediately triggers analysis with an empty preview panel. Users have no confirmation of what they uploaded.

**New flow:**
```
idle → previewing → scanning → complete
```

1. User uploads PDF
2. PDF renders in left panel, right panel shows "Analyze CV" button
3. User clicks "Analyze CV"
4. Scanner animation runs over the visible PDF
5. Analysis completes, left panel transforms to parsed sections

---

## PART 1: Install PDF Rendering Library

```bash
npm install react-pdf
```

**Note:** react-pdf requires a PDF.js worker. Add this setup.

---

## PART 2: Update Types and State

**File:** `/client/src/pages/home.tsx`

### 2A: Update AppState type

**FIND:**
```tsx
type AppState = "idle" | "scanning" | "complete";
```

**REPLACE WITH:**
```tsx
type AppState = "idle" | "previewing" | "scanning" | "complete";
```

### 2B: Add new state variables

**FIND** the state declarations (around line 57-67):
```tsx
const [state, setState] = useState<AppState>("idle");
```

**ADD after the existing state declarations:**
```tsx
// PDF preview state
const [pdfFile, setPdfFile] = useState<File | null>(null);
const [pdfUrl, setPdfUrl] = useState<string | null>(null);
```

---

## PART 3: Add PDF Viewer Component

**ADD** these imports at the top of the file:
```tsx
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
```

**ADD** this component inside the Home function, before the return statement:
```tsx
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
```

**ADD** `useRef` to the React imports:
```tsx
import { useState, useEffect, useRef } from "react";
```

---

## PART 4: Update File Upload Handler

**FIND** the `handleFileSelect` function and **REPLACE** entirely:

```tsx
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
```

**ADD** a new function to handle the actual analysis:

```tsx
const handleAnalyze = async () => {
  if (!pdfFile) return;
  
  setState("scanning");
  
  const formData = new FormData();
  formData.append("file", pdfFile);

  try {
    const response = await fetch("/api/cv/analyze", {
      method: "POST",
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
```

**ADD** a function to cancel/reset:

```tsx
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
```

---

## PART 5: Update Left Panel (CV Preview Area)

**FIND** the left panel's AnimatePresence section and **REPLACE** with this structure:

```tsx
<div className="flex-1 relative flex flex-col">
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
          {state === "previewing" && pdfUrl ? (
            <PDFViewer url={pdfUrl} />
          ) : state === "scanning" && pdfUrl ? (
            <PDFViewer url={pdfUrl} />
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
```

---

## PART 6: Update Right Panel

**FIND** the right panel's AnimatePresence section and **UPDATE** to include the new "previewing" state:

```tsx
<AnimatePresence mode="wait">
  {state === "idle" ? (
    <motion.div
      key="idle"
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
        <p className="text-lg text-gray-500 leading-relaxed max-w-sm mx-auto">
          This automated caretaker evaluates a CV and suggests improvements aligned to the CREADIS Quality Standard.
        </p>
      </div>
      <div className="space-y-6 max-w-md mx-auto w-full">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 font-sans text-center">
          ASSESSMENT | SUGGESTION | GROWTH
        </h3>
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
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl font-medium text-gray-900 mb-2 tracking-tight">Ready to Analyze</h2>
        <p className="text-sm text-gray-500 mb-1">
          {pdfFile?.name}
        </p>
        <p className="text-xs text-gray-400">
          {pdfFile && `${(pdfFile.size / 1024).toFixed(1)} KB`}
        </p>
      </div>
      
      <div className="space-y-4 max-w-sm mx-auto">
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          Review the document preview, then click below to analyze and convert to CREADIS format.
        </p>
        
        <button
          onClick={handleAnalyze}
          className="w-full px-6 py-3 bg-[#1a3a2a] text-white font-medium rounded-lg hover:bg-[#2a4a3a] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Analyze CV
        </button>
        
        <button
          onClick={handleCancel}
          className="w-full px-6 py-3 text-gray-500 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
        >
          Cancel
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
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing structure and content...
        </div>
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
    </motion.div>
  ) : (
    <motion.div
      key="complete"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-10"
    >
      {/* ... existing complete state content (strengths, suggestions, etc.) ... */}
      {/* Keep all the existing "complete" state JSX here */}
    </motion.div>
  )}
</AnimatePresence>
```

**ADD** the FileText icon to imports:
```tsx
import { Upload, Check, ChevronRight, Sparkles, Loader2, Leaf, Lock, FileText } from "lucide-react";
```

---

## PART 7: Update Header to Show Filename

**FIND** the header section and update to show filename in previewing state too:

```tsx
<header className="mb-8 flex items-center justify-between">
  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
    <div className="w-2 h-2 rounded-full bg-gray-400" />
    CV Health Check
  </div>
  {state !== "idle" && (pdfFile || cvData) && (
    <div className="text-xs text-gray-400 font-mono">
      {decodeFilename(pdfFile?.name || cvData?.fileName || '')}
    </div>
  )}
</header>
```

---

## PART 8: Handle DOCX Files

For DOCX files, we can't render them like PDFs. Show a text preview instead.

**UPDATE** the PDFViewer usage to handle non-PDF files:

```tsx
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
```

---

## Verification Checklist

1. [ ] Upload PDF → PDF renders in left panel
2. [ ] Right panel shows file info + "Analyze CV" button
3. [ ] Click "Analyze CV" → Scanner animation over PDF
4. [ ] Analysis completes → Left panel shows parsed sections
5. [ ] Upload DOCX → Shows placeholder (no preview), can still analyze
6. [ ] "Cancel" button returns to idle state
7. [ ] Upload card is centered in idle state
8. [ ] CV preview is centered horizontally after analysis

---

## Summary of Changes

| File | Change |
|------|--------|
| `package.json` | Add `react-pdf` dependency |
| `/client/src/pages/home.tsx` | New state, PDF viewer, two-step flow |

**New states:**
- `previewing`: PDF visible, waiting for user to click Analyze
- Updated `scanning`: Scanner runs over visible PDF

**New components:**
- `PDFViewer`: Renders PDF pages using react-pdf

**New handlers:**
- `handleAnalyze`: Triggers actual API call
- `handleCancel`: Returns to idle state

---

**END OF PATCH**

*Patch version: 003*  
*Priority: HIGH*  
*Architect: Logos*
