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
export type ActionType = 'rewrite' | 'add_info' | 'guided_edit';
export type ObservationStatus = 'pending' | 'awaiting_input' | 'processing' | 'accepted' | 'declined' | 'locked';

export interface Observation {
  id: string;
  sectionId: string;
  type: ObservationType;
  confidence: number;      // 0-1, internal only
  signal: string;          // internal code: "sparse_density"
  message: string;         // user-facing phrased observation

  // Action fields
  actionType: ActionType;
  inputPrompt?: string;          // Legacy: Question to ask user
  proposal?: string;             // Description of what will change
  rewrittenContent?: string;     // The actual new content to apply

  status: ObservationStatus;

  // Guided editing (Layer 2)
  guidedEdit?: GuidedEditContext;

  // Contextual label (replaces diagnostic sentences)
  contextualLabel?: {
    en: string;
    da: string;
  } | null;
  contextualLabelType?: string | null;
}

// ============================================
// GUIDED EDIT CONTEXT
// ============================================

export type RepresentationStatus = 'too_short' | 'balanced' | 'too_long';

export interface GuidedEditContext {
  claimBlocks: string[];              // Suggested elements as click-to-add pills
  sentenceStarters: string[];         // Rotating placeholder prompts
  representationStatus: RepresentationStatus;
}

// ============================================
// OUTCOME PICKERS (Layer 3)
// ============================================

export type OutcomeCategory = 'revenue' | 'positioning' | 'team_growth' | 'delivery';

export interface OutcomePicker {
  category: OutcomeCategory;
  label: { en: string; da: string };
  scaffold: { en: string; da: string };
}

export const OUTCOME_PICKERS: OutcomePicker[] = [
  {
    category: 'revenue',
    label: { en: 'Revenue impact', da: 'Omsætningseffekt' },
    scaffold: { en: 'Contributed to revenue growth by ___', da: 'Bidrog til omsætningsvækst ved ___' },
  },
  {
    category: 'positioning',
    label: { en: 'Market positioning', da: 'Markedspositionering' },
    scaffold: { en: 'Strengthened market position through ___', da: 'Styrkede markedsposition gennem ___' },
  },
  {
    category: 'team_growth',
    label: { en: 'Team growth', da: 'Teamvækst' },
    scaffold: { en: 'Built and developed team capabilities in ___', da: 'Opbyggede og udviklede teamkompetencer inden for ___' },
  },
  {
    category: 'delivery',
    label: { en: 'Delivery performance', da: 'Leveringsperformance' },
    scaffold: { en: 'Improved delivery outcomes by ___', da: 'Forbedrede leveringsresultater ved ___' },
  },
];

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
  rawText?: string;            // original text for display
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
  response: z.enum(['accepted', 'declined', 'locked']),
});
