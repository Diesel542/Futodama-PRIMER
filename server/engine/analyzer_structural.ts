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
