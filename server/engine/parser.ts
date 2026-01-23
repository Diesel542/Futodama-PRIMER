import { v4 as uuidv4 } from 'uuid';
import { CVSection, ParseResult } from '@shared/schema';

/**
 * INTELLIGENT CV PARSER
 *
 * Detects sections and job entries using multiple strategies:
 * 1. Explicit section headers (Experience, Education, etc.)
 * 2. Company name patterns (ApS, Inc., Ltd, Corp, etc.)
 * 3. Date range patterns indicating job tenure
 * 4. Job title patterns (Manager, Director, Consultant, etc.)
 */

// Section header patterns (case-insensitive)
const SECTION_PATTERNS: Record<CVSection['type'], RegExp> = {
  job: /^(experience|work\s*experience|employment|professional\s*experience|work\s*history|career\s*history|positions?\s*held)/i,
  education: /^(education|academic|qualifications|degrees|certifications?|training)/i,
  skill: /^(skills|technical\s*skills|competencies|technologies|expertise|proficiencies|core\s*competencies)/i,
  project: /^(projects|personal\s*projects|portfolio|key\s*projects|selected\s*projects)/i,
  summary: /^(summary|profile|about(\s*me)?|professional\s*summary|objective|personal\s*statement|overview)/i,
  other: /^$/,  // Never matches - 'other' is the fallback
};

// Company name patterns - common suffixes
const COMPANY_PATTERNS = [
  /\b(ApS|A\/S|Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|GmbH|AG|SA|BV|NV|Pty|PLC|LLP|LP)\b/i,
  /\b(University|College|Institute|Hospital|Foundation|Association|Organization|Group|Partners)\b/i,
  /\b(Municipality|Government|Ministry|Department|Agency)\b/i,
];

// Job title patterns
const JOB_TITLE_PATTERNS = [
  /\b(Manager|Director|Engineer|Developer|Consultant|Analyst|Specialist|Coordinator|Administrator|Assistant|Associate|Lead|Senior|Junior|Principal|Chief|Head|VP|Vice\s*President|CEO|CTO|CFO|COO|CIO)\b/i,
  /\b(Project\s*Manager|Program\s*Manager|Product\s*Manager|Account\s*Manager|IT\s*Manager)\b/i,
  /\b(Software|Hardware|Data|Business|Operations|Marketing|Sales|Finance|HR|Human\s*Resources)\s+(Manager|Director|Analyst|Engineer|Specialist)/i,
];

// Date extraction patterns
const DATE_PATTERNS = {
  // "Jan 2020 - Present", "2020-2023", "January 2020 – December 2023"
  range: /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—to]+\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current|now)/gi,
  // Just a year range: "2020 - 2023"
  yearRange: /\b(20\d{2}|19\d{2})\s*[-–—]\s*(20\d{2}|19\d{2}|present|current|now)\b/gi,
  // Standalone date range on a line
  standaloneDateRange: /^\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—]+\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current|now)\s*$/gim,
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

  // Try multiple parsing strategies
  let parsedSections = parseWithHeaders(text, warnings);

  // If we didn't find job sections with headers, try intelligent detection
  const hasJobs = parsedSections.some(s => s.type === 'job');
  if (!hasJobs) {
    const intelligentSections = parseIntelligently(text, warnings);
    if (intelligentSections.length > 0) {
      // Merge intelligent sections with any header-based sections
      parsedSections = mergeAndDedupe(parsedSections, intelligentSections);
    }
  }

  // Calculate overall parse confidence
  const totalContent = rawText.length;
  const parsedContent = parsedSections.reduce((sum, s) => sum + s.content.length, 0);
  const unparsedRatio = 1 - (parsedContent / totalContent);

  let overallConfidence: 'high' | 'medium' | 'low' = 'high';
  if (unparsedRatio > 0.3) {
    overallConfidence = 'low';
    warnings.push(`${Math.round(unparsedRatio * 100)}% of content could not be parsed into sections`);
  } else if (unparsedRatio > 0.15) {
    overallConfidence = 'medium';
  }

  // Add the raw text to each section for preview
  return {
    sections: parsedSections,
    unparsedContent,
    warnings,
    overallConfidence,
    rawText: text, // Preserve original for display
  };
}

/**
 * Original header-based parsing
 */
function parseWithHeaders(text: string, warnings: string[]): CVSection[] {
  const sections: CVSection[] = [];
  const chunks = splitIntoChunks(text);

  let currentSectionType: CVSection['type'] = 'other';
  let currentContent: string[] = [];
  let sectionCount = 0;

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const detectedType = detectSectionType(trimmed);

    if (detectedType && detectedType !== currentSectionType) {
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

  return sections;
}

/**
 * Intelligent parsing - detect jobs by patterns without explicit headers
 */
function parseIntelligently(text: string, warnings: string[]): CVSection[] {
  const sections: CVSection[] = [];
  const lines = text.split('\n');

  let currentJob: { start: number; title: string; company?: string; dates?: { start?: string; end?: string } } | null = null;
  let sectionCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line looks like a company name
    const isCompanyLine = COMPANY_PATTERNS.some(p => p.test(line));

    // Check if this line has a date range
    const dateMatch = extractDates(line);
    const hasDateRange = dateMatch.start && dateMatch.end;

    // Check if this line looks like a job title
    const isJobTitle = JOB_TITLE_PATTERNS.some(p => p.test(line));

    // Check if following lines have dates (look ahead)
    let nearbyDates: { start?: string; end?: string } = {};
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const lookAheadDates = extractDates(lines[j]);
      if (lookAheadDates.start) {
        nearbyDates = lookAheadDates;
        break;
      }
    }

    // Detect job entry start
    if ((isCompanyLine || (isJobTitle && nearbyDates.start)) && !currentJob) {
      // Start a new job section
      currentJob = {
        start: i,
        title: line,
        company: isCompanyLine ? line : undefined,
        dates: hasDateRange ? dateMatch : nearbyDates,
      };
    } else if (currentJob && (isCompanyLine || (isJobTitle && i - currentJob.start > 5))) {
      // Found another company/job - save current and start new
      const jobContent = lines.slice(currentJob.start, i).join('\n').trim();
      if (jobContent.length > 50) {
        const section = buildJobSection(
          currentJob.title,
          jobContent,
          currentJob.dates,
          sectionCount++,
          warnings
        );
        if (section) sections.push(section);
      }

      currentJob = {
        start: i,
        title: line,
        company: isCompanyLine ? line : undefined,
        dates: hasDateRange ? dateMatch : nearbyDates,
      };
    }
  }

  // Don't forget the last job
  if (currentJob) {
    const jobContent = lines.slice(currentJob.start).join('\n').trim();
    if (jobContent.length > 50) {
      const section = buildJobSection(
        currentJob.title,
        jobContent,
        currentJob.dates,
        sectionCount++,
        warnings
      );
      if (section) sections.push(section);
    }
  }

  return sections;
}

function buildJobSection(
  title: string,
  content: string,
  dates: { start?: string; end?: string } | undefined,
  index: number,
  _warnings: string[]
): CVSection | null {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  // Extract dates from content if not provided
  const extractedDates = dates || extractDates(content);

  let duration: number | undefined;
  if (extractedDates.start && extractedDates.end) {
    duration = calculateMonthsDifference(extractedDates.start, extractedDates.end);
  }

  return {
    id: `section-${index}-${uuidv4().slice(0, 8)}`,
    type: 'job',
    title: title.substring(0, 100), // Limit title length
    content,
    wordCount,
    startDate: extractedDates.start,
    endDate: extractedDates.end,
    duration,
    parseConfidence: dates?.start ? 'high' : 'medium',
  };
}

function mergeAndDedupe(headerSections: CVSection[], intelligentSections: CVSection[]): CVSection[] {
  // If intelligent parser found jobs, prefer those over "other" type sections
  const result: CVSection[] = [];

  for (const header of headerSections) {
    // Check if an intelligent section should replace this one
    const replacement = intelligentSections.find(intel =>
      header.type === 'other' && (
        intel.content.includes(header.title) ||
        header.content.includes(intel.title) ||
        header.title.includes(intel.title.substring(0, 30))
      )
    );

    if (replacement) {
      // Use the intelligently detected section (has proper type: 'job')
      result.push(replacement);
    } else {
      result.push(header);
    }
  }

  // Add any intelligent sections that weren't replacements
  for (const intelligent of intelligentSections) {
    const alreadyIncluded = result.some(r =>
      r.content.includes(intelligent.title) || intelligent.content.includes(r.title)
    );

    if (!alreadyIncluded) {
      result.push(intelligent);
    }
  }

  return result;
}

function splitIntoChunks(text: string): string[] {
  return text.split(/\n\n+|\n(?=[A-Z][A-Z\s]+:?\n)/);
}

function detectSectionType(text: string): CVSection['type'] | null {
  const firstLine = text.split('\n')[0].trim();

  for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (type === 'other') continue;
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

  const dates = extractDates(content);

  let duration: number | undefined;
  if (dates.start && dates.end) {
    duration = calculateMonthsDifference(dates.start, dates.end);
  }

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
  DATE_PATTERNS.range.lastIndex = 0;
  const rangeMatch = DATE_PATTERNS.range.exec(text);

  if (rangeMatch) {
    const [, start, end] = rangeMatch;
    return {
      start: normalizeDate(start),
      end: normalizeDate(end),
    };
  }

  // Try year range
  DATE_PATTERNS.yearRange.lastIndex = 0;
  const yearMatch = DATE_PATTERNS.yearRange.exec(text);
  if (yearMatch) {
    const [, start, end] = yearMatch;
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

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return new Date(`${yearMatch[0]}-01-01`).toISOString();
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

export function validateParseResult(result: ParseResult): boolean {
  if (result.sections.length === 0) {
    return false;
  }

  // Be more lenient - allow low confidence if we have sections
  if (result.overallConfidence === 'low' && result.sections.length < 2) {
    return false;
  }

  return true;
}
