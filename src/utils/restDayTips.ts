// Rest-day tips: a few generic ones, plus ones picked by simple keyword matching on the
// names (and target muscles) of the exercises in the active routines. All local, no AI.

export interface RestDayTip {
  id: string;
  title: string;
  body: string;
  /** Why this tip was picked, e.g. "Your routine has leg work". Empty for generic tips. */
  reason?: string;
}

interface TipTheme {
  id: string;
  /** Matched against lowercased exercise names and target muscles, as whole words. */
  keywords: string[];
  reason: string;
  tips: Omit<RestDayTip, 'reason'>[];
}

export const TIP_THEMES: TipTheme[] = [
  {
    id: 'legs',
    keywords: ['squat', 'squats', 'lunge', 'lunges', 'deadlift', 'deadlifts', 'leg', 'legs', 'calf', 'calves', 'glute', 'glutes', 'hamstring', 'hamstrings', 'quad', 'quads', 'quadriceps', 'step-up', 'step-ups', 'hip thrust', 'wall sit'],
    reason: 'Your routine works your legs',
    tips: [
      { id: 'legs-walk', title: 'Take an easy walk', body: 'A 20 to 30 minute walk gets blood moving through tired legs without adding strain. It often eases soreness faster than sitting still.' },
      { id: 'legs-stretch', title: 'Stretch hips and hamstrings', body: 'Hold a gentle hip flexor stretch and a hamstring stretch for about 30 seconds per side. Stop well before it hurts.' },
      { id: 'legs-elevate', title: 'Put your feet up', body: 'Ten minutes with your legs raised against a wall is a nice way to wind down after heavy leg days.' },
    ],
  },
  {
    id: 'running',
    keywords: ['run', 'running', 'jog', 'jogging', 'sprint', 'sprints', 'treadmill', 'cycling', 'bike', 'rowing', 'row machine', 'jump rope', 'skipping', 'cardio', 'elliptical', 'stair', 'stairs'],
    reason: 'Your routine includes cardio',
    tips: [
      { id: 'run-feet', title: 'Look after your feet', body: 'Roll the soles of your feet over a ball and do a few slow calf raises. Feet and calves take the most impact on cardio days.' },
      { id: 'run-hydrate', title: 'Top up fluids', body: 'Cardio sweats out more than you think. Drink steadily through the day, with a pinch of salt or an electrolyte drink if you sweated a lot.' },
      { id: 'run-easy', title: 'Keep any movement truly easy', body: 'If you want to move, keep it at a pace where you could chat comfortably. Rest days are where your endurance gains settle in.' },
    ],
  },
  {
    id: 'push',
    keywords: ['push-up', 'push-ups', 'pushup', 'pushups', 'push up', 'bench', 'press', 'chest', 'dip', 'dips', 'shoulder', 'shoulders', 'tricep', 'triceps', 'overhead', 'fly', 'flyes', 'pectorals', 'deltoids'],
    reason: 'Your routine has pushing work',
    tips: [
      { id: 'push-doorway', title: 'Open up your chest', body: 'A doorway chest stretch undoes some of the hunch that pressing work and desk time build up. Hold it for 30 seconds, twice.' },
      { id: 'push-shoulders', title: 'Give your shoulders some circles', body: 'Slow arm circles and shoulder rolls keep the joint moving without loading it.' },
    ],
  },
  {
    id: 'pull',
    keywords: ['pull-up', 'pull-ups', 'pullup', 'pullups', 'pull up', 'chin-up', 'chin-ups', 'row', 'rows', 'back', 'lat', 'lats', 'bicep', 'biceps', 'curl', 'curls', 'shrug', 'shrugs', 'trapezius'],
    reason: 'Your routine has pulling work',
    tips: [
      { id: 'pull-hang', title: 'Try a gentle hang', body: 'If you have a bar, a few relaxed 10 to 20 second hangs decompress your spine and stretch your lats.' },
      { id: 'pull-grip', title: 'Rest your grip', body: 'Pulling is hard on forearms and hands. Stretch your wrists both ways and skip anything grip-heavy today.' },
    ],
  },
  {
    id: 'core',
    keywords: ['plank', 'planks', 'crunch', 'crunches', 'sit-up', 'sit-ups', 'situp', 'abs', 'ab', 'core', 'abdominals', 'russian twist', 'mountain climber', 'mountain climbers', 'leg raise', 'leg raises', 'bicycle', 'hollow'],
    reason: 'Your routine trains your core',
    tips: [
      { id: 'core-breathe', title: 'Practise deep belly breathing', body: 'Five minutes of slow breathing into your belly relaxes a tight core and calms you down at the same time.' },
      { id: 'core-cobra', title: 'Ease into a cobra stretch', body: 'Lying face down and gently pressing up stretches the front of your torso after lots of crunching and planking.' },
    ],
  },
  {
    id: 'hiit',
    keywords: ['burpee', 'burpees', 'jumping jack', 'jumping jacks', 'hiit', 'tabata', 'box jump', 'box jumps', 'jump', 'jumps', 'kettlebell swing', 'swing', 'swings', 'high knees', 'plyometric', 'circuit'],
    reason: 'Your routine has high-intensity work',
    tips: [
      { id: 'hiit-sleep', title: 'Prioritise sleep tonight', body: 'Intense intervals tax your nervous system as much as your muscles. An early night is the best recovery tool you have.' },
      { id: 'hiit-calm', title: 'Keep stress low', body: 'Pick calm activities today. Your body does not know the difference between workout stress and a frantic day.' },
    ],
  },
  {
    id: 'mobility',
    keywords: ['yoga', 'stretch', 'stretches', 'stretching', 'mobility', 'pilates', 'foam roll', 'foam rolling', 'balance'],
    reason: 'Your routine already values mobility',
    tips: [
      { id: 'mobility-flow', title: 'A short, slow flow', body: 'Ten minutes of your favourite gentle stretches keeps the habit going without turning rest into a workout.' },
    ],
  },
];

export const GENERIC_TIPS: RestDayTip[] = [
  { id: 'sleep', title: 'Sleep is the main event', body: 'Muscles rebuild while you sleep. Aim for 7 to 9 hours and try to keep a regular bedtime.' },
  { id: 'protein', title: 'Eat enough protein', body: 'Spread protein across your meals today, like eggs, yogurt, beans, fish or meat, to give your muscles what they need to repair.' },
  { id: 'water', title: 'Stay hydrated', body: 'Keep a water bottle nearby. Even mild dehydration can make soreness and fatigue feel worse.' },
  { id: 'active-recovery', title: 'Move a little, gently', body: 'Light activity like a stroll or easy stretching helps recovery more than staying on the couch all day.' },
  { id: 'listen', title: 'Check in with your body', body: 'Notice anything that feels sore in a sharp or lasting way. Soreness that fades is normal; pain that lingers is worth resting longer.' },
  { id: 'plan', title: 'Look ahead', body: 'Glance at your next workout so you know what is coming. A little planning makes it easier to show up.' },
  { id: 'enjoy', title: 'Enjoy the day off', body: 'Rest is part of the plan, not a break from it. You are getting stronger today too.' },
];

/** Splits text into lowercase words, keeping hyphenated words intact. */
const normalize = (text: string) => ` ${text.toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim()} `;

/**
 * Returns the themes whose keywords appear in the given exercise texts, most matched first.
 * A keyword matches only as a whole word or phrase, so "row" doesn't match "throw".
 */
export function matchTipThemes(exerciseTexts: string[]): TipTheme[] {
  const texts = exerciseTexts.map(normalize);
  const scored = TIP_THEMES.map(theme => ({
    theme,
    hits: texts.filter(text => theme.keywords.some(k => text.includes(` ${k} `))).length,
  })).filter(s => s.hits > 0);
  scored.sort((a, b) => b.hits - a.hits);
  return scored.map(s => s.theme);
}

/** Small deterministic hash, so the same day always shows the same tips. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: T[], count: number, seed: string): T[] {
  if (items.length <= count) return [...items];
  const start = hash(seed) % items.length;
  return Array.from({ length: count }, (_, i) => items[(start + i) % items.length]);
}

/**
 * Picks the tips for a rest day: up to `routineCount` routine-specific tips (one per matched
 * theme, strongest match first) followed by generic tips, `total` in all. `seed` (e.g. the
 * date) keeps the choice stable for a day and varies it between days.
 */
export function getRestDayTips(
  exerciseTexts: string[],
  seed: string,
  { total = 5, routineCount = 3 }: { total?: number; routineCount?: number } = {}
): RestDayTip[] {
  const themes = matchTipThemes(exerciseTexts).slice(0, routineCount);
  const specific = themes.map(theme => ({
    ...pick(theme.tips, 1, `${seed}:${theme.id}`)[0],
    reason: theme.reason,
  }));
  const generic = pick(GENERIC_TIPS, Math.max(0, total - specific.length), `${seed}:generic`);
  return [...specific, ...generic];
}
