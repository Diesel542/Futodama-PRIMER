import Anthropic from '@anthropic-ai/sdk';
import { CVSection, RepresentationStatus } from '@shared/schema';
import { loadPrompt } from '../codex';

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

const OBSERVATION_SYSTEM_PROMPT_EN = `You are writing concise, professional observations about CV sections for a CV improvement tool.

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

const OBSERVATION_SYSTEM_PROMPT_DA = `Du skriver kortfattede, professionelle observationer om CV-sektioner til et CV-forbedringsværktøj.

KRITISKE BEGRÆNSNINGER:
- Brug aldrig tal, scores eller procenter i dit output
- Sig aldrig "du bør" eller "jeg anbefaler"
- Brug aldrig ordene: "svag", "dårlig", "mangelfuld", "utilstrækkelig", "mangler forbedring"
- Brug vægt-sprog: "bærer", "holder", "repræsenterer", "viser", "afspejler"
- Vær specifik om det faktiske indhold
- Maksimalt ÉN sætning
- Lyd observerende, ikke dømmende
- Skriv som om du er en senior redaktør, der gør en observation, ikke giver råd

TONE: Rolig, præcis, observerende. Som at bemærke at en plante har brug for vand, ikke at kritisere den for at være tørstig.`;

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

export async function phraseObservation(
  context: ObservationContext,
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const prompt = buildObservationPrompt(context, language);
  const systemPrompt = language === 'da' ? OBSERVATION_SYSTEM_PROMPT_DA : OBSERVATION_SYSTEM_PROMPT_EN;

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 150,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return text.text.trim();
}

function buildObservationPrompt(context: ObservationContext, language: string = 'en'): string {
  const { signal, sectionTitle } = context;
  const isDanish = language === 'da';

  const defaultSection = isDanish ? 'Erfaringssektion' : 'Experience section';
  const section = sectionTitle || defaultSection;

  switch (signal) {
    case 'sparse_density':
      return isDanish
        ? `Signal: sparse_density
Sektion: "${section}"
Varighed: ${context.durationMonths} måneders arbejde
Indhold: Kun ${context.wordCount} ord beskriver denne periode

Skriv én sætning, der observerer, at denne betydelige arbejdsperiode har meget lidt repræsentation i CV'et.`
        : `Signal: sparse_density
Section: "${section}"
Duration: ${context.durationMonths} months of work
Content: Only ${context.wordCount} words describing this period

Write one sentence observing that this substantial period of work has very little representation in the CV.`;

    case 'dense_but_shallow':
      return isDanish
        ? `Signal: dense_but_shallow
Sektion: "${section}"
Sektionen har mange ord, men lister måske snarere end beskriver.

Skriv én sætning, der observerer, at sektionen har volumen, men kunne have gavn af mere struktur.`
        : `Signal: dense_but_shallow
Section: "${section}"
The section has many words but may be listing rather than describing.

Write one sentence observing that the section has volume but may benefit from more structure.`;

    case 'outdated_experience':
      return isDanish
        ? `Signal: outdated_experience
Sektion: "${section}"
Denne erfaring sluttede for ${context.monthsSinceEnd} måneder siden.

Skriv én sætning, der observerer, at denne erfaring er fra noget tid siden, uden at antyde det er dårligt.`
        : `Signal: outdated_experience
Section: "${section}"
This experience ended ${context.monthsSinceEnd} months ago.

Write one sentence observing that this experience is from some time ago, without suggesting it's bad.`;

    case 'recent_but_thin':
      return isDanish
        ? `Signal: recent_but_thin
Sektion: "${section}"
Dette er nyligt arbejde, men har meget lidt detalje.

Skriv én sætning, der observerer, at nyligt arbejde kunne vise mere af, hvad der blev opnået.`
        : `Signal: recent_but_thin
Section: "${section}"
This is recent work but has very little detail.

Write one sentence observing that recent work could show more of what was accomplished.`;

    case 'large_gap':
      return isDanish
        ? `Signal: large_gap
Der ser ud til at være et ${context.gapMonths}-måneders hul før denne rolle.

Skriv én sætning, der neutralt bemærker hullet i tidslinjen.`
        : `Signal: large_gap
There appears to be a ${context.gapMonths}-month gap before this role.

Write one sentence noting the gap in the timeline, neutrally.`;

    case 'missing_metrics':
      return isDanish
        ? `Signal: missing_metrics
Sektion: "${section}"
Ingen specifikke tal, procenter eller kvantificerede resultater er til stede.

Skriv én sætning, der observerer, at effekten af dette arbejde ikke er kvantificeret.`
        : `Signal: missing_metrics
Section: "${section}"
No specific numbers, percentages, or quantified outcomes are present.

Write one sentence observing that the impact of this work isn't quantified.`;

    case 'missing_outcomes':
      return isDanish
        ? `Signal: missing_outcomes
Sektion: "${section}"
Beskrivelsen lister aktiviteter, men ikke resultater.

Skriv én sætning, der observerer, at hvad der blev opnået ikke er synligt.`
        : `Signal: missing_outcomes
Section: "${section}"
The description lists activities but not results.

Write one sentence observing that what was accomplished isn't visible.`;

    case 'missing_tools':
      return isDanish
        ? `Signal: missing_tools
Sektion: "${section}"
Ingen specifikke teknologier eller værktøjer er nævnt.

Skriv én sætning, der observerer, at de tekniske detaljer ikke er synlige.`
        : `Signal: missing_tools
Section: "${section}"
No specific technologies or tools are mentioned.

Write one sentence observing that the technical specifics aren't visible.`;

    case 'missing_team_context':
      return isDanish
        ? `Signal: missing_team_context
Sektion: "${section}"
Dette ser ud til at være en lederrolle, men teamkontekst er ikke specificeret.

Skriv én sætning, der observerer, at omfanget af lederskab ikke er klart.`
        : `Signal: missing_team_context
Section: "${section}"
This appears to be a leadership role but team context isn't specified.

Write one sentence observing that the scope of leadership isn't clear.`;

    default:
      return isDanish
        ? `Signal: ${signal}
Sektion: "${section}"

Skriv én sætning med en neutral observation om denne sektion.`
        : `Signal: ${signal}
Section: "${section}"

Write one sentence making a neutral observation about this section.`;
  }
}

// ============================================
// PROPOSAL GENERATION
// ============================================

export async function generateProposal(
  signal: string,
  sectionTitle: string,
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const isDanish = language === 'da';

  const prompt = isDanish
    ? `For en CV-sektion med titlen "${sectionTitle}" der har problemet: ${signal}

Skriv et kort, specifikt forslag (én sætning) om, hvad der kunne tilføjes eller præciseres.
Omskriv ikke sektionen - foreslå bare hvad der mangler.
Vær specifik, ikke generisk.`
    : `For a CV section titled "${sectionTitle}" that has the issue: ${signal}

Write a brief, specific suggestion (one sentence) for what could be added or clarified.
Do not rewrite the section - just suggest what's missing.
Be specific, not generic.`;

  const response = await anthropic.messages.create({
    model: model,
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
  duration?: number,
  model: string = 'claude-sonnet-4-20250514'
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
    model: model,
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

const STRENGTHS_SYSTEM_PROMPT_EN = `You are summarizing what a CV does well.

CRITICAL CONSTRAINTS:
- Focus ONLY on what is present and strong
- Do NOT mention what's missing
- Write 2-3 short paragraphs, each focusing on one strength
- Separate paragraphs with double newlines
- Be specific, reference actual content
- Do NOT use bullet points
- Sound confident but not effusive

TONE: Like a senior reviewer noting genuine strengths. Write in a reflective, confident tone.`;

const STRENGTHS_SYSTEM_PROMPT_DA = `Du opsummerer, hvad et CV gør godt.

KRITISKE BEGRÆNSNINGER:
- Fokuser KUN på det, der er til stede og stærkt
- Nævn IKKE, hvad der mangler
- Skriv 2-3 korte afsnit, hver fokuseret på en styrke
- Adskil afsnit med dobbelte linjeskift
- Vær specifik, referer til faktisk indhold
- Brug IKKE punktopstilling
- Lyd selvsikker, men ikke overstrømmende

TONE: Som en senior anmelder, der bemærker ægte styrker. Skriv i en reflekterende, selvsikker tone.`;

export async function phraseStrengths(
  signals: Array<{ signal: string; context: Record<string, unknown> }>,
  sectionSummaries: string[],
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string[]> {
  const isDanish = language === 'da';

  if (signals.length === 0) {
    return [isDanish
      ? 'Dette CV præsenterer professionel erfaring i et klart format.'
      : 'This CV presents professional experience in a clear format.'];
  }

  const signalDescriptions = signals.map(s => {
    switch (s.signal) {
      case 'consistent_progression':
        return isDanish ? 'Viser klar karriereprogression på tværs af roller' : 'Shows clear career progression across roles';
      case 'metrics_present':
        return isDanish ? 'Kvantificerer effekt med specifikke målinger' : 'Quantifies impact with specific metrics';
      case 'recent_activity':
        return isDanish ? 'Inkluderer aktuel, relevant erfaring' : 'Includes current, relevant experience';
      case 'balanced_density':
        return isDanish ? 'Opretholder ensartet detalje på tværs af sektioner' : 'Maintains consistent detail across sections';
      default:
        return s.signal;
    }
  });

  const prompt = isDanish
    ? `Baseret på denne CV-analyse:

Positive signaler opdaget:
${signalDescriptions.map(d => `- ${d}`).join('\n')}

Sektionsoversigter:
${sectionSummaries.slice(0, 3).join('\n')}

Skriv 2-3 sætninger, der opsummerer, hvad dette CV gør godt. Vær specifik og referer til det faktiske indhold.`
    : `Based on this CV analysis:

Positive signals detected:
${signalDescriptions.map(d => `- ${d}`).join('\n')}

Section summaries:
${sectionSummaries.slice(0, 3).join('\n')}

Write 2-3 sentences summarizing what this CV does well. Be specific and reference the actual content.`;

  const systemPrompt = isDanish ? STRENGTHS_SYSTEM_PROMPT_DA : STRENGTHS_SYSTEM_PROMPT_EN;

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Split into array of sentences/paragraphs
  return text.text.trim().split(/\n\n+/).filter(s => s.length > 0);
}

// ============================================
// CODEX-DRIVEN GENERATION
// ============================================

// Helper function for formatting duration
function formatDuration(startDate?: string, endDate?: string): string {
  if (!startDate) return 'N/A';
  const start = startDate.substring(0, 7); // YYYY-MM
  const end = endDate ? endDate.substring(0, 7) : 'Present';
  return `${start} to ${end}`;
}

// Generate rewrite based on codex instruction
export async function generateCodexRewrite(
  section: CVSection,
  instruction: string,
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const promptTemplate = loadPrompt('rewrite', language);

  const prompt = promptTemplate
    .replace('{{instruction}}', instruction)
    .replace('{{content}}', section.content)
    .replace('{{title}}', section.title)
    .replace('{{organization}}', section.organization || 'N/A')
    .replace('{{duration}}', formatDuration(section.startDate, section.endDate));

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return text.text.trim();
}

// Generate enhanced content from user input
export async function generateFromUserInput(
  section: CVSection,
  userInput: string,
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const promptTemplate = loadPrompt('add-info', language);

  const prompt = promptTemplate
    .replace('{{content}}', section.content)
    .replace('{{title}}', section.title)
    .replace('{{organization}}', section.organization || 'N/A')
    .replace('{{duration}}', formatDuration(section.startDate, section.endDate))
    .replace('{{userInput}}', userInput);

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return text.text.trim();
}

// ============================================
// GUIDED EDITING: CLAIM BLOCKS
// ============================================

const CLAIM_BLOCKS_SYSTEM_PROMPT_EN = `You generate suggested role elements for CV improvement.

CRITICAL CONSTRAINTS:
- Generate 4-6 short, professional claim phrases
- Each claim should be 5-10 words maximum
- Claims should be realistic for the role type
- Use active voice, start with verbs where appropriate
- Do NOT include specific numbers or metrics
- Claims should be generic enough to apply but specific enough to inspire
- Output ONLY a JSON array of strings, nothing else

EXAMPLES for a CEO role:
["Led strategic initiatives for enterprise clients", "Managed cross-functional leadership teams", "Drove business development and partnerships", "Owned P&L responsibility", "Built and scaled organizational capabilities"]`;

const CLAIM_BLOCKS_SYSTEM_PROMPT_DA = `Du genererer foreslåede rolleelementer til CV-forbedring.

KRITISKE BEGRÆNSNINGER:
- Generer 4-6 korte, professionelle påstandsfraser
- Hver påstand skal være maksimalt 5-10 ord
- Påstande skal være realistiske for rolletypen
- Brug aktiv stemme, start med verber hvor det er passende
- Inkluder IKKE specifikke tal eller målinger
- Påstande skal være generiske nok til at gælde, men specifikke nok til at inspirere
- Output KUN et JSON-array af strenge, intet andet

EKSEMPLER for en CEO-rolle:
["Ledte strategiske initiativer for erhvervskunder", "Styrede tværfunktionelle ledelsesteams", "Drev forretningsudvikling og partnerskaber", "Havde P&L-ansvar", "Byggede og skalerede organisatoriske kapabiliteter"]`;

export async function generateClaimBlocks(
  section: CVSection,
  signal: string,
  language: string = 'en',
  model: string = 'claude-sonnet-4-20250514'
): Promise<string[]> {
  const isDanish = language === 'da';
  const systemPrompt = isDanish ? CLAIM_BLOCKS_SYSTEM_PROMPT_DA : CLAIM_BLOCKS_SYSTEM_PROMPT_EN;

  const prompt = isDanish
    ? `Rolle: ${section.title}
Organisation: ${section.organization || 'Ikke angivet'}
Nuværende indhold: "${section.content.substring(0, 200)}..."
Problem: ${signal}

Generer 4-6 foreslåede rolleelementer, der kunne tilføjes til denne sektion.`
    : `Role: ${section.title}
Organization: ${section.organization || 'Not specified'}
Current content: "${section.content.substring(0, 200)}..."
Issue: ${signal}

Generate 4-6 suggested role elements that could be added to this section.`;

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0];
    if (text.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON array from response
    const parsed = JSON.parse(text.text.trim());
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 6); // Limit to 6 max
    }
    return [];
  } catch (error) {
    console.error('Failed to generate claim blocks:', error);
    // Fallback to generic claims
    return isDanish
      ? ['Ledte nøgleinitiativer', 'Samarbejdede med interessenter', 'Leverede målbare resultater', 'Drev procesforbedringer']
      : ['Led key initiatives', 'Collaborated with stakeholders', 'Delivered measurable results', 'Drove process improvements'];
  }
}

// ============================================
// GUIDED EDITING: SENTENCE STARTERS
// ============================================

export function getSentenceStarters(signal: string, language: string = 'en'): string[] {
  const isDanish = language === 'da';

  const starters: Record<string, { en: string[]; da: string[] }> = {
    sparse_density: {
      en: [
        'Led ___ initiatives resulting in ___',
        'Managed a team of ___ responsible for ___',
        'Delivered ___ by implementing ___',
        'Drove ___ growth through ___',
      ],
      da: [
        'Ledte ___ initiativer, der resulterede i ___',
        'Styrede et team på ___ med ansvar for ___',
        'Leverede ___ ved at implementere ___',
        'Drev ___ vækst gennem ___',
      ],
    },
    missing_metrics: {
      en: [
        'Achieved ___% improvement in ___',
        'Reduced ___ by ___ through ___',
        'Increased ___ from ___ to ___',
        'Managed budget of $___ for ___',
      ],
      da: [
        'Opnåede ___% forbedring i ___',
        'Reducerede ___ med ___ gennem ___',
        'Øgede ___ fra ___ til ___',
        'Administrerede budget på ___ kr. til ___',
      ],
    },
    missing_outcomes: {
      en: [
        'Successfully delivered ___ resulting in ___',
        'Transformed ___ which led to ___',
        'Achieved ___ by ___',
      ],
      da: [
        'Leverede succesfuldt ___, hvilket resulterede i ___',
        'Transformerede ___, hvilket førte til ___',
        'Opnåede ___ ved at ___',
      ],
    },
    missing_team_context: {
      en: [
        'Led a team of ___ across ___',
        'Managed ___ direct reports including ___',
        'Built and scaled team from ___ to ___',
      ],
      da: [
        'Ledte et team på ___ på tværs af ___',
        'Styrede ___ direkte rapporter inklusiv ___',
        'Byggede og skalerede team fra ___ til ___',
      ],
    },
  };

  const defaultStarters = {
    en: ['Contributed to ___ by ___', 'Responsible for ___ including ___'],
    da: ['Bidrog til ___ ved at ___', 'Ansvarlig for ___ inklusiv ___'],
  };

  const signalStarters = starters[signal] || defaultStarters;
  return isDanish ? signalStarters.da : signalStarters.en;
}

// ============================================
// REPRESENTATION STATUS
// ============================================

export function calculateRepresentationStatus(
  wordCount: number,
  durationMonths: number
): RepresentationStatus {
  if (!durationMonths || durationMonths === 0) return 'balanced';

  const wordsPerMonth = wordCount / durationMonths;

  if (wordsPerMonth < 5) return 'too_short';
  if (wordsPerMonth > 25) return 'too_long';
  return 'balanced';
}
