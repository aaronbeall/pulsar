import { create } from 'zustand';
import { defaultWeightUnit, type WeightUnit } from '../utils/units';

// The weight unit preference. A plain localStorage setting like the theme: weights are all
// stored in kg, so losing this (new phone, restore) only changes how they're shown.

const UNIT_KEY = 'pulsar:weightUnit';

const readUnit = (): WeightUnit => {
  try {
    const v = localStorage.getItem(UNIT_KEY);
    if (v === 'lb' || v === 'kg') return v;
  } catch {
    // localStorage unavailable
  }
  return defaultWeightUnit(typeof navigator !== 'undefined' ? navigator.language : undefined);
};

interface UnitsState {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
}

export const useUnitsStore = create<UnitsState>((set) => ({
  weightUnit: readUnit(),
  setWeightUnit: (weightUnit) => {
    try {
      localStorage.setItem(UNIT_KEY, weightUnit);
    } catch {
      // the choice lasts until reload
    }
    set({ weightUnit });
  },
}));

export const useWeightUnit = (): [WeightUnit, (unit: WeightUnit) => void] => {
  const unit = useUnitsStore(s => s.weightUnit);
  const setUnit = useUnitsStore(s => s.setWeightUnit);
  return [unit, setUnit];
};
