// Folds what Pulsar has learned from the user's history (utils/learnedPreferences.ts) into a
// planner Profile. The answers always win: history only fills in the schedule when the
// answers don't say, and only adds exercise likes and dislikes.

import type { LearnedPreferences } from '../../utils/learnedPreferences';
import type { Profile } from './profile';

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
  return next;
}
