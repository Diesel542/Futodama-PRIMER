# SMITH FIX 001: PDF Parse + Dynamic CV Rendering

**Priority:** CRITICAL  
**Blocking:** Application cannot process PDFs

---

## Issue 1: pdfParse is not a function

**Error:**
```
TypeError: pdfParse is not a function
at <anonymous> (/home/runner/workspace/server/routes.ts:33:31)
```

**Cause:** ESM/CJS interop issue with `pdf-parse` package. The dynamic import returns a module object, not the function directly.

**File:** `/server/routes.ts`

**Current code (broken):**
```typescript
const pdfParse = (await import("pdf-parse")).default ?? (await import("pdf-parse"));
const pdfData = await pdfParse(fileBuffer);
```

**Fix — Replace the PDF handling block (lines ~48-52) with:**

```typescript
if (mimeType === "application/pdf") {
  // pdf-parse has ESM/CJS interop issues - need to handle multiple export patterns
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  
  // pdf-parse might export a function directly or as a property
  const parser = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
  
  if (typeof parser !== 'function') {
    console.error('pdf-parse module structure:', pdfParseModule);
    throw new Error('Could not load PDF parser');
  }
  
  const pdfData = await parser(fileBuffer);
  extractedText = pdfData.text;
}
```

**Alternative simpler fix if the above is too defensive:**

```typescript
if (mimeType === "application/pdf") {
  // Use require-style import for pdf-parse (CommonJS package)
  const pdfParse = require("pdf-parse");
  const pdfData = await pdfParse(fileBuffer);
  extractedText = pdfData.text;
}
```

**Note:** If using `require()`, you may need to add this at the top of the file:
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
```

---

## Issue 2: CV Preview Shows Hardcoded Content

**Current state:** Left panel shows a static mockup CV (Alex Morgan), not the actual uploaded CV.

**Goal:** Render the CV preview from `cvData.sections` when available.

**File:** `/client/src/pages/home.tsx`

### Step 1: Add CVSection import

At the top of the file, update the import:

```typescript
import type { CV, Observation, AnalyzeResponse, CVSection } from "@shared/schema";
```

### Step 2: Create helper function and CVPreview component

Add these above the `Home` function (around line 30):

```tsx
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

// Dynamic CV Preview Component
interface CVPreviewProps {
  cv: CV;
  observations: Observation[];
  getHighlightClass: (sectionId: string) => string;
  handleSectionClick: (sectionId: string, e: React.MouseEvent) => void;
  activeSection: string | null;
  SuggestionPopover: React.FC<{ sectionId: string }>;
}

const CVPreview: React.FC<CVPreviewProps> = ({
  cv,
  observations,
  getHighlightClass,
  handleSectionClick,
  activeSection,
  SuggestionPopover,
}) => {
  // Group sections by type
  const summary = cv.sections.find(s => s.type === 'summary');
  const jobs = cv.sections.filter(s => s.type === 'job');
  const education = cv.sections.filter(s => s.type === 'education');
  const skills = cv.sections.filter(s => s.type === 'skill');
  const projects = cv.sections.filter(s => s.type === 'project');
  const other = cv.sections.filter(s => s.type === 'other');

  const hasPendingObservation = (sectionId: string) => {
    return observations.some(o => o.sectionId === sectionId && o.status === 'pending');
  };

  const renderSection = (section: CVSection) => (
    <div
      key={section.id}
      className={`mb-6 relative ${getHighlightClass(section.id)} ${hasPendingObservation(section.id) ? 'cursor-pointer' : ''}`}
      onClick={(e) => handleSectionClick(section.id, e)}
    >
      <div className="flex justify-between items-baseline mb-1">
        <h4 className="text-sm font-bold text-gray-600">{section.title}</h4>
        {section.startDate && (
          <span className="text-[10px] text-gray-500 font-sans">
            {formatDateRange(section.startDate, section.endDate)}
          </span>
        )}
      </div>
      {section.organization && (
        <div className="text-[11px] text-gray-600 italic mb-2">{section.organization}</div>
      )}
      <div className="text-[10px] leading-relaxed text-gray-600 whitespace-pre-wrap">
        {section.content}
      </div>
      {activeSection === section.id && <SuggestionPopover sectionId={section.id} />}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-600 mb-1">
            {cv.fileName.replace(/\.(pdf|docx?)$/i, '')}
          </h1>
          <div className="text-xs text-gray-500 font-sans">
            Uploaded {new Date(cv.uploadedAt).toLocaleDateString()}
          </div>
        </div>
        <DisCreadisLogo />
      </div>

      {/* Summary */}
      {summary && (
        <div className={`mb-6 ${getHighlightClass(summary.id)}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 font-sans">
            Professional Summary
          </h3>
          <p className="text-[10px] leading-relaxed text-gray-600">
            {summary.content}
          </p>
        </div>
      )}

      {/* Experience */}
      {jobs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">
            Experience
          </h3>
          {jobs.map(renderSection)}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">
            Education
          </h3>
          {education.map(renderSection)}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">
            Projects
          </h3>
          {projects.map(renderSection)}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 font-sans">
            Skills
          </h3>
          {skills.map(section => (
            <div key={section.id} className={getHighlightClass(section.id)}>
              <div className="text-[10px] text-gray-600">{section.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Other sections */}
      {other.length > 0 && other.map(renderSection)}
    </>
  );
};
```

### Step 3: Replace the hardcoded CV content

Find the section inside the `state !== "idle"` branch that renders the CV document. Look for the `<div className="flex-1 p-8 overflow-y-auto font-serif...">` that contains all the hardcoded Alex Morgan content.

Replace the entire contents of that div with:

```tsx
<div className="flex-1 p-8 overflow-y-auto font-serif text-gray-800 select-none bg-white">
  {cvData ? (
    <CVPreview
      cv={cvData}
      observations={observations}
      getHighlightClass={getHighlightClass}
      handleSectionClick={handleSectionClick}
      activeSection={activeSection}
      SuggestionPopover={SuggestionPopover}
    />
  ) : (
    <div className="flex items-center justify-center h-full text-gray-400">
      Processing document...
    </div>
  )}
</div>
```

**Keep the scanning overlay** that follows this div — don't remove it.

---

## Testing Checklist

After applying fixes:

1. [ ] Upload a PDF CV — should not get "pdfParse is not a function" error
2. [ ] Upload a DOCX CV — should work as before  
3. [ ] CV preview shows actual uploaded content (not "Alex Morgan")
4. [ ] Sections appear grouped correctly (Experience, Education, Skills, etc.)
5. [ ] Sections with observations are highlighted yellow
6. [ ] Clicking a highlighted section shows the observation popover
7. [ ] Accepting an observation turns the section green
8. [ ] Observations panel on the right shows real LLM-phrased observations

---

## Priority Order

1. **Fix pdf-parse FIRST** — nothing works until PDFs can be processed
2. **Then fix CV preview** — makes the demo actually useful

---

## Debug Tip

If the pdf-parse fix doesn't work, add this logging to see the actual module structure:

```typescript
if (mimeType === "application/pdf") {
  const pdfParseModule = await import("pdf-parse");
  console.log('Module:', pdfParseModule);
  console.log('Module.default:', pdfParseModule.default);
  console.log('typeof default:', typeof pdfParseModule.default);
  // ... then figure out the right access pattern
}
```

---

**End of fix instructions**
