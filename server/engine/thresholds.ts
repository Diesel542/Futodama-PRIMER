/**
 * PRIMER THRESHOLDS
 *
 * These values are initial estimates. They MUST be validated
 * against real CREADIS CVs and adjusted accordingly.
 *
 * DO NOT hardcode these values elsewhere. Always import from here.
 */

export const DENSITY_THRESHOLDS = {
  SPARSE_BELOW: 4,        // words per month - below this is sparse
  DENSE_ABOVE: 25,        // words per month - above this is unusually dense
  IDEAL_MIN: 8,           // words per month - healthy minimum
  IDEAL_MAX: 20,          // words per month - healthy maximum
};

export const TEMPORAL_THRESHOLDS = {
  OUTDATED_MONTHS: 36,    // experience older than this is "outdated"
  RECENT_MONTHS: 12,      // experience within this is "recent"
  GAP_WARNING_MONTHS: 6,  // unexplained gap longer than this triggers warning
};

export const STRUCTURAL_INDICATORS = {
  // Regex patterns for detection
  METRICS: /\d+%|\$[\d,]+|\d+x|\d+\s*(users|customers|clients|employees|team members)/gi,
  OUTCOMES: /\b(resulted|improved|reduced|increased|decreased|achieved|delivered|saved|generated|grew|accelerated)\b/gi,
  TOOLS: /\b(Python|JavaScript|TypeScript|Java|Go|Rust|AWS|Azure|GCP|Docker|Kubernetes|React|Node|SQL|PostgreSQL|MongoDB|Kafka|Redis|TensorFlow|PyTorch)\b/gi,
  TEAM_SIZE: /\b(team of|led|managed|supervised)\s*\d+/gi,
};

export const CONFIDENCE_THRESHOLDS = {
  MINIMUM_TO_SHOW: 0.7,   // observations below this are not shown
  HIGH: 0.85,             // high confidence
  MEDIUM: 0.7,            // medium confidence
};

export const PARSE_THRESHOLDS = {
  MIN_CONTENT_LENGTH: 100,        // characters
  MAX_UNPARSED_RATIO: 0.3,        // if > 30% unparsed, fail gracefully
};
