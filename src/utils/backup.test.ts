import { describe, expect, it } from 'vitest';
import { BackupParseError, backupFileName, compareBackupToDevice, createBackup, latestActivityAt, parseBackup, summarizeBackup } from './backup';
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

describe('compareBackupToDevice', () => {
  const data = (workoutTimes: number[], setEnd?: number) => ({
    routines: [{ ...routine, createdAt: 100 }],
    workouts: workoutTimes.map((t, i) => ({
      ...workout,
      id: `w${i}`,
      startedAt: t,
      exercises: setEnd ? [{ exerciseId: 'e1', sets: 1, setLog: [{ startedAt: t, endedAt: setEnd }] }] : [],
    })) as unknown as Workout[],
  });

  it('flags a device with newer activity than the backup', () => {
    expect(compareBackupToDevice(data([1000]), data([1000, 5000]))).toEqual({
      backupLatest: 1000, deviceLatest: 5000, deviceIsNewer: true,
    });
  });

  it('does not flag when the backup is as new or newer', () => {
    expect(compareBackupToDevice(data([5000]), data([1000])).deviceIsNewer).toBe(false);
    expect(compareBackupToDevice(data([1000]), data([1000])).deviceIsNewer).toBe(false);
  });

  it('counts set ends and an empty device', () => {
    expect(latestActivityAt(data([1000], 9000))).toBe(9000);
    expect(compareBackupToDevice(data([1000]), { routines: [], workouts: [] })).toEqual({
      backupLatest: 1000, deviceLatest: null, deviceIsNewer: false,
    });
  });
});
