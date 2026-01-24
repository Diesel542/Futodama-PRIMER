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
