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
- Keep content concise - summarize very long sections if needed to fit response limits

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

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function parseWithLLM(
  rawText: string,
  model: string = 'claude-sonnet-4-20250514'
): Promise<ParseResult> {
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

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      console.log(`[LLM Parser] Attempt ${attempt}/${MAX_RETRIES + 1}, model: ${model}, text length: ${truncatedText.length}`);

      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 8000, // Increased from 4000 to handle long CVs
        system: PARSER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      console.log(`[LLM Parser] Got response, stop_reason: ${response.stop_reason}`);

      // Check if response was truncated
      if (response.stop_reason === 'max_tokens') {
        console.warn('[LLM Parser] Response truncated due to max_tokens limit');
        warnings.push('LLM response was truncated - CV may be too complex');

        // Try to salvage partial JSON
        const text = response.content[0];
        if (text.type === 'text') {
          const partialResult = tryParsePartialJSON(text.text, warnings);
          if (partialResult && partialResult.sections.length > 0) {
            console.log(`[LLM Parser] Salvaged ${partialResult.sections.length} sections from truncated response`);
            return convertToParseResult(partialResult.sections, rawText, warnings, 'medium');
          }
        }

        // If we can't salvage, continue to retry or fallback
        if (attempt <= MAX_RETRIES) {
          console.log(`[LLM Parser] Will retry with shorter content...`);
          // Could implement content shortening here for retry
        }
        continue;
      }

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

        console.log(`[LLM Parser] Parsing JSON response (${cleanJson.length} chars)`);
        parsed = JSON.parse(cleanJson);
      } catch (jsonError) {
        console.error('[LLM Parser] Failed to parse LLM response as JSON');
        console.error('[LLM Parser] JSON error:', jsonError);
        console.error('[LLM Parser] Response preview:', text.text.substring(0, 500));

        // Try to salvage partial JSON
        const partialResult = tryParsePartialJSON(text.text, warnings);
        if (partialResult && partialResult.sections.length > 0) {
          console.log(`[LLM Parser] Salvaged ${partialResult.sections.length} sections from malformed JSON`);
          return convertToParseResult(partialResult.sections, rawText, warnings, 'medium');
        }

        warnings.push('LLM response was not valid JSON');

        if (attempt <= MAX_RETRIES) {
          console.log(`[LLM Parser] Retrying after JSON parse failure...`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        return fallbackParse(rawText, warnings);
      }

      // Validate we got something useful
      if (!parsed.sections || parsed.sections.length === 0) {
        warnings.push('LLM did not identify any sections');

        if (attempt <= MAX_RETRIES) {
          console.log(`[LLM Parser] No sections found, retrying...`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        return fallbackParse(rawText, warnings);
      }

      console.log(`[LLM Parser] Successfully parsed ${parsed.sections.length} sections`);
      return convertToParseResult(parsed.sections, rawText, warnings, 'high');

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[LLM Parser] Attempt ${attempt} failed:`, lastError.message);

      // Check for rate limiting
      if (lastError.message.includes('rate') || lastError.message.includes('429')) {
        console.log(`[LLM Parser] Rate limited, waiting before retry...`);
        await sleep(RETRY_DELAY_MS * 2);
      } else if (attempt <= MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  // All retries exhausted
  console.error('[LLM Parser] All attempts failed');
  warnings.push(`LLM parsing failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`);
  return fallbackParse(rawText, warnings);
}

function tryParsePartialJSON(text: string, warnings: string[]): LLMParseResponse | null {
  try {
    // Clean markdown
    let cleanJson = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to find complete sections array even if response was truncated
    const sectionsMatch = cleanJson.match(/"sections"\s*:\s*\[/);
    if (!sectionsMatch) return null;

    // Find all complete section objects
    const sections: ParsedSection[] = [];
    const sectionRegex = /\{\s*"type"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]+)"[^}]*"content"\s*:\s*"([^"]*)"[^}]*\}/g;

    let match;
    while ((match = sectionRegex.exec(cleanJson)) !== null) {
      try {
        // Try to parse this section as valid JSON
        const sectionStr = match[0];
        const section = JSON.parse(sectionStr);
        if (section.type && section.title) {
          sections.push(section);
        }
      } catch {
        // Skip malformed sections
      }
    }

    if (sections.length > 0) {
      warnings.push(`Recovered ${sections.length} sections from partial response`);
      return { sections };
    }

    return null;
  } catch {
    return null;
  }
}

function convertToParseResult(
  sections: ParsedSection[],
  rawText: string,
  warnings: string[],
  confidence: 'high' | 'medium' | 'low'
): ParseResult {
  const cvSections: CVSection[] = sections.map((s, index) => {
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
      parseConfidence: confidence,
    };
  });

  console.log(`[LLM Parser] Converted ${cvSections.length} sections:`,
    cvSections.map(s => `${s.type}: "${s.title}" (${s.wordCount} words)`).join(', '));

  return {
    sections: cvSections,
    unparsedContent: [],
    warnings,
    overallConfidence: confidence,
    rawText,
  };
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
  console.warn('[LLM Parser] FALLBACK TRIGGERED - warnings:', warnings);

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
    rawText,
  };
}
