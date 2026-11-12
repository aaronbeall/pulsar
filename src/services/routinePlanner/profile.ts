// The structured reading of the setup wizard's free-text answers, and the vocabulary the
// planner works in. parseAnswers.ts fills it in, the "Your plan" screen lets the user correct
// it, and planRoutine.ts builds a week from it. Pure data, no React.

import type { DayOfWeek } from '../../models/types';

export type Goal = 'strength' | 'muscle' | 'fatLoss' | 'endurance' | 'mobility' | 'athletic' | 'general';
export const GOALS: Goal[] = ['strength', 'muscle', 'fatLoss', 'endurance', 'mobility', 'athletic', 'general'];

export type Equipment =
  | 'dumbbell' | 'barbell' | 'kettlebell' | 'band' | 'pullupBar' | 'bench'
  | 'machine' | 'cable' | 'treadmill' | 'bike' | 'rower' | 'elliptical' | 'jumpRope' | 'pool';
/** Everything a commercial gym has (a pool is the one thing we don't assume). */
export const GYM_EQUIPMENT: Equipment[] = [
  'dumbbell', 'barbell', 'kettlebell', 'band', 'pullupBar', 'bench',
  'machine', 'cable', 'treadmill', 'bike', 'rower', 'elliptical', 'jumpRope',
];
export const ALL_EQUIPMENT: Equipment[] = [...GYM_EQUIPMENT, 'pool'];

/** A body area the user wants more of. */
export type Focus = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'glutes' | 'legs' | 'upper' | 'lower';

/** A body area that's injured or sore, so exercises that load it are left out. */
export type Limit = 'knee' | 'back' | 'shoulder' | 'wrist' | 'ankle' | 'hip' | 'neck' | 'elbow';

/**
 * Activity and movement tags an answer can like or rule out ("I hate running", "no burpees").
 * The exercise catalog carries the same tags.
 */
export type Activity =
  | 'running' | 'jumping' | 'burpees' | 'cardio' | 'swimming' | 'cycling' | 'rowing' | 'walking'
  | 'yoga' | 'boxing' | 'hiit' | 'lunges' | 'squats' | 'pushups' | 'pullups' | 'deadlifts'
  | 'crunches' | 'planks' | 'floor' | 'stairs';

export type Condition = 'asthma' | 'pregnant' | 'overweight' | 'senior' | 'heart' | 'arthritis';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  /** How much each goal matters, 0..1. Empty means no goal was stated. */
  goals: Partial<Record<Goal, number>>;
  /** Equipment available. Bodyweight is always available and isn't listed. */
  equipment: Equipment[];
  /** True when no answer said anything about equipment, so `equipment` is a guess. */
  equipmentAssumed: boolean;
  /** Sessions a week, when the answers say. */
  daysPerWeek?: number;
  /** Weekdays the user named as ones they want to train on. */
  preferredDays: DayOfWeek[];
  /** Weekdays the user ruled out. */
  blockedDays: DayOfWeek[];
  /** Minutes per session, when the answers say. */
  minutes?: number;
  focus: Focus[];
  /** Areas the user said they don't want to train ("skip legs"). */
  skipFocus: Focus[];
  limits: Limit[];
  likes: Activity[];
  avoid: Activity[];
  conditions: Condition[];
  level?: Level;
  /** Learned from the app (see utils/learnedPreferences.ts): exercises to favor. */
  likedExercises: string[];
  /** Learned: exercises the user marked as disliked, left out. */
  dislikedExercises: string[];
  /** Learned: exercises the user keeps skipping, left out. */
  skippedExercises: string[];
  /**
   * What came from the user's history rather than their answers: the schedule fields, and
   * whether how recent workouts felt moved the level or the session length.
   */
  learned?: { days?: boolean; minutes?: boolean; level?: 'easier' | 'harder'; length?: 'shorter' | 'longer' };
}

export function emptyProfile(): Profile {
  return {
    goals: {},
    equipment: [],
    equipmentAssumed: true,
    preferredDays: [],
    blockedDays: [],
    focus: [],
    skipFocus: [],
    limits: [],
    likes: [],
    avoid: [],
    conditions: [],
    likedExercises: [],
    dislikedExercises: [],
    skippedExercises: [],
  };
}

/** The goal with the highest weight, or 'general' when none was stated. */
export function primaryGoal(profile: Profile): Goal {
  let best: Goal = 'general';
  let bestWeight = 0;
  for (const goal of GOALS) {
    const weight = profile.goals[goal] ?? 0;
    if (weight > bestWeight) {
      best = goal;
      bestWeight = weight;
    }
  }
  return best;
}

/** Goals in order of weight, highest first. */
export function rankedGoals(profile: Profile): Goal[] {
  return GOALS.filter(g => (profile.goals[g] ?? 0) > 0).sort((a, b) => (profile.goals[b] ?? 0) - (profile.goals[a] ?? 0));
}

/** The level the planner works at: what the answers say, else beginner with a condition, else intermediate. */
export function effectiveLevel(profile: Profile): Level {
  return profile.level ?? (profile.conditions.length > 0 ? 'beginner' : 'intermediate');
}

/** True when impact moves (jumping, running) should be left out. */
export function needsLowImpact(profile: Profile): boolean {
  return (
    profile.avoid.includes('jumping') ||
    profile.limits.some(l => l === 'knee' || l === 'ankle' || l === 'hip') ||
    profile.conditions.some(c => c === 'overweight' || c === 'senior' || c === 'pregnant' || c === 'arthritis')
  );
}
