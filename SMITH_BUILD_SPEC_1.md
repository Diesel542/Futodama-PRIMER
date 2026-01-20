# PRIMER v0: CV Health Check Engine
## Build Specification for Smith (Claude Code)

**Project:** Futodama-PRIMER  
**Version:** 0.1.0  
**Architect:** Logos  
**Date:** January 2026

---

## 0. CORE PRINCIPLE

**Primer v0 is a structural analysis engine, not a matching engine.**

It has ONE job:
> Turn a raw CV into structured data + grounded observations.

The pipeline is deterministic except for two LLM touchpoints (phrasing and rewriting).

```
parse → analyze → observe → phrase → return
```

No magic. No vibes. Signals → observations → natural phrasing.

---

## 1. THE OWNER'S COMMANDMENT

**Read this. Memorize it. Do not violate it.**

> "Never show a number in the UI.  
> Never show a score.  
> Never show an index.  
> Observations must be phrased, not quantified."

If you find yourself writing `{observation.confidence}` or `{section.densityScore}` anywhere in UI code, **STOP**. You are violating the core design principle.

Scores exist internally for ranking and filtering. They are **never exposed to users**.

---

## 2. FILE STRUCTURE (MANDATORY)

You MUST create this exact structure. Do not combine files. Do not "simplify" by merging. Each file has a single responsibility.

```
/server
  /engine
    parser.ts              # CV text → structured sections
    analyzer_density.ts    # Words-per-month analysis
    analyzer_temporal.ts   # Recency and gap detection
    analyzer_structural.ts # Metrics, outcomes, tools detection
    observationGenerator.ts # Signals → observations
    thresholds.ts          # Configurable constants
  /llm
    claude.ts              # All LLM interactions
  routes.ts                # API endpoints
  storage.ts               # In-memory CV store

/shared
  schema.ts                # Type definitions

/client
  /src
    /pages
      home.tsx             # UPDATE: Replace mocks with real data
```

**Why this structure matters:**
- Each analyzer is independently testable
- LLM code is isolated (easy to mock, easy to swap)
- Thresholds are configurable without code changes
- Clear separation of concerns

---

## 3. DATA MODEL

**File: `/shared/schema.ts`**

Replace the existing content with:

```typescript
import { z } from "zod";

// ============================================
// CV SECTION
// ============================================

export interface CVSection {
  id: string;
  type: 'job' | 'education' | 'skill' | 'project' | 'summary' | 'other';
  title: string;
  organization?: string;
  startDate?: string;      // ISO date string
  endDate?: string;        // ISO date string, null = present
  duration?: number;       // computed: months
  content: string;         // raw text of this section
  wordCount: number;       // computed
  
  // Parser metadata
  parseConfidence: 'high' | 'medium' | 'low';
  
  // Analyzer outputs (internal only, never sent to UI)
  densityScore?: number;   // words per month
  recencyScore?: number;   // months since end date
  completeness?: {
    hasMetrics: boolean;
    hasOutcomes: boolean;
    hasTools: boolean;
    hasTeamSize: boolean;
  };
}

// ============================================
// OBSERVATION
// ============================================

export type ObservationType = 'density' | 'temporal' | 'structural';
export type ObservationStatus = 'pending' | 'accepted' | 'declined' | 'locked';

export interface Observation {
  id: string;
  sectionId: string;
  type: ObservationType;
  confidence: number;      // 0-1, internal only
  signal: string;          // internal code: "sparse_density"
  message: string;         // user-facing phrased observation
  proposal?: string;       // suggested improvement text
  status: ObservationStatus;
}

// ============================================
// CV (ROOT OBJECT)
// ============================================

export interface CV {
  id: string;
  uploadedAt: string;      // ISO date string
  fileName: string;
  rawText: string;
  sections: CVSection[];
  observations: Observation[];
  strengths: string[];     // 2-3 phrased strength statements
}

// ============================================
// PARSE RESULT (internal)
// ============================================

export interface ParseResult {
  sections: CVSection[];
  unparsedContent: string[];   // chunks we couldn't classify
  warnings: string[];          // parse issues
  overallConfidence: 'high' | 'medium' | 'low';
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface AnalyzeResponse {
  cv: CV;
  observations: Observation[];
  strengths: string[];
}

export interface RewriteResponse {
  original: string;
  rewritten: string;
}

export interface ObservationResponse {
  success: boolean;
  observation: Observation;
}

export interface ErrorResponse {
  error: string;
  code: 'PARSE_FAILED' | 'FILE_TOO_SHORT' | 'UNSUPPORTED_FORMAT' | 'ANALYSIS_FAILED' | 'SECTION_NOT_FOUND';
  details?: string;
}

// ============================================
// ZOD VALIDATORS (for API input validation)
// ============================================

export const RewriteRequestSchema = z.object({
  sectionId: z.string().min(1),
});

export const ObservationRespondSchema = z.object({
  observationId: z.string().min(1),
  response: z.enum(['accepted', 'declined', 'locked']),
});
```

---

## 4. THRESHOLDS (CONFIGURABLE)

**File: `/server/engine/thresholds.ts`**

```typescript
/**
 * PRIMER THRESHOLDS
 * 
 * These values are initial estimates. They MUST be validated
 * against real CREADIS CVs and adjusted accordingly.
 * 
 * DO NOT hardcode these values elsewhere. Always import from here.
 */

export const DENSITY_THRESHOLDS = {
  SPARSE_BELOW: 4,        // words per month - below this is sparse
  DENSE_ABOVE: 25,        // words per month - above this is unusually dense
  IDEAL_MIN: 8,           // words per month - healthy minimum
  IDEAL_MAX: 20,          // words per month - healthy maximum
};

export const TEMPORAL_THRESHOLDS = {
  OUTDATED_MONTHS: 36,    // experience older than this is "outdated"
  RECENT_MONTHS: 12,      // experience within this is "recent"
  GAP_WARNING_MONTHS: 6,  // unexplained gap longer than this triggers warning
};

export const STRUCTURAL_INDICATORS = {
  // Regex patterns for detection
  METRICS: /\d+%|\$[\d,]+|\d+x|\d+\s*(users|customers|clients|employees|team members)/gi,
  OUTCOMES: /\b(resulted|improved|reduced|increased|decreased|achieved|delivered|saved|generated|grew|accelerated)\b/gi,
  TOOLS: /\b(Python|JavaScript|TypeScript|Java|Go|Rust|AWS|Azure|GCP|Docker|Kubernetes|React|Node|SQL|PostgreSQL|MongoDB|Kafka|Redis|TensorFlow|PyTorch)\b/gi,
  TEAM_SIZE: /\b(team of|led|managed|supervised)\s*\d+/gi,
};

export const CONFIDENCE_THRESHOLDS = {
  MINIMUM_TO_SHOW: 0.7,   // observations below this are not shown
  HIGH: 0.85,             // high confidence
  MEDIUM: 0.7,            // medium confidence
};

export const PARSE_THRESHOLDS = {
  MIN_CONTENT_LENGTH: 100,        // characters
  MAX_UNPARSED_RATIO: 0.3,        // if > 30% unparsed, fail gracefully
};
```

---

## 5. PARSER

**File: `/server/engine/parser.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { CVSection, ParseResult } from '@shared/schema';

/**
 * PARSER
 * 
 * Responsibility: Turn raw CV text into structured CVSection[].
 * 
 * This parser is intentionally simple for v0. It will be improved
 * based on real-world CV formats encountered.
 */

// Section header patterns (case-insensitive)
const SECTION_PATTERNS = {
  job: /^(experience|work\s*experience|employment|professional\s*experience|work\s*history)/i,
  education: /^(education|academic|qualifications|degrees)/i,
  skill: /^(skills|technical\s*skills|competencies|technologies|expertise)/i,
  project: /^(projects|personal\s*projects|portfolio|key\s*projects)/i,
  summary: /^(summary|profile|about|professional\s*summary|objective)/i,
};

// Date extraction patterns
const DATE_PATTERNS = {
  // "Jan 2020 - Present", "2020-2023", "January 2020 – December 2023"
  range: /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—to]+\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current|now)/gi,
  // Just a year range: "2020 - 2023"
  yearRange: /\b(20\d{2})\s*[-–—]\s*(20\d{2}|present|current|now)\b/gi,
};

export function parseCV(rawText: string, fileName: string): ParseResult {
  const warnings: string[] = [];
  const unparsedContent: string[] = [];
  const sections: CVSection[] = [];
  
  // Normalize line endings and clean up
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  
  // Split into potential sections by double newlines or headers
  const chunks = splitIntoChunks(text);
  
  let currentSectionType: CVSection['type'] = 'other';
  let currentContent: string[] = [];
  let sectionCount = 0;
  
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    
    // Check if this chunk is a section header
    const detectedType = detectSectionType(trimmed);
    
    if (detectedType && detectedType !== currentSectionType) {
      // Save previous section if exists
      if (currentContent.length > 0) {
        const section = buildSection(
          currentSectionType,
          currentContent.join('\n'),
          sectionCount++,
          warnings
        );
        if (section) {
          sections.push(section);
        }
      }
      
      currentSectionType = detectedType;
      currentContent = [trimmed];
    } else {
      currentContent.push(trimmed);
    }
  }
  
  // Don't forget the last section
  if (currentContent.length > 0) {
    const section = buildSection(
      currentSectionType,
      currentContent.join('\n'),
      sectionCount++,
      warnings
    );
    if (section) {
      sections.push(section);
    }
  }
  
  // Extract job entries from experience sections
  const expandedSections = expandJobSections(sections, warnings);
  
  // Calculate overall parse confidence
  const totalContent = rawText.length;
  const parsedContent = expandedSections.reduce((sum, s) => sum + s.content.length, 0);
  const unparsedRatio = 1 - (parsedContent / totalContent);
  
  let overallConfidence: 'high' | 'medium' | 'low' = 'high';
  if (unparsedRatio > 0.3) {
    overallConfidence = 'low';
    warnings.push(`${Math.round(unparsedRatio * 100)}% of content could not be parsed into sections`);
  } else if (unparsedRatio > 0.15) {
    overallConfidence = 'medium';
  }
  
  return {
    sections: expandedSections,
    unparsedContent,
    warnings,
    overallConfidence,
  };
}

function splitIntoChunks(text: string): string[] {
  // Split on double newlines or lines that look like headers (ALL CAPS or followed by colon)
  return text.split(/\n\n+|\n(?=[A-Z][A-Z\s]+:?\n)/);
}

function detectSectionType(text: string): CVSection['type'] | null {
  const firstLine = text.split('\n')[0].trim();
  
  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(firstLine)) {
      return type as CVSection['type'];
    }
  }
  
  return null;
}

function buildSection(
  type: CVSection['type'],
  content: string,
  index: number,
  warnings: string[]
): CVSection | null {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return null;
  
  const title = lines[0].trim();
  const bodyContent = lines.slice(1).join('\n').trim();
  const wordCount = bodyContent.split(/\s+/).filter(w => w.length > 0).length;
  
  // Extract dates if present
  const dates = extractDates(content);
  
  // Calculate duration if we have dates
  let duration: number | undefined;
  if (dates.start && dates.end) {
    duration = calculateMonthsDifference(dates.start, dates.end);
  }
  
  // Determine parse confidence for this section
  let parseConfidence: 'high' | 'medium' | 'low' = 'high';
  if (type === 'other') {
    parseConfidence = 'low';
    warnings.push(`Could not classify section: "${title.substring(0, 50)}..."`);
  } else if (!dates.start && type === 'job') {
    parseConfidence = 'medium';
    warnings.push(`No dates found for job section: "${title}"`);
  }
  
  return {
    id: `section-${index}-${uuidv4().slice(0, 8)}`,
    type,
    title,
    content: bodyContent || content,
    wordCount,
    startDate: dates.start,
    endDate: dates.end,
    duration,
    parseConfidence,
  };
}

function extractDates(text: string): { start?: string; end?: string } {
  // Try to find date ranges
  const rangeMatch = text.match(DATE_PATTERNS.range);
  
  if (rangeMatch) {
    const [_, start, end] = rangeMatch;
    return {
      start: normalizeDate(start),
      end: normalizeDate(end),
    };
  }
  
  return {};
}

function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  const lower = dateStr.toLowerCase();
  if (lower === 'present' || lower === 'current' || lower === 'now') {
    return new Date().toISOString();
  }
  
  // Try to parse as date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  
  // If just a year, use January 1
  const yearMatch = dateStr.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return new Date(`${yearMatch[1]}-01-01`).toISOString();
  }
  
  return undefined;
}

function calculateMonthsDifference(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
    + (endDate.getMonth() - startDate.getMonth());
  
  return Math.max(1, months); // At least 1 month
}

function expandJobSections(sections: CVSection[], warnings: string[]): CVSection[] {
  // For now, return as-is. 
  // Future: Split "Experience" section into individual job entries
  return sections;
}

export function validateParseResult(result: ParseResult): boolean {
  // Check if we have enough parsed content
  if (result.sections.length === 0) {
    return false;
  }
  
  if (result.overallConfidence === 'low') {
    return false;
  }
  
  return true;
}
```

---

## 6. DENSITY ANALYZER

**File: `/server/engine/analyzer_density.ts`**

```typescript
import { CVSection } from '@shared/schema';
import { DENSITY_THRESHOLDS } from './thresholds';

/**
 * DENSITY ANALYZER
 * 
 * Measures words-per-month for job/project sections.
 * Detects sections that are too sparse (undertended) or too dense.
 */

export interface DensitySignal {
  sectionId: string;
  signal: 'sparse_density' | 'dense_but_shallow' | 'healthy_density';
  densityScore: number;
  confidence: number;
  details: {
    wordCount: number;
    durationMonths: number;
    wordsPerMonth: number;
  };
}

export function analyzeDensity(section: CVSection): DensitySignal | null {
  // Only analyze sections that have duration
  if (!section.duration || section.duration <= 0) {
    return null;
  }
  
  // Only analyze jobs and projects
  if (section.type !== 'job' && section.type !== 'project') {
    return null;
  }
  
  const wordsPerMonth = section.wordCount / section.duration;
  
  // Update section with computed score
  section.densityScore = wordsPerMonth;
  
  // Determine signal
  let signal: DensitySignal['signal'];
  let confidence: number;
  
  if (wordsPerMonth < DENSITY_THRESHOLDS.SPARSE_BELOW) {
    signal = 'sparse_density';
    // More sparse = more confident this is a problem
    confidence = Math.min(0.95, 0.7 + (DENSITY_THRESHOLDS.SPARSE_BELOW - wordsPerMonth) * 0.05);
  } else if (wordsPerMonth > DENSITY_THRESHOLDS.DENSE_ABOVE) {
    signal = 'dense_but_shallow';
    // Very high density might indicate list-dumping
    confidence = Math.min(0.85, 0.6 + (wordsPerMonth - DENSITY_THRESHOLDS.DENSE_ABOVE) * 0.01);
  } else {
    signal = 'healthy_density';
    confidence = 0.9;
  }
  
  // Reduce confidence if parse confidence was low
  if (section.parseConfidence === 'low') {
    confidence *= 0.6;
  } else if (section.parseConfidence === 'medium') {
    confidence *= 0.8;
  }
  
  return {
    sectionId: section.id,
    signal,
    densityScore: wordsPerMonth,
    confidence,
    details: {
      wordCount: section.wordCount,
      durationMonths: section.duration,
      wordsPerMonth,
    },
  };
}

export function analyzeDensityAll(sections: CVSection[]): DensitySignal[] {
  return sections
    .map(analyzeDensity)
    .filter((signal): signal is DensitySignal => signal !== null);
}
```

---

## 7. TEMPORAL ANALYZER

**File: `/server/engine/analyzer_temporal.ts`**

```typescript
import { CVSection } from '@shared/schema';
import { TEMPORAL_THRESHOLDS } from './thresholds';

/**
 * TEMPORAL ANALYZER
 * 
 * Detects:
 * - Outdated experience (last activity > N months ago)
 * - Recent but thin sections
 * - Large unexplained gaps
 */

export interface TemporalSignal {
  sectionId: string;
  signal: 'outdated_experience' | 'recent_but_thin' | 'large_gap' | 'current_and_healthy';
  recencyScore: number; // months since end date
  confidence: number;
  details: {
    endDate?: string;
    monthsSinceEnd: number;
  };
}

export function analyzeTemporal(section: CVSection): TemporalSignal | null {
  // Only analyze jobs and projects with end dates
  if (section.type !== 'job' && section.type !== 'project') {
    return null;
  }
  
  const now = new Date();
  let monthsSinceEnd: number;
  
  if (!section.endDate) {
    // No end date - assume current if it's a job
    monthsSinceEnd = 0;
  } else {
    const endDate = new Date(section.endDate);
    monthsSinceEnd = (now.getFullYear() - endDate.getFullYear()) * 12 
      + (now.getMonth() - endDate.getMonth());
  }
  
  // Update section with computed score
  section.recencyScore = monthsSinceEnd;
  
  // Determine signal
  let signal: TemporalSignal['signal'];
  let confidence: number;
  
  if (monthsSinceEnd > TEMPORAL_THRESHOLDS.OUTDATED_MONTHS) {
    signal = 'outdated_experience';
    confidence = Math.min(0.9, 0.7 + (monthsSinceEnd - TEMPORAL_THRESHOLDS.OUTDATED_MONTHS) * 0.005);
  } else if (monthsSinceEnd < TEMPORAL_THRESHOLDS.RECENT_MONTHS && section.wordCount < 50) {
    signal = 'recent_but_thin';
    confidence = 0.75;
  } else {
    signal = 'current_and_healthy';
    confidence = 0.85;
  }
  
  // Reduce confidence if parse confidence was low
  if (section.parseConfidence === 'low') {
    confidence *= 0.6;
  } else if (section.parseConfidence === 'medium') {
    confidence *= 0.8;
  }
  
  return {
    sectionId: section.id,
    signal,
    recencyScore: monthsSinceEnd,
    confidence,
    details: {
      endDate: section.endDate,
      monthsSinceEnd,
    },
  };
}

export function analyzeTemporalAll(sections: CVSection[]): TemporalSignal[] {
  return sections
    .map(analyzeTemporal)
    .filter((signal): signal is TemporalSignal => signal !== null);
}

/**
 * Detect gaps between consecutive jobs
 */
export function detectGaps(sections: CVSection[]): TemporalSignal[] {
  const jobs = sections
    .filter(s => s.type === 'job' && s.endDate && s.startDate)
    .sort((a, b) => new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime());
  
  const gaps: TemporalSignal[] = [];
  
  for (let i = 0; i < jobs.length - 1; i++) {
    const current = jobs[i];
    const previous = jobs[i + 1];
    
    const currentStart = new Date(current.startDate!);
    const previousEnd = new Date(previous.endDate!);
    
    const gapMonths = (currentStart.getFullYear() - previousEnd.getFullYear()) * 12
      + (currentStart.getMonth() - previousEnd.getMonth());
    
    if (gapMonths > TEMPORAL_THRESHOLDS.GAP_WARNING_MONTHS) {
      gaps.push({
        sectionId: current.id,
        signal: 'large_gap',
        recencyScore: gapMonths,
        confidence: Math.min(0.85, 0.6 + gapMonths * 0.02),
        details: {
          monthsSinceEnd: gapMonths,
        },
      });
    }
  }
  
  return gaps;
}
```

---

## 8. STRUCTURAL ANALYZER

**File: `/server/engine/analyzer_structural.ts`**

```typescript
import { CVSection } from '@shared/schema';
import { STRUCTURAL_INDICATORS } from './thresholds';

/**
 * STRUCTURAL ANALYZER
 * 
 * Detects presence or absence of:
 * - Metrics (numbers, percentages, dollar amounts)
 * - Outcomes (result verbs)
 * - Tools (technologies)
 * - Team context (team size, management)
 */

export interface StructuralSignal {
  sectionId: string;
  signal: 'missing_metrics' | 'missing_outcomes' | 'missing_tools' | 'missing_team_context' | 'well_structured';
  confidence: number;
  completeness: {
    hasMetrics: boolean;
    hasOutcomes: boolean;
    hasTools: boolean;
    hasTeamSize: boolean;
  };
}

export function analyzeStructure(section: CVSection): StructuralSignal[] {
  // Only analyze jobs and projects
  if (section.type !== 'job' && section.type !== 'project') {
    return [];
  }
  
  const content = section.content;
  const signals: StructuralSignal[] = [];
  
  // Check each structural element
  const hasMetrics = STRUCTURAL_INDICATORS.METRICS.test(content);
  const hasOutcomes = STRUCTURAL_INDICATORS.OUTCOMES.test(content);
  const hasTools = STRUCTURAL_INDICATORS.TOOLS.test(content);
  const hasTeamSize = STRUCTURAL_INDICATORS.TEAM_SIZE.test(content);
  
  // Reset regex lastIndex (global flag issue)
  STRUCTURAL_INDICATORS.METRICS.lastIndex = 0;
  STRUCTURAL_INDICATORS.OUTCOMES.lastIndex = 0;
  STRUCTURAL_INDICATORS.TOOLS.lastIndex = 0;
  STRUCTURAL_INDICATORS.TEAM_SIZE.lastIndex = 0;
  
  // Update section completeness
  section.completeness = {
    hasMetrics,
    hasOutcomes,
    hasTools,
    hasTeamSize,
  };
  
  const baseConfidence = section.parseConfidence === 'high' ? 0.85 
    : section.parseConfidence === 'medium' ? 0.7 
    : 0.5;
  
  // Generate signals for missing elements
  if (!hasMetrics) {
    signals.push({
      sectionId: section.id,
      signal: 'missing_metrics',
      confidence: baseConfidence * 0.9,
      completeness: section.completeness,
    });
  }
  
  if (!hasOutcomes) {
    signals.push({
      sectionId: section.id,
      signal: 'missing_outcomes',
      confidence: baseConfidence * 0.85,
      completeness: section.completeness,
    });
  }
  
  // Tools are less critical - lower confidence signal
  if (!hasTools && section.type === 'job') {
    signals.push({
      sectionId: section.id,
      signal: 'missing_tools',
      confidence: baseConfidence * 0.6,
      completeness: section.completeness,
    });
  }
  
  // Team context is important for senior roles
  if (!hasTeamSize && section.content.toLowerCase().includes('lead')) {
    signals.push({
      sectionId: section.id,
      signal: 'missing_team_context',
      confidence: baseConfidence * 0.75,
      completeness: section.completeness,
    });
  }
  
  // If everything is present, emit positive signal
  if (hasMetrics && hasOutcomes && signals.length === 0) {
    signals.push({
      sectionId: section.id,
      signal: 'well_structured',
      confidence: 0.9,
      completeness: section.completeness,
    });
  }
  
  return signals;
}

export function analyzeStructureAll(sections: CVSection[]): StructuralSignal[] {
  return sections.flatMap(analyzeStructure);
}
```

---

## 9. OBSERVATION GENERATOR

**File: `/server/engine/observationGenerator.ts`**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { CVSection, Observation, ObservationType } from '@shared/schema';
import { CONFIDENCE_THRESHOLDS } from './thresholds';
import { DensitySignal, analyzeDensityAll } from './analyzer_density';
import { TemporalSignal, analyzeTemporalAll, detectGaps } from './analyzer_temporal';
import { StructuralSignal, analyzeStructureAll } from './analyzer_structural';

/**
 * OBSERVATION GENERATOR
 * 
 * Converts analyzer signals into Observation objects.
 * Filters by confidence threshold.
 * Does NOT phrase observations - that's the LLM's job.
 */

interface RawObservation {
  sectionId: string;
  type: ObservationType;
  signal: string;
  confidence: number;
  context: Record<string, any>; // Data for LLM phrasing
}

export function generateObservations(sections: CVSection[]): RawObservation[] {
  const raw: RawObservation[] = [];
  
  // Run all analyzers
  const densitySignals = analyzeDensityAll(sections);
  const temporalSignals = analyzeTemporalAll(sections);
  const gapSignals = detectGaps(sections);
  const structuralSignals = analyzeStructureAll(sections);
  
  // Convert density signals
  for (const signal of densitySignals) {
    if (signal.signal === 'healthy_density') continue; // Don't observe healthy
    
    raw.push({
      sectionId: signal.sectionId,
      type: 'density',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        wordCount: signal.details.wordCount,
        durationMonths: signal.details.durationMonths,
        wordsPerMonth: signal.details.wordsPerMonth,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }
  
  // Convert temporal signals
  for (const signal of temporalSignals) {
    if (signal.signal === 'current_and_healthy') continue;
    
    raw.push({
      sectionId: signal.sectionId,
      type: 'temporal',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        monthsSinceEnd: signal.details.monthsSinceEnd,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }
  
  // Convert gap signals
  for (const signal of gapSignals) {
    raw.push({
      sectionId: signal.sectionId,
      type: 'temporal',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        gapMonths: signal.details.monthsSinceEnd,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }
  
  // Convert structural signals
  for (const signal of structuralSignals) {
    if (signal.signal === 'well_structured') continue;
    
    raw.push({
      sectionId: signal.sectionId,
      type: 'structural',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        completeness: signal.completeness,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }
  
  // Filter by confidence threshold
  const filtered = raw.filter(o => o.confidence >= CONFIDENCE_THRESHOLDS.MINIMUM_TO_SHOW);
  
  // Sort by confidence (highest first)
  filtered.sort((a, b) => b.confidence - a.confidence);
  
  // Limit to top 8 observations (avoid overwhelming)
  return filtered.slice(0, 8);
}

export function createObservation(raw: RawObservation, message: string, proposal?: string): Observation {
  return {
    id: `obs-${uuidv4().slice(0, 8)}`,
    sectionId: raw.sectionId,
    type: raw.type,
    confidence: raw.confidence,
    signal: raw.signal,
    message,
    proposal,
    status: 'pending',
  };
}

/**
 * Identify positive signals for strengths
 */
export interface StrengthSignal {
  signal: string;
  confidence: number;
  context: Record<string, any>;
}

export function identifyStrengths(sections: CVSection[]): StrengthSignal[] {
  const strengths: StrengthSignal[] = [];
  
  // Check for consistent progression
  const jobs = sections.filter(s => s.type === 'job').sort((a, b) => {
    if (!a.startDate || !b.startDate) return 0;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
  
  if (jobs.length >= 2) {
    // Check if titles suggest progression
    const titles = jobs.map(j => j.title.toLowerCase());
    const hasProgression = titles.some((t, i) => {
      if (i === 0) return false;
      const current = t;
      const previous = titles[i - 1];
      return (current.includes('senior') && !previous.includes('senior')) ||
             (current.includes('lead') && !previous.includes('lead')) ||
             (current.includes('manager') && !previous.includes('manager'));
    });
    
    if (hasProgression) {
      strengths.push({
        signal: 'consistent_progression',
        confidence: 0.8,
        context: { jobCount: jobs.length },
      });
    }
  }
  
  // Check for metrics presence across sections
  const sectionsWithMetrics = sections.filter(s => s.completeness?.hasMetrics);
  if (sectionsWithMetrics.length >= 2) {
    strengths.push({
      signal: 'metrics_present',
      confidence: 0.85,
      context: { count: sectionsWithMetrics.length },
    });
  }
  
  // Check for recent activity
  const recentJobs = sections.filter(s => 
    s.type === 'job' && 
    s.recencyScore !== undefined && 
    s.recencyScore < 12
  );
  if (recentJobs.length > 0) {
    strengths.push({
      signal: 'recent_activity',
      confidence: 0.9,
      context: {},
    });
  }
  
  // Check for balanced density
  const densityScores = sections
    .filter(s => s.densityScore !== undefined)
    .map(s => s.densityScore!);
  
  if (densityScores.length >= 2) {
    const avg = densityScores.reduce((a, b) => a + b, 0) / densityScores.length;
    const variance = densityScores.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / densityScores.length;
    
    if (variance < 50 && avg >= 8 && avg <= 20) {
      strengths.push({
        signal: 'balanced_density',
        confidence: 0.75,
        context: { averageWordsPerMonth: avg },
      });
    }
  }
  
  return strengths;
}
```

---

## 10. LLM INTEGRATION

**File: `/server/llm/claude.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk';

/**
 * CLAUDE LLM INTEGRATION
 * 
 * Two functions:
 * 1. phraseObservation - Turn signal + context into natural language
 * 2. rewriteSection - Generate improved prose for a section
 */

const anthropic = new Anthropic();

// ============================================
// OBSERVATION PHRASING
// ============================================

const OBSERVATION_SYSTEM_PROMPT = `You are writing concise, professional observations about CV sections for a CV improvement tool.

CRITICAL CONSTRAINTS:
- Never use numbers, scores, or percentages in your output
- Never say "you should" or "I recommend"
- Never use words: "weak", "poor", "bad", "lacking", "insufficient", "needs improvement"
- Use weight-language: "carrying", "holding", "representing", "showing", "reflects"
- Be specific to the actual content described
- ONE sentence maximum
- Sound like noticing, not judging
- Write as if you are a senior editor making an observation, not giving advice

TONE: Calm, precise, observational. Like noting that a plant needs water, not criticizing it for being thirsty.`;

interface ObservationContext {
  signal: string;
  sectionTitle?: string;
  wordCount?: number;
  durationMonths?: number;
  wordsPerMonth?: number;
  monthsSinceEnd?: number;
  gapMonths?: number;
  completeness?: {
    hasMetrics: boolean;
    hasOutcomes: boolean;
    hasTools: boolean;
    hasTeamSize: boolean;
  };
}

export async function phraseObservation(context: ObservationContext): Promise<string> {
  const prompt = buildObservationPrompt(context);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: OBSERVATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return text.text.trim();
}

function buildObservationPrompt(context: ObservationContext): string {
  const { signal, sectionTitle } = context;
  
  switch (signal) {
    case 'sparse_density':
      return `Signal: sparse_density
Section: "${sectionTitle || 'Experience section'}"
Duration: ${context.durationMonths} months of work
Content: Only ${context.wordCount} words describing this period

Write one sentence observing that this substantial period of work has very little representation in the CV.`;

    case 'dense_but_shallow':
      return `Signal: dense_but_shallow
Section: "${sectionTitle || 'Experience section'}"
The section has many words but may be listing rather than describing.

Write one sentence observing that the section has volume but may benefit from more structure.`;

    case 'outdated_experience':
      return `Signal: outdated_experience
Section: "${sectionTitle || 'Experience section'}"
This experience ended ${context.monthsSinceEnd} months ago.

Write one sentence observing that this experience is from some time ago, without suggesting it's bad.`;

    case 'recent_but_thin':
      return `Signal: recent_but_thin
Section: "${sectionTitle || 'Experience section'}"
This is recent work but has very little detail.

Write one sentence observing that recent work could show more of what was accomplished.`;

    case 'large_gap':
      return `Signal: large_gap
There appears to be a ${context.gapMonths}-month gap before this role.

Write one sentence noting the gap in the timeline, neutrally.`;

    case 'missing_metrics':
      return `Signal: missing_metrics
Section: "${sectionTitle || 'Experience section'}"
No specific numbers, percentages, or quantified outcomes are present.

Write one sentence observing that the impact of this work isn't quantified.`;

    case 'missing_outcomes':
      return `Signal: missing_outcomes
Section: "${sectionTitle || 'Experience section'}"
The description lists activities but not results.

Write one sentence observing that what was accomplished isn't visible.`;

    case 'missing_tools':
      return `Signal: missing_tools
Section: "${sectionTitle || 'Experience section'}"
No specific technologies or tools are mentioned.

Write one sentence observing that the technical specifics aren't visible.`;

    case 'missing_team_context':
      return `Signal: missing_team_context
Section: "${sectionTitle || 'Experience section'}"
This appears to be a leadership role but team context isn't specified.

Write one sentence observing that the scope of leadership isn't clear.`;

    default:
      return `Signal: ${signal}
Section: "${sectionTitle || 'Section'}"

Write one sentence making a neutral observation about this section.`;
  }
}

// ============================================
// PROPOSAL GENERATION
// ============================================

export async function generateProposal(signal: string, sectionTitle: string): Promise<string> {
  const prompt = `For a CV section titled "${sectionTitle}" that has the issue: ${signal}

Write a brief, specific suggestion (one sentence) for what could be added or clarified.
Do not rewrite the section - just suggest what's missing.
Be specific, not generic.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return text.text.trim();
}

// ============================================
// SECTION REWRITE
// ============================================

const REWRITE_SYSTEM_PROMPT = `You are rewriting a CV section to be clearer and more impactful.

CRITICAL CONSTRAINTS:
- Match the approximate length of the original (±20%)
- Do NOT add information that wasn't implied in the original
- Do NOT invent metrics or outcomes
- Preserve the person's voice where possible
- Improve structure and clarity, not substance
- Use active voice
- Lead with impact where possible
- Be specific, not generic

TONE: Professional, crisp, enterprise-appropriate. No embellishment.`;

export async function rewriteSection(
  originalContent: string,
  sectionTitle: string,
  organization?: string,
  duration?: number
): Promise<string> {
  const context = [
    `Section: ${sectionTitle}`,
    organization ? `Organization: ${organization}` : null,
    duration ? `Duration: ${duration} months` : null,
  ].filter(Boolean).join('\n');

  const prompt = `${context}

Original content:
"""
${originalContent}
"""

Rewrite this section to be clearer and more impactful, following the constraints in your instructions.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: REWRITE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return text.text.trim();
}

// ============================================
// STRENGTHS PHRASING
// ============================================

const STRENGTHS_SYSTEM_PROMPT = `You are summarizing what a CV does well.

CRITICAL CONSTRAINTS:
- Focus ONLY on what is present and strong
- Do NOT mention what's missing
- 2-3 sentences maximum
- Be specific, reference actual content
- Sound confident but not effusive

TONE: Like a senior reviewer noting genuine strengths.`;

export async function phraseStrengths(
  signals: Array<{ signal: string; context: Record<string, any> }>,
  sectionSummaries: string[]
): Promise<string[]> {
  if (signals.length === 0) {
    return ['This CV presents professional experience in a clear format.'];
  }

  const signalDescriptions = signals.map(s => {
    switch (s.signal) {
      case 'consistent_progression':
        return 'Shows clear career progression across roles';
      case 'metrics_present':
        return 'Quantifies impact with specific metrics';
      case 'recent_activity':
        return 'Includes current, relevant experience';
      case 'balanced_density':
        return 'Maintains consistent detail across sections';
      default:
        return s.signal;
    }
  });

  const prompt = `Based on this CV analysis:

Positive signals detected:
${signalDescriptions.map(d => `- ${d}`).join('\n')}

Section summaries:
${sectionSummaries.slice(0, 3).join('\n')}

Write 2-3 sentences summarizing what this CV does well. Be specific and reference the actual content.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: STRENGTHS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  // Split into array of sentences/paragraphs
  return text.text.trim().split(/\n\n+/).filter(s => s.length > 0);
}
```

---

## 11. STORAGE

**File: `/server/storage.ts`**

Replace the existing content:

```typescript
import { CV, Observation } from '@shared/schema';

/**
 * IN-MEMORY STORAGE FOR V0
 * 
 * This is intentionally simple. We're not using a database yet.
 * CVs are stored for the session duration only.
 * 
 * For v1, this will be replaced with proper persistence.
 */

class CVStorage {
  private cvs: Map<string, CV> = new Map();
  
  store(cv: CV): void {
    this.cvs.set(cv.id, cv);
  }
  
  get(id: string): CV | undefined {
    return this.cvs.get(id);
  }
  
  updateObservation(cvId: string, observationId: string, status: Observation['status']): Observation | undefined {
    const cv = this.cvs.get(cvId);
    if (!cv) return undefined;
    
    const observation = cv.observations.find(o => o.id === observationId);
    if (!observation) return undefined;
    
    observation.status = status;
    return observation;
  }
  
  getSection(cvId: string, sectionId: string) {
    const cv = this.cvs.get(cvId);
    if (!cv) return undefined;
    return cv.sections.find(s => s.id === sectionId);
  }
  
  // For debugging
  listAll(): CV[] {
    return Array.from(this.cvs.values());
  }
  
  clear(): void {
    this.cvs.clear();
  }
}

export const cvStorage = new CVStorage();
```

---

## 12. API ROUTES

**File: `/server/routes.ts`**

Replace the existing content:

```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import mammoth from "mammoth";
import { v4 as uuidv4 } from 'uuid';

import { cvStorage } from "./storage";
import { parseCV, validateParseResult } from "./engine/parser";
import { generateObservations, createObservation, identifyStrengths } from "./engine/observationGenerator";
import { phraseObservation, generateProposal, rewriteSection, phraseStrengths } from "./llm/claude";
import { PARSE_THRESHOLDS } from "./engine/thresholds";
import { 
  CV, 
  AnalyzeResponse, 
  RewriteResponse, 
  ErrorResponse,
  RewriteRequestSchema,
  ObservationRespondSchema 
} from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ============================================
  // POST /api/cv/analyze
  // ============================================
  app.post("/api/cv/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No file uploaded", 
          code: "UNSUPPORTED_FORMAT" 
        } as ErrorResponse);
      }

      let extractedText = "";
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      // Extract text based on file type
      if (mimeType === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } else {
        return res.status(400).json({ 
          error: "Unsupported file type. Please upload PDF or DOCX.", 
          code: "UNSUPPORTED_FORMAT" 
        } as ErrorResponse);
      }

      // Basic validation
      if (extractedText.length < PARSE_THRESHOLDS.MIN_CONTENT_LENGTH) {
        return res.status(400).json({ 
          error: "Document appears to be too short or empty", 
          code: "FILE_TOO_SHORT" 
        } as ErrorResponse);
      }

      // Parse CV into structured sections
      const parseResult = parseCV(extractedText, req.file.originalname);
      
      // Validate parse result
      if (!validateParseResult(parseResult)) {
        return res.status(400).json({ 
          error: "Could not identify CV sections. Please ensure the CV has clear section headings.",
          code: "PARSE_FAILED",
          details: parseResult.warnings.join('; ')
        } as ErrorResponse);
      }

      // Generate raw observations
      const rawObservations = generateObservations(parseResult.sections);
      
      // Phrase observations using LLM
      const phrasedObservations = await Promise.all(
        rawObservations.map(async (raw) => {
          const message = await phraseObservation(raw.context);
          const proposal = await generateProposal(raw.signal, raw.context.sectionTitle || 'Section');
          return createObservation(raw, message, proposal);
        })
      );

      // Identify and phrase strengths
      const strengthSignals = identifyStrengths(parseResult.sections);
      const sectionSummaries = parseResult.sections
        .slice(0, 5)
        .map(s => `${s.title}: ${s.content.substring(0, 100)}...`);
      const strengths = await phraseStrengths(strengthSignals, sectionSummaries);

      // Build CV object
      const cv: CV = {
        id: uuidv4(),
        uploadedAt: new Date().toISOString(),
        fileName: req.file.originalname,
        rawText: extractedText,
        sections: parseResult.sections,
        observations: phrasedObservations,
        strengths,
      };

      // Store for later operations
      cvStorage.store(cv);

      // Return response
      const response: AnalyzeResponse = {
        cv,
        observations: phrasedObservations,
        strengths,
      };

      res.json(response);

    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ 
        error: "Failed to process the uploaded file",
        code: "ANALYSIS_FAILED" 
      } as ErrorResponse);
    }
  });

  // ============================================
  // POST /api/cv/rewrite
  // ============================================
  app.post("/api/cv/:cvId/rewrite", async (req, res) => {
    try {
      const { cvId } = req.params;
      const parsed = RewriteRequestSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          code: "PARSE_FAILED",
          details: parsed.error.message
        } as ErrorResponse);
      }

      const { sectionId } = parsed.data;
      const section = cvStorage.getSection(cvId, sectionId);

      if (!section) {
        return res.status(404).json({
          error: "Section not found",
          code: "SECTION_NOT_FOUND"
        } as ErrorResponse);
      }

      const rewritten = await rewriteSection(
        section.content,
        section.title,
        section.organization,
        section.duration
      );

      const response: RewriteResponse = {
        original: section.content,
        rewritten,
      };

      res.json(response);

    } catch (error) {
      console.error("Error rewriting section:", error);
      res.status(500).json({
        error: "Failed to rewrite section",
        code: "ANALYSIS_FAILED"
      } as ErrorResponse);
    }
  });

  // ============================================
  // POST /api/observation/respond
  // ============================================
  app.post("/api/cv/:cvId/observation/:observationId/respond", async (req, res) => {
    try {
      const { cvId, observationId } = req.params;
      const parsed = ObservationRespondSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request body",
          code: "PARSE_FAILED",
          details: parsed.error.message
        } as ErrorResponse);
      }

      const { response: userResponse } = parsed.data;
      const observation = cvStorage.updateObservation(cvId, observationId, userResponse);

      if (!observation) {
        return res.status(404).json({
          error: "Observation not found",
          code: "SECTION_NOT_FOUND"
        } as ErrorResponse);
      }

      res.json({
        success: true,
        observation,
      });

    } catch (error) {
      console.error("Error updating observation:", error);
      res.status(500).json({
        error: "Failed to update observation",
        code: "ANALYSIS_FAILED"
      } as ErrorResponse);
    }
  });

  return httpServer;
}
```

---

## 13. UI INTEGRATION

**File: `/client/src/pages/home.tsx`**

Smith must make these changes (do NOT rewrite the entire file):

### 13.1 Remove Mock Data

Delete these constants:
- `MOCK_STRENGTHS_PARAGRAPHS`
- `MOCK_SUGGESTIONS`

### 13.2 Add State for Real Data

```typescript
// Add these state variables
const [cvData, setCvData] = useState<CV | null>(null);
const [observations, setObservations] = useState<Observation[]>([]);
const [strengths, setStrengths] = useState<string[]>([]);
```

### 13.3 Update handleFileSelect

```typescript
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
```

### 13.4 Update Observation Rendering

Replace the mock suggestions mapping with:

```typescript
{observations.filter(o => o.status !== 'declined').map((observation, i) => {
  const isExpanded = expandedSuggestion === observation.id;
  const isHandled = observation.status !== 'pending';

  return (
    <motion.li 
      key={observation.id}
      // ... existing animation props ...
      onClick={() => !isHandled && handleSuggestionClick(observation.id)}
      className={cn(
        "text-sm relative pl-6 pr-4 py-3 rounded-md transition-all border",
        isHandled 
          ? "bg-green-50 border-green-100 text-green-800" 
          : "bg-white border-transparent hover:bg-gray-50 cursor-pointer"
      )}
    >
      {/* Use observation.message instead of item.title */}
      <span>{observation.message}</span>
      
      {/* Use observation.proposal instead of item.proposal */}
      {isExpanded && observation.proposal && (
        <div className="bg-gray-50 p-3 rounded text-xs font-mono">
          {observation.proposal}
        </div>
      )}
    </motion.li>
  );
})}
```

### 13.5 Update handleAction to Call API

```typescript
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
```

### 13.6 Update Strengths Rendering

Replace hardcoded strengths with:

```typescript
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
```

### 13.7 Update CV Preview Section

The CV preview (left panel) currently shows hardcoded HTML. For v0, this can remain as a visual mockup. For v1, it should render from `cvData.sections`.

For now, the highlight states should map to real observation `sectionId`:

```typescript
const getHighlightClass = (sectionId: string) => {
  if (state !== 'complete' || !observations) return '';
  
  const relatedObservations = observations.filter(o => o.sectionId === sectionId);
  
  if (relatedObservations.length === 0) return 'bg-transparent';
  
  const allResolved = relatedObservations.every(o => o.status !== 'pending');
  const hasAccepted = relatedObservations.some(o => o.status === 'accepted');
  
  if (allResolved && hasAccepted) {
    return 'bg-[#E8F5E9]'; // Green - resolved
  }
  
  return 'bg-[#FDF6E3]'; // Yellow - pending
};
```

---

## 14. TEST CASES (MANDATORY)

Smith must verify these pass before proceeding to next phase:

### 14.1 Parser Tests

```typescript
// Test 1: Sparse content detection
const input1 = {
  content: "Managed platform migration.",
  duration: 36, // months
};
// Expected: sparse_density signal

// Test 2: Date extraction
const input2 = "Senior Engineer at TechCorp (Jan 2020 - Present)";
// Expected: startDate = "2020-01-01", endDate = current date

// Test 3: Section type detection
const input3 = "EXPERIENCE\nSoftware Engineer at...";
// Expected: type = 'job'
```

### 14.2 Analyzer Tests

```typescript
// Density Test
const section1 = { wordCount: 10, duration: 36 }; // 0.28 wpm
// Expected: signal = 'sparse_density', confidence > 0.7

// Temporal Test  
const section2 = { endDate: '2018-01-01' }; // 7 years ago
// Expected: signal = 'outdated_experience'

// Structural Test
const section3 = { content: "Managed team of 6 using AWS and Python. Reduced costs by 30%." };
// Expected: hasTeamSize=true, hasTools=true, hasMetrics=true
```

### 14.3 Integration Test

Upload a real CV (PDF or DOCX). Verify:
1. Sections are extracted
2. At least 2 observations are generated
3. Observations have phrased messages (not raw signals)
4. Strengths are returned
5. No scores or numbers appear in the response

---

## 15. DELIVERY ORDER (GATES)

Smith must follow this order. Do not skip ahead.

| Phase | Task | Gate |
|-------|------|------|
| 1 | Update `schema.ts` with all types | Types compile without error |
| 2 | Create `thresholds.ts` | Constants accessible |
| 3 | Create `parser.ts` | **GATE: Test with 3 CVs. Does it extract sections?** |
| 4 | Create `analyzer_density.ts` | Unit tests pass |
| 5 | Create `analyzer_structural.ts` | Unit tests pass |
| 6 | Create `analyzer_temporal.ts` | Unit tests pass |
| 7 | Create `observationGenerator.ts` | **GATE: Run on test CVs. Do observations make sense?** |
| 8 | Create `claude.ts` | LLM calls work |
| 9 | Update `routes.ts` | API returns real data |
| 10 | Update `storage.ts` | CVs persist in memory |
| 11 | Update `home.tsx` | **GATE: Human review. Do phrased observations sound right?** |
| 12 | Polish highlights and states | UI reflects observation status |

**No skipping gates. Each gate must pass before proceeding.**

---

## 16. EXPLICIT WARNINGS

### DO NOT:

1. **Combine files** — Each analyzer is separate. The LLM code is separate. Do not merge.

2. **Expose scores** — `confidence`, `densityScore`, `recencyScore` are INTERNAL. Never in API response to UI.

3. **Hardcode thresholds** — Always import from `thresholds.ts`.

4. **Skip the LLM phrasing** — Raw signals like "sparse_density" must NEVER reach the UI.

5. **Ignore parse confidence** — Low-confidence parses should reduce observation confidence.

6. **Generate too many observations** — Max 8. Quality over quantity.

7. **Use judgmental language** — No "weak," "poor," "needs improvement." Weight-language only.

8. **Set up a database** — In-memory storage only for v0. Do not install Postgres.

9. **Rewrite the entire UI** — Make surgical changes to `home.tsx`. Preserve the existing design.

10. **Proceed past a failed gate** — If parsing fails on test CVs, fix it before building analyzers.

---

## 17. SUCCESS CRITERIA

v0 is complete when:

1. ✅ User can upload a PDF or DOCX CV
2. ✅ System extracts structured sections
3. ✅ System generates 3-8 observations
4. ✅ Observations use weight-language, no scores
5. ✅ Observations are specific to actual CV content
6. ✅ Strengths are phrased positively
7. ✅ User can accept/decline observations
8. ✅ UI updates to reflect accepted changes (yellow → green)
9. ✅ No numbers, scores, or percentages appear anywhere in UI
10. ✅ System feels like "noticing" not "judging"

---

## APPENDIX: Environment Setup

Smith should verify these are available:

```bash
# Required packages (already in package.json)
npm install uuid @anthropic-ai/sdk

# Add types
npm install --save-dev @types/uuid
```

Environment variable needed:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

**END OF SPECIFICATION**

*Document version: 1.0*
*Architect: Logos*
*Prepared for: Smith (Claude Code)*
