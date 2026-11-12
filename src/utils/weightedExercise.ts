import { Exercise } from '../models/types';
import { exerciseTemplates } from '../services/exerciseTemplates';

// Which exercises log a weight per set. A person's own switch always wins; otherwise it's
// worked out from what we know about the exercise, so lifts track weight and push-ups,
// planks and runs never show a weight field.

// free-exercise-db equipment that means a load you pick a number for.
const WEIGHTED_EQUIPMENT = new Set(['barbell', 'dumbbell', 'kettlebells', 'cable', 'machine', 'e-z curl bar']);

// Words in a name that mean there's a weight to log.
const EQUIPMENT_WORDS = /\b(barbell|dumbbells?|db|kettlebells?|kb|cable|machine|smith|ez[- ]?bar|e-z|trap[- ]bar|landmine|plate)\b/i;

// Classic lifts that are usually named without their equipment ("Back Squat", "Deadlift").
const LIFT_WORDS = /\b(deadlifts?|bench press|back squat|front squat|goblet|overhead press|military press|shoulder press|leg press|pull-?downs?|skull ?crushers?|shrugs?|lateral raises?|chest fly|clean|snatch|thruster)\b/i;

// Bodyweight moves that would otherwise match the words above ("Pull-down" is a machine,
// "Pull-up" isn't). "Weighted Pull-up" still counts.
const BODYWEIGHT_WORDS = /\b(bodyweight|body weight|push-?ups?|pull-?ups?|chin-?ups?|nordic|inverted|band(ed)?|air squat)\b/i;

const normalize = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/s$/, '');

export interface WeightedHints {
  name: string;
  timed?: boolean;
  /** free-exercise-db `equipment`, when the exercise came from there. */
  equipment?: string;
}

/** Whether an exercise with this name (and maybe equipment) should track weight by default. */
export function inferWeighted({ name, timed, equipment }: WeightedHints): boolean {
  if (timed) return false;
  const template = exerciseTemplates.find(t => normalize(t.name) === normalize(name));
  if (template) return (template.relativeWeight ?? 0) > 0;
  if (equipment) return WEIGHTED_EQUIPMENT.has(equipment);
  if (/\bweighted\b/i.test(name)) return true;
  if (BODYWEIGHT_WORDS.test(name)) return false;
  return EQUIPMENT_WORDS.test(name) || LIFT_WORDS.test(name);
}

/** Whether to show weights for this exercise: the person's switch, else the inferred default. */
export function isWeightedExercise(exercise: Pick<Exercise, 'name' | 'timed' | 'weighted'> | undefined): boolean {
  if (!exercise) return false;
  return exercise.weighted ?? inferWeighted(exercise);
}
