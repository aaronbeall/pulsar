import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Exercise, Routine, Workout } from '../models/types';
import * as db from '../db/indexedDb';

interface PulsarStoreState {
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  loading: boolean;
  // Load all data from DB
  loadAll: () => Promise<void>;
  // Exercise methods
  addExercise: (exercise: Exercise) => Promise<void>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  // Routine methods
  addRoutine: (routine: Routine) => Promise<void>;
  updateRoutine: (routine: Routine) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;
  // Workout methods
  addWorkout: (workout: Workout) => Promise<void>;
  updateWorkout: (workout: Workout) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
}

export const usePulsarStore = create<PulsarStoreState>()(
  persist(
    (set, get) => ({
      exercises: [],
      routines: [],
      workouts: [],
      loading: true,
      loadAll: async () => {
        set({ loading: true });
        const [exercises, routines, workouts] = await Promise.all([
          db.getExercises(),
          db.getRoutines(),
          db.getWorkouts(),
        ]);
        set({ exercises, routines, workouts, loading: false });
      },
      addExercise: async (exercise) => {
        await db.addExercise(exercise);
        set({ exercises: [...get().exercises, exercise] });
      },
      updateExercise: async (exercise) => {
        await db.addExercise(exercise);
        set({ exercises: get().exercises.map(e => e.id === exercise.id ? exercise : e) });
      },
      removeExercise: async (id) => {
        await db.removeExercise(id);
        set({ exercises: get().exercises.filter(e => e.id !== id) });
      },
      addRoutine: async (routine) => {
        await db.addRoutine(routine);
        set({ routines: [...get().routines, routine] });
      },
      updateRoutine: async (routine) => {
        await db.addRoutine(routine);
        set({ routines: get().routines.map(r => r.id === routine.id ? routine : r) });
      },
      removeRoutine: async (id) => {
        await db.removeRoutine(id);
        set({ routines: get().routines.filter(r => r.id !== id) });
      },
      addWorkout: async (workout) => {
        await db.addWorkout(workout);
        set({ workouts: [...get().workouts, workout] });
      },
      updateWorkout: async (workout) => {
        await db.addWorkout(workout);
        set({ workouts: get().workouts.map(w => w.id === workout.id ? workout : w) });
      },
      removeWorkout: async (id) => {
        await db.removeWorkout(id);
        set({ workouts: get().workouts.filter(w => w.id !== id) });
      },
    }),
    { name: 'pulsar-store' }
  )
);

// Convenience hooks
export const useExercises = () => usePulsarStore(s => s.exercises);
export const useRoutines = () => usePulsarStore(s => s.routines);
export const useWorkouts = () => usePulsarStore(s => s.workouts);
export const useRoutine = (id: string) => usePulsarStore(s => s.routines.find(r => r.id === id));
export const useExercise = (id: string) => usePulsarStore(s => s.exercises.find(e => e.id === id));
export const useWorkout = (id: string) => usePulsarStore(s => s.workouts.find(w => w.id === id));
export const usePulsarLoading = () => usePulsarStore(s => s.loading);

// Call this in your app root to load all data on startup
export const usePulsarStoreInit = () => {
  const loadAll = usePulsarStore(s => s.loadAll);
  React.useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [loadAll]);
};
