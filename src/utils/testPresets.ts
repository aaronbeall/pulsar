import { addDays, startOfDay } from 'date-fns';
import { DAYS_OF_WEEK } from '../constants/days';
import type {
  DayOfWeek,
  Exercise,
  Routine,
  RoutineChange,
  RoutineChatMessage,
  RoutineDay,
  RoutineRevision,
  SchedulePeriod,
  ScheduledExercise,
  Workout,
  WorkoutExercise,
} from '../models/types';

// Preset data sets for manual testing (dev mode only, see DEV-FEATURES.md). Each preset
// builds a full app data set relative to `now`, so streaks and "today" always line up with
// the day you load it. Loading one replaces everything on the device, like restoring a backup.
//
// Routines carry an explicit `schedulePeriods` log (the restore path stores it as given), so
// past days are judged by the schedule that was in force then, not today's.

export interface TestPresetData {
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
}

export interface TestPreset {
  id: string;
  name: string;
  description: string;
  build: (now?: number) => TestPresetData;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// ---------------------------------------------------------------------------------------
// Exercises

interface ExerciseSpec {
  name: string;
  img: string;
  muscles: string[];
  timed?: boolean;
  weight?: number; // starting weight in lb, for weighted lifts
}

const EXERCISE_SPECS: Record<string, ExerciseSpec> = {
  'ex-bench': { name: 'Bench Press', img: 'Barbell_Bench_Press_-_Medium_Grip/0.jpg', muscles: ['Chest', 'Triceps', 'Shoulders'], weight: 135 },
  'ex-row': { name: 'Bent-over Row', img: 'Bent_Over_Barbell_Row/0.jpg', muscles: ['Back', 'Biceps'], weight: 95 },
  'ex-press': { name: 'Overhead Press', img: 'Standing_Military_Press/0.jpg', muscles: ['Shoulders', 'Triceps'], weight: 75 },
  'ex-curl': { name: 'Bicep Curl', img: 'Dumbbell_Bicep_Curl/0.jpg', muscles: ['Biceps'], weight: 25 },
  'ex-squat': { name: 'Squat', img: 'Barbell_Squat/0.jpg', muscles: ['Quadriceps', 'Glutes', 'Hamstrings'], weight: 155 },
  'ex-deadlift': { name: 'Deadlift', img: 'Barbell_Deadlift/0.jpg', muscles: ['Hamstrings', 'Glutes', 'Back'], weight: 185 },
  'ex-lunge': { name: 'Lunge', img: 'Dumbbell_Lunges/0.jpg', muscles: ['Quadriceps', 'Glutes', 'Hamstrings'], weight: 20 },
  'ex-calf': { name: 'Calf Raise', img: 'Calf_Raise_On_A_Dumbbell/0.jpg', muscles: ['Calves'] },
  'ex-pushup': { name: 'Push-up', img: 'Pushups/0.jpg', muscles: ['Chest', 'Triceps', 'Shoulders'] },
  'ex-pullup': { name: 'Pull-up', img: 'Pullups/0.jpg', muscles: ['Back', 'Biceps', 'Shoulders'] },
  'ex-bwsquat': { name: 'Bodyweight Squat', img: 'Bodyweight_Squat/0.jpg', muscles: ['Quadriceps', 'Glutes'] },
  'ex-dip': { name: 'Tricep Dip', img: 'Dips_-_Triceps_Version/0.jpg', muscles: ['Triceps', 'Shoulders'] },
  'ex-bridge': { name: 'Glute Bridge', img: 'Butt_Lift_Bridge/0.jpg', muscles: ['Glutes', 'Hamstrings'] },
  'ex-plank': { name: 'Plank', img: 'Plank/0.jpg', muscles: ['Abs', 'Back', 'Shoulders'], timed: true },
  'ex-sideplank': { name: 'Side Plank', img: 'Side_Bridge/0.jpg', muscles: ['Obliques', 'Abs'], timed: true },
  'ex-twist': { name: 'Russian Twist', img: 'Russian_Twist/0.jpg', muscles: ['Abs', 'Obliques'] },
  'ex-crunch': { name: 'Crunch', img: 'Crunches/0.jpg', muscles: ['Abs'] },
  'ex-legraise': { name: 'Hanging Leg Raise', img: 'Hanging_Leg_Raise/0.jpg', muscles: ['Abs', 'Hip Flexors'] },
  'ex-climber': { name: 'Mountain Climber', img: 'Mountain_Climbers/0.jpg', muscles: ['Abs', 'Shoulders', 'Legs'], timed: true },
  'ex-run': { name: 'Running', img: 'Running_Treadmill/0.jpg', muscles: ['Legs', 'Cardio'], timed: true },
  'ex-walk': { name: 'Walking', img: 'Walking_Treadmill/0.jpg', muscles: ['Legs', 'Cardio'], timed: true },
  'ex-boxjump': { name: 'Box Jump', img: 'Box_Jump_Multiple_Response/0.jpg', muscles: ['Quadriceps', 'Glutes', 'Calves'] },
  'ex-swing': { name: 'Kettlebell Swing', img: 'One-Arm_Kettlebell_Swings/0.jpg', muscles: ['Glutes', 'Hamstrings', 'Back'], timed: true },
};

function exercisesFor(routines: Routine[], workouts: Workout[] = []): Exercise[] {
  const ids = new Set<string>();
  for (const w of workouts) w.exercises.forEach(e => ids.add(e.exerciseId));
  for (const r of routines) {
    for (const d of r.dailySchedule) d.exercises.forEach(e => ids.add(e.exerciseId));
    for (const c of r.changes ?? []) {
      for (const op of c.patch.dailySchedule ?? []) if (op.op === 'setDay') op.exercises.forEach(e => ids.add(e.exerciseId));
    }
  }
  return [...ids].map(id => {
    const spec = EXERCISE_SPECS[id];
    return {
      id,
      name: spec.name,
      description: '',
      targetMuscles: spec.muscles,
      howToUrl: '',
      coverImageUrl: IMG + spec.img,
      iconImageUrl: IMG + spec.img,
      ...(spec.timed ? { timed: true } : {}),
    };
  });
}

// ---------------------------------------------------------------------------------------
// Routines

const reps = (exerciseId: string, sets: number, count: number): ScheduledExercise => ({ exerciseId, sets, reps: count });
const timed = (exerciseId: string, sets: number, seconds: number): ScheduledExercise => ({ exerciseId, sets, duration: seconds });

const DAY_PLANS: Record<string, { kind: string; exercises: ScheduledExercise[] }> = {
  upper: { kind: 'Upper Body', exercises: [reps('ex-bench', 3, 8), reps('ex-row', 3, 10), reps('ex-press', 3, 8), reps('ex-curl', 2, 12)] },
  lower: { kind: 'Lower Body', exercises: [reps('ex-squat', 3, 8), reps('ex-deadlift', 3, 5), reps('ex-lunge', 2, 10), reps('ex-calf', 3, 15)] },
  full: { kind: 'Full Body', exercises: [reps('ex-pushup', 3, 15), reps('ex-pullup', 3, 8), reps('ex-bwsquat', 3, 20), timed('ex-plank', 3, 45)] },
  bodyweight: { kind: 'Bodyweight', exercises: [reps('ex-pushup', 3, 15), reps('ex-dip', 3, 12), reps('ex-bwsquat', 3, 20), reps('ex-bridge', 3, 15)] },
  core: { kind: 'Core & Abs', exercises: [timed('ex-plank', 3, 45), reps('ex-twist', 3, 20), reps('ex-crunch', 3, 20), timed('ex-sideplank', 2, 30)] },
  cardio: { kind: 'Cardio', exercises: [timed('ex-run', 1, 1200), timed('ex-climber', 3, 30), reps('ex-boxjump', 3, 10)] },
  conditioning: { kind: 'Conditioning', exercises: [timed('ex-swing', 4, 30), timed('ex-climber', 3, 30), reps('ex-legraise', 3, 12)] },
  recovery: { kind: 'Active Recovery', exercises: [timed('ex-walk', 1, 1800), timed('ex-sideplank', 2, 30), reps('ex-bridge', 2, 15)] },
};

function schedule(plan: Partial<Record<DayOfWeek, keyof typeof DAY_PLANS>>): RoutineDay[] {
  return DAYS_OF_WEEK.filter(d => plan[d]).map(day => {
    const p = DAY_PLANS[plan[day]!];
    return { day, kind: p.kind, exercises: p.exercises.map(e => ({ ...e })) };
  });
}

const daysOf = (s: RoutineDay[]): DayOfWeek[] => DAYS_OF_WEEK.filter(d => s.some(x => x.day === d));

function routine(
  id: string,
  name: string,
  description: string,
  dailySchedule: RoutineDay[],
  createdAt: number,
  periods: SchedulePeriod[],
  extra: Partial<Routine> = {},
): Routine {
  const open = periods.length > 0 && periods[periods.length - 1].end === undefined;
  return { id, name, description, active: open, createdAt, dailySchedule, chatHistory: [], schedulePeriods: periods, ...extra };
}

// ---------------------------------------------------------------------------------------
// Workouts

/** Small deterministic noise, so the data looks lived-in but every load is the same. */
const jitter = (seed: number, range: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * range);
};

interface WorkoutOptions {
  /** Unfinished: the first `doneExercises` are complete and the rest untouched. */
  inProgress?: { doneExercises: number };
  /** Skip the last exercise (counts as done, but not performed). */
  skipLast?: boolean;
  /** Override the weekday, for a workout logged on a routine's rest day (a "bonus" workout). */
  bonus?: { kind: string; exercises: ScheduledExercise[] };
  nickname?: string;
}

function workout(r: Routine, date: Date, seq: number, opts: WorkoutOptions = {}): Workout {
  const day = DAYS_OF_WEEK[date.getDay()];
  const plan = opts.bonus ?? r.dailySchedule.find(d => d.day === day);
  if (!plan) throw new Error(`${r.name} has nothing on ${day}`);
  // Mornings or evenings, a few minutes either way.
  const startedAt = startOfDay(date).getTime() + ((seq % 3 === 0 ? 7 : 18) * 60 + jitter(seq, 40)) * 60_000;
  let t = startedAt;
  const exercises: WorkoutExercise[] = plan.exercises.map((ex, i) => {
    const spec = EXERCISE_SPECS[ex.exerciseId];
    const base: WorkoutExercise = { ...ex };
    if (spec.weight) base.weight = spec.weight + 5 * Math.floor(seq / 6);
    const pending = opts.inProgress && i >= opts.inProgress.doneExercises;
    if (pending) return base;
    if (opts.skipLast && i === plan.exercises.length - 1) {
      return { ...base, skipped: true, startedAt: t, completedAt: t, completedSets: 0 };
    }
    const exStart = t;
    const setLog = Array.from({ length: ex.sets }, (_, s) => {
      const len = (ex.duration ?? 40 + (ex.reps ?? 10) * 2) * 1000;
      const start = t;
      t += len;
      const rec = { startedAt: start, endedAt: t };
      t += (60 + jitter(seq * 10 + i * 3 + s, 45)) * 1000; // rest
      return rec;
    });
    return {
      ...base,
      startedAt: exStart,
      completedAt: setLog[setLog.length - 1].endedAt,
      completedSets: ex.sets,
      ...(ex.duration ? { completedDuration: ex.sets * ex.duration } : {}),
      setLog,
    };
  });
  return {
    id: `w-${r.id}-${seq}`,
    nickname: opts.nickname ?? `${plan.kind} #${seq + 1}`,
    routineId: r.id,
    day,
    startedAt,
    ...(opts.inProgress ? {} : { completedAt: t }),
    exercises,
  };
}

interface LogOptions {
  from: number;
  to: number; // exclusive: the day `to` falls on and later are left alone
  /** Days back from `now` (0 = today) that were scheduled but not done. */
  missedDaysAgo?: number[];
  /** Days back from `now` with a skipped last exercise. */
  partialDaysAgo?: number[];
}

/** One completed workout for every scheduled day of `r` from the day of `from` up to (not incl.) the day of `to`. */
function logWorkouts(r: Routine, now: number, opts: LogOptions, seqStart = 0): Workout[] {
  const out: Workout[] = [];
  const today = startOfDay(now).getTime();
  const missed = new Set(opts.missedDaysAgo ?? []);
  const partial = new Set(opts.partialDaysAgo ?? []);
  let seq = seqStart;
  const last = startOfDay(opts.to).getTime();
  for (let d = startOfDay(opts.from); d.getTime() < last; d = addDays(d, 1)) {
    const t = d.getTime();
    // Judged by the schedule in force at the end of the day, like the app does.
    const eod = t + DAY_MS - 1;
    const period = (r.schedulePeriods ?? []).find(p => p.start <= eod && (p.end === undefined || p.end > eod));
    const day = DAYS_OF_WEEK[d.getDay()];
    if (!period?.days.includes(day) || !r.dailySchedule.some(x => x.day === day)) continue;
    const ago = Math.round((today - t) / DAY_MS);
    if (missed.has(ago)) continue;
    out.push(workout(r, d, seq++, { skipLast: partial.has(ago) }));
  }
  return out;
}

const daysAgo = (now: number, n: number, hour = 9) => startOfDay(now).getTime() - n * DAY_MS + hour * 3600_000;
const dateAgo = (now: number, n: number) => addDays(startOfDay(now), -n);

/** A bonus workout on a day the routine has off, `n` days ago (skipped if that day is scheduled). */
function bonusWorkout(r: Routine, now: number, n: number, seq: number, plan: keyof typeof DAY_PLANS): Workout[] {
  const date = dateAgo(now, n);
  if (r.dailySchedule.some(d => d.day === DAYS_OF_WEEK[date.getDay()])) return [];
  return [workout(r, date, seq, { bonus: DAY_PLANS[plan], nickname: `Bonus ${DAY_PLANS[plan].kind}` })];
}

const STRENGTH_DESC = 'Three days a week: upper body, lower body and a full-body finisher.';
const strengthSchedule = () => schedule({ Monday: 'upper', Wednesday: 'lower', Friday: 'full' });

// ---------------------------------------------------------------------------------------
// AI chat and plan history

function aiHistory(now: number, createdAt: number): Pick<Routine, 'chatHistory' | 'changes' | 'revisions'> {
  const at = (n: number, h = 20) => daysAgo(now, n, h);
  const msg = (id: string, role: 'user' | 'ai', message: string, date: number, extra: Partial<RoutineChatMessage> = {}): RoutineChatMessage =>
    ({ id, role, message, date, ...extra });

  const fridayBefore = { day: 'Friday' as DayOfWeek, kind: DAY_PLANS.full.kind, exercises: DAY_PLANS.full.exercises };
  const changes: RoutineChange[] = [
    {
      id: 'chg-1',
      status: 'accepted',
      createdAt: at(40),
      patch: { dailySchedule: [{ op: 'setDay', day: 'Friday', kind: 'Full Body', exercises: [...DAY_PLANS.full.exercises, timed('ex-climber', 3, 30)] }] },
      decisions: { Friday: { status: 'accepted', date: at(40), previousDay: fridayBefore } },
    },
    {
      id: 'chg-2',
      status: 'partial',
      createdAt: at(25),
      patch: {
        dailySchedule: [
          { op: 'setDay', day: 'Tuesday', kind: 'Core & Abs', exercises: DAY_PLANS.core.exercises },
          { op: 'setDay', day: 'Saturday', kind: 'Cardio', exercises: DAY_PLANS.cardio.exercises },
        ],
        description: 'Strength three days a week, plus a core day on Tuesday.',
      },
      decisions: {
        Tuesday: { status: 'accepted', date: at(25), previousDay: null },
        Saturday: { status: 'rejected', date: at(25) },
        description: { status: 'accepted', date: at(25), previousDescription: STRENGTH_DESC },
      },
    },
    {
      id: 'chg-3',
      status: 'rejected',
      createdAt: at(12),
      patch: { dailySchedule: [{ op: 'clearDay', day: 'Wednesday' }] },
      decisions: { Wednesday: { status: 'rejected', date: at(12) } },
    },
    {
      id: 'chg-4',
      status: 'rejected',
      createdAt: at(3),
      patch: { dailySchedule: [{ op: 'setDay', day: 'Monday', kind: 'Upper Body', exercises: [reps('ex-bench', 4, 6), reps('ex-row', 4, 8)] }] },
      decisions: { Monday: { status: 'rejected', date: at(1), superseded: true } },
    },
    {
      id: 'chg-5',
      status: 'pending',
      createdAt: at(1),
      patch: {
        dailySchedule: [
          { op: 'setDay', day: 'Monday', kind: 'Upper Body', exercises: [reps('ex-bench', 4, 6), reps('ex-row', 4, 8), reps('ex-press', 3, 8), reps('ex-dip', 3, 12)] },
          { op: 'setDay', day: 'Saturday', kind: 'Active Recovery', exercises: DAY_PLANS.recovery.exercises },
        ],
      },
    },
  ];

  const chatHistory: RoutineChatMessage[] = [
    msg('m-1', 'user', 'I want to get stronger. I can lift three days a week, about an hour each.', createdAt - 600_000),
    msg('m-2', 'ai', 'Great, here is a three-day plan: upper body Monday, lower body Wednesday and a full-body day Friday.', createdAt - 540_000),
    msg('m-3', 'user', 'Friday feels a bit easy. Can you add some cardio to it?', at(40, 19)),
    msg('m-4', 'ai', 'I added mountain climbers to the end of Friday.', at(40, 19) + 30_000, { pendingChangeId: 'chg-1' }),
    msg('m-5', 'user', 'I have time on Tuesdays and Saturdays too. What should I do then?', at(25, 19)),
    msg('m-6', 'ai', 'A core day on Tuesday and some cardio on Saturday would round things out.', at(25, 19) + 30_000, { pendingChangeId: 'chg-2' }),
    msg('m-7', 'user', 'Should I just drop leg day? My knees are sore.', at(12, 19)),
    msg('m-8', 'ai', 'You could make Wednesday a rest day for now.', at(12, 19) + 30_000, { pendingChangeId: 'chg-3' }),
    msg('m-9', 'user', 'Make Monday heavier.', at(3, 19)),
    msg('m-10', 'ai', 'Monday is now heavier: four sets of bench and rows.', at(3, 19) + 30_000, { pendingChangeId: 'chg-4' }),
    msg('m-11', 'user', 'Actually keep the press on Monday, and give me something light for Saturday.', at(1, 19)),
    msg('m-12', 'ai', 'Here is a heavier Monday that keeps the press, plus an easy recovery Saturday.', at(1, 19) + 30_000, { pendingChangeId: 'chg-5' }),
  ];

  const revisions: RoutineRevision[] = [
    { id: 'rev-1', date: at(40), source: 'ai', summary: 'Friday: added Mountain Climber', changeId: 'chg-1' },
    { id: 'rev-2', date: at(32), source: 'manual', summary: 'Lower Body: Squat 3 × 10 → 3 × 8' },
    { id: 'rev-3', date: at(25), source: 'ai', summary: 'Tuesday: added Core & Abs; updated description', changeId: 'chg-2' },
  ];

  return { chatHistory, changes, revisions };
}

// ---------------------------------------------------------------------------------------
// The presets

function weeksAgo(now: number, n: number) {
  return daysAgo(now, n * 7, 8);
}

const presets: TestPreset[] = [
  {
    id: 'empty',
    name: 'New user (no data)',
    description: 'Nothing at all: the first-run experience.',
    build: () => ({ exercises: [], routines: [], workouts: [] }),
  },
  {
    id: 'just-started',
    name: 'Just started',
    description: 'One routine created today, no workouts yet.',
    build: (now = Date.now()) => {
      const s = strengthSchedule();
      const created = now - 60_000;
      const r = routine('r-strength', 'Starter Strength', STRENGTH_DESC, s, created, [{ start: created, days: daysOf(s) }]);
      return { exercises: exercisesFor([r]), routines: [r], workouts: [] };
    },
  },
  {
    id: 'long-streak',
    name: 'Long streak',
    description: 'Six months on one routine without missing a day, with a few bonus weekend workouts. Today is not done yet.',
    build: (now = Date.now()) => {
      const s = strengthSchedule();
      const created = weeksAgo(now, 26);
      const r = routine('r-strength', 'Iron Habit', STRENGTH_DESC, s, created, [{ start: created, days: daysOf(s) }]);
      const workouts = logWorkouts(r, now, { from: created, to: startOfDay(now).getTime() });
      [6, 20, 34, 55, 90].forEach((n, i) => workouts.push(...bonusWorkout(r, now, n, 900 + i, 'cardio')));
      return { exercises: exercisesFor([r], workouts), routines: [r], workouts };
    },
  },
  {
    id: 'broken-streak',
    name: 'Broken streak',
    description: 'A long best streak that broke five weeks ago, a couple more misses since, and a short current streak. Some workouts skipped an exercise.',
    build: (now = Date.now()) => {
      const s = strengthSchedule();
      const created = weeksAgo(now, 16);
      const r = routine('r-strength', 'Comeback Plan', STRENGTH_DESC, s, created, [{ start: created, days: daysOf(s) }]);
      // Which offsets are scheduled depends on today's weekday, so pick misses from the real dates.
      const scheduledAgo = (min: number, max: number) => {
        const out: number[] = [];
        for (let n = min; n <= max; n++) if (daysOf(s).includes(DAYS_OF_WEEK[dateAgo(now, n).getDay()])) out.push(n);
        return out;
      };
      const fiveWeeks = scheduledAgo(33, 40).slice(0, 2);
      const twoWeeks = scheduledAgo(14, 20).slice(0, 1);
      const recent = scheduledAgo(8, 13).slice(0, 1);
      const partial = scheduledAgo(1, 60).filter((_, i) => i % 5 === 2);
      const workouts = logWorkouts(r, now, {
        from: created,
        to: startOfDay(now).getTime(),
        missedDaysAgo: [...fiveWeeks, ...twoWeeks, ...recent],
        partialDaysAgo: partial,
      });
      return { exercises: exercisesFor([r], workouts), routines: [r], workouts };
    },
  },
  {
    id: 'lapsed',
    name: 'Lapsed user',
    description: 'Ten weeks of solid training that stopped three weeks ago. The streak has expired.',
    build: (now = Date.now()) => {
      const s = strengthSchedule();
      const created = weeksAgo(now, 13);
      const r = routine('r-strength', 'Summer Shape-up', STRENGTH_DESC, s, created, [{ start: created, days: daysOf(s) }]);
      const workouts = logWorkouts(r, now, { from: created, to: daysAgo(now, 21, 0) });
      return { exercises: exercisesFor([r], workouts), routines: [r], workouts };
    },
  },
  {
    id: 'multiple-active',
    name: 'Two active routines',
    description: 'Strength on Mon/Wed/Fri and cardio + core on Tue/Thu, both active for eight weeks, a few misses and some Saturday bonus workouts.',
    build: (now = Date.now()) => {
      const s1 = strengthSchedule();
      const s2 = schedule({ Tuesday: 'cardio', Thursday: 'core' });
      const c1 = weeksAgo(now, 8);
      const c2 = weeksAgo(now, 7) + 3600_000;
      const r1 = routine('r-strength', 'Strength Days', STRENGTH_DESC, s1, c1, [{ start: c1, days: daysOf(s1) }]);
      const r2 = routine('r-cardio', 'Cardio & Core', 'Tuesday runs and a Thursday core session.', s2, c2, [{ start: c2, days: daysOf(s2) }]);
      const today = startOfDay(now).getTime();
      const workouts = [
        ...logWorkouts(r1, now, { from: c1, to: today, missedDaysAgo: [16, 17, 18, 19, 20, 21] }),
        ...logWorkouts(r2, now, { from: c2, to: today, missedDaysAgo: [30, 31, 32, 33, 34, 35, 36], partialDaysAgo: [9, 10, 11, 12, 13, 14, 15] }, 500),
      ];
      [1, 2, 3, 4, 5, 6, 7].forEach(n => {
        if (dateAgo(now, n).getDay() === 6) workouts.push(...bonusWorkout(r1, now, n, 950, 'conditioning'));
      });
      [15, 16, 17, 18, 19, 20, 21].forEach(n => {
        if (dateAgo(now, n).getDay() === 6) workouts.push(...bonusWorkout(r2, now, n, 951, 'recovery'));
      });
      return { exercises: exercisesFor([r1, r2], workouts), routines: [r1, r2], workouts };
    },
  },
  {
    id: 'routine-switches',
    name: 'Routine switches',
    description: 'Started on a bodyweight routine, changed its days, then switched to a strength routine six weeks ago. One more routine was made but never used.',
    build: (now = Date.now()) => {
      const bwOld = schedule({ Monday: 'bodyweight', Wednesday: 'bodyweight', Friday: 'bodyweight' });
      const bwNew = schedule({ Monday: 'bodyweight', Tuesday: 'core', Thursday: 'bodyweight', Saturday: 'cardio' });
      const created = weeksAgo(now, 20);
      const edited = weeksAgo(now, 12);
      const switched = weeksAgo(now, 6);
      // The stored schedule is the last one it had; the log remembers the earlier days.
      const bw = routine('r-bodyweight', 'Living Room Circuit', 'No equipment, anywhere.', bwNew, created, [
        { start: created, end: edited, days: daysOf(bwOld) },
        { start: edited, end: switched, days: daysOf(bwNew) },
      ]);
      const s = strengthSchedule();
      const st = routine('r-strength', 'Gym Strength', STRENGTH_DESC, s, switched - 3600_000, [{ start: switched, days: daysOf(s) }]);
      const unused = routine('r-unused', 'Marathon Prep (draft)', 'Never activated.', schedule({ Tuesday: 'cardio', Thursday: 'cardio', Sunday: 'cardio' }), weeksAgo(now, 3), []);
      // Workouts under the first schedule used its old days, which the stored schedule no
      // longer has, so log them against a copy that still does.
      const bwAsOld = { ...bw, dailySchedule: [...bwOld, ...bwNew.filter(d => !bwOld.some(o => o.day === d.day))] };
      const workouts = [
        ...logWorkouts(bwAsOld, now, { from: created, to: edited }),
        ...logWorkouts(bw, now, { from: edited, to: switched, missedDaysAgo: [50, 51, 52] }, 300),
        ...logWorkouts(st, now, { from: switched, to: startOfDay(now).getTime() }, 600),
        ...bonusWorkout(st, now, 10, 990, 'cardio'),
      ];
      return { exercises: exercisesFor([bw, st, unused], workouts), routines: [bw, st, unused], workouts };
    },
  },
  {
    id: 'ai-history',
    name: 'AI plan history',
    description: 'A routine built with AI chat: accepted, partly accepted, rejected and superseded suggestions, a manual edit, and one suggestion waiting for review.',
    build: (now = Date.now()) => {
      const s = schedule({ Monday: 'upper', Tuesday: 'core', Wednesday: 'lower', Friday: 'full' });
      s.find(d => d.day === 'Friday')!.exercises.push(timed('ex-climber', 3, 30));
      const created = weeksAgo(now, 7);
      const coreAdded = daysAgo(now, 25, 20);
      const r = routine('r-ai', 'AI Strength Plan', 'Strength three days a week, plus a core day on Tuesday.', s, created, [
        { start: created, end: coreAdded, days: ['Monday', 'Wednesday', 'Friday'] },
        { start: coreAdded, days: daysOf(s) },
      ], aiHistory(now, created));
      const workouts = logWorkouts(r, now, { from: created, to: startOfDay(now).getTime(), missedDaysAgo: [12, 13, 14] });
      return { exercises: exercisesFor([r], workouts), routines: [r], workouts };
    },
  },
  {
    id: 'mid-workout',
    name: 'Workout in progress',
    description: "An every-day routine with today's workout started 45 minutes ago and two exercises done, plus three weeks of history.",
    build: (now = Date.now()) => {
      const s = schedule({
        Sunday: 'recovery', Monday: 'upper', Tuesday: 'cardio', Wednesday: 'lower',
        Thursday: 'core', Friday: 'full', Saturday: 'conditioning',
      });
      const created = weeksAgo(now, 3);
      const r = routine('r-daily', 'Every Day', 'Something every day of the week.', s, created, [{ start: created, days: daysOf(s) }]);
      const workouts = logWorkouts(r, now, { from: created, to: startOfDay(now).getTime(), missedDaysAgo: [4] });
      // Started 45 minutes ago, or at midnight if that's sooner (it has to be today's).
      const startAt = Math.max(now - 45 * 60_000, startOfDay(now).getTime());
      const today = workout(r, new Date(now), 800, { inProgress: { doneExercises: 2 } });
      // Move the session to start at startAt, squeezed so the done sets end a minute ago.
      const origStart = today.startedAt;
      const lastEnd = Math.max(...today.exercises.flatMap(ex => ex.setLog?.map(set => set.endedAt) ?? [origStart]));
      const scale = Math.min(1, (now - 60_000 - startAt) / Math.max(1, lastEnd - origStart));
      const move = (t: number) => Math.round(startAt + (t - origStart) * scale);
      today.startedAt = startAt;
      today.exercises.forEach(ex => {
        if (ex.startedAt) ex.startedAt = move(ex.startedAt);
        if (ex.completedAt) ex.completedAt = move(ex.completedAt);
        ex.setLog?.forEach(set => { set.startedAt = move(set.startedAt); set.endedAt = move(set.endedAt); });
      });
      workouts.push(today);
      return { exercises: exercisesFor([r], workouts), routines: [r], workouts };
    },
  },
];

export const TEST_PRESETS: readonly TestPreset[] = presets;

export function getTestPreset(id: string): TestPreset | undefined {
  return presets.find(p => p.id === id);
}
