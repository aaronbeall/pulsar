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

const DB_NAME = 'PulsarDB';
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
