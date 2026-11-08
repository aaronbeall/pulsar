import { openDB, DBSchema } from 'idb';
import { Exercise, Routine, Workout } from '../models/types';

interface PulsarDB extends DBSchema {
  exercises: {
    key: string; // Exercise ID
    value: Exercise;
  };
  routines: {
    key: string; // Routine ID
    value: Routine;
  };
  workouts: {
    key: string; // Workout ID
    value: Workout;
  };
}

// PR preview builds are served from the same origin as the live app (a pr-<n>/ subpath on
// GitHub Pages), and IndexedDB is per-origin, so give each preview its own database to keep
// test data from touching real workout history.
const PREVIEW_PR = import.meta.env.VITE_PREVIEW_PR;
export const DB_NAME = PREVIEW_PR ? `PulsarDB-pr-${PREVIEW_PR}` : 'PulsarDB';
const DB_VERSION = 1;

export const getDB = async () => {
  return openDB<PulsarDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('exercises')) {
        db.createObjectStore('exercises', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('routines')) {
        db.createObjectStore('routines', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('workouts')) {
        db.createObjectStore('workouts', { keyPath: 'id' });
      }
    },
  });
};

// Utility functions
export const addExercise = async (exercise: Exercise) => {
  const db = await getDB();
  await db.put('exercises', exercise);
};

export const addRoutine = async (routine: Routine) => {
  const db = await getDB();
  await db.put('routines', routine);
};

export const addWorkout = async (workout: Workout) => {
  const db = await getDB();
  await db.put('workouts', workout);
};

export const getExercises = async (): Promise<Exercise[]> => {
  const db = await getDB();
  return db.getAll('exercises');
};

export const getRoutines = async (): Promise<Routine[]> => {
  const db = await getDB();
  return db.getAll('routines');
};

export const getRoutine = async (id: string): Promise<Routine | undefined> => {
  const db = await getDB();
  return db.get('routines', id);
};

export const getWorkouts = async (): Promise<Workout[]> => {
  const db = await getDB();
  return db.getAll('workouts');
};

export const getWorkout = async (id: string): Promise<Workout | undefined> => {
  const db = await getDB();
  return db.get('workouts', id);
};

export const removeExercise = async (id: string) => {
  const db = await getDB();
  await db.delete('exercises', id);
};

export const removeRoutine = async (id: string) => {
  const db = await getDB();
  await db.delete('routines', id);
};

export const removeWorkout = async (id: string) => {
  const db = await getDB();
  await db.delete('workouts', id);
};

/**
 * Replace everything in the database with the given data, in one transaction: either the
 * whole restore lands or none of it does, so a bad import can't leave a half-wiped DB.
 */
export const replaceAllData = async (data: { exercises: Exercise[]; routines: Routine[]; workouts: Workout[] }) => {
  const db = await getDB();
  const tx = db.transaction(['exercises', 'routines', 'workouts'], 'readwrite');
  const exercises = tx.objectStore('exercises');
  const routines = tx.objectStore('routines');
  const workouts = tx.objectStore('workouts');
  await Promise.all([exercises.clear(), routines.clear(), workouts.clear()]);
  await Promise.all([
    ...data.exercises.map(e => exercises.put(e)),
    ...data.routines.map(r => routines.put(r)),
    ...data.workouts.map(w => workouts.put(w)),
  ]);
  await tx.done;
};
