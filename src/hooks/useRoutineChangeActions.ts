import { useCallback } from 'react';
import type { RoutineChangeItemKey } from '../models/types';
import { usePulsarStore } from '../store/pulsarStore';
import { decideChangeItems } from '../utils/routineChangeUtils';

export type DecideChangeItems = (
  changeId: string,
  keys: RoutineChangeItemKey[],
  status: 'accepted' | 'rejected'
) => Promise<void>;

/**
 * Accept or reject items of an AI-suggested change. Shared by the chat summary, the review
 * view, and the inline suggestions in the routine list (view and edit modes), so a decision
 * made in any of them shows up in all of them. Always builds on the latest stored routine.
 */
export function useRoutineChangeActions(routineId: string): DecideChangeItems {
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  return useCallback(async (changeId, keys, status) => {
    const latest = usePulsarStore.getState().routines.find(r => r.id === routineId);
    if (!latest) return;
    await updateRoutine(decideChangeItems(latest, changeId, keys, status));
  }, [routineId, updateRoutine]);
}

/** Bring a day of the routine list into view, e.g. from a row of the chat summary. */
export function scrollToRoutineDay(day: string) {
  document.getElementById(`routine-day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
