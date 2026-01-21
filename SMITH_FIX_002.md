# SMITH FIX 002: LLM-Assisted Parsing + CV Preview UI

**Priority:** CRITICAL  
**Issues:** 
1. Parser fails on real-world CVs (everything becomes one "other" section)
2. CV preview UI displays poorly formatted content

---

## Issue 1: Parser Can't Handle Real CV Formats

**Current problem:**
The regex-based parser only recognizes CVs with exact header matches like "Experience", "Education", etc. Real CVs have:
- Danish headers ("Erfaring", "Uddannelse")
- Varied formatting
- Prose-style content without clear headers
- PDF extraction artifacts

**Result:** Everything gets dumped into one `type: "other"` section with `parseConfidence: "low"`, which means no observations pass the confidence threshold.

**Solution:** Use Claude to intelligently parse the CV structure.

---

### New File: `/server/engine/llm-parser.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { CVSection, ParseResult } from '@shared/schema';

const anthropic = new Anthropic();

const PARSER_SYSTEM_PROMPT = `You are a CV/resume parser. Your job is to analyze raw CV text and identify distinct sections.

For each section you identify, extract:
1. type: one of "job", "education", "skill", "project", "summary", or "other"
2. title: the section heading or role title
3. organization: company/school name if applicable
4. startDate: in YYYY-MM format if found (e.g., "2020-01")
5. endDate: in YYYY-MM format if found, or "present" if current
6. content: the text content of that section

CRITICAL RULES:
- For job/experience sections, create ONE entry per role/position
- Extract dates even if they're in European format (e.g., "Januar 2020" → "2020-01")
- If a section has no clear type, use "other"
- Preserve the original language of the content
- Be thorough - don't skip sections

Respond with valid JSON only, no markdown, no explanation.`;

interface ParsedSection {
  type: 'job' | 'education' | 'skill' | 'project' | 'summary' | 'other';
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  content: string;
}

interface LLMParseResponse {
  sections: ParsedSection[];
}

export async function parseWithLLM(rawText: string): Promise<ParseResult> {
  const warnings: string[] = [];
  
  // Truncate if too long (Claude has context limits)
  const maxChars = 30000;
  const truncatedText = rawText.length > maxChars 
    ? rawText.substring(0, maxChars) + "\n...[truncated]"
    : rawText;
  
  if (rawText.length > maxChars) {
    warnings.push(`CV text truncated from ${rawText.length} to ${maxChars} characters`);
  }

  const prompt = `Parse this CV/resume into structured sections:

"""
${truncatedText}
"""

Return a JSON object with this structure:
{
  "sections": [
    {
      "type": "job|education|skill|project|summary|other",
      "title": "Section title or role name",
      "organization": "Company or school name (optional)",
      "startDate": "YYYY-MM format (optional)",
      "endDate": "YYYY-MM or 'present' (optional)",
      "content": "The full text content of this section"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0];
    if (text.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    let parsed: LLMParseResponse;
    try {
      // Clean up potential markdown code blocks
      const cleanJson = text.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch (jsonError) {
      console.error('Failed to parse LLM response as JSON:', text.text);
      warnings.push('LLM response was not valid JSON, falling back to basic parsing');
      return fallbackParse(rawText, warnings);
    }

    // Convert to CVSection format
    const sections: CVSection[] = parsed.sections.map((s, index) => {
      const wordCount = s.content.split(/\s+/).filter(w => w.length > 0).length;
      
      // Parse dates
      const startDate = parseDate(s.startDate);
      const endDate = parseDate(s.endDate);
      
      // Calculate duration
      let duration: number | undefined;
      if (startDate && endDate) {
        duration = calculateMonthsDifference(startDate, endDate);
      }

      return {
        id: `section-${index}-${uuidv4().slice(0, 8)}`,
        type: s.type,
        title: s.title,
        organization: s.organization,
        startDate,
        endDate,
        duration,
        content: s.content,
        wordCount,
        parseConfidence: 'high' as const, // LLM parsing is high confidence
      };
    });

    // Validate we got something useful
    if (sections.length === 0) {
      warnings.push('LLM did not identify any sections');
      return fallbackParse(rawText, warnings);
    }

    return {
      sections,
      unparsedContent: [],
      warnings,
      overallConfidence: 'high',
    };

  } catch (error) {
    console.error('LLM parsing failed:', error);
    warnings.push(`LLM parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return fallbackParse(rawText, warnings);
  }
}

function parseDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  
  const lower = dateStr.toLowerCase();
  if (lower === 'present' || lower === 'current' || lower === 'now' || lower === 'nu') {
    return new Date().toISOString();
  }
  
  // Try YYYY-MM format
  const yymm = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (yymm) {
    return new Date(`${yymm[1]}-${yymm[2]}-01`).toISOString();
  }
  
  // Try just year
  const year = dateStr.match(/^(\d{4})$/);
  if (year) {
    return new Date(`${year[1]}-01-01`).toISOString();
  }
  
  // Try to parse naturally
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  
  return undefined;
}

function calculateMonthsDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  return Math.max(1, months);
}

function fallbackParse(rawText: string, warnings: string[]): ParseResult {
  // Simple fallback: treat entire text as one section
  warnings.push('Using fallback parser - CV structure could not be determined');
  
  const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
  
  return {
    sections: [{
      id: `section-0-${uuidv4().slice(0, 8)}`,
      type: 'other',
      title: 'CV Content',
      content: rawText,
      wordCount,
      parseConfidence: 'low',
    }],
    unparsedContent: [],
    warnings,
    overallConfidence: 'low',
  };
}
```

---

### Update `/server/routes.ts`

Replace the parser import and usage:

**Old:**
```typescript
import { parseCV, validateParseResult } from "./engine/parser";
```

**New:**
```typescript
import { parseWithLLM } from "./engine/llm-parser";
```

**In the `/api/cv/analyze` handler, replace:**
```typescript
// Parse CV into structured sections
const parseResult = parseCV(extractedText, req.file.originalname);

// Validate parse result
if (!validateParseResult(parseResult)) {
  ...
}
```

**With:**
```typescript
// Parse CV into structured sections using LLM
const parseResult = await parseWithLLM(extractedText);

// Check if we got usable sections
if (parseResult.sections.length === 0 || parseResult.overallConfidence === 'low') {
  // Still continue, but with limited analysis
  console.warn('CV parsing had issues:', parseResult.warnings);
}
```

**Note:** Remove the hard validation failure - we want to show something even if parsing isn't perfect.

---

## Issue 2: CV Preview UI Looks Bad

**Current problem:**
- Raw text dump with no formatting
- No visual hierarchy
- Hard to read
- Doesn't look like a CV

**Solution:** Improve the CVPreview component styling.

---

### Update `/client/src/pages/home.tsx`

Replace the `renderSection` function and CV rendering with better styled version:

```tsx
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
      className={cn(
        "mb-6 p-4 rounded-lg transition-all duration-300",
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
          {cvData.fileName.replace(/\.(pdf|docx?)$/i, '').replace(/_/g, ' ')}
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
            Summary
          </h3>
          {renderSection(summary)}
        </section>
      )}

      {/* Experience */}
      {jobs.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-green-400 rounded-full" />
            Experience
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
            Education
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
            Projects
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
            Skills
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
            Additional Information
          </h3>
          <div className="space-y-4">
            {other.map(renderSection)}
          </div>
        </section>
      )}
    </div>
  );
};
```

---

### Update highlight classes

The highlight classes need to work well with the new card-based design:

```typescript
const getHighlightClass = (sectionId: string) => {
  if (state !== 'complete' || !observations.length) return '';

  const relatedObservations = observations.filter(o => o.sectionId === sectionId);

  if (relatedObservations.length === 0) {
    return '';
  }

  const allResolved = relatedObservations.every(o => o.status !== 'pending');
  const hasAccepted = relatedObservations.some(o => o.status === 'accepted');

  if (allResolved && hasAccepted) {
    return 'bg-green-50 border border-green-200 shadow-sm';
  }

  if (allResolved) {
    return 'bg-gray-50 border border-gray-200';
  }

  return 'bg-amber-50 border border-amber-200 shadow-sm';
};
```

---

## Testing Checklist

After implementing fixes:

1. [ ] Upload Ronni's CV (PDF) - should parse into multiple sections
2. [ ] Console shows sections with types like "job", "education", not just "other"
3. [ ] `parseConfidence` is "high" for most sections
4. [ ] Observations are generated (not empty array)
5. [ ] CV preview shows organized sections with headers
6. [ ] Content is formatted with bullet points where appropriate
7. [ ] Sections with observations have yellow background
8. [ ] Clicking highlighted section shows popover
9. [ ] Accept/decline changes highlight color

---

## File Summary

| File | Action |
|------|--------|
| `/server/engine/llm-parser.ts` | **CREATE** - New LLM-powered parser |
| `/server/routes.ts` | **UPDATE** - Use new parser |
| `/client/src/pages/home.tsx` | **UPDATE** - Better CV rendering |

---

**End of fix instructions**
