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
  signals: Array<{ signal: string; context: Record<string, unknown> }>,
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
