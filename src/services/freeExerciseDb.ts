// Free, purpose-built exercise dataset (873 exercises, real photos, Unlicense/public domain):
// https://github.com/yuhonas/free-exercise-db
//
// Bundled as a static asset (public/free-exercise-db.json — pruned to only the fields
// Pulsar uses, ~310KB down from the source's ~1MB) rather than fetched from a third party
// at runtime: exercise lookups then never depend on an external API staying up, which is
// exactly the failure mode that broke the previous Google CSE integration. Fetched once,
// lazily, and memoized for the session — actual exercise photos still load from Wikimedia's
// upload CDN by URL (not bundled; there are 873 of them), same as any other <img> src.
//
// This sits between the curated `exerciseTemplates.ts` catalog and the live Wikimedia
// Commons search in the exercise resolution order (see routineBuilderService.ts:
// getAddedExercise): a much broader net than the curated ~114 templates, with guaranteed-
// relevant images (no risk of the keyword-collision false positives a general-purpose
// image search can return), but still a finite catalog — genuinely novel or AI-invented
// exercise names fall through to the live search after this.

export interface FreeExerciseDbEntry {
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  images: string[]; // relative paths, e.g. "Barbell_Squat/0.jpg" — 0-2 per entry
}

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// Categories that are typically held/timed rather than rep-counted.
const TIMED_CATEGORIES = new Set(['cardio', 'stretching']);

// Local, private copy of the same normalization scheme used elsewhere (lowercase, strip
// non-alphanumeric, strip trailing plural 's') — duplicated rather than imported from
// routineBuilderService.ts to avoid a circular import (that module will import from here).
function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/s$/, '');
}

let indexPromise: Promise<Map<string, FreeExerciseDbEntry>> | null = null;

function loadIndex(): Promise<Map<string, FreeExerciseDbEntry>> {
  if (!indexPromise) {
    indexPromise = fetch(`${import.meta.env.BASE_URL}free-exercise-db.json`)
      .then(res => (res.ok ? res.json() : []))
      .then((entries: FreeExerciseDbEntry[]) => {
        const map = new Map<string, FreeExerciseDbEntry>();
        for (const entry of entries) {
          const key = normalize(entry.name);
          if (!map.has(key)) map.set(key, entry); // first match wins on duplicate names
        }
        return map;
      })
      .catch(() => new Map<string, FreeExerciseDbEntry>());
  }
  return indexPromise;
}

export async function findFreeExerciseDbEntry(exerciseName: string): Promise<FreeExerciseDbEntry | null> {
  const index = await loadIndex();
  return index.get(normalize(exerciseName)) || null;
}

export function isTimedCategory(category: string): boolean {
  return TIMED_CATEGORIES.has(category);
}

export function getFreeExerciseDbImageUrls(entry: FreeExerciseDbEntry): string[] {
  return entry.images.map(path => `${IMAGE_BASE_URL}${path}`);
}
