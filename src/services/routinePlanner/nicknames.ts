// Fun name ideas for a Planner-built routine, like the nicknames each ready-made routine
// carries, but worked out from what's actually in the plan: its split, gear, days, length,
// focus, the activities asked for, and the exercises it leans on. The most specific traits
// come first, so a pregnancy-safe plan or a kettlebell-heavy one gets names about that before
// generic ones. Pure logic, no React — see the tests.

import { exerciseCatalog } from './exerciseCatalog';
import { rng, type RoutinePlan } from './planRoutine';
import { effectiveLevel, needsLowImpact, primaryGoal, type Activity, type Focus, type Goal, type Profile } from './profile';

const GOAL_NAMES: Record<Goal, string[]> = {
  strength: ['Iron Will', 'Heavy Metal', 'Strong Opinions', 'Lift Off', 'Grip It & Rip It'],
  muscle: ['Gains Train', 'Swole Patrol', 'Pump Up the Volume', 'Muscle Memoir', 'Rep Rally'],
  fatLoss: ['Sweat Equity', 'Burn Notice', 'Meltdown Mode', 'Calorie Crusher', 'Sweatflix Binge'],
  endurance: ['Engine Room', 'Lungs of Steel', 'The Long Haul', 'Stamina Saga'],
  mobility: ['Bend & Mend', 'Smooth Operator', 'Joint Venture', 'Limber Up Club'],
  athletic: ['Game Day Ready', 'Fast & Fierce', 'Spring Loaded', 'All-Star Shuffle'],
  general: ['Good All Over', 'Everyday Hero', 'Fit Happens', 'Jack of All Sets'],
};

const SPLIT_NAMES: Record<string, string[]> = {
  full: ['The Whole Enchilada', 'Head to Toe Show', 'All-You-Can-Lift Buffet', 'Total Package'],
  upperLower: ['Upstairs Downstairs', 'Split Personality', 'Penthouse & Basement', 'Half & Half Hero'],
  ppl: ['Push It Real Good', 'Pull Up a Chair', 'The Triple Decker', 'Leg Day Lottery'],
  conditioning: ['Circuit Breaker', 'Huff & Puff', 'Short Circuit'],
  cardio: ['Cardio Party', 'Heart to Heart', 'Pulse Check'],
  mobility: ['Stretch Goals', 'Loose Cannon', 'Bendy & Ready'],
};

const EQUIPMENT_NAMES = {
  bodyweight: ['Gravity Is My Gym', 'Living Room Legend', 'Carpet Crusher', 'No Gym, No Problem'],
  dumbbell: ['Dumbbell Diaries', 'Pair of Dumbbells', 'Two Hands, Two Bells'],
  kettlebell: ['Swing State', 'Bell Bottoms', 'For Whom the Bell Tolls', 'Kettle Corn'],
  barbell: ['Raising the Bar', 'Bar None', 'Bar Hopping'],
  band: ['Band Practice', 'Rubber Band Man', 'Snap Back'],
};

const FOCUS_NAMES: Partial<Record<Focus, string[]>> = {
  glutes: ['Cheeky Business', 'Glute Expectations', 'Back That Up'],
  arms: ['Gun Show', 'Sleeve Stretcher', 'Arms Race'],
  core: ['Core Values', 'Abs-olutely', 'Six-Pack Pursuit'],
  chest: ['Chest Quest', 'Pec Deck the Halls'],
  back: ['Got Your Back', 'Back in Business'],
  shoulders: ['Boulder Shoulders', 'Shoulder to Shoulder'],
  legs: ['Quad Squad', 'Leg Day Lover'],
  lower: ['Quad Squad', 'Leg Day Lover'],
};

const ACTIVITY_NAMES: Partial<Record<Activity, string[]>> = {
  running: ['Pace Makers', 'Sole Survivor', 'Run the Week'],
  swimming: ['Pool Party', 'Making Waves'],
  cycling: ['Spin Doctor', 'Wheel Deal'],
  yoga: ['Om My Gains', 'Namaste Strong', 'Zen & Tonic'],
  boxing: ['Float & Sting', 'Punch Line', 'Jab Well Done'],
  walking: ['Walk It Off', 'Step Right Up'],
  rowing: ['Row Your Boat', 'Stroke of Genius'],
};

const DAY_COUNT_NAMES: Record<number, string[]> = {
  1: ['One and Done'],
  2: ['Twice Is Nice', 'Double Feature'],
  3: ["Three's Company", 'Hat Trick'],
  4: ['Fantastic Four', 'Four on the Floor'],
  5: ['High Five', 'Five Alive'],
  6: ['Six Pack Week', 'Half-Dozen Hustle'],
  7: ['No Days Off', 'Seven Wonders'],
};

const pick = <T,>(items: T[], random: () => number): T => items[Math.floor(random() * items.length)];

/**
 * Up to `count` fun names for the plan, most specific first. Different seeds pick different
 * names for the same traits.
 */
export function planNicknames(plan: RoutinePlan, profile: Profile, seed = 0, count = 5): string[] {
  const random = rng(seed + 7);
  const groups: string[][] = [];
  const exercises = plan.days.flatMap(d => d.exercises.map(e => e.name));
  const uses = (pattern: RegExp) => exercises.filter(n => pattern.test(n)).length;

  // Who it's for.
  if (profile.conditions.includes('pregnant')) groups.push(['Bump & Pump', 'Baby on Board', 'Growing Strong']);
  if (profile.conditions.includes('senior')) groups.push(['Golden Gains', 'Silver Streak', 'Ageless Wonder']);

  // A liked exercise it includes.
  const liked = profile.likedExercises.find(n => exercises.includes(n));
  if (liked) groups.push([`${liked} Fan Club`]);

  // What the user asked for.
  for (const f of profile.focus) if (FOCUS_NAMES[f]) groups.push(FOCUS_NAMES[f]!);
  // An activity they asked for, when the plan actually has it (bad knees can rule out running).
  const tagged = (a: Activity) => exercises.some(n => exerciseCatalog.find(c => c.name === n)?.tags.includes(a));
  for (const a of profile.likes) if (ACTIVITY_NAMES[a] && tagged(a)) groups.push(ACTIVITY_NAMES[a]!);

  // The gear it uses.
  if (profile.equipment.length === 0) groups.push(EQUIPMENT_NAMES.bodyweight);
  if (uses(/kettlebell/i) >= 2) groups.push(EQUIPMENT_NAMES.kettlebell);
  if (uses(/barbell/i) >= 2) groups.push(EQUIPMENT_NAMES.barbell);
  if (uses(/band/i) >= 2) groups.push(EQUIPMENT_NAMES.band);
  if (uses(/dumbbell/i) >= 3) groups.push(EQUIPMENT_NAMES.dumbbell);

  // The exercise it leans on most.
  const counts = new Map<string, number>();
  for (const n of exercises) counts.set(n, (counts.get(n) ?? 0) + 1);
  const [star, times] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (star && times >= 2 && plan.days.length >= 2 && star !== liked) groups.push([`The ${star} Show`, `${star} Season`]);

  // The shape of the week.
  const kinds = new Set(plan.days.map(d => d.kind.replace(/ [A-Z]$/, '')));
  if ([...kinds].every(k => k === 'Full Body')) groups.push(SPLIT_NAMES.full);
  if (kinds.has('Upper Body') && [...kinds].some(k => k.startsWith('Lower Body'))) groups.push(SPLIT_NAMES.upperLower);
  if (kinds.has('Push') && kinds.has('Pull')) groups.push(SPLIT_NAMES.ppl);
  if (kinds.has('Conditioning')) groups.push(SPLIT_NAMES.conditioning);
  if (kinds.has('Cardio')) groups.push(SPLIT_NAMES.cardio);
  if (kinds.has('Mobility')) groups.push(SPLIT_NAMES.mobility);

  // When and how long.
  const weekend = plan.days.length > 0 && plan.days.every(d => d.day === 'Saturday' || d.day === 'Sunday');
  if (weekend) groups.push(['Weekend Warrior', 'Sunday Funday']);
  const minutes = profile.minutes ?? 45;
  if (minutes <= 25) groups.push(['Lunch Break Legend', 'Express Lane', 'Snack-Size Sweat']);
  if (minutes >= 75) groups.push(['The Long Game', 'Marathon Session']);
  if (DAY_COUNT_NAMES[plan.days.length]) groups.push(DAY_COUNT_NAMES[plan.days.length]);

  groups.push(GOAL_NAMES[primaryGoal(profile)]);

  // How hard.
  if (profile.limits.includes('knee')) groups.push(['Knee-sy Does It']);
  else if (needsLowImpact(profile)) groups.push(['Easy Does It', 'Soft Landing']);
  const level = effectiveLevel(profile);
  if (level === 'beginner') groups.push(['Fresh Start', 'Rookie Season', 'Day One Crew']);
  if (level === 'advanced') groups.push(['Final Boss', 'Expert Mode', 'Hard Mode']);

  const names: string[] = [];
  const add = (name: string) => {
    if (!names.includes(name) && name !== plan.name && name.length <= 40) names.push(name);
  };
  // One from each trait, most specific first; then seconds helpings if there's room.
  for (const group of groups) {
    if (names.length >= count) break;
    add(pick(group, random));
  }
  for (const group of groups) {
    if (names.length >= count) break;
    for (const name of group) if (names.length < count) add(name);
  }
  return names;
}

