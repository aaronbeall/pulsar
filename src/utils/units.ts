// Weight units. Every weight Pulsar stores is in kg (unrounded), whichever unit the person
// uses; this module converts for display and input. Shared by lift tracking and body weight.

export type WeightUnit = 'lb' | 'kg';

export const KG_PER_LB = 0.45359237;

// Countries that weigh things in pounds. Everywhere else gets kg.
const LB_REGIONS = new Set(['US', 'LR', 'MM']);

/** The unit a locale like "en-US" or "de-DE" most likely uses. */
export function defaultWeightUnit(locale: string | undefined): WeightUnit {
  const region = locale?.split(/[-_]/)[1]?.toUpperCase();
  return region && LB_REGIONS.has(region) ? 'lb' : 'kg';
}

export const toKg = (value: number, unit: WeightUnit): number => (unit === 'lb' ? value * KG_PER_LB : value);

export const fromKg = (kg: number, unit: WeightUnit): number => (unit === 'lb' ? kg / KG_PER_LB : kg);

/** Rounds to the nearest 0.5, the finest step anyone loads a bar or picks a dumbbell in. */
export const roundWeight = (value: number): number => Math.round(value * 2) / 2;

/** A kg value as it reads in `unit`: 61.235 kg in lb → 135. */
export const displayWeight = (kg: number, unit: WeightUnit): number => roundWeight(fromKg(kg, unit));

/** "135 lb", "62.5 kg". */
export function formatWeight(kg: number, unit: WeightUnit, withUnit = true): string {
  const n = displayWeight(kg, unit);
  return withUnit ? `${n} ${unit}` : `${n}`;
}

/** The usual smallest jump between working weights: 5 lb or 2.5 kg. */
export const weightStep = (unit: WeightUnit): number => (unit === 'lb' ? 5 : 2.5);

/** Steps a weight up or down by one `weightStep`, snapped to that step, never below 0. Returns kg. */
export function stepWeightKg(kg: number, unit: WeightUnit, direction: 1 | -1): number {
  const step = weightStep(unit);
  const current = displayWeight(kg, unit);
  const snapped = direction > 0 ? Math.floor(current / step + 1e-9) * step + step : Math.ceil(current / step - 1e-9) * step - step;
  return toKg(Math.max(0, snapped), unit);
}
