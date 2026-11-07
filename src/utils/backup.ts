import { Exercise, Routine, Workout } from '../models/types';

/**
 * Full-data backup format. Everything the app stores in IndexedDB goes in here, so a
 * backup file is enough to rebuild the app on a new phone / after the browser evicts
 * storage. Settings in localStorage (color scheme, API keys, caches) are deliberately
 * left out: they're cheap to redo and an API key shouldn't end up in a file that gets
 * shared around.
 */
export interface PulsarBackup {
  app: 'pulsar';
  formatVersion: 1;
  exportedAt: number;
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
}

export const BACKUP_FORMAT_VERSION = 1;

export function createBackup(
  data: { exercises: Exercise[]; routines: Routine[]; workouts: Workout[] },
  now: number = Date.now(),
): PulsarBackup {
  return {
    app: 'pulsar',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now,
    exercises: data.exercises,
    routines: data.routines,
    workouts: data.workouts,
  };
}

/** `pulsar-backup-2026-11-06.json` */
export function backupFileName(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `pulsar-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export class BackupParseError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function checkRecords(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new BackupParseError(`Backup is missing its ${label} list.`);
  }
  value.forEach((item, i) => {
    if (!isObject(item) || typeof item.id !== 'string' || !item.id) {
      throw new BackupParseError(`Item ${i + 1} in ${label} has no id.`);
    }
  });
  return value as Record<string, unknown>[];
}

/**
 * Parse and sanity-check a backup file's text. Throws BackupParseError with a message
 * fit to show the user when the file isn't a Pulsar backup or is damaged. This checks
 * structure (right lists, every record has an id), not every field: the data came out of
 * this app, so a deep schema check would mostly just break on harmless additions.
 */
export function parseBackup(text: string): PulsarBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupParseError("This file isn't valid JSON, so it can't be a Pulsar backup.");
  }
  if (!isObject(raw) || raw.app !== 'pulsar') {
    throw new BackupParseError("This file isn't a Pulsar backup.");
  }
  if (typeof raw.formatVersion !== 'number' || raw.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupParseError('This backup was made by a newer version of Pulsar. Update the app and try again.');
  }
  const exercises = checkRecords(raw.exercises, 'exercises') as unknown as Exercise[];
  const routines = checkRecords(raw.routines, 'routines') as unknown as Routine[];
  const workouts = checkRecords(raw.workouts, 'workouts') as unknown as Workout[];
  return {
    app: 'pulsar',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
    exercises,
    routines,
    workouts,
  };
}

export function summarizeBackup(backup: PulsarBackup): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return [
    plural(backup.routines.length, 'routine'),
    plural(backup.workouts.length, 'workout'),
    plural(backup.exercises.length, 'exercise'),
  ].join(', ');
}

type BackupData = Pick<PulsarBackup, 'routines' | 'workouts'>;

/**
 * When the data was last used: the latest workout start/finish, set end or routine
 * creation. Null when there's no activity at all.
 */
export function latestActivityAt(data: BackupData): number | null {
  let latest: number | null = null;
  const consider = (t: number | undefined) => {
    if (typeof t === 'number' && (latest === null || t > latest)) latest = t;
  };
  data.routines.forEach(r => consider(r.createdAt));
  data.workouts.forEach(w => {
    consider(w.startedAt);
    consider(w.completedAt);
    w.exercises?.forEach(ex => ex.setLog?.forEach(set => consider(set.endedAt)));
  });
  return latest;
}

export interface BackupComparison {
  backupLatest: number | null;
  deviceLatest: number | null;
  /** The device has activity after the backup's latest, which a restore would lose. */
  deviceIsNewer: boolean;
}

export function compareBackupToDevice(backup: BackupData, device: BackupData): BackupComparison {
  const backupLatest = latestActivityAt(backup);
  const deviceLatest = latestActivityAt(device);
  return {
    backupLatest,
    deviceLatest,
    deviceIsNewer: deviceLatest !== null && (backupLatest === null || deviceLatest > backupLatest),
  };
}
