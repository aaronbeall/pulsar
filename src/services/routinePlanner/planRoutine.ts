// Builds a weekly routine from a Profile, without AI. Instead of copying a fixed template, it:
// 1. picks a split (the kinds of sessions) from the goal, days a week and experience,
// 2. places the sessions on the week: the days that fit the user's preferred and blocked days
//    with the fewest back-to-back days, then the order of sessions that keeps similar
//    sessions apart (every combination is tried; a week is small),
// 3. fills each session's movement slots (squat, hinge, push, pull...) from the tagged
//    exercise catalog, leaving out what the equipment, injuries, dislikes and conditions rule
//    out, and sizes sets, reps and the number of exercises to the goal and session length.
// A seed gives variations: the same profile and seed always build the same week.
//
// Pure logic, no React — see planRoutine.test.ts.

import type { DayOfWeek } from '../../models/types';
import { CatalogExercise, ExerciseTag, Slot, exerciseCatalog } from './exerciseCatalog';
import { Activity, Equipment, Focus, Goal, Level, Limit, Profile, needsLowImpact, primaryGoal, rankedGoals } from './profile';

export interface PlannedExercise {
  name: string;
  sets: number;
  reps?: number;
  /** Seconds, for exercises done for time. */
  duration?: number;
}

export interface PlannedDay {
  day: DayOfWeek;
  kind: string;
  exercises: PlannedExercise[];
}

export interface RoutinePlan {
  name: string;
  description: string;
  /** Short lines on how the answers shaped the plan, for the user to check. */
  notes: string[];
  days: PlannedDay[];
}

type Session = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'conditioning' | 'cardio' | 'mobility';

const WEEK_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const RESISTANCE: Session[] = ['full', 'upper', 'lower', 'push', 'pull', 'legs'];

const SESSION_SLOTS: Record<Session, Slot[]> = {
  full: ['squat', 'hPush', 'hinge', 'hPull', 'lunge', 'vPush', 'core', 'vPull', 'glute', 'biceps', 'triceps', 'calf'],
  upper: ['hPush', 'hPull', 'vPush', 'vPull', 'shoulderIso', 'biceps', 'triceps', 'rearDelt', 'chestIso', 'core'],
  lower: ['squat', 'hinge', 'lunge', 'glute', 'hamstring', 'calf', 'core', 'quad'],
  push: ['hPush', 'vPush', 'chestIso', 'shoulderIso', 'triceps', 'hPush', 'core', 'triceps'],
  pull: ['vPull', 'hPull', 'rearDelt', 'biceps', 'hPull', 'core', 'biceps', 'carry'],
  legs: ['squat', 'hinge', 'lunge', 'quad', 'hamstring', 'calf', 'glute', 'core'],
  conditioning: ['cond', 'cond', 'cond', 'core', 'cond', 'cond', 'core'],
  cardio: ['cardio', 'core', 'mobility', 'core'],
  mobility: ['mobility', 'mobility', 'mobility', 'mobility', 'core', 'mobility', 'mobility', 'mobility'],
};

const SESSION_LABEL: Record<Session, string> = {
  full: 'Full Body', upper: 'Upper Body', lower: 'Lower Body', push: 'Push', pull: 'Pull', legs: 'Legs',
  conditioning: 'Conditioning', cardio: 'Cardio', mobility: 'Mobility',
};

const FOCUS_SLOTS: Record<Focus, Slot[]> = {
  chest: ['chestIso', 'chestIso'],
  back: ['hPull', 'rearDelt'],
  shoulders: ['shoulderIso', 'rearDelt'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
  glutes: ['glute', 'glute'],
  legs: ['lunge', 'quad'],
  upper: ['hPush', 'hPull'],
  lower: ['squat', 'glute'],
};
const LOWER_SLOTS = new Set<Slot>(['squat', 'hinge', 'lunge', 'glute', 'quad', 'hamstring', 'calf']);
const UPPER_SLOTS = new Set<Slot>(['hPush', 'vPush', 'chestIso', 'shoulderIso', 'rearDelt', 'hPull', 'vPull', 'biceps', 'triceps']);
const COMPOUND_SLOTS = new Set<Slot>(['squat', 'hinge', 'lunge', 'hPush', 'vPush', 'hPull', 'vPull']);

/** Small seeded random number generator (mulberry32), so a seed always builds the same week. */
function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// 1. Split

export function defaultDaysPerWeek(profile: Profile): number {
  return profile.daysPerWeek ?? (profile.preferredDays.length || 3);
}

export function defaultMinutes(profile: Profile): number {
  if (profile.minutes) return profile.minutes;
  if (profile.conditions.includes('senior') || profile.level === 'beginner') return 30;
  return 45;
}

function resistanceSplit(n: number, profile: Profile, goal: Goal): Session[] {
  const level = profile.level ?? 'intermediate';
  switch (n) {
    case 1: return ['full'];
    case 2: return ['full', 'full'];
    case 3: return level === 'advanced' && (goal === 'muscle' || goal === 'strength') ? ['push', 'pull', 'legs'] : ['full', 'full', 'full'];
    case 4: return ['upper', 'lower', 'upper', 'lower'];
    case 5: return ['upper', 'lower', 'push', 'pull', 'legs'];
    default: return ['push', 'pull', 'legs', 'push', 'pull', 'legs'].slice(0, n) as Session[];
  }
}

export function chooseSessions(profile: Profile, n: number): Session[] {
  const goal = primaryGoal(profile);
  let sessions: Session[];
  const base = Math.min(n, 6);
  switch (goal) {
    case 'fatLoss':
      sessions = ([
        [], ['full'], ['full', 'full'], ['full', 'conditioning', 'full'], ['full', 'conditioning', 'full', 'conditioning'],
        ['upper', 'conditioning', 'lower', 'conditioning', 'full'], ['upper', 'conditioning', 'lower', 'cardio', 'full', 'conditioning'],
      ] as Session[][])[base];
      break;
    case 'endurance':
      sessions = ([
        [], ['cardio'], ['cardio', 'full'], ['cardio', 'full', 'cardio'], ['cardio', 'full', 'cardio', 'full'],
        ['cardio', 'full', 'cardio', 'full', 'cardio'], ['cardio', 'full', 'cardio', 'full', 'cardio', 'conditioning'],
      ] as Session[][])[base];
      break;
    case 'mobility':
      sessions = ([
        [], ['mobility'], ['mobility', 'full'], ['mobility', 'full', 'mobility'], ['mobility', 'full', 'mobility', 'full'],
        ['mobility', 'full', 'mobility', 'full', 'mobility'], ['mobility', 'full', 'mobility', 'full', 'mobility', 'cardio'],
      ] as Session[][])[base];
      break;
    case 'athletic':
      sessions = base >= 3
        ? [...resistanceSplit(base - 1, profile, goal), 'conditioning']
        : resistanceSplit(base, profile, goal);
      break;
    default:
      sessions = resistanceSplit(base, profile, goal);
  }
  sessions = [...sessions];

  // A strong second goal takes one session on longer weeks.
  const second = rankedGoals(profile).find(g => g !== goal && (profile.goals[g] ?? 0) >= 0.4);
  if (second && sessions.length >= 4 && RESISTANCE.includes(sessions[sessions.length - 1])) {
    const extra: Session | undefined = second === 'fatLoss' ? 'conditioning' : second === 'endurance' ? 'cardio' : second === 'mobility' ? 'mobility' : undefined;
    if (extra && !sessions.includes(extra)) sessions[sessions.length - 1] = extra;
  }
  if (n >= 7) sessions.push(goal === 'endurance' ? 'mobility' : goal === 'mobility' ? 'conditioning' : 'mobility');

  // Skipped areas: no leg days for "skip legs", no upper days for "skip upper body".
  const skipLower = profile.skipFocus.some(f => f === 'legs' || f === 'lower');
  const skipUpper = profile.skipFocus.some(f => f === 'upper');
  sessions = sessions.map(s => {
    if (skipLower && (s === 'lower' || s === 'legs')) return 'upper';
    if (skipUpper && (s === 'upper' || s === 'push' || s === 'pull')) return 'lower';
    return s;
  });

  // Dislikes and conditions that rule out whole kinds of session.
  const noIntervals = profile.avoid.includes('hiit') || profile.conditions.includes('pregnant') || profile.conditions.includes('heart');
  const noCardio = profile.avoid.includes('cardio');
  return sessions.map(s => {
    if (s === 'conditioning' && noCardio) return 'full';
    if (s === 'conditioning' && noIntervals) return 'cardio';
    if (s === 'cardio' && noCardio) return goal === 'mobility' ? 'mobility' : 'full';
    return s;
  });
}

// ---------------------------------------------------------------------------------------------
// 2. Week placement

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)];
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  const seen = new Set<string>();
  items.forEach((item, i) => {
    const key = String(item);
    if (seen.has(key)) return;
    seen.add(key);
    for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) out.push([item, ...rest]);
  });
  return out;
}

/** Number of back-to-back pairs in a set of weekdays (Sunday to Monday counts). */
function adjacentPairs(days: number[]): number {
  const set = new Set(days);
  return days.filter(d => set.has((d + 1) % 7)).length;
}

/** Picks which weekdays to train on. */
export function chooseDays(profile: Profile, n: number, random: () => number): DayOfWeek[] {
  const allowed = WEEK_ORDER.map((_, i) => i).filter(i => !profile.blockedDays.includes(WEEK_ORDER[i]));
  const preferred = allowed.filter(i => profile.preferredDays.includes(WEEK_ORDER[i]));
  const count = Math.max(1, Math.min(n, allowed.length));

  let candidates: number[][];
  if (preferred.length >= count) {
    candidates = combinations(preferred, count);
  } else {
    const others = allowed.filter(i => !preferred.includes(i));
    candidates = combinations(others, count - preferred.length).map(c => [...preferred, ...c].sort((a, b) => a - b));
  }

  let best: number[] = candidates[0] ?? [];
  let bestScore = Infinity;
  for (const combo of candidates) {
    // Rest between sessions matters most; weekends off is a mild preference on short weeks.
    const weekend = combo.filter(i => i >= 5).length;
    const score = adjacentPairs(combo) * 10 + (count <= 5 ? weekend : 0) + random() * 0.5;
    if (score < bestScore) {
      best = combo;
      bestScore = score;
    }
  }
  return best.map(i => WEEK_ORDER[i]);
}

/** How much two sessions on back-to-back days work the same muscles (higher is worse). */
function overlap(a: Session, b: Session): number {
  const easy: Session[] = ['cardio', 'mobility'];
  if (easy.includes(a) || easy.includes(b)) return a === b ? 0.5 : 0;
  if (a === b) return 3;
  const groups: Record<Session, string[]> = {
    full: ['upper', 'lower'], upper: ['upper'], push: ['upper'], pull: ['upper'],
    lower: ['lower'], legs: ['lower'], conditioning: ['lower'], cardio: [], mobility: [],
  };
  const shared = groups[a].filter(g => groups[b].includes(g)).length;
  return shared * (a === 'conditioning' || b === 'conditioning' ? 1 : 2);
}

/** Orders the sessions over the chosen days so similar sessions aren't back to back. */
function arrangeSessions(sessions: Session[], days: DayOfWeek[]): Session[] {
  const index = days.map(d => WEEK_ORDER.indexOf(d));
  let best = sessions;
  let bestScore = Infinity;
  for (const order of permutations(sessions)) {
    let score = 0;
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) {
        if (i !== j && (index[i] + 1) % 7 === index[j]) score += overlap(order[i], order[j]);
      }
    }
    // Stay close to the split's own order (Upper, Lower, Upper, Lower reads naturally).
    for (let i = 0; i < order.length; i++) if (order[i] !== sessions[i]) score += 0.01;
    if (score < bestScore) {
      best = order;
      bestScore = score;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// 3. Exercises

interface Filters {
  /** Prefer exercises done standing (getting up and down off the floor is hard work). */
  preferStanding: boolean;
  equipment: Set<Equipment>;
  limits: Set<Limit>;
  excludeTags: Set<ExerciseTag>;
  likes: Set<Activity>;
  level: Level;
  maxLevel: number;
}

function buildFilters(profile: Profile): Filters {
  const excludeTags = new Set<ExerciseTag>(profile.avoid);
  if (needsLowImpact(profile)) {
    excludeTags.add('impact');
    excludeTags.add('jumping');
  }
  if (profile.conditions.includes('pregnant')) for (const t of ['supine', 'prone', 'crunches', 'heavy', 'hang', 'impact', 'burpees'] as ExerciseTag[]) excludeTags.add(t);
  if (profile.conditions.includes('heart')) excludeTags.add('heavy');
  if (profile.conditions.includes('senior')) excludeTags.add('hang');
  // Not wanting to get down on the floor rules out floor work, not just one exercise.
  if (profile.avoid.includes('floor')) excludeTags.add('floor');
  const level = profile.level ?? (profile.conditions.length > 0 ? 'beginner' : 'intermediate');
  return {
    preferStanding: profile.conditions.some(c => c === 'senior' || c === 'overweight' || c === 'pregnant' || c === 'arthritis'),
    equipment: new Set(profile.equipment),
    limits: new Set(profile.limits),
    excludeTags,
    likes: new Set(profile.likes),
    level,
    maxLevel: level === 'beginner' ? 2 : 3,
  };
}

function isAvailable(ex: CatalogExercise, f: Filters): boolean {
  if (ex.level > f.maxLevel) return false;
  if (!ex.equipment.some(alt => alt.every(e => f.equipment.has(e)))) return false;
  if (ex.limits.some(l => f.limits.has(l))) return false;
  if (ex.tags.some(t => f.excludeTags.has(t))) return false;
  return true;
}

function scoreExercise(ex: CatalogExercise, f: Filters, goal: Goal, usedInWeek: Map<string, number>, random: () => number): number {
  let score = ex.priority * 2;
  if (ex.tags.some(t => f.likes.has(t as Activity))) score += 4;
  // Use the equipment people have: an exercise that needs some of it beats the bodyweight version.
  const usesEquipment = ex.equipment.some(alt => alt.length > 0 && alt.every(e => f.equipment.has(e)));
  if (usesEquipment) score += 1.5;
  if (goal === 'strength' && ex.equipment.some(alt => alt.includes('barbell')) && f.equipment.has('barbell')) score += 1.5;
  if (f.level === 'beginner') score += ex.level === 1 ? 1 : -1;
  if (f.level === 'advanced' && ex.level >= 2) score += 1;
  if (f.preferStanding && ex.tags.includes('floor')) score -= 3;
  score -= (usedInWeek.get(ex.name) ?? 0) * 2;
  return score + random() * 2.5;
}

/** 'reps' leaves out exercises done for time, 'timed' leaves out the rest. */
type PickMode = 'reps' | 'timed' | 'any';

function pickExercise(slot: Slot, used: Set<string>, f: Filters, goal: Goal, usedInWeek: Map<string, number>, random: () => number, mode: PickMode = 'any'): CatalogExercise | undefined {
  let best: CatalogExercise | undefined;
  let bestScore = -Infinity;
  for (const ex of exerciseCatalog) {
    if (!ex.slots.includes(slot) || used.has(ex.name) || !isAvailable(ex, f)) continue;
    if ((mode === 'reps' && ex.seconds) || (mode === 'timed' && !ex.seconds)) continue;
    const score = scoreExercise(ex, f, goal, usedInWeek, random);
    if (score > bestScore) {
      best = ex;
      bestScore = score;
    }
  }
  return best;
}

/** Sets and reps (or seconds) for an exercise in a resistance session. */
function dose(ex: CatalogExercise, slot: Slot, goal: Goal, f: Filters, profile: Profile): Omit<PlannedExercise, 'name'> {
  const beginner = f.level === 'beginner';
  if (ex.seconds) return { sets: beginner ? 2 : 3, duration: ex.seconds };
  // Bodyweight moves are too light for low reps.
  const loaded = ex.equipment.some(alt => alt.length > 0 && alt.every(e => f.equipment.has(e)));
  const compound = COMPOUND_SLOTS.has(slot) && loaded;
  let sets: number;
  let reps: number;
  switch (goal) {
    case 'strength':
      [sets, reps] = compound ? [beginner ? 3 : 4, beginner ? 8 : 5] : [3, 10];
      break;
    case 'muscle':
      [sets, reps] = compound ? [beginner ? 3 : 4, beginner ? 10 : 8] : [3, 12];
      break;
    case 'endurance':
    case 'mobility':
      [sets, reps] = [beginner ? 2 : 3, 15];
      break;
    default:
      [sets, reps] = [3, compound ? 10 : 12];
  }
  if (profile.conditions.includes('heart')) reps = Math.max(reps, 10);
  return { sets, reps };
}

function sessionExercises(
  session: Session,
  profile: Profile,
  f: Filters,
  goal: Goal,
  minutes: number,
  usedInWeek: Map<string, number>,
  random: () => number,
): PlannedExercise[] {
  let slots = [...SESSION_SLOTS[session]];
  const resistance = RESISTANCE.includes(session);

  if (resistance) {
    // Focus areas get extra slots right after the main lifts, so short sessions keep them.
    const extra: Slot[] = [];
    for (const focus of profile.focus) {
      for (const slot of FOCUS_SLOTS[focus]) {
        const fits = session === 'full' || (UPPER_SLOTS.has(slot) && ['upper', 'push', 'pull'].includes(session)) ||
          (LOWER_SLOTS.has(slot) && ['lower', 'legs'].includes(session)) || slot === 'core';
        if (fits) extra.push(slot);
      }
    }
    slots.splice(Math.min(session === 'full' ? 4 : 3, slots.length), 0, ...extra);
    if (profile.skipFocus.some(s => s === 'legs' || s === 'lower')) slots = slots.filter(s => !LOWER_SLOTS.has(s));
    if (profile.skipFocus.includes('upper')) slots = slots.filter(s => !UPPER_SLOTS.has(s));
  }

  const used = new Set<string>();
  const out: PlannedExercise[] = [];
  const add = (ex: CatalogExercise, d: Omit<PlannedExercise, 'name'>) => {
    used.add(ex.name);
    usedInWeek.set(ex.name, (usedInWeek.get(ex.name) ?? 0) + 1);
    out.push({ name: ex.name, ...d });
  };

  if (session === 'conditioning') {
    // A circuit: every move for the same time, repeated for a few rounds.
    const moves = minutes >= 40 ? 6 : minutes >= 25 ? 5 : 4;
    const work = f.level === 'beginner' || profile.conditions.includes('asthma') ? 30 : 40;
    const rounds = Math.max(2, Math.min(5, Math.floor((minutes - 5) / (moves * ((work + 20) / 60)))));
    for (const slot of slots) {
      if (out.length >= moves) break;
      const ex = pickExercise(slot, used, f, goal, usedInWeek, random, 'timed');
      if (ex) add(ex, { sets: rounds, duration: work });
    }
    return out;
  }

  if (session === 'cardio') {
    const main = pickExercise('cardio', used, f, goal, usedInWeek, random);
    const extras = minutes >= 30 ? 2 : minutes >= 20 ? 1 : 0;
    const mainMinutes = Math.max(10, Math.round((minutes - extras * 4) / 5) * 5);
    if (main) add(main, { sets: 1, duration: mainMinutes * 60 });
    for (const slot of slots.slice(1)) {
      if (out.length >= 1 + extras) break;
      const ex = pickExercise(slot, used, f, goal, usedInWeek, random);
      if (ex) add(ex, ex.seconds ? { sets: 2, duration: ex.seconds } : { sets: 2, reps: 12 });
    }
    return out;
  }

  if (session === 'mobility') {
    const count = Math.max(4, Math.min(8, Math.floor(minutes / 4)));
    for (const slot of slots) {
      if (out.length >= count) break;
      const ex = pickExercise(slot, used, f, goal, usedInWeek, random);
      if (ex) add(ex, ex.seconds ? { sets: 2, duration: ex.seconds } : { sets: 2, reps: 10 });
    }
    return out;
  }

  // Resistance: about 7 minutes an exercise at 3 sets, 9 at 4, plus a few for warming up.
  const perExercise = f.level === 'beginner' ? 6 : 8;
  const count = Math.max(3, Math.min(8, Math.floor((minutes - 5) / perExercise)));
  const second = rankedGoals(profile).find(g => g !== goal && (profile.goals[g] ?? 0) >= 0.4);
  const finisher: Slot | undefined = (goal === 'fatLoss' || second === 'fatLoss' || second === 'endurance') && !profile.avoid.includes('cardio')
    ? 'cond'
    : second === 'mobility' ? 'mobility' : undefined;
  const mainCount = finisher && count > 3 ? count - 1 : count;
  for (const slot of slots) {
    if (out.length >= mainCount) break;
    const mode: PickMode = slot === 'core' || slot === 'carry' || slot === 'quad' ? 'any' : 'reps';
    const ex = pickExercise(slot, used, f, goal, usedInWeek, random, mode);
    if (ex) add(ex, dose(ex, slot, goal, f, profile));
  }
  if (finisher && out.length < count) {
    const ex = pickExercise(finisher, used, f, goal, usedInWeek, random, 'timed');
    if (ex) add(ex, { sets: 3, duration: ex.seconds ?? 30 });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Naming and notes

const GOAL_NAME: Record<Goal, string> = {
  strength: 'Strength', muscle: 'Muscle Builder', fatLoss: 'Fat Burn', endurance: 'Endurance',
  mobility: 'Move Well', athletic: 'Athlete', general: 'Total Fitness',
};

const LIMIT_NOTE: Record<Limit, string> = {
  knee: 'Easy on the knees: no jumping, lunges or deep squats',
  back: 'Easy on the lower back: no deadlifts, sit-ups or heavy loaded squats',
  shoulder: 'Easy on the shoulders: no overhead pressing, dips or hanging',
  wrist: 'Easy on the wrists: no push-ups or moves on your hands',
  ankle: 'Easy on the ankles: no running or jumping',
  hip: 'Easy on the hips: no running, side lunges or wide squats',
  neck: 'Easy on the neck: no crunches or bar-on-the-back squats',
  elbow: 'Easy on the elbows: no dips, pull-ups or triceps extensions',
};

const ACTIVITY_LABEL: Record<Activity, string> = {
  running: 'running', jumping: 'jumping', burpees: 'burpees', cardio: 'cardio days', swimming: 'swimming',
  cycling: 'cycling', rowing: 'rowing', walking: 'walking', yoga: 'yoga', boxing: 'boxing', hiit: 'interval circuits',
  lunges: 'lunges', squats: 'squats', pushups: 'push-ups', pullups: 'pull-ups', deadlifts: 'deadlifts',
  crunches: 'crunches', planks: 'planks', floor: 'floor work', stairs: 'stairs',
};

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'dumbbells', barbell: 'a barbell', kettlebell: 'kettlebells', band: 'bands', pullupBar: 'a pull-up bar',
  bench: 'a bench', machine: 'machines', cable: 'cables', treadmill: 'a treadmill', bike: 'a bike', rower: 'a rower',
  elliptical: 'an elliptical', jumpRope: 'a jump rope', pool: 'a pool',
};

export function listText(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function equipmentText(equipment: Equipment[]): string {
  if (equipment.length === 0) return 'no equipment';
  if (['barbell', 'machine', 'cable', 'dumbbell'].every(e => equipment.includes(e as Equipment))) return 'a full gym';
  return listText(equipment.map(e => EQUIPMENT_LABEL[e]));
}

function buildNotes(profile: Profile, days: PlannedDay[], minutes: number): string[] {
  const notes: string[] = [];
  const dayNames = days.map(d => d.day);
  notes.push(`${listText(dayNames)}, about ${minutes} minutes${dayNames.length > 1 ? ' each' : ''}`);
  if (profile.blockedDays.length) notes.push(`${listText(profile.blockedDays)} kept free`);
  if (profile.equipmentAssumed) notes.push('No equipment mentioned, so it uses your bodyweight only');
  for (const limit of profile.limits) notes.push(LIMIT_NOTE[limit]);
  const avoided = profile.avoid.filter(a => a !== 'floor').map(a => ACTIVITY_LABEL[a]);
  if (avoided.length) notes.push(`No ${listText(avoided)}`);
  if (profile.avoid.includes('floor')) notes.push('Nothing on the floor');
  if (profile.conditions.includes('pregnant')) {
    notes.push('Nothing lying on your back, no jumping or heavy lifts. Check with your doctor or midwife first');
  }
  if (profile.conditions.includes('heart')) notes.push('Moderate effort, no max lifts. Check with your doctor before you start');
  if (profile.conditions.includes('asthma')) notes.push('Shorter intervals with rest to catch your breath. Warm up first and keep your inhaler handy');
  if (!profile.conditions.includes('pregnant') && needsLowImpact(profile) && !profile.limits.length) notes.push('Low impact: no jumping or running');
  if (profile.focus.length) notes.push(`Extra work for ${listText(profile.focus.map(f => (f === 'upper' ? 'upper body' : f === 'lower' ? 'lower body' : f)))}`);
  const liked = profile.likes.filter(l => days.some(d => d.exercises.some(e => exerciseCatalog.find(c => c.name === e.name)?.tags.includes(l))));
  if (liked.length) notes.push(`Includes ${listText(liked.map(l => ACTIVITY_LABEL[l]))}, since you like it`);
  return notes;
}

// ---------------------------------------------------------------------------------------------

/** Builds a week from a profile. Different seeds give different, equally valid variations. */
export function planRoutine(profile: Profile, seed = 0): RoutinePlan {
  const random = rng(seed + 1);
  const goal = primaryGoal(profile);
  const minutes = defaultMinutes(profile);
  const days = chooseDays(profile, defaultDaysPerWeek(profile), random);
  const sessions = arrangeSessions(chooseSessions(profile, days.length), days);
  const filters = buildFilters(profile);
  const usedInWeek = new Map<string, number>();

  // Count how often each kind of session appears, to letter repeats ("Full Body A", "B").
  const totals = new Map<Session, number>();
  for (const s of sessions) totals.set(s, (totals.get(s) ?? 0) + 1);
  const seen = new Map<Session, number>();

  const planned: PlannedDay[] = days.map((day, i) => {
    const session = sessions[i];
    const nth = seen.get(session) ?? 0;
    seen.set(session, nth + 1);
    let kind = SESSION_LABEL[session];
    if (session === 'lower' && profile.focus.includes('glutes')) kind = 'Lower Body & Glutes';
    if ((totals.get(session) ?? 0) > 1 && RESISTANCE.includes(session)) kind = `${kind} ${String.fromCharCode(65 + nth)}`;
    return { day, kind, exercises: sessionExercises(session, profile, filters, goal, minutes, usedInWeek, random) };
  }).filter(d => d.exercises.length > 0);

  const bodyweightOnly = profile.equipment.length === 0;
  const goalName = profile.conditions.includes('pregnant') ? GOAL_NAME.general : GOAL_NAME[goal];
  const name = `${planned.length}-Day ${bodyweightOnly ? 'Bodyweight ' : ''}${goalName}`;
  const kinds = Array.from(new Set(planned.map(d => d.kind.replace(/ [A-Z]$/, ''))));
  const description = `${listText(kinds)}, ${planned.length} ${planned.length === 1 ? 'day' : 'days'} a week, about ${minutes} minutes, with ${equipmentText(profile.equipment)}.`;
  return { name, description, notes: buildNotes(profile, planned, minutes), days: planned };
}
