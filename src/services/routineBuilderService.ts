// NOTE: All DB access for exercises/routines/workouts should go through the Zustand store (pulsarStore.ts).
// This service now expects exercises to be passed in from the store, and add operations to use the store's addExercise.
// Direct DB calls (getExercises, addExercise) have been removed from this file.

import { Routine, Exercise, DayOfWeek } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { getSearchUrl, getHowToQuery, fetchExerciseSearchImageUrl } from '../utils/webUtils';
import { exerciseTemplates, ExerciseTemplate } from './exerciseTemplates';
import { routineTemplates, RoutineTemplate } from './routineTemplates';
import { dailyWorkoutTemplates } from './dailyWorkoutTemplates';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a new Exercise from a template (ExerciseTemplate).
 * Fetches how-to and image URLs, and returns a new Exercise object.
 */
export async function createNewExercise(template: ExerciseTemplate): Promise<Exercise> {
  const howToUrl = getSearchUrl(getHowToQuery(template.name));
  const imageUrl = await fetchExerciseSearchImageUrl(template.name);
  return {
    id: uuidv4(),
    name: template.name,
    description: template.description,
    targetMuscles: template.targetMuscles,
    howToUrl,
    coverImageUrl: imageUrl || '',
    iconImageUrl: imageUrl || '',
    liked: false,
    disliked: false,
    favorite: false,
    timed: !!template.timed,
  };
}

/**
 * Normalize a string for forgiving search (lowercase, alphanum, no trailing plural 's').
 */
export function normalizeExerciseName(str: string) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') // Remove non-alphanum
    .replace(/s$/, ''); // Remove trailing plural s
}

/**
 * Find an existing Exercise or ExerciseTemplate by name (forgiving match).
 * Returns the Exercise or ExerciseTemplate if found, otherwise null.
 */
export function findExistingExercise(name: string, exercises: Exercise[]): Exercise | ExerciseTemplate | null {
  const norm = normalizeExerciseName(name);
  // Search in existing exercises
  for (const ex of exercises) {
    if (normalizeExerciseName(ex.name) === norm) return ex;
  }
  // Search in suggestions
  for (const suggestion of exerciseTemplates) {
    if (normalizeExerciseName(suggestion.name) === norm) return suggestion;
  }
  return null;
}

/**
 * Find or create and add an Exercise by name.
 * Returns an existing Exercise if found, otherwise creates from template or stub and expects caller to add to store.
 */
export async function getAddedExercise(name: string, exercises: Exercise[], addExercise: (ex: Exercise) => Promise<void>): Promise<Exercise> {
  const norm = normalizeExerciseName(name);
  // 1. Search in existing exercises
  for (const ex of exercises) {
    if (normalizeExerciseName(ex.name) === norm) return ex;
  }
  // 2. Search in templates
  let template = exerciseTemplates.find(t => normalizeExerciseName(t.name) === norm);
  // 3. If not found, create ad hoc template stub
  if (!template) {
    template = {
      name,
      description: '',
      targetMuscles: [],
      timed: false,
    };
  }
  // 4. Create and add to store
  const newExercise = await createNewExercise(template);
  await addExercise(newExercise);
  return newExercise;
}

/**
 * Search for exercises or templates matching a search string, sorted by match score.
 * Score: +2 for name match, +1 for each targetMuscles match, +3 for liked, -3 for disliked.
 * Only returns matches with score > 0.
 */
export function searchExerciseSuggestions(
  allExercises: Array<Exercise | ExerciseTemplate>,
  search: string
): Array<Exercise | ExerciseTemplate> {
  const norm = normalizeExerciseName(search);
  // Helper to match name or targetMuscles and tally score
  function matchScore(ex: { name: string; targetMuscles?: string[]; liked?: boolean; disliked?: boolean }) {
    let score = 0;
    if (normalizeExerciseName(ex.name).includes(norm)) score += 2;
    if (ex.targetMuscles) {
      for (const m of ex.targetMuscles) {
        if (normalizeExerciseName(m).includes(norm)) score += 1;
      }
    }
    if (ex.liked) score += 3;
    if (ex.disliked) score -= 3;
    return score;
  }
  // Only return matches with score > 0
  const matches = allExercises
    .map(ex => ({ ex, score: matchScore(ex) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ ex }) => ex);
  return matches;
}

const funnyWords = [
  // General funny/quirky
  'Wacky', 'Zany', 'Bouncy', 'Funky', 'Snazzy', 'Quirky', 'Spunky', 'Jazzy', 'Peppy', 'Sassy',
  'Loopy', 'Goofy', 'Nutty', 'Cheeky', 'Perky', 'Zippy', 'Bubbly', 'Jolly', 'Frisky', 'Chirpy',
  'Wobble', 'Giggle', 'Waddle', 'Dizzy', 'Twisty', 'Wiggly', 'Bonkers', 'Swole', 'Buff', 'Ripped',
  'Shredded', 'Flexy', 'Beefy', 'Chunky', 'Mighty', 'Thunder', 'Lightning', 'Rocket', 'Turbo',
  'Beast', 'Savage', 'Legend', 'Epic', 'Heroic', 'Viking', 'Ninja', 'Samurai', 'Gladiator',
  'Warrior', 'Titan', 'Juggernaut', 'Machine', 'Robot', 'Cyborg', 'Power', 'Blast', 'Pump',
  'Crush', 'Smash', 'Blitz', 'Rampage', 'Rumble', 'Boom', 'Kaboom', 'Zap', 'Wham', 'Pow',
  'Slam', 'Thump', 'Thud', 'Thicc', 'Yoked', 'Chonk', 'Chiseled', 'Diesel', 'Alpha', 'Omega',
  'Unicorn', 'Rhino', 'Gorilla', 'Monkey', 'Banana', 'Peanut', 'Pickle', 'Broccoli', 'Squat',
  'Lunge', 'Plank', 'Burpee', 'Crunch', 'Pushup', 'Pullup', 'Deadlift', 'Bench', 'Curl', 'Dip',
  'Jump', 'Sprint', 'Dash', 'Zoom', 'Flash', 'Blaze', 'Inferno', 'Fire', 'Ice', 'Frost', 'Chill',
  'Zen', 'Chillax', 'Groovy', 'Rad', 'Gnarly', 'Dope', 'Boss', 'Champ', 'Ace', 'Pro', 'Rookie',
  'Noob', 'Wizard', 'Guru', 'Sensei', 'Coach', 'Captain', 'Chief', 'Commander', 'Major', 'Sarge',
  'Scout', 'Ranger', 'Explorer', 'Nomad', 'Maverick', 'Rebel', 'Outlaw', 'Bandit', 'Pirate',
  'Jester', 'Clown', 'Goat', 'Moose', 'Bear', 'Otter', 'Penguin', 'Sloth', 'Cheetah', 'Panther',
  'Lion', 'Tiger', 'Shark', 'Dolphin', 'Whale', 'Crab', 'Lobster', 'Octopus', 'Squid', 'Turtle',
  // Fitness/Workout specific
  'Rep', 'Set', 'Gainz', 'Sweat', 'Burn', 'Cardio', 'HIIT', 'Tabata', 'Mobility', 'Stretch',
  'Yoga', 'Pilates', 'Spin', 'Cycle', 'Row', 'Box', 'Kick', 'Punch', 'Fight', 'Battle', 'Grind',
  'Hustle', 'Flow', 'Groove', 'Bounce', 'Hop', 'Skip', 'Leap', 'Stomp', 'March', 'Charge',
  'Blast', 'Rocket', 'Jet', 'Zoom', 'Vroom', 'Drive', 'Cruise', 'Roll', 'Slide', 'Glide',
  'Wave', 'Surf', 'Swim', 'Dive', 'Climb', 'Hike', 'Trek', 'Trail', 'Peak', 'Summit', 'Valley',
  'Canyon', 'Desert', 'Jungle', 'Forest', 'Swamp', 'Marsh', 'Lake', 'River', 'Ocean', 'Sea',
  // Entertaining/absurd
  'Banana', 'Pickle', 'Broccoli', 'Potato', 'Tomato', 'Pumpkin', 'Muffin', 'Cupcake', 'Cookie',
  'Donut', 'Waffle', 'Pancake', 'Bacon', 'Egg', 'Sausage', 'Tofu', 'Noodle', 'Spaghetti', 'Pizza',
  'Nacho', 'Taco', 'Burrito', 'Queso', 'Salsa', 'Guac', 'Avocado', 'Cheese', 'Milkshake', 'Smoothie',
  'Sundae', 'Fudge', 'Brownie', 'Marshmallow', 'Gummy', 'Jelly', 'Peach', 'Berry', 'Apple', 'Grape',
  'Melon', 'Kiwi', 'Lime', 'Lemon', 'Orange', 'Coconut', 'Pineapple', 'Mango', 'Papaya', 'Dragonfruit',
  // More fitness fun
  'Muscle', 'Abs', 'Core', 'Quads', 'Glutes', 'Hammies', 'Calves', 'Pecs', 'Lats', 'Traps', 'Delts',
  'Forearms', 'Biceps', 'Triceps', 'Neck', 'Back', 'Chest', 'Legs', 'Arms', 'Shoulders', 'Wings',
  'Washboard', 'Steel', 'Iron', 'Bronze', 'Gold', 'Silver', 'Platinum', 'Diamond', 'Ruby', 'Sapphire',
  'Emerald', 'Crystal', 'Stone', 'Rock', 'Pebble', 'Boulder', 'Mountain', 'Volcano', 'Comet', 'Meteor',
  'Astro', 'Cosmo', 'Galaxy', 'Star', 'Nova', 'Nebula', 'Orbit', 'Rocket', 'Space', 'Alien', 'Martian',
  'Robot', 'Android', 'Cyborg', 'Droid', 'Bot', 'Chip', 'Pixel', 'Nano', 'Mega', 'Giga', 'Tera',
  'Quantum', 'Turbo', 'Hyper', 'Ultra', 'Max', 'Prime', 'Super', 'Mega', 'Ultra', 'Hyper', 'Extreme',
  'Insane', 'Wild', 'Crazy', 'Mad', 'Epic', 'Legend', 'Mythic', 'Heroic', 'Royal', 'King', 'Queen',
  'Prince', 'Princess', 'Duke', 'Duchess', 'Baron', 'Baroness', 'Knight', 'Paladin', 'Squire', 'Page',
  'Wizard', 'Mage', 'Sorcerer', 'Witch', 'Warlock', 'Druid', 'Shaman', 'Monk', 'Priest', 'Cleric',
  'Saint', 'Angel', 'Demon', 'Devil', 'Imp', 'Goblin', 'Orc', 'Troll', 'Giant', 'Ogre', 'Dragon',
  'Wyvern', 'Hydra', 'Phoenix', 'Griffin', 'Unicorn', 'Pegasus', 'Mermaid', 'Kraken', 'Yeti', 'Bigfoot',
  'Loch', 'Nessie', 'Chupacabra', 'Mothman', 'Banshee', 'Poltergeist', 'Ghost', 'Zombie', 'Vampire',
  'Werewolf', 'Mummy', 'Skeleton', 'Ghoul', 'Wraith', 'Shade', 'Specter', 'Phantom', 'Spirit', 'Sprite',
  'Pixie', 'Fairy', 'Elf', 'Dwarf', 'Gnome', 'Halfling', 'Hobbit', 'Troll', 'Ogre', 'Gargoyle', 'Gremlin',
  'Imp', 'Leprechaun', 'Genie', 'Djinn', 'Sphinx', 'Minotaur', 'Centaur', 'Satyr', 'Faun', 'Cyclops',
  'Harpy', 'Basilisk', 'Cockatrice', 'Manticore', 'Cerberus', 'Chimera', 'Hydra', 'Kraken', 'Leviathan',
  'Behemoth', 'Colossus', 'Titan', 'Goliath', 'Atlas', 'Hercules', 'Achilles', 'Odysseus', 'Perseus',
  'Jason', 'Theseus', 'Orpheus', 'Daedalus', 'Icarus', 'Prometheus', 'Pandora', 'Medusa', 'Circe',
  'Calypso', 'Scylla', 'Charybdis', 'Sirens', 'Furies', 'Graces', 'Muses', 'Nymph', 'Dryad', 'Naiad',
  'Oceanid', 'Oread', 'Satyr', 'Faun', 'Centaur', 'Minotaur', 'Sphinx', 'Chimera', 'Cerberus', 'Hydra',
  'Kraken', 'Leviathan', 'Behemoth', 'Colossus', 'Titan', 'Goliath', 'Atlas', 'Hercules', 'Achilles',
  'Odysseus', 'Perseus', 'Jason', 'Theseus', 'Orpheus', 'Daedalus', 'Icarus', 'Prometheus', 'Pandora',
  // Just for fun
  'Banana', 'Pickle', 'Broccoli', 'Potato', 'Tomato', 'Pumpkin', 'Muffin', 'Cupcake', 'Cookie',
  'Donut', 'Waffle', 'Pancake', 'Bacon', 'Egg', 'Sausage', 'Tofu', 'Noodle', 'Spaghetti', 'Pizza',
  'Nacho', 'Taco', 'Burrito', 'Queso', 'Salsa', 'Guac', 'Avocado', 'Cheese', 'Milkshake', 'Smoothie',
  'Sundae', 'Fudge', 'Brownie', 'Marshmallow', 'Gummy', 'Jelly', 'Peach', 'Berry', 'Apple', 'Grape',
  'Melon', 'Kiwi', 'Lime', 'Lemon', 'Orange', 'Coconut', 'Pineapple', 'Mango', 'Papaya', 'Dragonfruit'
];

export const generateRandomRoutineName = () => {
  const shuffled = funnyWords.sort(() => 0.5 - Math.random());
  return `${shuffled[0]} ${shuffled[1]} ${shuffled[2]}`;
};

/**
 * Generate a routine and exercises. Expects addExercise to be passed in from the store.
 */
export const generateRoutine = async (
  responses: { [key: string]: string },
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>
): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  await delay(2000);
  const routineId = uuidv4();
  const routineName = generateRandomRoutineName();
  // Pick a few exercises randomly
  const shuffledSuggestions = exerciseTemplates.slice().sort(() => Math.random() - 0.5);
  const pickedSuggestions = shuffledSuggestions.slice(0, 5);

  const allExercises = [...exercises];
  const newExercises: Exercise[] = [];

  for (const suggestion of pickedSuggestions) {
    // Try to find an existing exercise (forgiving match)
    let found = allExercises.find(ex => normalizeExerciseName(ex.name) === normalizeExerciseName(suggestion.name));
    if (found) {
      newExercises.push(found);
    } else {
      const created = await createNewExercise(suggestion);
      await addExercise(created);
      allExercises.push(created);
      newExercises.push(created);
    }
  }

  const routine: Routine = {
    id: routineId,
    name: routineName,
    description: 'A routine tailored to your preferences.',
    active: true,
    createdAt: Date.now(),
    dailySchedule: [
      {
        day: 'Monday',
        kind: 'Strength',
        exercises: [
          { exerciseId: newExercises[0].id, reps: 10, sets: 3 },
          { exerciseId: newExercises[1].id, reps: 15, sets: 3 },
          { exerciseId: newExercises[2].id, duration: 60, sets: 1 },
        ],
      },
      {
        day: 'Wednesday',
        kind: 'Cardio',
        exercises: [
          { exerciseId: newExercises[3].id, reps: 12, sets: 3 },
          { exerciseId: newExercises[4].id, duration: 90, sets: 1 },
        ],
      },
      {
        day: 'Friday',
        kind: 'Flexibility',
        exercises: [
          { exerciseId: newExercises[2].id, duration: 120, sets: 1 },
          { exerciseId: newExercises[3].id, reps: 10, sets: 2 },
        ],
      },
    ],
    prompts: {
      goals: responses.goals || '',
      equipment: responses.equipment || '',
      time: responses.time || '',
      additionalInfo: responses.additionalInfo || '',
    },
    responses: [
      {
        date: Date.now(),
        prompt: 'Make my routine!',
        response: 'Here is your custom routine based on your preferences.',
        dismissed: false,
      }
    ],
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: newExercises };
};

/**
 * Create a Routine from a RoutineTemplate, adding any missing exercises to the store.
 */
export async function createRoutineFromTemplate(
  template: RoutineTemplate,
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>
): Promise<{ routine: Routine, exercises: Exercise[] }> {
  const routineId = uuidv4();
  const allExercises = [...exercises];
  const newExercises: Exercise[] = [];
  const dailySchedule = [];

  for (const [day, dayName] of Object.entries(template.days)) {
    if (!dayName) continue;
    // Find the daily workout template for this day
    const dayTmpl = dailyWorkoutTemplates.find(dt => dt.day.toLowerCase() === String(dayName).toLowerCase());
    if (!dayTmpl) continue;
    const scheduledExercises = [];
    for (const ex of dayTmpl.exercises) {
      // Try to find an existing exercise (forgiving match)
      let found = allExercises.find(e => normalizeExerciseName(e.name) === normalizeExerciseName(ex.name));
      if (!found) {
        // Try to find in templates
        let templateEx = exerciseTemplates.find(t => normalizeExerciseName(t.name) === normalizeExerciseName(ex.name));
        if (!templateEx) {
          templateEx = { name: ex.name, description: '', targetMuscles: [], timed: !!ex.duration };
        }
        found = await createNewExercise(templateEx);
        await addExercise(found);
        allExercises.push(found);
        newExercises.push(found);
      }
      scheduledExercises.push({
        exerciseId: found.id,
        sets: ex.sets,
        reps: ex.reps,
        duration: ex.duration,
      });
    }
    dailySchedule.push({
      day: day as DayOfWeek,
      kind: dayName,
      exercises: scheduledExercises,
    });
  }

  const routine: Routine = {
    id: routineId,
    name: template.name,
    description: template.description,
    active: true,
    createdAt: Date.now(),
    dailySchedule,
    prompts: {
      goals: '',
      equipment: '',
      time: '',
      additionalInfo: '',
    },
    responses: [],
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: newExercises };
}
