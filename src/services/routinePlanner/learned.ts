// Folds what Pulsar has learned from the user's history (utils/learnedPreferences.ts) into a
// planner Profile. The answers always win: history only fills in the schedule when the
// answers don't say, only adds exercise likes and dislikes, and only lets how recent workouts
// felt move the level or session length when the answers didn't set them.

import type { LearnedPreferences } from '../../utils/learnedPreferences';
import { defaultMinutes } from './planRoutine';
import { effectiveLevel, type Level, type Profile } from './profile';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const LENGTH_STEP = 10;
const MIN_MINUTES = 15;
const MAX_MINUTES = 90;

export function applyLearned(profile: Profile, prefs: LearnedPreferences | undefined): Profile {
  if (!prefs) return profile;
  const next: Profile = {
    ...profile,
    likedExercises: [...prefs.likedExercises],
    dislikedExercises: [...prefs.dislikedExercises],
    skippedExercises: [...prefs.skippedExercises],
    learned: { ...profile.learned },
  };
  const usualDays = prefs.usualDays.filter(d => !profile.blockedDays.includes(d));
  if (profile.daysPerWeek === undefined && profile.preferredDays.length === 0 && usualDays.length > 0) {
    next.preferredDays = usualDays;
    next.daysPerWeek = usualDays.length;
    next.learned!.days = true;
  }
  if (profile.minutes === undefined && prefs.usualMinutes !== undefined) {
    next.minutes = prefs.usualMinutes;
    next.learned!.minutes = true;
  }
  // Length first, from what the session would have been before any level change.
  if (profile.minutes === undefined && prefs.length) {
    const from = defaultMinutes(next);
    const to = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, from + (prefs.length === 'shorter' ? -LENGTH_STEP : LENGTH_STEP)));
    if (to !== from) {
      next.minutes = to;
      next.learned!.minutes = true;
      next.learned!.length = prefs.length;
    }
  }
  if (profile.level === undefined && prefs.effort) {
    const from = LEVELS.indexOf(effectiveLevel(profile));
    const to = Math.max(0, Math.min(LEVELS.length - 1, from + (prefs.effort === 'easier' ? -1 : 1)));
    if (to !== from) {
      next.level = LEVELS[to];
      next.learned!.level = prefs.effort;
    }
  }
  return next;
}
