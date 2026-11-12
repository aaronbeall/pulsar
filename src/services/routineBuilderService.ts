// NOTE: All DB access for exercises/routines/workouts should go through the Zustand store (pulsarStore.ts).
// This service now expects exercises to be passed in from the store, and add operations to use the store's addExercise.
// Direct DB calls (getExercises, addExercise) have been removed from this file.

import { Routine, RoutineChatMessage, Exercise, DayOfWeek, ScheduledExercise, RoutineDay } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { getSearchUrl, getHowToQuery, getExerciseSearchImageUrl, searchExerciseImages } from '../utils/webUtils';
import { exerciseTemplates, ExerciseTemplate } from './exerciseTemplates';
import { routineTemplates, RoutineTemplate } from './routineTemplates';
import { dailyWorkoutTemplates } from './dailyWorkoutTemplates';
import { normalizeExerciseName } from '../utils/exerciseName';
import { findFreeExerciseDbEntry, getFreeExerciseDbImageUrls, isTimedCategory } from './freeExerciseDb';
import { workoutPrompts } from '../constants/prompts';
import { getActiveAIProvider, AIProvider, AIError, StreamOptions } from './ai';
import type { RoutinePlan } from './routinePlanner/planRoutine';

/**
 * Create a new Exercise from a template (ExerciseTemplate).
 * Fetches a how-to URL, and an image URL unless the template already has one (e.g.
 * resolved from free-exercise-db) — in which case the live search is skipped entirely.
 */
export async function createNewExercise(template: ExerciseTemplate): Promise<Exercise> {
  const howToUrl = getSearchUrl(getHowToQuery(template.name));
  const imageUrl = template.imageUrl || await getExerciseSearchImageUrl(template.name);
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

export { normalizeExerciseName };

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
 * Returns an existing Exercise if found, otherwise creates one — checking, in order: the
 * curated exerciseTemplates catalog (hand-tuned text/timed metadata, wins if present), the
 * bundled free-exercise-db dataset (873 exercises with real photos, no live query needed —
 * consulted even when the curated catalog matched, since the curated catalog carries no
 * images of its own and would otherwise fall through to a live search that can return a
 * confidently wrong result, not just no result — e.g. "Russian Twist" live-searched on
 * Wikimedia returns an unrelated 1902 book about Russia), then finally an ad hoc stub whose
 * image gets resolved via a live Wikimedia search. A live network call only ever happens
 * for exercise names in neither catalog.
 */
export async function getAddedExercise(name: string, exercises: Exercise[], addExercise: (ex: Exercise) => Promise<void>, timedHint = false): Promise<Exercise> {
  const norm = normalizeExerciseName(name);
  // 1. Search in existing exercises
  for (const ex of exercises) {
    if (normalizeExerciseName(ex.name) === norm) return ex;
  }
  // 2. Search in the curated template catalog
  let template = exerciseTemplates.find(t => normalizeExerciseName(t.name) === norm);
  // 3. Search the bundled free-exercise-db dataset — for text+image when tier 2 missed, or
  //    just to borrow an image when tier 2 hit (the curated catalog carries no images).
  if (!template || !template.imageUrl) {
    const dbEntry = await findFreeExerciseDbEntry(name);
    if (dbEntry) {
      const imageUrl = getFreeExerciseDbImageUrls(dbEntry)[0];
      template = template
        ? { ...template, imageUrl: template.imageUrl ?? imageUrl }
        : {
          name: dbEntry.name,
          description: dbEntry.description,
          targetMuscles: [...dbEntry.primaryMuscles, ...dbEntry.secondaryMuscles],
          timed: isTimedCategory(dbEntry.category),
          imageUrl,
        };
    }
  }
  // 4. Still nothing — ad hoc stub; createNewExercise will fall back to a live image search
  if (!template) {
    template = {
      name,
      description: '',
      targetMuscles: [],
      timed: timedHint,
    };
  }
  // 5. Create and add to store
  const newExercise = await createNewExercise(template);
  await addExercise(newExercise);
  return newExercise;
}

/**
 * Resolve a batch of AI-provided { name, sets, reps?, duration? } entries into real
 * ScheduledExercise records (with exerciseId), reusing the same name resolution/creation
 * pipeline template-based routines already use (getAddedExercise). Tracks newly-created
 * exercises locally as it goes so repeated names within one batch don't create duplicates
 * before the store has re-rendered with them.
 */
export async function resolveAIExercises(
  rawExercises: Array<{ name: string; sets: number; reps?: number; duration?: number }>,
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>
): Promise<{ scheduled: ScheduledExercise[]; newExercises: Exercise[] }> {
  const known = [...exercises];
  const newExercises: Exercise[] = [];
  const scheduled: ScheduledExercise[] = [];
  for (const raw of rawExercises) {
    const exercise = await getAddedExercise(raw.name, known, addExercise, !!raw.duration);
    if (!known.some(e => e.id === exercise.id)) {
      known.push(exercise);
      newExercises.push(exercise);
    }
    scheduled.push({
      exerciseId: exercise.id,
      sets: raw.sets,
      reps: raw.reps,
      duration: raw.duration,
    });
  }
  return { scheduled, newExercises };
}

/**
 * Resolve a single best-guess image for an exercise name — the same free-exercise-db-then-
 * live-Wikimedia-search tiers createNewExercise uses, exposed standalone so an existing
 * exercise whose image lookup previously failed (e.g. transient rate-limiting, or created
 * before this tiered system existed) can be retried after the fact.
 */
export async function resolveExerciseImage(name: string): Promise<string | undefined> {
  const dbEntry = await findFreeExerciseDbEntry(name);
  const dbImage = dbEntry && getFreeExerciseDbImageUrls(dbEntry)[0];
  if (dbImage) return dbImage;
  return (await getExerciseSearchImageUrl(name)) || undefined;
}

/**
 * Resolve multiple candidate images for an exercise name — free-exercise-db's own photos
 * (up to 2) plus several live Wikimedia results, deduped — for manually cycling through
 * alternatives in the exercise details dialog. Deliberately not used at exercise-creation
 * time (resolveExerciseImage is faster and sufficient there); fetching several live search
 * results is only worth the cost when a user explicitly asks for alternatives.
 */
export async function getExerciseImageCandidates(name: string): Promise<string[]> {
  const candidates: string[] = [];
  const dbEntry = await findFreeExerciseDbEntry(name);
  if (dbEntry) candidates.push(...getFreeExerciseDbImageUrls(dbEntry));
  const wikiResults = await searchExerciseImages(name, 6);
  for (const url of wikiResults) {
    if (!candidates.includes(url)) candidates.push(url);
  }
  return candidates;
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
 * Turns the setup wizard's answers into the routine's initial chat stream: an ai/user turn
 * per answered prompt, followed by a closing ai message — the AI's own commentary when real
 * AI generation ran, otherwise a canned confirmation.
 */
function buildWizardChatHistory(responses: string[], closingMessage?: string): RoutineChatMessage[] {
  const now = Date.now();
  let t = 0;
  const chatHistory: RoutineChatMessage[] = [];
  workoutPrompts.forEach((prompt, i) => {
    const answer = responses[i];
    if (!answer) return;
    chatHistory.push({ id: uuidv4(), role: 'ai', message: prompt.question, date: now + t++ });
    chatHistory.push({ id: uuidv4(), role: 'user', message: answer, date: now + t++ });
  });
  chatHistory.push({
    id: uuidv4(),
    role: 'ai',
    message: closingMessage || 'Here is your routine. Ask me here if you want to change anything.',
    date: now + t++,
    dismissed: false,
  });
  return chatHistory;
}

/** Positional wizard answers -> { question, answer } pairs for the AI prompt, skipping
 * unanswered prompts (same filtering buildWizardChatHistory does). */
function zipWizardAnswers(responses: string[]): Array<{ question: string; answer: string }> {
  return workoutPrompts
    .map((prompt, i) => ({ question: prompt.question, answer: responses[i] }))
    .filter((qa): qa is { question: string; answer: string } => !!qa.answer);
}

/**
 * Resolve a planned week (from Pulsar AI or the Planner) into a routine schedule, adding any
 * exercises the store doesn't have yet. Days are resolved in order so one new exercise used
 * on several days is only added once.
 */
async function resolveSchedule(
  days: { day: DayOfWeek; kind?: string; exercises: Parameters<typeof resolveAIExercises>[0] }[],
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>,
): Promise<{ dailySchedule: RoutineDay[]; newExercises: Exercise[] }> {
  let known = [...exercises];
  const newExercises: Exercise[] = [];
  const dailySchedule: RoutineDay[] = [];
  for (const day of days) {
    const resolved = await resolveAIExercises(day.exercises, known, addExercise);
    known = [...known, ...resolved.newExercises];
    newExercises.push(...resolved.newExercises);
    dailySchedule.push({ day: day.day, kind: day.kind || '', exercises: resolved.scheduled });
  }
  return { dailySchedule, newExercises };
}

/**
 * Build a routine from a real AI-generated plan. Exercise names come back from the model,
 * not exerciseIds — resolved via resolveAIExercises (same pipeline template routines use)
 * before being stored.
 */
async function generateRoutineWithAI(
  provider: AIProvider,
  responses: string[],
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>,
  options?: StreamOptions
): Promise<{ routine: Routine, exercises: Exercise[] }> {
  const plan = await provider.generateRoutine(zipWizardAnswers(responses), options);

  const { dailySchedule, newExercises: allNewExercises } = await resolveSchedule(plan.schedule, exercises, addExercise);

  const routine: Routine = {
    id: uuidv4(),
    name: plan.name || generateRandomRoutineName(),
    description: plan.description || 'A routine tailored to your preferences.',
    active: true,
    createdAt: Date.now(),
    dailySchedule,
    // The wizard's Q&A becomes the initial chat stream, closed out with the AI's own
    // commentary instead of a canned line.
    chatHistory: buildWizardChatHistory(responses, plan.commentary),
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: allNewExercises };
}

/**
 * Generate a routine from the setup wizard's answers with the active AI provider. There is
 * deliberately no non-AI fallback here: without a provider, the wizard offers keyword-matched
 * templates instead (services/templateSearch.ts). Errors (bad key, network, unusable
 * response) propagate as AIError so the wizard can show them and let the user retry.
 */
export const generateRoutine = async (
  responses: string[],
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>,
  options?: StreamOptions
): Promise<{ routine: Routine, exercises: Exercise[] }> => {
  const provider = getActiveAIProvider('plan');
  if (!provider) throw new AIError('no_key', 'Pulsar AI isn\'t set up. Sign in or add your OpenAI key in Settings.');
  return generateRoutineWithAI(provider, responses, exercises, addExercise, options);
};

/**
 * Create a Routine from a plan the no-AI planner built (services/routinePlanner), adding any
 * missing exercises to the store. The wizard's answers become the routine's chat, closed
 * with the plan's notes, so a later AI chat knows what the user asked for.
 */
export async function createRoutineFromPlan(
  plan: RoutinePlan,
  responses: string[],
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>,
  name = plan.name,
): Promise<{ routine: Routine, exercises: Exercise[] }> {
  const { dailySchedule, newExercises: allNewExercises } = await resolveSchedule(plan.days, exercises, addExercise);
  const closing = `I built this from your answers: ${plan.notes.map(n => n.replace(/\.$/, '')).join('. ')}. Change anything you like, or ask me here.`;
  const routine: Routine = {
    id: uuidv4(),
    name: name.trim() || plan.name,
    description: plan.description,
    active: true,
    createdAt: Date.now(),
    dailySchedule,
    chatHistory: buildWizardChatHistory(responses, closing),
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: allNewExercises };
}

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
        // Try to find in the curated template catalog
        let templateEx = exerciseTemplates.find(t => normalizeExerciseName(t.name) === normalizeExerciseName(ex.name));
        // Then the bundled free-exercise-db dataset — even if the curated catalog already
        // matched, since it carries no images of its own (see getAddedExercise for why
        // that matters: a curated-only match falls through to a live search that can
        // return a confidently wrong image, not just no image).
        if (!templateEx || !templateEx.imageUrl) {
          const dbEntry = await findFreeExerciseDbEntry(ex.name);
          if (dbEntry) {
            const imageUrl = getFreeExerciseDbImageUrls(dbEntry)[0];
            templateEx = templateEx
              ? { ...templateEx, imageUrl: templateEx.imageUrl ?? imageUrl }
              : {
                name: dbEntry.name,
                description: dbEntry.description,
                targetMuscles: [...dbEntry.primaryMuscles, ...dbEntry.secondaryMuscles],
                timed: isTimedCategory(dbEntry.category),
                imageUrl,
              };
          }
        }
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
    chatHistory: [], // no setup wizard for template-based routines
    liked: false,
    disliked: false,
    favorite: false,
  };
  return { routine, exercises: newExercises };
}
