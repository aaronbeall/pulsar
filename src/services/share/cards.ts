// What a share card shows: pure functions from workouts and routines to the numbers and words
// on a card, plus the line of text shared with it. The canvas drawing lives in render.ts; the
// sheet in components/ShareSheet.tsx. Nothing here touches the DOM, so it's unit-tested.
import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { Routine, Workout } from '../../models/types';
import { getActivitySummary } from '../../utils/activitySummary';
import { DayLabel } from '../../utils/dayDetail';
import { getHistorySummaryStats, getWorkoutKind, isPerfectWorkout } from '../../utils/historyStats';
import { formatSessionName } from '../../utils/sessionName';
import { getDayStatuses, getStreakInfo } from '../../utils/workoutUtils';

export type ShareCardKind = 'workout' | 'streak' | 'week' | 'month' | 'total';
export type ShareSize = 'story' | 'square';

export const SHARE_SIZES: Record<ShareSize, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: 'Story' },
  square: { width: 1080, height: 1080, label: 'Square' },
};

export const CARD_LABELS: Record<ShareCardKind, string> = {
  workout: 'Workout',
  streak: 'Streak',
  week: 'This week',
  month: 'This month',
  total: 'All time',
};

export const SHARE_URL = 'https://pulsarworkouts.app';

/** Streak lengths worth a "share it?" nudge, then every 100 days after the last. */
const MILESTONES = [7, 30, 100, 365];

export function isStreakMilestone(streak: number): boolean {
  if (MILESTONES.includes(streak)) return true;
  return streak > 365 && streak % 100 === 0;
}

export interface WorkoutCard {
  kind: 'workout';
  /** The session's code name in curly quotes, e.g. “Iron Dawn”. */
  title: string;
  /** The day's kind from the routine, e.g. "Upper Body". */
  dayKind?: string;
  durationMs: number;
  exercisesDone: number;
  perfect: boolean;
  streak: number;
}

export interface StreakCard {
  kind: 'streak';
  streak: number;
  best: number;
  /** The current run is the longest ever (and long enough to brag about). */
  isBest: boolean;
  milestone: boolean;
  week: DayLabel[];
  totalDone: number;
  totalTimeMs: number;
}

export interface WeekCard {
  kind: 'week';
  done: number;
  planned: number;
  week: DayLabel[];
  timeMs: number;
}

export interface MonthDay {
  day: number;
  done: boolean;
  future: boolean;
}

export interface MonthCard {
  kind: 'month';
  /** e.g. "November". */
  monthName: string;
  done: number;
  days: MonthDay[];
  /** Weekday of the 1st, 0 = Sunday, for laying the days out in a calendar grid. */
  firstWeekday: number;
  timeMs: number;
  best: number;
}

export interface TotalCard {
  kind: 'total';
  done: number;
  timeMs: number;
  best: number;
  perfect: number;
  /** e.g. "Mar 2026", the month of the first finished workout. */
  since?: string;
}

export type ShareCard = WorkoutCard | StreakCard | WeekCard | MonthCard | TotalCard;

/** Where the sheet was opened from decides which cards it offers. */
export type ShareContext = { workoutId?: string };

const KINDS: ShareCardKind[] = ['workout', 'streak', 'week', 'month', 'total'];
export const ALL_CARD_KINDS: readonly ShareCardKind[] = KINDS;

/** The share sheet's URL value: the card to start on, and the workout it's about, if any. */
export function shareParam(kind: ShareCardKind, workoutId?: string): string {
  return workoutId ? `${kind}:${workoutId}` : kind;
}

export function parseShareParam(value: string): { kind?: ShareCardKind; workoutId?: string; gallery: boolean } {
  if (value === 'dev') return { gallery: true };
  const i = value.indexOf(':');
  const head = i < 0 ? value : value.slice(0, i);
  const workoutId = i < 0 ? undefined : value.slice(i + 1) || undefined;
  const kind = KINDS.find(k => k === head);
  return { kind, workoutId, gallery: false };
}

export function buildWorkoutCard(workout: Workout, workouts: Workout[], routines: Routine[], now = new Date()): WorkoutCard {
  const info = getStreakInfo(workouts, routines, now);
  const streak = info.status !== 'expired' ? info.streak : 0;
  return {
    kind: 'workout',
    title: formatSessionName(workout.nickname) || 'Workout',
    dayKind: getWorkoutKind(workout, routines),
    durationMs: workout.completedAt ? Math.max(0, workout.completedAt - workout.startedAt) : 0,
    exercisesDone: workout.exercises.filter(ex => ex.completedAt && !ex.skipped).length,
    perfect: isPerfectWorkout(workout),
    streak,
  };
}

export function buildStreakCard(workouts: Workout[], routines: Routine[], now = new Date()): StreakCard {
  const summary = getActivitySummary(workouts, routines, now);
  const streak = summary.status !== 'expired' ? summary.streak : 0;
  return {
    kind: 'streak',
    streak,
    best: summary.best,
    isBest: streak >= 3 && streak >= summary.best,
    milestone: isStreakMilestone(streak),
    week: summary.week.map(d => d.label),
    totalDone: summary.totalDone,
    totalTimeMs: summary.totalTimeMs,
  };
}

export function buildWeekCard(workouts: Workout[], routines: Routine[], now = new Date()): WeekCard {
  const summary = getActivitySummary(workouts, routines, now);
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }).getTime();
  const weekEnd = addDays(new Date(weekStart), 7).getTime();
  return {
    kind: 'week',
    done: summary.weekDone,
    planned: summary.weekPlanned,
    week: summary.week.map(d => d.label),
    timeMs: completedTimeBetween(workouts, weekStart, weekEnd),
  };
}

export function buildMonthCard(workouts: Workout[], routines: Routine[], now = new Date()): MonthCard {
  const start = startOfMonth(now);
  const statuses = Object.values(getDayStatuses(start, endOfMonth(now), workouts, routines, now));
  const days = statuses.map(s => ({ day: s.date.getDate(), done: s.completed, future: s.future }));
  return {
    kind: 'month',
    monthName: format(now, 'MMMM'),
    done: days.filter(d => d.done).length,
    days,
    firstWeekday: start.getDay(),
    timeMs: completedTimeBetween(workouts, start.getTime(), addDays(endOfMonth(now), 1).getTime()),
    best: getStreakInfo(workouts, routines, now).best,
  };
}

export function buildTotalCard(workouts: Workout[], routines: Routine[]): TotalCard {
  const stats = getHistorySummaryStats(workouts, routines);
  const first = workouts.filter(w => w.completedAt).reduce<number | undefined>(
    (min, w) => (min === undefined || w.startedAt < min ? w.startedAt : min), undefined);
  return {
    kind: 'total',
    done: stats.totalCompleted,
    timeMs: stats.totalWorkoutTimeMs,
    best: stats.bestStreak,
    perfect: stats.perfectWorkouts,
    since: first !== undefined ? format(first, 'MMM yyyy') : undefined,
  };
}

function completedTimeBetween(workouts: Workout[], from: number, to: number): number {
  let ms = 0;
  for (const w of workouts) {
    if (w.completedAt && w.startedAt >= from && w.startedAt < to) ms += w.completedAt - w.startedAt;
  }
  return ms;
}

export function buildCard(kind: ShareCardKind, context: ShareContext, workouts: Workout[], routines: Routine[], now = new Date()): ShareCard | null {
  switch (kind) {
    case 'workout': {
      const workout = workouts.find(w => w.id === context.workoutId);
      return workout?.completedAt ? buildWorkoutCard(workout, workouts, routines, now) : null;
    }
    case 'streak': return buildStreakCard(workouts, routines, now);
    case 'week': return buildWeekCard(workouts, routines, now);
    case 'month': return buildMonthCard(workouts, routines, now);
    case 'total': return buildTotalCard(workouts, routines);
  }
}

/**
 * The cards worth offering, best first. From a finished workout: that workout, then the streak
 * and the week. From Activity: the streak, the week, the month and all time. A card with
 * nothing to show (no live streak, nothing this month) is left out.
 */
export function getOfferedCards(context: ShareContext, workouts: Workout[], routines: Routine[], now = new Date()): ShareCardKind[] {
  const summary = getActivitySummary(workouts, routines, now);
  const liveStreak = summary.status !== 'expired' && summary.streak > 0;
  const kinds: ShareCardKind[] = context.workoutId
    ? ['workout', 'streak', 'week']
    : ['streak', 'week', 'month', 'total'];
  return kinds.filter(kind => {
    if (kind === 'workout') return !!workouts.find(w => w.id === context.workoutId)?.completedAt;
    if (kind === 'streak') return liveStreak;
    if (kind === 'week') return summary.weekDone > 0;
    if (kind === 'month') return summary.monthDone > 0;
    return summary.totalDone > 0;
  });
}

/**
 * Whether the celebration should offer the streak card unprompted: on a milestone, or the day
 * the streak passes the previous best (when that best was worth beating). `previousBest` is the
 * best streak before this workout counted.
 */
export function getStreakNudge(streak: number, previousBest: number): 'milestone' | 'best' | null {
  if (streak <= 0) return null;
  if (isStreakMilestone(streak)) return 'milestone';
  if (previousBest >= 3 && streak === previousBest + 1) return 'best';
  return null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The line of text shared with the image. Always ends with the site link. */
export function getShareText(card: ShareCard): string {
  return `${getShareLine(card)} ${SHARE_URL}`;
}

function getShareLine(card: ShareCard): string {
  switch (card.kind) {
    case 'workout':
      return card.streak > 1
        ? `Finished ${card.title} on Pulsar, day ${card.streak} of my streak 🔥`
        : `Finished ${card.title} on Pulsar 💪`;
    case 'streak':
      if (card.isBest && card.streak > 1) return `New best: a ${card.streak} day streak on Pulsar 🔥`;
      return `Day ${card.streak} of my streak on Pulsar 🔥`;
    case 'week':
      return card.planned > 0
        ? `${card.done} of ${card.planned} workouts done this week on Pulsar 💪`
        : `${plural(card.done, 'workout')} this week on Pulsar 💪`;
    case 'month':
      return `${plural(card.done, 'workout')} in ${card.monthName} on Pulsar 💪`;
    case 'total':
      return `${plural(card.done, 'workout')} and counting on Pulsar 💪`;
  }
}

/** File name for the shared image, e.g. "pulsar-streak-30.png". */
export function getShareFileName(card: ShareCard): string {
  const n = card.kind === 'streak' ? `-${card.streak}` : '';
  return `pulsar-${card.kind}${n}.png`;
}

/** Short duration for cards: "42m", "1h 05m". */
export function formatCardDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Sample cards with made-up numbers, for the dev mode gallery and homepage screenshots. */
export const SAMPLE_CARDS: Record<ShareCardKind, ShareCard> = {
  workout: { kind: 'workout', title: '“Iron Dawn”', dayKind: 'Upper Body', durationMs: 42 * 60000, exercisesDone: 6, perfect: true, streak: 12 },
  streak: { kind: 'streak', streak: 30, best: 30, isBest: true, milestone: true, week: ['done', 'done', 'rest', 'done', 'today', 'planned', 'rest'], totalDone: 48, totalTimeMs: 31 * 3600000 },
  week: { kind: 'week', done: 4, planned: 5, week: ['rest', 'done', 'done', 'missed', 'done', 'done', 'planned'], timeMs: 185 * 60000 },
  month: {
    kind: 'month', monthName: 'November', done: 14, firstWeekday: 0, timeMs: 580 * 60000, best: 30,
    days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, done: [1, 2, 4, 5, 7, 8, 9, 11, 12, 15, 16, 18, 19, 22].includes(i + 1), future: i + 1 > 24 })),
  },
  total: { kind: 'total', done: 48, timeMs: 31 * 3600000, best: 30, perfect: 37, since: 'Mar 2026' },
};
