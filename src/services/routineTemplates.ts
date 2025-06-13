// This file contains a list of full weekly routine templates for routine generation.
// Format: Routine Name | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
// Each day is the name of a daily workout template from dailyWorkoutTemplates.ts

import type { DayOfWeek } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';

const routineTemplatesData = `
Full Body Beginner     | Rest                | Full Body           | Rest                | Full Body           | Rest                | Full Body           | Rest                |
Upper/Lower Split      | Rest                | Upper Body          | Lower Body          | Rest                | Upper Body          | Lower Body          | Rest                |
Push/Pull/Legs         | Rest                | Push Day            | Pull Day            | Leg Day             | Rest                | Full Body           | Rest                |
Classic 3-Day Split    | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Rest                | Leg Day             | Rest                |
Athlete Performance    | Rest                | Athletic Speed      | Plyometrics         | Endurance           | Rest                | Powerlifting        | Rest                |
Fat Loss HIIT          | Rest                | HIIT                | Cardio              | HIIT                | Cardio              | HIIT                | Rest                |
Strength Builder       | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                |
Glute Focus            | Rest                | Glutes & Hamstrings | Lower Body          | Glutes & Hamstrings | Rest                | Full Body           | Rest                |
Core & Mobility        | Rest                | Core & Abs          | Mobility & Stretch  | Core Stability      | Mobility & Stretch  | Core & Abs          | Rest                |
Kettlebell Athlete     | Rest                | Kettlebell          | Cardio              | Kettlebell          | Rest                | Kettlebell          | Rest                |
Bodyweight Only        | Rest                | Bodyweight Only     | Cardio              | Bodyweight Only     | Cardio              | Bodyweight Only     | Rest                |
Dumbbell Only          | Rest                | Dumbbell Only       | Cardio              | Dumbbell Only       | Cardio              | Dumbbell Only       | Rest                |
Machine Only           | Rest                | Machine Only        | Cardio              | Machine Only        | Cardio              | Machine Only        | Rest                |
Barbell Only           | Rest                | Barbell Only        | Cardio              | Barbell Only        | Cardio              | Barbell Only        | Rest                |
Active Recovery        | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     |
5-Day Powerbuilder     | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Rest                |
Classic Bro Split      | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Rest                |
Endurance Athlete      | Rest                | Endurance           | Cardio              | Endurance           | Cardio              | Endurance           | Rest                |
Yoga & Strength        | Rest                | Yoga Flow           | Powerlifting        | Yoga Flow           | Powerlifting        | Yoga Flow           | Rest                |
Moderate Full Body     | Rest                | Full Body           | Cardio              | Full Body           | Cardio              | Full Body           | Rest                |
Moderate Upper/Lower   | Rest                | Upper Body          | Lower Body          | Cardio              | Upper Body          | Lower Body          | Rest                |
Moderate Push/Pull/Legs| Rest                | Push Day            | Pull Day            | Leg Day             | Cardio              | Full Body           | Rest                |
Advanced Powerbuilder  | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Full Body           |
Advanced Athlete       | Cardio              | Athletic Speed      | Plyometrics         | Endurance           | Powerlifting        | HIIT                | Full Body           |
Advanced Bro Split     | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Full Body           |
`;

export type RoutineTemplate = {
  name: string;
  days: { [day in DayOfWeek]: string | null };
};

export const routineTemplates: RoutineTemplate[] = routineTemplatesData
  .trim()
  .split('\n')
  .map(line => {
    const [name, ...days] = line.split('|').map(s => s.trim());
    const daysObj = {} as { [day in DayOfWeek]: string | null };
    DAYS_OF_WEEK.forEach((day, i) => {
      const val = days[i]?.toLowerCase() === 'rest' ? null : days[i];
      daysObj[day] = val || null;
    });
    return { name, days: daysObj };
  });
