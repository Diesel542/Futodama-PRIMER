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
const SECTION_PATTERNS: Record<CVSection['type'], RegExp> = {
  job: /^(experience|work\s*experience|employment|professional\s*experience|work\s*history)/i,
  education: /^(education|academic|qualifications|degrees)/i,
  skill: /^(skills|technical\s*skills|competencies|technologies|expertise)/i,
  project: /^(projects|personal\s*projects|portfolio|key\s*projects)/i,
  summary: /^(summary|profile|about|professional\s*summary|objective)/i,
  other: /^$/,  // Never matches - 'other' is the fallback
};

// Date extraction patterns
const DATE_PATTERNS = {
  // "Jan 2020 - Present", "2020-2023", "January 2020 – December 2023"
  range: /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—to]+\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current|now)/gi,
  // Just a year range: "2020 - 2023"
  yearRange: /\b(20\d{2})\s*[-–—]\s*(20\d{2}|present|current|now)\b/gi,
};

export function parseCV(rawText: string, _fileName: string): ParseResult {
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
    if (type === 'other') continue;  // Skip 'other' - it's the fallback
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
  DATE_PATTERNS.range.lastIndex = 0;  // Reset regex
  const rangeMatch = DATE_PATTERNS.range.exec(text);

  if (rangeMatch) {
    const [, start, end] = rangeMatch;
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

function expandJobSections(sections: CVSection[], _warnings: string[]): CVSection[] {
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
