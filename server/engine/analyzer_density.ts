import { CVSection } from '@shared/schema';
import { DENSITY_THRESHOLDS } from './thresholds';

/**
 * DENSITY ANALYZER
 *
 * Measures words-per-month for job/project sections.
 * Detects sections that are too sparse (undertended) or too dense.
 */

export interface DensitySignal {
  sectionId: string;
  signal: 'sparse_density' | 'dense_but_shallow' | 'healthy_density';
  densityScore: number;
  confidence: number;
  details: {
    wordCount: number;
    durationMonths: number;
    wordsPerMonth: number;
  };
}

export function analyzeDensity(section: CVSection): DensitySignal | null {
  // Only analyze sections that have duration
  if (!section.duration || section.duration <= 0) {
    return null;
  }

  // Only analyze jobs and projects
  if (section.type !== 'job' && section.type !== 'project') {
    return null;
  }

  const wordsPerMonth = section.wordCount / section.duration;

  // Update section with computed score
  section.densityScore = wordsPerMonth;

  // Determine signal
  let signal: DensitySignal['signal'];
  let confidence: number;

  if (wordsPerMonth < DENSITY_THRESHOLDS.SPARSE_BELOW) {
    signal = 'sparse_density';
    // More sparse = more confident this is a problem
    confidence = Math.min(0.95, 0.7 + (DENSITY_THRESHOLDS.SPARSE_BELOW - wordsPerMonth) * 0.05);
  } else if (wordsPerMonth > DENSITY_THRESHOLDS.DENSE_ABOVE) {
    signal = 'dense_but_shallow';
    // Very high density might indicate list-dumping
    confidence = Math.min(0.85, 0.6 + (wordsPerMonth - DENSITY_THRESHOLDS.DENSE_ABOVE) * 0.01);
  } else {
    signal = 'healthy_density';
    confidence = 0.9;
  }

  // Reduce confidence if parse confidence was low
  if (section.parseConfidence === 'low') {
    confidence *= 0.6;
  } else if (section.parseConfidence === 'medium') {
    confidence *= 0.8;
  }

  return {
    sectionId: section.id,
    signal,
    densityScore: wordsPerMonth,
    confidence,
    details: {
      wordCount: section.wordCount,
      durationMonths: section.duration,
      wordsPerMonth,
    },
  };
}

export function analyzeDensityAll(sections: CVSection[]): DensitySignal[] {
  return sections
    .map(analyzeDensity)
    .filter((signal): signal is DensitySignal => signal !== null);
}
