/**
 * An exercise name reduced for forgiving comparison: lowercase letters and digits only, with
 * a trailing plural "s" dropped, so "Push-up", "push up" and "Pushups" compare equal. Shared
 * by exercise lookup, the free-exercise-db index and the Planner.
 */
export function normalizeExerciseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/s$/, '');
}
