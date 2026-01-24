# PATCH 005: Codex Architecture + Actionable Suggestions
## Priority: HIGH — Core feature completion

---

## Overview

Transform suggestions from informational to actionable. Users can apply changes directly to their CV.

**Two action types:**
1. **Rewrite** — LLM pre-generates improved text, user applies it
2. **Add Info** — User provides input, LLM generates text based on input, user applies it

**Visual feedback:**
- Yellow highlight = pending suggestion
- Green highlight = accepted/applied
- No highlight = declined/locked

**Architecture change:**
- Centralize AI behavior rules in `/server/codex/`
- Keep existing `thresholds.ts` — codex imports from it

---

## PART 1: Create Codex Directory Structure

```
/server/codex/
├── index.ts              # Codex loader and types
├── actions.json          # Signal → action mapping
└── prompts/
    ├── rewrite.en.md     # English rewrite prompt
    ├── rewrite.da.md     # Danish rewrite prompt
    ├── add-info.en.md    # English add-info prompt
    └── add-info.da.md    # Danish add-info prompt
```

**NOTE:** We keep using `/server/engine/thresholds.ts` for threshold values — no duplication.

---

## PART 2: Create Codex Files

### 2A: `/server/codex/index.ts`

```typescript
import fs from 'fs';
import path from 'path';

// Re-export existing thresholds (single source of truth)
export { 
  DENSITY_THRESHOLDS, 
  TEMPORAL_THRESHOLDS, 
  CONFIDENCE_THRESHOLDS,
  PARSE_THRESHOLDS 
} from '../engine/thresholds';

export type ActionType = 'rewrite' | 'add_info';

export interface ActionDefinition {
  actionType: ActionType;
  inputPrompt?: {
    en: string;
    da: string;
  };
  rewriteInstruction?: {
    en: string;
    da: string;
  };
}

// Load JSON files
const codexPath = path.join(__dirname);

export const actions: Record<string, ActionDefinition> = JSON.parse(
  fs.readFileSync(path.join(codexPath, 'actions.json'), 'utf-8')
);

// Load prompt templates
export function loadPrompt(name: string, language: string = 'en'): string {
  const filename = `${name}.${language}.md`;
  const filepath = path.join(codexPath, 'prompts', filename);
  
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath, 'utf-8');
  }
  
  // Fallback to English
  const fallback = path.join(codexPath, 'prompts', `${name}.en.md`);
  return fs.readFileSync(fallback, 'utf-8');
}

// Get action for a signal
export function getActionForSignal(signal: string): ActionDefinition | null {
  return actions[signal] || null;
}
```

### 2B: `/server/codex/actions.json`

```json
{
  "sparse_density": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What were your key accomplishments, responsibilities, and measurable outcomes in this role?",
      "da": "Hvad var dine vigtigste resultater, ansvarsområder og målbare resultater i denne rolle?"
    }
  },
  "light_density": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "Can you add more detail about your specific contributions and achievements?",
      "da": "Kan du tilføje flere detaljer om dine specifikke bidrag og resultater?"
    }
  },
  "outdated_experience": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What recent experience or skills do you have that relate to or build upon this earlier work?",
      "da": "Hvilken nyere erfaring eller kompetencer har du, der relaterer sig til eller bygger videre på dette tidligere arbejde?"
    }
  },
  "stale_experience": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "How have you applied or developed these skills more recently?",
      "da": "Hvordan har du anvendt eller udviklet disse kompetencer på det seneste?"
    }
  },
  "missing_metrics": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What measurable outcomes can you share? (e.g., percentages, team sizes, revenue, time saved)",
      "da": "Hvilke målbare resultater kan du dele? (f.eks. procenter, teamstørrelser, omsætning, sparet tid)"
    }
  },
  "missing_outcomes": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What results or impact did you achieve in this role?",
      "da": "Hvilke resultater eller effekt opnåede du i denne rolle?"
    }
  },
  "missing_tools": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What specific technologies, tools, or methodologies did you use?",
      "da": "Hvilke specifikke teknologier, værktøjer eller metoder brugte du?"
    }
  },
  "missing_team_context": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "How large was your team and what was your leadership scope?",
      "da": "Hvor stort var dit team, og hvad var omfanget af dit lederskab?"
    }
  },
  "dense_but_shallow": {
    "actionType": "rewrite",
    "rewriteInstruction": {
      "en": "Restructure this dense content for better readability. Use bullet points for achievements. Preserve all facts.",
      "da": "Omstrukturer dette tætte indhold for bedre læsbarhed. Brug punktopstillinger til resultater. Bevar alle fakta."
    }
  },
  "recent_but_thin": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "This is recent work - what key achievements or responsibilities should be highlighted?",
      "da": "Dette er nyligt arbejde - hvilke nøgleresultater eller ansvarsområder bør fremhæves?"
    }
  },
  "large_gap": {
    "actionType": "add_info",
    "inputPrompt": {
      "en": "What were you doing during this period? (e.g., education, freelance, personal projects, travel)",
      "da": "Hvad lavede du i denne periode? (f.eks. uddannelse, freelance, personlige projekter, rejser)"
    }
  }
}
```

### 2C: `/server/codex/prompts/rewrite.en.md`

```markdown
You are rewriting a CV section to improve its quality while preserving all factual information.

INSTRUCTIONS:
{{instruction}}

ORIGINAL CONTENT:
{{content}}

SECTION CONTEXT:
- Title: {{title}}
- Organization: {{organization}}
- Duration: {{duration}}

RULES:
1. Preserve ALL facts, dates, names, and specific details
2. Do not invent or assume any information
3. Improve structure and clarity
4. Use active voice
5. Lead with impact
6. Keep professional tone
7. Output ONLY the rewritten content, no explanations

REWRITTEN CONTENT:
```

### 2D: `/server/codex/prompts/rewrite.da.md`

```markdown
Du omskriver en CV-sektion for at forbedre kvaliteten, mens du bevarer al faktuel information.

INSTRUKTIONER:
{{instruction}}

ORIGINALT INDHOLD:
{{content}}

SEKTIONSKONTEKST:
- Titel: {{title}}
- Organisation: {{organization}}
- Varighed: {{duration}}

REGLER:
1. Bevar ALLE fakta, datoer, navne og specifikke detaljer
2. Opfind eller antag ikke information
3. Forbedre struktur og klarhed
4. Brug aktiv form
5. Start med det vigtigste
6. Behold professionel tone
7. Output KUN det omskrevne indhold, ingen forklaringer

OMSKREVET INDHOLD:
```

### 2E: `/server/codex/prompts/add-info.en.md`

```markdown
You are enhancing a CV section by incorporating new information provided by the user.

ORIGINAL CONTENT:
{{content}}

SECTION CONTEXT:
- Title: {{title}}
- Organization: {{organization}}
- Duration: {{duration}}

USER PROVIDED INFORMATION:
{{userInput}}

RULES:
1. Seamlessly integrate the new information into the existing content
2. Maintain consistent tone and style with the original
3. Structure for maximum impact and readability
4. Use active voice and strong action verbs
5. Quantify achievements where possible
6. Do not remove any existing factual information
7. Output ONLY the enhanced content, no explanations

ENHANCED CONTENT:
```

### 2F: `/server/codex/prompts/add-info.da.md`

```markdown
Du forbedrer en CV-sektion ved at inkorporere ny information fra brugeren.

ORIGINALT INDHOLD:
{{content}}

SEKTIONSKONTEKST:
- Titel: {{title}}
- Organisation: {{organization}}
- Varighed: {{duration}}

BRUGERENS INFORMATION:
{{userInput}}

REGLER:
1. Integrer den nye information sømløst i det eksisterende indhold
2. Bevar konsistent tone og stil med originalen
3. Strukturer for maksimal effekt og læsbarhed
4. Brug aktiv form og stærke handlingsverber
5. Kvantificer resultater hvor muligt
6. Fjern ikke eksisterende faktuel information
7. Output KUN det forbedrede indhold, ingen forklaringer

FORBEDRET INDHOLD:
```

---

## PART 3: Update Observation Type

### 3A: `/shared/schema.ts`

**UPDATE** the existing types (don't remove `locked`):

```typescript
export type ActionType = 'rewrite' | 'add_info';
export type ObservationStatus = 'pending' | 'awaiting_input' | 'processing' | 'accepted' | 'declined' | 'locked';

export interface Observation {
  id: string;
  sectionId: string;
  type: ObservationType;
  confidence: number;
  signal: string;
  message: string;
  
  // NEW: Action fields
  actionType: ActionType;
  inputPrompt?: string;       // Question to ask user (for add_info)
  proposal?: string;          // Description of what will change
  rewrittenContent?: string;  // The actual new content to apply
  
  status: ObservationStatus;
}
```

---

## PART 4: Update Observation Generator

### 4A: `/server/engine/observationGenerator.ts`

**UPDATE** imports and the `createObservation` function:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { CVSection, Observation, ObservationType, ActionType } from '@shared/schema';
import { CONFIDENCE_THRESHOLDS } from './thresholds';
import { getActionForSignal } from '../codex';
// ... keep existing analyzer imports

// ... keep existing RawObservation interface and generateObservations function ...

// UPDATE createObservation to include action info:
export function createObservation(
  raw: RawObservation, 
  message: string, 
  proposal?: string,
  actionType: ActionType = 'add_info',
  inputPrompt?: string,
  rewrittenContent?: string
): Observation {
  return {
    id: `obs-${uuidv4().slice(0, 8)}`,
    sectionId: raw.sectionId,
    type: raw.type,
    confidence: raw.confidence,
    signal: raw.signal,
    message,
    proposal,
    actionType,
    inputPrompt,
    rewrittenContent,
    status: 'pending',
  };
}
```

---

## PART 5: Add LLM Functions for Codex-Driven Generation

### 5A: `/server/llm/claude.ts`

**ADD** import at top (if not already present):
```typescript
import { CVSection } from '@shared/schema';
import { loadPrompt } from '../codex';
```

**ADD** these new functions (keep all existing functions):

```typescript
// NEW: Generate rewrite based on codex instruction
export async function generateCodexRewrite(
  section: CVSection,
  instruction: string,
  language: string = 'en'
): Promise<string> {
  const promptTemplate = loadPrompt('rewrite', language);
  
  const prompt = promptTemplate
    .replace('{{instruction}}', instruction)
    .replace('{{content}}', section.content)
    .replace('{{title}}', section.title)
    .replace('{{organization}}', section.organization || 'N/A')
    .replace('{{duration}}', formatDuration(section.startDate, section.endDate));
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return text.text.trim();
}

// NEW: Generate enhanced content from user input
export async function generateFromUserInput(
  section: CVSection,
  userInput: string,
  language: string = 'en'
): Promise<string> {
  const promptTemplate = loadPrompt('add-info', language);
  
  const prompt = promptTemplate
    .replace('{{content}}', section.content)
    .replace('{{title}}', section.title)
    .replace('{{organization}}', section.organization || 'N/A')
    .replace('{{duration}}', formatDuration(section.startDate, section.endDate))
    .replace('{{userInput}}', userInput);
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  return text.text.trim();
}

// Helper function (add if not already present)
function formatDuration(startDate?: string, endDate?: string): string {
  if (!startDate) return 'N/A';
  const start = startDate.substring(0, 7); // YYYY-MM
  const end = endDate ? endDate.substring(0, 7) : 'Present';
  return `${start} to ${end}`;
}
```

---

## PART 6: Update Routes

### 6A: `/server/routes.ts`

**ADD** import at top:
```typescript
import { getActionForSignal } from './codex';
import { generateCodexRewrite, generateFromUserInput } from './llm/claude';
```

**UPDATE** the observation creation in `/api/cv/analyze` to include action info:

Find the section that creates observations (around line 107-123) and **UPDATE**:

```typescript
// Phrase observations using LLM and add action info
const phrasedObservations = await Promise.all(
  rawObservations.map(async (raw) => {
    const observationContext = {
      signal: raw.signal,
      sectionTitle: raw.context.sectionTitle as string | undefined,
      wordCount: raw.context.wordCount as number | undefined,
      durationMonths: raw.context.durationMonths as number | undefined,
      wordsPerMonth: raw.context.wordsPerMonth as number | undefined,
      monthsSinceEnd: raw.context.monthsSinceEnd as number | undefined,
      gapMonths: raw.context.gapMonths as number | undefined,
      completeness: raw.context.completeness as { hasMetrics: boolean; hasOutcomes: boolean; hasTools: boolean; hasTeamSize: boolean } | undefined,
    };
    
    const message = await phraseObservation(observationContext, language);
    const proposal = await generateProposal(raw.signal, (raw.context.sectionTitle as string) || 'Section', language);
    
    // Get action from codex
    const action = getActionForSignal(raw.signal);
    const actionType = action?.actionType || 'add_info';
    const inputPrompt = action?.inputPrompt?.[language as 'en' | 'da'] || action?.inputPrompt?.en;
    
    // For rewrite actions, pre-generate the content
    let rewrittenContent: string | undefined;
    if (actionType === 'rewrite' && action?.rewriteInstruction) {
      const section = parseResult.sections.find(s => s.id === raw.sectionId);
      if (section) {
        const instruction = action.rewriteInstruction[language as 'en' | 'da'] || action.rewriteInstruction.en;
        rewrittenContent = await generateCodexRewrite(section, instruction, language);
      }
    }
    
    return createObservation(raw, message, proposal, actionType, inputPrompt, rewrittenContent);
  })
);
```

### 6B: **ADD** new endpoint for processing user input:

```typescript
// ============================================
// POST /api/cv/process-input
// ============================================
app.post("/api/cv/process-input", async (req, res) => {
  try {
    const { observationId, sectionId, userInput, section } = req.body;
    const language = (req.headers['x-language'] as string) || 'en';
    
    if (!observationId || !sectionId || !userInput || !section) {
      return res.status(400).json({ 
        error: "Missing required fields",
        code: "PARSE_FAILED" 
      } as ErrorResponse);
    }
    
    // Generate new content based on user input
    const rewrittenContent = await generateFromUserInput(section, userInput, language);
    
    const proposalText = language === 'da' 
      ? 'Foreslået forbedring baseret på dine oplysninger.'
      : 'Suggested enhancement based on your input.';
    
    res.json({
      observationId,
      rewrittenContent,
      proposal: proposalText,
    });
    
  } catch (error) {
    console.error("Process input error:", error);
    res.status(500).json({ 
      error: "Failed to process input",
      code: "ANALYSIS_FAILED" 
    } as ErrorResponse);
  }
});
```

---

## PART 7: Update Frontend — Types and State

### 7A: `/client/src/pages/home.tsx`

**UPDATE** the Observation interface (find existing or add near top):

```typescript
type ActionType = 'rewrite' | 'add_info';
type ObservationStatus = 'pending' | 'awaiting_input' | 'processing' | 'accepted' | 'declined' | 'locked';

interface Observation {
  id: string;
  sectionId: string;
  type: string;
  signal: string;
  message: string;
  confidence: number;
  actionType: ActionType;
  inputPrompt?: string;
  proposal?: string;
  rewrittenContent?: string;
  status: ObservationStatus;
}
```

---

## PART 8: Update SuggestionPopover Component

**REPLACE** the existing SuggestionPopover with this enhanced version:

```tsx
const SuggestionPopover = ({ sectionId }: { sectionId: string }) => {
  const observation = observations.find(o => 
    o.sectionId === sectionId && 
    !['accepted', 'declined', 'locked'].includes(o.status)
  );
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, language } = useSettings();
  
  if (!observation) return null;
  
  const handleSubmitInput = async () => {
    if (!userInput.trim() || !cvData) return;
    
    setIsProcessing(true);
    
    // Find the section
    const section = cvData.sections.find(s => s.id === observation.sectionId);
    if (!section) {
      setIsProcessing(false);
      return;
    }
    
    try {
      const response = await fetch('/api/cv/process-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Language': language,
        },
        body: JSON.stringify({
          observationId: observation.id,
          sectionId: observation.sectionId,
          userInput: userInput.trim(),
          section: section,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to process');
      
      const data = await response.json();
      
      // Update observation with generated content
      setObservations(prev => prev.map(o => 
        o.id === observation.id 
          ? { ...o, rewrittenContent: data.rewrittenContent, proposal: data.proposal }
          : o
      ));
      
      setUserInput('');
      
    } catch (error) {
      console.error('Failed to process input:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleApply = () => {
    if (!observation.rewrittenContent || !cvData) return;
    
    // Update the CV section content
    setCvData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === observation.sectionId
            ? { ...section, content: observation.rewrittenContent! }
            : section
        ),
      };
    });
    
    // Mark observation as accepted
    setObservations(prev => prev.map(o =>
      o.id === observation.id ? { ...o, status: 'accepted' as ObservationStatus } : o
    ));
    
    setActiveSection(null);
  };
  
  const handleLock = () => {
    setObservations(prev => prev.map(o =>
      o.id === observation.id ? { ...o, status: 'locked' as ObservationStatus } : o
    ));
    setActiveSection(null);
  };
  
  const handleDecline = () => {
    setObservations(prev => prev.map(o =>
      o.id === observation.id ? { ...o, status: 'declined' as ObservationStatus } : o
    ));
    setActiveSection(null);
  };
  
  // Render based on action type and state
  const renderContent = () => {
    // ADD_INFO: Needs user input first (and no rewrittenContent yet)
    if (observation.actionType === 'add_info' && !observation.rewrittenContent) {
      return (
        <>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-3 items-start">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                {observation.message}
              </p>
            </div>
          </div>
          
          <div className="p-4 dark:bg-gray-900">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
              {observation.inputPrompt}
            </label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t('input.placeholder')}
              className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              rows={3}
              disabled={isProcessing}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setActiveSection(null)}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                {t('complete.back')}
              </button>
              <button
                onClick={handleSubmitInput}
                disabled={!userInput.trim() || isProcessing}
                className="flex-1 px-3 py-2 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('submit')
                )}
              </button>
            </div>
          </div>
        </>
      );
    }
    
    // REWRITE or ADD_INFO with generated content: Show preview
    return (
      <>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-3 items-start">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
              {observation.message}
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {t('complete.suggestedChange')}
            </span>
            <button 
              onClick={() => setActiveSection(null)} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="text-[10px]">{t('complete.back')}</span>
            </button>
          </div>
          
          {/* Preview of new content */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-3 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {observation.rewrittenContent}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleLock}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
            >
              <Lock className="w-3 h-3" />
              {t('complete.lock')}
            </button>
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Check className="w-3 h-3" />
              {t('complete.apply')}
            </button>
          </div>
        </div>
      </>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      data-suggestion-popover
      className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {renderContent()}
    </motion.div>
  );
};
```

---

## PART 9: Update Highlight Classes

**UPDATE** getHighlightClass to show green for accepted, nothing for declined/locked:

```tsx
const getHighlightClass = (sectionId: string) => {
  const observation = observations.find(o => o.sectionId === sectionId);
  
  if (!observation) return '';
  
  if (observation.status === 'accepted') {
    return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400';
  }
  
  if (observation.status === 'declined' || observation.status === 'locked') {
    return ''; // No highlight for declined or locked
  }
  
  // Pending, awaiting_input, or processing
  return 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400';
};
```

---

## PART 10: Update getPendingObservation

**UPDATE** to handle all resolved states:

```tsx
const getPendingObservation = (sectionId: string) => {
  return observations.find(o => 
    o.sectionId === sectionId && 
    !['accepted', 'declined', 'locked'].includes(o.status)
  );
};
```

---

## PART 11: Add Translation Keys

**ADD** to SettingsContext.tsx translations:

```typescript
// English
'input.placeholder': 'Enter your information...',
'processing': 'Processing...',
'submit': 'Submit',

// Danish
'input.placeholder': 'Indtast dine oplysninger...',
'processing': 'Behandler...',
'submit': 'Indsend',
```

---

## Verification Checklist

**Codex Setup:**
1. [ ] `/server/codex/` directory created with all files
2. [ ] `actions.json` loads without errors
3. [ ] Prompt templates load correctly for both EN and DA

**Observation Generation:**
4. [ ] Observations include `actionType` field (`rewrite` or `add_info`)
5. [ ] `add_info` observations include `inputPrompt`
6. [ ] `rewrite` observations include pre-generated `rewrittenContent`

**User Input Flow (add_info):**
7. [ ] Clicking section with add_info observation shows input prompt
8. [ ] User can type in textarea and submit
9. [ ] After submit, generated content appears for review
10. [ ] "Apply Change" updates the CV section content

**Rewrite Flow:**
11. [ ] Clicking section with rewrite observation shows preview immediately
12. [ ] "Apply Change" updates the CV section content

**Visual Feedback:**
13. [ ] Pending observations → Yellow highlight
14. [ ] Applied/accepted → Green highlight
15. [ ] Locked/declined → No highlight

**Language Support:**
16. [ ] Input prompts appear in selected language (EN/DA)
17. [ ] Generated content respects language setting

---

## Summary of Changes

| Location | Changes |
|----------|---------|
| `/server/codex/` | NEW directory with index.ts, actions.json, prompts/ |
| `/shared/schema.ts` | Add `ActionType`, update `ObservationStatus`, add fields to `Observation` |
| `/server/engine/observationGenerator.ts` | Update `createObservation` to accept action fields |
| `/server/llm/claude.ts` | Add `generateCodexRewrite` and `generateFromUserInput` functions |
| `/server/routes.ts` | Update analyze endpoint, add `/api/cv/process-input` endpoint |
| `/client/src/pages/home.tsx` | New `SuggestionPopover` with input handling, updated highlight logic |
| `/client/src/contexts/SettingsContext.tsx` | Add new translation keys |

**Files NOT changed:**
- `/server/engine/thresholds.ts` — kept as-is, codex imports from it

---

**END OF PATCH**

*Patch version: 005*  
*Priority: HIGH*  
*Architect: Logos*
