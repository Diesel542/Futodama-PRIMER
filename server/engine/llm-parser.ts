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
      rawText, // Preserve original for display
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
    rawText,
  };
}
