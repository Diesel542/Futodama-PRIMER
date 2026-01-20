import { CVSection } from '@shared/schema';
import { TEMPORAL_THRESHOLDS } from './thresholds';

/**
 * TEMPORAL ANALYZER
 *
 * Detects:
 * - Outdated experience (last activity > N months ago)
 * - Recent but thin sections
 * - Large unexplained gaps
 */

export interface TemporalSignal {
  sectionId: string;
  signal: 'outdated_experience' | 'recent_but_thin' | 'large_gap' | 'current_and_healthy';
  recencyScore: number; // months since end date
  confidence: number;
  details: {
    endDate?: string;
    monthsSinceEnd: number;
  };
}

export function analyzeTemporal(section: CVSection): TemporalSignal | null {
  // Only analyze jobs and projects with end dates
  if (section.type !== 'job' && section.type !== 'project') {
    return null;
  }

  const now = new Date();
  let monthsSinceEnd: number;

  if (!section.endDate) {
    // No end date - assume current if it's a job
    monthsSinceEnd = 0;
  } else {
    const endDate = new Date(section.endDate);
    monthsSinceEnd = (now.getFullYear() - endDate.getFullYear()) * 12
      + (now.getMonth() - endDate.getMonth());
  }

  // Update section with computed score
  section.recencyScore = monthsSinceEnd;

  // Determine signal
  let signal: TemporalSignal['signal'];
  let confidence: number;

  if (monthsSinceEnd > TEMPORAL_THRESHOLDS.OUTDATED_MONTHS) {
    signal = 'outdated_experience';
    confidence = Math.min(0.9, 0.7 + (monthsSinceEnd - TEMPORAL_THRESHOLDS.OUTDATED_MONTHS) * 0.005);
  } else if (monthsSinceEnd < TEMPORAL_THRESHOLDS.RECENT_MONTHS && section.wordCount < 50) {
    signal = 'recent_but_thin';
    confidence = 0.75;
  } else {
    signal = 'current_and_healthy';
    confidence = 0.85;
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
    recencyScore: monthsSinceEnd,
    confidence,
    details: {
      endDate: section.endDate,
      monthsSinceEnd,
    },
  };
}

export function analyzeTemporalAll(sections: CVSection[]): TemporalSignal[] {
  return sections
    .map(analyzeTemporal)
    .filter((signal): signal is TemporalSignal => signal !== null);
}

/**
 * Detect gaps between consecutive jobs
 */
export function detectGaps(sections: CVSection[]): TemporalSignal[] {
  const jobs = sections
    .filter(s => s.type === 'job' && s.endDate && s.startDate)
    .sort((a, b) => new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime());

  const gaps: TemporalSignal[] = [];

  for (let i = 0; i < jobs.length - 1; i++) {
    const current = jobs[i];
    const previous = jobs[i + 1];

    const currentStart = new Date(current.startDate!);
    const previousEnd = new Date(previous.endDate!);

    const gapMonths = (currentStart.getFullYear() - previousEnd.getFullYear()) * 12
      + (currentStart.getMonth() - previousEnd.getMonth());

    if (gapMonths > TEMPORAL_THRESHOLDS.GAP_WARNING_MONTHS) {
      gaps.push({
        sectionId: current.id,
        signal: 'large_gap',
        recencyScore: gapMonths,
        confidence: Math.min(0.85, 0.6 + gapMonths * 0.02),
        details: {
          monthsSinceEnd: gapMonths,
        },
      });
    }
  }

  return gaps;
}
