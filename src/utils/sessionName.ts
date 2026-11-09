// Workout sessions get a generated code name ("Mighty Tiger", see nameUtils.ts). Wherever one
// appears in content it's shown the same way, in curly quotes, so it reads as a name and not
// as a description of the workout. Routine names are the user's own and are shown plainly.

/** A session's code name as display text, e.g. “Mighty Tiger”. */
export function formatSessionName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `“${trimmed}”` : '';
}
