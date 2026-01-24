import { v4 as uuidv4 } from 'uuid';
import { CVSection, Observation, ObservationType, ActionType } from '@shared/schema';
import { CONFIDENCE_THRESHOLDS } from './thresholds';
import { getActionForSignal } from '../codex';
import { DensitySignal, analyzeDensityAll } from './analyzer_density';
import { TemporalSignal, analyzeTemporalAll, detectGaps } from './analyzer_temporal';
import { StructuralSignal, analyzeStructureAll } from './analyzer_structural';

/**
 * OBSERVATION GENERATOR
 *
 * Converts analyzer signals into Observation objects.
 * Filters by confidence threshold.
 * Does NOT phrase observations - that's the LLM's job.
 */

export interface RawObservation {
  sectionId: string;
  type: ObservationType;
  signal: string;
  confidence: number;
  context: Record<string, unknown>; // Data for LLM phrasing
}

export function generateObservations(sections: CVSection[]): RawObservation[] {
  const raw: RawObservation[] = [];

  // Run all analyzers
  const densitySignals = analyzeDensityAll(sections);
  const temporalSignals = analyzeTemporalAll(sections);
  const gapSignals = detectGaps(sections);
  const structuralSignals = analyzeStructureAll(sections);

  // Convert density signals
  for (const signal of densitySignals) {
    if (signal.signal === 'healthy_density') continue; // Don't observe healthy

    raw.push({
      sectionId: signal.sectionId,
      type: 'density',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        wordCount: signal.details.wordCount,
        durationMonths: signal.details.durationMonths,
        wordsPerMonth: signal.details.wordsPerMonth,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }

  // Convert temporal signals
  for (const signal of temporalSignals) {
    if (signal.signal === 'current_and_healthy') continue;

    raw.push({
      sectionId: signal.sectionId,
      type: 'temporal',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        monthsSinceEnd: signal.details.monthsSinceEnd,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }

  // Convert gap signals
  for (const signal of gapSignals) {
    raw.push({
      sectionId: signal.sectionId,
      type: 'temporal',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        gapMonths: signal.details.monthsSinceEnd,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }

  // Convert structural signals
  for (const signal of structuralSignals) {
    if (signal.signal === 'well_structured') continue;

    raw.push({
      sectionId: signal.sectionId,
      type: 'structural',
      signal: signal.signal,
      confidence: signal.confidence,
      context: {
        completeness: signal.completeness,
        sectionTitle: sections.find(s => s.id === signal.sectionId)?.title,
      },
    });
  }

  // Filter by confidence threshold
  const filtered = raw.filter(o => o.confidence >= CONFIDENCE_THRESHOLDS.MINIMUM_TO_SHOW);

  // Sort by confidence (highest first)
  filtered.sort((a, b) => b.confidence - a.confidence);

  // Limit to top 8 observations (avoid overwhelming)
  return filtered.slice(0, 8);
}

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

/**
 * Identify positive signals for strengths
 */
export interface StrengthSignal {
  signal: string;
  confidence: number;
  context: Record<string, unknown>;
}

export function identifyStrengths(sections: CVSection[]): StrengthSignal[] {
  const strengths: StrengthSignal[] = [];

  // Check for consistent progression
  const jobs = sections.filter(s => s.type === 'job').sort((a, b) => {
    if (!a.startDate || !b.startDate) return 0;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  if (jobs.length >= 2) {
    // Check if titles suggest progression
    const titles = jobs.map(j => j.title.toLowerCase());
    const hasProgression = titles.some((t, i) => {
      if (i === 0) return false;
      const current = t;
      const previous = titles[i - 1];
      return (current.includes('senior') && !previous.includes('senior')) ||
             (current.includes('lead') && !previous.includes('lead')) ||
             (current.includes('manager') && !previous.includes('manager'));
    });

    if (hasProgression) {
      strengths.push({
        signal: 'consistent_progression',
        confidence: 0.8,
        context: { jobCount: jobs.length },
      });
    }
  }

  // Check for metrics presence across sections
  const sectionsWithMetrics = sections.filter(s => s.completeness?.hasMetrics);
  if (sectionsWithMetrics.length >= 2) {
    strengths.push({
      signal: 'metrics_present',
      confidence: 0.85,
      context: { count: sectionsWithMetrics.length },
    });
  }

  // Check for recent activity
  const recentJobs = sections.filter(s =>
    s.type === 'job' &&
    s.recencyScore !== undefined &&
    s.recencyScore < 12
  );
  if (recentJobs.length > 0) {
    strengths.push({
      signal: 'recent_activity',
      confidence: 0.9,
      context: {},
    });
  }

  // Check for balanced density
  const densityScores = sections
    .filter(s => s.densityScore !== undefined)
    .map(s => s.densityScore!);

  if (densityScores.length >= 2) {
    const avg = densityScores.reduce((a, b) => a + b, 0) / densityScores.length;
    const variance = densityScores.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / densityScores.length;

    if (variance < 50 && avg >= 8 && avg <= 20) {
      strengths.push({
        signal: 'balanced_density',
        confidence: 0.75,
        context: { averageWordsPerMonth: avg },
      });
    }
  }

  return strengths;
}
