import { describe, it, expect } from 'vitest';
import {
  applyRoutineChange,
  decideChangeItems,
  diffExercises,
  getItemStatus,
  getPendingProposals,
  summarizeRoutineEdit,
  supersedePendingItems,
} from './routineChangeUtils';
import type { Routine, RoutineChange, RoutineDay } from '../models/types';

const day = (d: RoutineDay['day'], kind: string): RoutineDay => ({ day: d, kind, exercises: [{ exerciseId: kind, sets: 3, reps: 10 }] });
const change = (patch: RoutineChange['patch']): RoutineChange => ({ id: 'c1', status: 'pending', patch });

describe('applyRoutineChange', () => {
  const routine = { description: 'Old', dailySchedule: [day('Monday', 'Push'), day('Friday', 'Legs')] };

  it('replaces an existing day and keeps the rest', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'setDay', day: 'Monday', kind: 'Pull', exercises: [] }] }));
    expect(result.dailySchedule.map(d => d.kind)).toEqual(['Pull', 'Legs']);
  });

  it('adds a new day in weekday order', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'setDay', day: 'Wednesday', kind: 'Cardio', exercises: [] }] }));
    expect(result.dailySchedule.map(d => d.day)).toEqual(['Monday', 'Wednesday', 'Friday']);
  });

  it('clears a day to rest', () => {
    const result = applyRoutineChange(routine, change({ dailySchedule: [{ op: 'clearDay', day: 'Friday' }] }));
    expect(result.dailySchedule.map(d => d.day)).toEqual(['Monday']);
  });

  it('updates the description only when the change has one', () => {
    expect(applyRoutineChange(routine, change({ description: 'New' })).description).toBe('New');
    expect(applyRoutineChange(routine, change({})).description).toBe('Old');
  });

  it('does not mutate the input', () => {
    applyRoutineChange(routine, change({ dailySchedule: [{ op: 'clearDay', day: 'Monday' }] }));
    expect(routine.dailySchedule).toHaveLength(2);
  });
});

const ex = (exerciseId: string, sets = 3, reps = 10) => ({ exerciseId, sets, reps });

const makeRoutine = (changes: RoutineChange[]): Routine => ({
  id: 'r1',
  name: 'R',
  description: 'Old',
  active: true,
  createdAt: 0,
  dailySchedule: [day('Monday', 'Push'), day('Friday', 'Legs')],
  chatHistory: [],
  changes,
});

const threeItemChange = (): RoutineChange => change({
  dailySchedule: [
    { op: 'setDay', day: 'Monday', kind: 'Pull', exercises: [ex('row')] },
    { op: 'clearDay', day: 'Friday' },
  ],
  description: 'New',
});

describe('decideChangeItems', () => {
  it('applies only the accepted day and keeps the change pending', () => {
    const result = decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Monday'], 'accepted', 5);
    expect(result.dailySchedule.map(d => d.kind)).toEqual(['Pull', 'Legs']);
    expect(result.description).toBe('Old');
    const c = result.changes![0];
    expect(c.status).toBe('pending');
    expect(c.decisions?.Monday).toMatchObject({ status: 'accepted', date: 5, previousDay: day('Monday', 'Push') });
  });

  it('records a revision for accepted items but not for rejected ones', () => {
    const accepted = decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Friday', 'description'], 'accepted', 5);
    expect(accepted.revisions).toHaveLength(1);
    expect(accepted.revisions![0]).toMatchObject({ source: 'ai', changeId: 'c1', date: 5 });
    expect(accepted.revisions![0].summary).toBe('Friday made a rest day, updated the description');
    expect(accepted.changes![0].decisions?.description?.previousDescription).toBe('Old');

    const rejected = decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Monday'], 'rejected', 5);
    expect(rejected.revisions).toEqual([]);
    expect(rejected.dailySchedule).toEqual(makeRoutine([]).dailySchedule);
  });

  it('derives partial / accepted / rejected once every item is decided', () => {
    let r = decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Monday'], 'accepted');
    r = decideChangeItems(r, 'c1', ['Friday', 'description'], 'rejected');
    expect(r.changes![0].status).toBe('partial');
    expect(decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Monday', 'Friday', 'description'], 'accepted').changes![0].status).toBe('accepted');
  });

  it('does not re-decide an item that was already decided', () => {
    let r = decideChangeItems(makeRoutine([threeItemChange()]), 'c1', ['Monday'], 'rejected');
    r = decideChangeItems(r, 'c1', ['Monday'], 'accepted');
    expect(getItemStatus(r.changes![0], 'Monday')).toBe('rejected');
    expect(r.dailySchedule[0].kind).toBe('Push');
  });
});

describe('supersedePendingItems / getPendingProposals', () => {
  it('rejects older pending suggestions for the same day as superseded', () => {
    const older = threeItemChange();
    const newer: RoutineChange = { id: 'c2', status: 'pending', patch: { dailySchedule: [{ op: 'clearDay', day: 'Monday' }] } };
    const [updated] = supersedePendingItems([older], newer, 9);
    expect(updated.decisions?.Monday).toEqual({ status: 'rejected', date: 9, superseded: true });
    expect(getItemStatus(updated, 'Friday')).toBe('pending');

    const proposals = getPendingProposals({ changes: [updated, newer] });
    expect(proposals.days.Monday?.change.id).toBe('c2');
    expect(proposals.days.Friday?.change.id).toBe('c1');
    expect(proposals.description?.text).toBe('New');
    expect(proposals.count).toBe(3);
  });
});

describe('diffExercises', () => {
  it('marks kept, changed, removed and added exercises in order', () => {
    const rows = diffExercises([ex('a'), ex('b'), ex('c')], [ex('a'), ex('x'), ex('c', 4)]);
    expect(rows.map(r => r.type)).toEqual(['same', 'removed', 'added', 'changed']);
  });

  it('handles empty sides', () => {
    expect(diffExercises([], [ex('a')]).map(r => r.type)).toEqual(['added']);
    expect(diffExercises([ex('a')], []).map(r => r.type)).toEqual(['removed']);
  });
});

describe('summarizeRoutineEdit', () => {
  const base = makeRoutine([]);
  it('lists edited days and description', () => {
    const after = { ...base, description: 'X', dailySchedule: [day('Monday', 'Pull'), day('Friday', 'Legs'), day('Sunday', 'Yoga')] };
    expect(summarizeRoutineEdit(base, after)).toBe('Edited Sunday and Monday, updated the description');
  });
  it('treats an empty day the same as a rest day', () => {
    const after = { ...base, dailySchedule: [...base.dailySchedule, { day: 'Tuesday' as const, kind: '', exercises: [] }] };
    expect(summarizeRoutineEdit(base, after)).toBeNull();
  });
});
