# PATCH 001: Parser + CV Preview Fix
## Priority: CRITICAL — System currently non-functional

**Issue:** First real CV upload produced zero observations. Parser failed, UI shows unformatted text dump.

**Root Cause:** Regex-based parser cannot handle real-world CV formats (Danish, non-standard headings, varied structure).

**Solution:** Replace regex parser with LLM-assisted parsing. Fix CV preview rendering.

---

## PART 1: LLM-Assisted Parser

### File: `/server/engine/parser.ts`

**Replace the entire file with this implementation:**

```typescript
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { CVSection, ParseResult } from '../../shared/schema';

const anthropic = new Anthropic();

/**
 * LLM-ASSISTED CV PARSER
 * 
 * The regex approach failed on real CVs. We now use Claude to 
 * extract structured sections from any CV format.
 */

interface LLMSection {
  type: 'job' | 'education' | 'skill' | 'project' | 'summary' | 'other';
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  content: string;
}

const PARSER_SYSTEM_PROMPT = `You are a CV parser. Extract structured sections from CV text.

Your job is to identify and extract:
1. Jobs/roles (with title, company, dates, description)
2. Education entries
3. Skills sections
4. Projects
5. Summary/profile sections

Return ONLY valid JSON. No markdown, no explanation.`;

const PARSER_USER_PROMPT = `Parse this CV into structured sections.

Return a JSON array where each object has:
- type: "job" | "education" | "skill" | "project" | "summary" | "other"
- title: string (job title, degree name, or section heading)
- organization: string or null (company name, school name)
- startDate: string or null (format: "YYYY-MM" or "YYYY")
- endDate: string or null (format: "YYYY-MM", "YYYY", or "present")
- content: string (the full description text for this entry)

Be thorough. This CV may have:
- Non-English text (Danish, German, etc.)
- Non-standard section headings
- Dates in various formats
- Multiple roles at the same company

Extract EVERYTHING. Better to over-extract than miss content.

CV TEXT:
"""
{CV_TEXT}
"""

Return ONLY the JSON array. No other text.`;

export async function parseCV(rawText: string, fileName: string): Promise<ParseResult> {
  const warnings: string[] = [];
  
  try {
    // Call Claude to extract sections
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: PARSER_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: PARSER_USER_PROMPT.replace('{CV_TEXT}', rawText)
      }]
    });

    const text = response.content[0];
    if (text.type !== 'text') {
      throw new Error('Unexpected response type from parser');
    }

    // Parse the JSON response
    let llmSections: LLMSection[];
    try {
      // Handle potential markdown code blocks
      let jsonText = text.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      llmSections = JSON.parse(jsonText);
    } catch (parseError) {
      warnings.push('LLM returned invalid JSON, falling back to basic parsing');
      return fallbackParse(rawText, fileName, warnings);
    }

    // Convert LLM sections to our CVSection format
    const sections: CVSection[] = llmSections.map((s, index) => {
      const startDate = normalizeDate(s.startDate);
      const endDate = normalizeDate(s.endDate);
      const duration = calculateDuration(startDate, endDate);
      const wordCount = countWords(s.content);

      return {
        id: `section-${index}-${uuidv4().slice(0, 8)}`,
        type: s.type,
        title: s.title || 'Untitled Section',
        organization: s.organization || undefined,
        startDate,
        endDate,
        duration,
        content: s.content || '',
        wordCount,
        parseConfidence: 'high', // LLM parsing is generally reliable
      };
    });

    // Filter out empty sections
    const validSections = sections.filter(s => s.content.length > 10 || s.type === 'skill');

    return {
      sections: validSections,
      unparsedContent: [],
      warnings,
      overallConfidence: validSections.length >= 2 ? 'high' : 'medium',
    };

  } catch (error) {
    console.error('LLM parsing failed:', error);
    warnings.push(`LLM parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return fallbackParse(rawText, fileName, warnings);
  }
}

/**
 * Fallback: Basic line-based parsing when LLM fails
 */
function fallbackParse(rawText: string, fileName: string, warnings: string[]): ParseResult {
  warnings.push('Using fallback parser - results may be limited');
  
  // Split by double newlines to get chunks
  const chunks = rawText.split(/\n\n+/).filter(c => c.trim().length > 20);
  
  const sections: CVSection[] = chunks.slice(0, 10).map((chunk, index) => {
    const lines = chunk.split('\n');
    const title = lines[0]?.trim() || 'Section';
    const content = lines.slice(1).join('\n').trim() || chunk;
    
    return {
      id: `section-${index}-${uuidv4().slice(0, 8)}`,
      type: 'other' as const,
      title: title.substring(0, 100),
      content,
      wordCount: countWords(content),
      parseConfidence: 'low' as const,
    };
  });

  return {
    sections,
    unparsedContent: [],
    warnings,
    overallConfidence: 'low',
  };
}

function normalizeDate(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  
  const lower = dateStr.toLowerCase().trim();
  if (lower === 'present' || lower === 'current' || lower === 'now' || lower === 'nu') {
    return new Date().toISOString();
  }

  // Try direct ISO parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Extract year and optional month
  const yearMonth = dateStr.match(/(\d{4})[-\/]?(\d{1,2})?/);
  if (yearMonth) {
    const year = yearMonth[1];
    const month = yearMonth[2] || '01';
    return new Date(`${year}-${month.padStart(2, '0')}-01`).toISOString();
  }

  // Just year
  const yearOnly = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearOnly) {
    return new Date(`${yearOnly[0]}-01-01`).toISOString();
  }

  return undefined;
}

function calculateDuration(startDate?: string, endDate?: string): number | undefined {
  if (!startDate) return undefined;
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 
    + (end.getMonth() - start.getMonth());
  
  return Math.max(1, months);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export function validateParseResult(result: ParseResult): boolean {
  if (result.sections.length === 0) return false;
  if (result.overallConfidence === 'low' && result.sections.length < 3) return false;
  return true;
}
```

---

## PART 2: Fix CV Preview Rendering

### File: `/client/src/pages/home.tsx`

The CV preview currently dumps raw text without formatting. We need to display it properly.

**FIND this section** (the CV preview area inside the "preview" motion.div):

Look for the document mockup div that currently shows hardcoded "Alex Morgan" content.

**REPLACE the hardcoded CV content with a dynamic renderer:**

```tsx
{/* CV Content - Dynamic Rendering */}
<div className="flex-1 p-8 overflow-y-auto bg-white">
  {cvData ? (
    <div className="space-y-6">
      {/* Header from filename */}
      <div className="border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-xl font-bold text-gray-700">{cvData.fileName.replace(/\.[^.]+$/, '')}</h1>
        <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(cvData.uploadedAt).toLocaleDateString()}</p>
      </div>
      
      {/* Sections */}
      {cvData.sections.map((section) => {
        const relatedObservations = observations.filter(o => o.sectionId === section.id);
        const hasPending = relatedObservations.some(o => o.status === 'pending');
        const hasAccepted = relatedObservations.some(o => o.status === 'accepted');
        const allResolved = relatedObservations.length > 0 && !hasPending;
        
        let highlightClass = '';
        if (relatedObservations.length > 0) {
          if (allResolved && hasAccepted) {
            highlightClass = 'bg-[#E8F5E9] border-l-4 border-green-300';
          } else if (hasPending) {
            highlightClass = 'bg-[#FDF6E3] border-l-4 border-amber-300';
          }
        }
        
        return (
          <div 
            key={section.id} 
            className={`p-4 rounded-sm transition-colors duration-500 ${highlightClass}`}
          >
            {/* Section Header */}
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-sm font-bold text-gray-700">{section.title}</h3>
              {section.startDate && (
                <span className="text-xs text-gray-400">
                  {formatDateRange(section.startDate, section.endDate)}
                </span>
              )}
            </div>
            
            {section.organization && (
              <p className="text-xs text-gray-500 italic mb-2">{section.organization}</p>
            )}
            
            {/* Section Content */}
            <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    /* Fallback: Show raw text with basic formatting */
    <div className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed font-serif">
      {/* This shows during scanning before cvData is set */}
      Analyzing document...
    </div>
  )}
</div>
```

**ADD this helper function** near the top of the file (after imports):

```tsx
function formatDateRange(startDate?: string, endDate?: string): string {
  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    // If it's within the last month, treat as "Present"
    if (Math.abs(now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000) {
      return 'Present';
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  const start = formatDate(startDate);
  const end = formatDate(endDate) || 'Present';
  
  if (!start) return '';
  return `${start} — ${end}`;
}
```

---

## PART 3: Update Routes to Handle Async Parser

### File: `/server/routes.ts`

The parser is now async (LLM call). Ensure the route handles this:

**VERIFY** that the analyze endpoint awaits the parser:

```typescript
// This should already be correct, but verify:
const parseResult = await parseCV(extractedText, req.file.originalname);
```

If `parseCV` wasn't being awaited, add `await`.

---

## PART 4: Improve Error Feedback in UI

### File: `/client/src/pages/home.tsx`

When parsing fails or returns low confidence, the user should see something helpful, not an empty panel.

**FIND** the strengths rendering section.

**ADD** a fallback for empty observations:

```tsx
{/* Suggestions Section */}
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
  
  {observations.length === 0 ? (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-sm text-gray-500 italic"
    >
      This CV appears well-structured. No specific suggestions at this time.
    </motion.p>
  ) : (
    <ul className="space-y-3">
      {/* ... existing observation mapping ... */}
    </ul>
  )}
</section>
```

---

## PART 5: Verification Checklist

After implementing, test with the same Danish CV:

1. [ ] Parser returns `parseConfidence: "high"` or `"medium"`
2. [ ] Sections array has multiple entries (jobs, education, etc.)
3. [ ] CV preview shows formatted sections, not raw text dump
4. [ ] Observations array has at least 1-2 entries
5. [ ] Strengths text is specific (not generic fallback)
6. [ ] Yellow highlights appear on sections with pending observations
7. [ ] Console shows LLM API calls being made

---

## PART 6: Dependencies

Ensure `@anthropic-ai/sdk` is installed:

```bash
npm install @anthropic-ai/sdk
```

Ensure the API key is loaded. In `/server/index.ts` or wherever env is loaded:

```typescript
// Anthropic SDK auto-loads ANTHROPIC_API_KEY from environment
// No manual configuration needed if .env is loaded
```

If using dotenv, ensure it's initialized early:

```typescript
import 'dotenv/config';
// or
import dotenv from 'dotenv';
dotenv.config();
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `/server/engine/parser.ts` | Complete rewrite: LLM-assisted parsing |
| `/client/src/pages/home.tsx` | Dynamic CV preview rendering + helper function |
| `/server/routes.ts` | Verify async handling (likely already correct) |

**Do not touch:**
- Analyzers (density, temporal, structural) — they're fine
- Observation generator — it's fine
- LLM phrasing (`claude.ts`) — it's fine
- Storage — it's fine

The problem was **input** (parser), not processing.

---

## Expected Result After Patch

The same Danish CV should produce:

1. **CV Preview:** Properly formatted sections with titles, organizations, dates, and content
2. **Sections:** 5-10 structured sections (jobs at Little Studio, Jacob Jensen, Privateers, etc.)
3. **Observations:** 3-6 observations about density, missing metrics, etc.
4. **Strengths:** Specific statements about career progression and experience breadth
5. **Highlights:** Yellow backgrounds on sections that have pending observations

---

**END OF PATCH SPECIFICATION**

*Patch version: 001*  
*Priority: CRITICAL*  
*Architect: Logos*
