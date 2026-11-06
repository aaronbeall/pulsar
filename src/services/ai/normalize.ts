// Validation for what comes back from the model. JSON mode guarantees valid JSON, not the
// shape we asked for: day names can come back lowercased or abbreviated, numbers as strings,
// both reps and duration on one exercise, or nothing usable at all. Everything is coerced
// into the typed shapes here, or rejected with a parse_error, before any of it touches a
// routine. Pure — see normalize.test.ts.

import { DAYS_OF_WEEK } from '../../constants/days';
import { DayOfWeek } from '../../models/types';
import { AIChangeResponse, AIError, AIExerciseEntry, AIRoutineResponse } from './types';

export function normalizeDay(value: unknown): DayOfWeek | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v.length < 3) return null;
  return DAYS_OF_WEEK.find(d => d.toLowerCase().startsWith(v.slice(0, 3))) ?? null;
}

function toPositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof n !== 'number' || !isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

export function normalizeExercise(raw: unknown): AIExerciseEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return null;
  const sets = toPositiveInt(r.sets) ?? 1;
  const duration = toPositiveInt(r.duration);
  const reps = toPositiveInt(r.reps);
  // Exactly one of reps/duration. A timed exercise wins if the model sent both; a bare
  // name with neither gets a sensible default rather than being dropped.
  if (duration) return { name, sets, duration };
  return { name, sets, reps: reps ?? 10 };
}

function normalizeExercises(raw: unknown): AIExerciseEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeExercise).filter((e): e is AIExerciseEntry => !!e);
}

export function normalizeRoutineResponse(raw: unknown): AIRoutineResponse {
  if (!raw || typeof raw !== 'object') {
    throw new AIError('parse_error', 'The AI response was not a routine. Try again.');
  }
  const r = raw as Record<string, unknown>;
  const byDay = new Map<DayOfWeek, AIRoutineResponse['schedule'][number]>();
  for (const entry of Array.isArray(r.schedule) ? r.schedule : []) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const day = normalizeDay(e.day);
    const exercises = normalizeExercises(e.exercises);
    if (!day || exercises.length === 0 || byDay.has(day)) continue;
    byDay.set(day, { day, kind: typeof e.kind === 'string' ? e.kind.trim() : '', exercises });
  }
  if (byDay.size === 0) {
    throw new AIError('parse_error', 'The AI returned a routine with no workout days. Try again.');
  }
  return {
    name: typeof r.name === 'string' ? r.name.trim() : '',
    description: typeof r.description === 'string' ? r.description.trim() : '',
    commentary: typeof r.commentary === 'string' ? r.commentary.trim() : '',
    schedule: DAYS_OF_WEEK.filter(d => byDay.has(d)).map(d => byDay.get(d)!),
  };
}

type ScheduleOp = NonNullable<AIChangeResponse['patch']['dailySchedule']>[number];

export function normalizeChangeResponse(raw: unknown): AIChangeResponse {
  if (!raw || typeof raw !== 'object') {
    throw new AIError('parse_error', 'Could not understand the AI response. Try again.');
  }
  const r = raw as Record<string, unknown>;
  const patchRaw = (r.patch && typeof r.patch === 'object' ? r.patch : {}) as Record<string, unknown>;

  const ops: ScheduleOp[] = [];
  const seen = new Set<DayOfWeek>();
  for (const opRaw of Array.isArray(patchRaw.dailySchedule) ? patchRaw.dailySchedule : []) {
    if (!opRaw || typeof opRaw !== 'object') continue;
    const o = opRaw as Record<string, unknown>;
    const day = normalizeDay(o.day);
    if (!day || seen.has(day)) continue;
    const exercises = normalizeExercises(o.exercises);
    if (o.op === 'clearDay' || (o.op !== 'setDay' && exercises.length === 0)) {
      ops.push({ op: 'clearDay', day });
    } else if (exercises.length > 0) {
      ops.push({ op: 'setDay', day, kind: typeof o.kind === 'string' ? o.kind.trim() : '', exercises });
    } else {
      continue; // a setDay with no usable exercises — ignore rather than wipe the day
    }
    seen.add(day);
  }

  const description = typeof patchRaw.description === 'string' && patchRaw.description.trim()
    ? patchRaw.description.trim()
    : undefined;
  const commentary = typeof r.commentary === 'string' && r.commentary.trim()
    ? r.commentary.trim()
    : (ops.length || description ? 'Here is a suggested change.' : "Sorry, I didn't catch that. Could you rephrase?");

  const patch: AIChangeResponse['patch'] = {};
  if (ops.length) patch.dailySchedule = ops;
  if (description) patch.description = description;
  return { commentary, patch };
}
