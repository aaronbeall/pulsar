// This file contains a list of full weekly routine templates for routine generation.
// Format: Routine Name | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
// Each day is the name of a daily workout template from dailyWorkoutTemplates.ts

import type { DayOfWeek } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';

const routineTemplatesData = `
Full Body Beginner     | Rest                | Full Body           | Rest                | Full Body           | Rest                | Full Body           | Rest                | "The Everyman Circuit","Starter Strong","Total Rookie Routine","Full Circuit Rookie","Meat & Potatoes"
Upper/Lower Split      | Rest                | Upper Body          | Lower Body          | Rest                | Upper Body          | Lower Body          | Rest                | "Top & Bottom Shuffle","UpDown Town","Split Decision","Upper/Lower Ladder","Pants Optional"
Push/Pull/Legs         | Rest                | Push Day            | Pull Day            | Leg Day             | Rest                | Full Body           | Rest                | "Push, Pull, Party!","The Triple Threat","PPL Express","Pushy McPullface","Legs Miserables"
Classic 3-Day Split    | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Rest                | Leg Day             | Rest                | "Brofessor's Choice","Old School Swole","Three-Peat Treat","Classic Mass","Bench Press & Chill"
Athlete Performance    | Rest                | Athletic Speed      | Plyometrics         | Endurance           | Rest                | Powerlifting        | Rest                | "The Olympian Week","Game Changer","Pro Circuit","Athlete's Arsenal","Track Star Starter Pack"
Fat Loss HIIT          | Rest                | HIIT                | Cardio              | HIIT                | Cardio              | HIIT                | Rest                | "Sweat Symphony","HIIT Parade","Shred Sesh","Cardio Inferno","Sweatflix Binge"
Strength Builder       | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                | "Iron Repeater","Power Tower","Strength Stack","Barbell Blitz","Meathead Mondays"
Glute Focus            | Rest                | Glutes & Hamstrings | Lower Body          | Glutes & Hamstrings | Rest                | Full Body           | Rest                | "Peach Pursuit","Booty Builder","Gluteus Maxout","Buns of Steel","Squat Goals"
Core & Mobility        | Rest                | Core & Abs          | Mobility & Stretch  | Core Stability      | Mobility & Stretch  | Core & Abs          | Rest                | "Bend & Mend","Flex Appeal","Core Restore","Limber Lumber","Abs-olutely Flexible"
Kettlebell Athlete     | Rest                | Kettlebell          | Cardio              | Kettlebell          | Rest                | Kettlebell          | Rest                | "Bell to the Metal","Swing King","Kettle-Crusher","Iron Bell Flow","Handle With Care"
Bodyweight Only        | Rest                | Bodyweight Only     | Cardio              | Bodyweight Only     | Cardio              | Bodyweight Only     | Rest                | "No Gym, No Problem","Anywhere Athlete","Gravity Games","Prison Yard Special","Couch Potato Redemption"
Dumbbell Only          | Rest                | Dumbbell Only       | Cardio              | Dumbbell Only       | Cardio              | Dumbbell Only       | Rest                | "Dumbbell Dynasty","DB Domination","Handle It!","Dumbbell Deluge","Curl Jam"
Machine Only           | Rest                | Machine Only        | Cardio              | Machine Only        | Cardio              | Machine Only        | Rest                | "Cyborg Circuit","Robot Routine","Selectorized Sesh","Gymbot 3000"
Barbell Only           | Rest                | Barbell Only        | Cardio              | Barbell Only        | Cardio              | Barbell Only        | Rest                | "Barbell Bash","Barbell Bonanza","Iron Bar Brigade","Barbell Battalion","Barbellasaurus Rex"
Active Recovery        | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     | "Zen & Tonic","Chill Circuit","Recovery Road","Restoration Nation","Nap Gains"
5-Day Powerbuilder     | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Rest                | "Power Parade","Builder’s Week","Strength Streak","Rep Rally"
Classic Bro Split      | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Rest                | "Swole Week Classic","Bro Split Supreme","Meathead Medley","Chest Bump Week","Broscience 101"
Endurance Athlete      | Rest                | Endurance           | Cardio              | Endurance           | Cardio              | Endurance           | Rest                | "Marathoner Mode","Enduro Engine","Stamina Saga","Distance Dominator","Cardioholic"
Yoga & Strength        | Rest                | Yoga Flow           | Powerlifting        | Yoga Flow           | Powerlifting        | Yoga Flow           | Rest                | "Zen & Steel","Om & Iron","Stretch & Press","Namaste & Press","Downward Dog Days"
Moderate Full Body     | Rest                | Full Body           | Cardio              | Full Body           | Cardio              | Full Body           | Rest                | "Balanced Beast","Middle Path Muscle","All-Arounder","Goldilocks Routine"
Moderate Upper/Lower   | Rest                | Upper Body          | Lower Body          | Cardio              | Upper Body          | Lower Body          | Rest                | "Half & Half Hero","Split the Difference","Upper/Lower Legend","Pants Optional Jr."
Moderate Push/Pull/Legs| Rest                | Push Day            | Pull Day            | Leg Day             | Cardio              | Full Body           | Rest                | "Push, Pull, Play","PPL Lite","Triple Play","Pushy McPullface Jr."
Advanced Powerbuilder  | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Full Body           | "Elite Engine","Powerhouse Pro","Max Out Week","Repocalypse"
Advanced Athlete       | Cardio              | Athletic Speed      | Plyometrics         | Endurance           | Powerlifting        | HIIT                | Full Body           | "Beast Mode Unlocked","Pro Performance","Athlete Ascend","Sweat Equity"
Advanced Bro Split     | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Full Body           | "Brofessor's PhD","Bro Split Elite","Swole Scholar","Brolympics"
`;

export type RoutineTemplate = {
  name: string;
  days: { [day in DayOfWeek]: string | null };
  nicknames?: string[];
};

export const routineTemplates: RoutineTemplate[] = routineTemplatesData
  .trim()
  .split('\n')
  .map(line => {
    const parts = line.split('|').map(s => s.trim());
    const name = parts[0];
    const days = parts.slice(1, 8);
    const nicknameStr = parts[8] || '';
    // Add brackets to make it a JSON array, then parse
    const nicknames: string[] = JSON.parse(`[${nicknameStr}]`);
    const daysObj = {} as { [day in DayOfWeek]: string | null };
    DAYS_OF_WEEK.forEach((day, i) => {
      const val = days[i]?.toLowerCase() === 'rest' ? null : days[i];
      daysObj[day] = val || null;
    });
    return { name, days: daysObj, nicknames };
  });
