import { CV, Observation } from '@shared/schema';

/**
 * IN-MEMORY STORAGE FOR V0
 *
 * This is intentionally simple. We're not using a database yet.
 * CVs are stored for the session duration only.
 *
 * For v1, this will be replaced with proper persistence.
 */

class CVStorage {
  private cvs: Map<string, CV> = new Map();

  store(cv: CV): void {
    this.cvs.set(cv.id, cv);
  }

  get(id: string): CV | undefined {
    return this.cvs.get(id);
  }

  updateObservation(cvId: string, observationId: string, status: Observation['status']): Observation | undefined {
    const cv = this.cvs.get(cvId);
    if (!cv) return undefined;

    const observation = cv.observations.find(o => o.id === observationId);
    if (!observation) return undefined;

    observation.status = status;
    return observation;
  }

  getSection(cvId: string, sectionId: string) {
    const cv = this.cvs.get(cvId);
    if (!cv) return undefined;
    return cv.sections.find(s => s.id === sectionId);
  }

  // For debugging
  listAll(): CV[] {
    return Array.from(this.cvs.values());
  }

  clear(): void {
    this.cvs.clear();
  }
}

export const cvStorage = new CVStorage();
