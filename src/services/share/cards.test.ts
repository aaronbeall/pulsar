import { describe, it, expect } from 'vitest';
import type { DayOfWeek, Routine, Workout } from '../../models/types';
import {
  buildMonthCard, buildStreakCard, buildTotalCard, buildWeekCard, buildWorkoutCard, formatCardDuration,
  getOfferedCards, getShareFileName, getShareText, getStreakNudge, isStreakMilestone, SAMPLE_CARDS,
} from './cards';

const d = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);
const now = d(7, 29); // Wednesday

const routine: Routine = {
  id: 'r1', name: 'Strength', description: '', active: true, createdAt: d(7, 1).getTime(), chatHistory: [],
  dailySchedule: (['Monday', 'Wednesday', 'Friday'] as DayOfWeek[]).map(day => ({ day, kind: 'Full Body', exercises: [] })),
};
const ex = (completed: boolean, skipped = false) => ({
  exerciseId: 'e', sets: 3, reps: 10, completedAt: completed ? 1 : undefined, skipped,
}) as Workout['exercises'][number];
const done = (day: DayOfWeek, at: Date, minutes = 45, exercises = [ex(true), ex(true)]): Workout => ({
  id: `${day}-${at.getTime()}`, nickname: 'Iron Dawn', routineId: 'r1', day, startedAt: at.getTime(),
  completedAt: at.getTime() + minutes * 60_000, exercises,
});

const workouts = [
  done('Friday', d(6, 26)),
  done('Monday', d(7, 20)),
  done('Wednesday', d(7, 22)),
  done('Friday', d(7, 24), 30, [ex(true), ex(true, true)]),
  done('Monday', d(7, 27)),
];

describe('card models', () => {
  it('builds a workout card', () => {
    const card = buildWorkoutCard(workouts[3], workouts, [routine], now);
    expect(card).toMatchObject({ title: '“Iron Dawn”', dayKind: 'Full Body', durationMs: 30 * 60_000, exercisesDone: 1, perfect: false, streak: 4 });
    expect(buildWorkoutCard(workouts[4], workouts, [routine], now).perfect).toBe(true);
  });

  it('builds a streak card', () => {
    const card = buildStreakCard(workouts, [routine], now);
    expect(card).toMatchObject({ streak: 4, best: 4, isBest: true, milestone: false, totalDone: 5 });
    expect(card.week).toEqual(['rest', 'done', 'rest', 'today', 'rest', 'planned', 'rest']);
  });

  it("builds this week's card with its time", () => {
    expect(buildWeekCard(workouts, [routine], now)).toMatchObject({ done: 1, planned: 3, timeMs: 45 * 60_000 });
  });

  it("builds this month's calendar", () => {
    const card = buildMonthCard(workouts, [routine], now);
    expect(card.monthName).toBe('July');
    expect(card.firstWeekday).toBe(3); // July 1 2026 is a Wednesday
    expect(card.days).toHaveLength(31);
    expect(card.days.filter(x => x.done).map(x => x.day)).toEqual([20, 22, 24, 27]);
    expect(card.days[29]).toMatchObject({ day: 30, future: true });
    expect(card.done).toBe(4);
    expect(card.timeMs).toBe((45 * 3 + 30) * 60_000);
  });

  it('builds the all time card', () => {
    expect(buildTotalCard(workouts, [routine])).toMatchObject({ done: 5, best: 4, perfect: 4, since: 'Jun 2026' });
  });
});

describe('getOfferedCards', () => {
  it('offers the workout first after a workout', () => {
    expect(getOfferedCards({ workoutId: workouts[4].id }, workouts, [routine], now)).toEqual(['workout', 'streak', 'week']);
  });

  it('offers activity cards, leaving out empty ones', () => {
    expect(getOfferedCards({}, workouts, [routine], now)).toEqual(['streak', 'week', 'month', 'total']);
    // Months later with no streak and nothing this month or week: only all time is left.
    expect(getOfferedCards({}, workouts, [routine], d(10, 14))).toEqual(['total']);
    expect(getOfferedCards({}, [], [routine], now)).toEqual([]);
  });
});

describe('streak nudges', () => {
  it('knows the milestones', () => {
    expect([6, 7, 30, 100, 365, 400, 500, 450].map(isStreakMilestone)).toEqual([false, true, true, true, true, true, true, false]);
  });

  it('nudges on a milestone or the day the best is passed', () => {
    expect(getStreakNudge(7, 10)).toBe('milestone');
    expect(getStreakNudge(11, 10)).toBe('best');
    expect(getStreakNudge(12, 10)).toBeNull(); // already passed yesterday
    expect(getStreakNudge(3, 2)).toBeNull(); // a best of 2 isn't worth beating
    expect(getStreakNudge(0, 0)).toBeNull();
  });
});

describe('share text', () => {
  it('words each card and ends with the link', () => {
    expect(getShareText(SAMPLE_CARDS.workout)).toBe('Finished “Iron Dawn” on Pulsar, day 12 of my streak 🔥 https://pulsarworkouts.app');
    expect(getShareText({ ...SAMPLE_CARDS.workout, kind: 'workout', streak: 1 } as typeof SAMPLE_CARDS.workout)).toBe('Finished “Iron Dawn” on Pulsar 💪 https://pulsarworkouts.app');
    expect(getShareText(SAMPLE_CARDS.streak)).toBe('New best: a 30 day streak on Pulsar 🔥 https://pulsarworkouts.app');
    expect(getShareText({ ...SAMPLE_CARDS.streak, isBest: false } as typeof SAMPLE_CARDS.streak)).toBe('Day 30 of my streak on Pulsar 🔥 https://pulsarworkouts.app');
    expect(getShareText(SAMPLE_CARDS.week)).toBe('4 of 5 workouts done this week on Pulsar 💪 https://pulsarworkouts.app');
    expect(getShareText({ ...SAMPLE_CARDS.month, done: 1 } as typeof SAMPLE_CARDS.month)).toBe('1 workout in November on Pulsar 💪 https://pulsarworkouts.app');
    expect(getShareText(SAMPLE_CARDS.total)).toBe('48 workouts and counting on Pulsar 💪 https://pulsarworkouts.app');
  });

  it('names the file', () => {
    expect(getShareFileName(SAMPLE_CARDS.streak)).toBe('pulsar-streak-30.png');
    expect(getShareFileName(SAMPLE_CARDS.week)).toBe('pulsar-week.png');
  });

  it('formats card durations', () => {
    expect(formatCardDuration(42 * 60_000)).toBe('42m');
    expect(formatCardDuration(65 * 60_000)).toBe('1h 05m');
  });
});

describe('share param', () => {
  it('round-trips', async () => {
    const { shareParam, parseShareParam } = await import('./cards');
    expect(shareParam('workout', 'w1')).toBe('workout:w1');
    expect(parseShareParam('workout:w1')).toEqual({ kind: 'workout', workoutId: 'w1', gallery: false });
    expect(parseShareParam('streak')).toEqual({ kind: 'streak', workoutId: undefined, gallery: false });
    expect(parseShareParam('nope')).toEqual({ kind: undefined, workoutId: undefined, gallery: false });
    expect(parseShareParam('dev').gallery).toBe(true);
  });
});
