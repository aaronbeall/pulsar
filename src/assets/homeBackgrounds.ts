import { getDayOfYear } from 'date-fns';
import workout1 from './home-backgrounds/home-bg-workout-1.jpg';
import workout2 from './home-backgrounds/home-bg-workout-2.jpg';
import workout3 from './home-backgrounds/home-bg-workout-3.jpg';
import rest1 from './home-backgrounds/home-bg-rest-1.jpg';
import rest2 from './home-backgrounds/home-bg-rest-2.jpg';
import rest3 from './home-backgrounds/home-bg-rest-3.jpg';

export interface HomeBackgroundImage {
  src: string;
  title: string;
  // Absent for a today's-exercise pick (Change 2) — that's a user's own data, not one of
  // the curated CC-licensed photos below, so there's nothing to credit in Settings.
  author?: string;
  license?: string;
  sourceUrl?: string;
}

// All from Wikimedia Commons, CC BY / CC BY-SA (attribution required — credited in
// Settings rather than overlaid on the image itself, to keep the home view uncluttered).
const WORKOUT_BACKGROUNDS: HomeBackgroundImage[] = [
  {
    src: workout1,
    title: 'Uphill',
    author: 'Don McCullough',
    license: 'CC BY 2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Uphill_-_Explored_-_Flickr_-_Don_McCullough.jpg',
  },
  {
    src: workout2,
    title: 'Runner 2',
    author: 'opheliarossetti',
    license: 'CC BY-SA 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Runner_2.jpg',
  },
  {
    src: workout3,
    title: 'Cyclist in silhouette at sunset, Marchant Park',
    author: 'John Robert McPherson',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ficus_microcarpa_and_cyclist_in_silhouette_at_sunset_Marchant_Park_Aspley_P1080052.jpg',
  },
];

const REST_BACKGROUNDS: HomeBackgroundImage[] = [
  {
    src: rest1,
    title: 'Sunrise in Dalkey, Dublin',
    author: 'Giuseppe Milo',
    license: 'CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunrise_In_Dalkey_Dublin_Ireland_Seascape_Photography_(194456677).jpeg',
  },
  {
    src: rest2,
    title: 'Bull Island at sunrise, Dublin',
    author: 'Giuseppe Milo',
    license: 'CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bull_Island_At_Sunrise_Dublin_Ireland_Landscape_Photography_(197048387).jpeg',
  },
  {
    src: rest3,
    title: 'Sunrise in Bull Island, Dublin',
    author: 'Giuseppe Milo',
    license: 'CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sunrise_In_Bull_Island_Dublin_Ireland_Landscape_Photography_(196665097).jpeg',
  },
];

export const ALL_HOME_BACKGROUNDS = [...WORKOUT_BACKGROUNDS, ...REST_BACKGROUNDS];

// Small integer hash (Knuth's multiplicative method + XOR-shift to actually mix bits —
// multiplying by an odd constant alone preserves the input's parity, which would make a
// naive `(seed * const) % 2` coin flip always land the same way as `seed % 2`). Used to
// derive a workout-day coin flip that doesn't visibly correlate with the day-of-year seed
// used for pool-index picks below.
function hashSeed(n: number): number {
  let h = (n * 2654435761) | 0;
  h = h ^ (h >>> 16);
  return Math.abs(h);
}

/**
 * Deterministically pick one image for "today" — same image all day on every reload,
 * varies day to day. Deliberately not re-randomized per render/reload: a background that
 * changes every visit would be more distracting than pleasant.
 *
 * Rest days always pick from the curated calm-photo pool. Workout days flip a (seeded)
 * coin between that same curated energetic-photo pool and a photo of one of today's
 * actual scheduled exercises, when any are available with an image — extra personalization
 * that ties the background to what you're actually about to do.
 */
export function pickTodaysHomeBackground(
  isRestDay: boolean,
  exerciseImages: string[] = [],
  date: Date = new Date()
): HomeBackgroundImage {
  const daySeed = date.getFullYear() * 1000 + getDayOfYear(date);

  if (isRestDay) {
    return REST_BACKGROUNDS[daySeed % REST_BACKGROUNDS.length];
  }

  const pickExerciseImage = exerciseImages.length > 0 && hashSeed(daySeed) % 2 === 0;
  if (pickExerciseImage) {
    return { src: exerciseImages[daySeed % exerciseImages.length], title: 'Today’s workout' };
  }
  return WORKOUT_BACKGROUNDS[daySeed % WORKOUT_BACKGROUNDS.length];
}
