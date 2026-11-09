import { DAYS_OF_WEEK } from "../constants/days";

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface Exercise {
  id: string; // Unique identifier
  name: string;
  description: string; // Optional description
  targetMuscles?: string[]; // Optional target muscle group
  howToUrl: string;
  coverImageUrl: string;
  iconImageUrl: string;
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
  timed?: boolean;
}

export interface RoutineDay {
    day: DayOfWeek; // e.g., "Monday", "Tuesday"
    kind: string;
    exercises: ScheduledExercise[];
  }

// A single turn in a routine's AI chat — covers both the initial setup-wizard Q&A (seeded
// once at creation) and any later back-and-forth, in one flexible, appendable stream.
export interface RoutineChatMessage {
  id: string;
  role: 'user' | 'ai';
  message: string;
  date: number;
  dismissed?: boolean; // 'ai' messages not yet acknowledged (e.g. a "new update" indicator)
  pendingChangeId?: string; // links an 'ai' message to a RoutineChange it's proposing
}

// A change to a routine's schedule/description proposed by the AI in chat, reviewed by the
// user before it's applied. Per-day ops (not a full-schedule replace) so the diff UI can
// show exactly which days changed instead of an opaque "routine updated." Each day (and the
// description) is its own reviewable item: the user can accept Monday and reject Friday.
export type RoutineChangeOp =
  | { op: 'setDay'; day: DayOfWeek; kind: string; exercises: ScheduledExercise[] }
  | { op: 'clearDay'; day: DayOfWeek }; // turn into a rest day

// One reviewable piece of a RoutineChange: a day of the week, or the routine description.
export type RoutineChangeItemKey = DayOfWeek | 'description';

export interface RoutineChangeDecision {
  status: 'accepted' | 'rejected';
  date: number;
  // What the item looked like right before an accept was applied, so history and the review
  // view can still show what was replaced after the fact. null = it was a rest day.
  previousDay?: RoutineDay | null;
  previousDescription?: string;
  superseded?: boolean; // auto-rejected because a newer suggestion changed the same item
}

export interface RoutineChange {
  id: string;
  // Derived from decisions: pending while any item is undecided, 'partial' when some items
  // were accepted and others rejected.
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  createdAt?: number;
  patch: {
    dailySchedule?: RoutineChangeOp[];
    description?: string;
  };
  decisions?: Partial<Record<RoutineChangeItemKey, RoutineChangeDecision>>;
}

// An entry in a routine's change history (shown in the Activity timeline): an edit saved by
// the user, or AI-suggested items they accepted.
export interface RoutineRevision {
  id: string;
  date: number;
  source: 'ai' | 'manual';
  summary: string;
  changeId?: string; // for 'ai' revisions, the RoutineChange the accepted items came from
}

// One span of time a routine was active, with the weekdays it scheduled during it. `end` is
// unset for the current period. See utils/schedulePeriods.ts.
export interface SchedulePeriod {
  start: number;
  end?: number;
  days: DayOfWeek[];
}

export interface Routine {
  id: string; // Unique identifier
  name: string;
  description: string;
  active: boolean;
  createdAt: number;
  dailySchedule: Array<RoutineDay>;
  chatHistory: RoutineChatMessage[];
  changes?: RoutineChange[]; // all AI-proposed changes, any status — pending ones await a decision
  revisions?: RoutineRevision[]; // change history, oldest first
  schedulePeriods?: SchedulePeriod[]; // when it was active and on which weekdays, oldest first (kept by the store)
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
}

export interface ScheduledExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  duration?: number;  // In seconds
}

export interface Workout {
  id: string; // Unique identifier
  nickname: string;
  routineId: string;
  day: DayOfWeek;
  startedAt: number;
  completedAt?: number;
  exercises: WorkoutExercise[];
  liked?: boolean;
  disliked?: boolean;
  favorite?: boolean;
  feedback?: string;
}

export interface WorkoutExercise extends ScheduledExercise {
  weight?: number;
  startedAt?: number;
  completedAt?: number;
  skipped?: boolean; // Counts as completed but not or partially performed
  completedSets?: number; // Track completed sets
  completedDuration?: number; // Track completed duration for timed exercises (seconds, summed over sets)
  // Wall-clock time (ms) the in-progress set started; unset between sets. Persisted so a
  // running timer survives the screen locking, the app being backgrounded, or a reload.
  currentSetStartedAt?: number;
  // One entry per finished set, in order. Exercise and rest times are derived from these
  // (see utils/workoutTiming.ts).
  setLog?: SetRecord[];
}

export interface SetRecord {
  startedAt: number; // ms
  endedAt: number; // ms
}