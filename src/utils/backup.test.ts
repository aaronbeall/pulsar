import { describe, expect, it } from 'vitest';
import { BackupParseError, backupFileName, createBackup, parseBackup, summarizeBackup } from './backup';
import { Exercise, Routine, Workout } from '../models/types';

const exercise = { id: 'e1', name: 'Push-up' } as unknown as Exercise;
const routine = { id: 'r1', name: 'Mine', dailySchedule: [], chatHistory: [] } as unknown as Routine;
const workout = { id: 'w1', routineId: 'r1', exercises: [] } as unknown as Workout;

describe('backup', () => {
  it('round-trips through JSON', () => {
    const backup = createBackup({ exercises: [exercise], routines: [routine], workouts: [workout] }, 1000);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual(backup);
    expect(summarizeBackup(parsed)).toBe('1 routine, 1 workout, 1 exercise');
  });

  it('rejects non-JSON and non-Pulsar files', () => {
    expect(() => parseBackup('not json')).toThrow(BackupParseError);
    expect(() => parseBackup('[]')).toThrow(/isn't a Pulsar backup/);
    expect(() => parseBackup(JSON.stringify({ app: 'other' }))).toThrow(/isn't a Pulsar backup/);
  });

  it('rejects backups from a newer format', () => {
    const backup = { ...createBackup({ exercises: [], routines: [], workouts: [] }), formatVersion: 99 };
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(/newer version/);
  });

  it('rejects missing lists and records without ids', () => {
    const base = createBackup({ exercises: [], routines: [], workouts: [] });
    expect(() => parseBackup(JSON.stringify({ ...base, workouts: undefined }))).toThrow(/workouts list/);
    expect(() => parseBackup(JSON.stringify({ ...base, routines: [{ name: 'x' }] }))).toThrow(/Item 1 in routines/);
  });

  it('names files by local date', () => {
    expect(backupFileName(new Date(2026, 10, 6, 9).getTime())).toBe('pulsar-backup-2026-11-06.json');
  });
});
