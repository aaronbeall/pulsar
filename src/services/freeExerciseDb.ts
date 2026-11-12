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
// getAddedExercise): a much broader net than the curated ~170 templates, with guaranteed-
// relevant images (no risk of the keyword-collision false positives a general-purpose
// image search can return), but still a finite catalog — genuinely novel or AI-invented
// exercise names fall through to the live search after this.

import { normalizeExerciseName as normalize } from '../utils/exerciseName';

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


/**
 * Curated exercise names (exerciseTemplates.ts and the Planner catalog) whose free-exercise-db
 * entry has a different name, so they still get its description and photo. Only definitive
 * matches: the same exercise in its standard form, never a loose guess.
 */
export const FREE_EXERCISE_DB_ALIASES: Record<string, string> = {
  'Crunch':                 'Crunches',
  'Glute Bridge':           'Butt Lift (Bridge)',
  'Tricep Dip':             'Dips - Triceps Version',
  'Side Plank':             'Side Bridge',
  'Calf Raise':             'Standing Calf Raises',
  'Hip Thrust':             'Barbell Hip Thrust',
  'Jump Squat':             'Freehand Jump Squat',
  'Squat Jump':             'Freehand Jump Squat',
  'Box Jump':               'Front Box Jump',
  'Jump Rope':              'Rope Jumping',
  'Bench Press':            'Barbell Bench Press - Medium Grip',
  'Incline Bench Press':    'Barbell Incline Bench Press - Medium Grip',
  'Decline Bench Press':    'Decline Barbell Bench Press',
  'Chest Fly':              'Dumbbell Flyes',
  'Overhead Press':         'Standing Military Press',
  'Arnold Press':           'Arnold Dumbbell Press',
  'Lateral Raise':          'Side Lateral Raise',
  'Front Raise':            'Front Dumbbell Raise',
  'Rear Delt Fly':          'Reverse Flyes',
  'Pull-down':              'Wide-Grip Lat Pulldown',
  'Bent-over Row':          'Bent Over Barbell Row',
  'Seated Row':             'Seated Cable Rows',
  'Bicep Curl':             'Dumbbell Bicep Curl',
  'Skullcrusher':           'EZ-Bar Skullcrusher',
  'Tricep Kickback':        'Tricep Dumbbell Kickback',
  'Cable Pushdown':         'Triceps Pushdown',
  'Front Squat':            'Front Barbell Squat',
  'Leg Curl':               'Lying Leg Curls',
  'Deadlift':               'Barbell Deadlift',
  'Ab Wheel Rollout':       'Ab Roller',
  'Hip Abduction':          'Thigh Abductor',
  'Woodchopper':            'Standing Cable Wood Chop',
  'Medicine Ball Slam':     'Overhead Slam',
  'Battle Rope Wave':       'Battling Ropes',
  'Rowing':                 'Rowing, Stationary',
  'Row Machine':            'Rowing, Stationary',
  'Cycling':                'Bicycling',
  'Stair Climber':          'Stairmaster',
  'Elliptical':             'Elliptical Trainer',
  'Sled Drag':              'Sled Drag - Harness',
  'Kettlebell Clean':       'One-Arm Kettlebell Clean',
  'Kettlebell Snatch':      'One-Arm Kettlebell Snatch',
  'Kettlebell Row':         'One-Arm Kettlebell Row',
  'Reverse Hyper':          'Reverse Hyperextension',
  'Turkish Get-Up':         'Kettlebell Turkish Get-Up (Lunge style)',
  'Band Shoulder Press':    'Shoulder Press - With Bands',
};
const ALIASES = new Map(Object.entries(FREE_EXERCISE_DB_ALIASES).map(([from, to]) => [normalize(from), normalize(to)]));

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
  const key = normalize(exerciseName);
  return index.get(key) || index.get(ALIASES.get(key) ?? '') || null;
}

export function isTimedCategory(category: string): boolean {
  return TIMED_CATEGORIES.has(category);
}

export function getFreeExerciseDbImageUrls(entry: FreeExerciseDbEntry): string[] {
  return entry.images.map(path => `${IMAGE_BASE_URL}${path}`);
}
