// This file contains a list of full weekly routine templates for routine generation.
// Format: Routine Name | Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
// Each day is the name of a daily workout template from dailyWorkoutTemplates.ts

import type { DayOfWeek } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';

const routineTemplatesData = `
Full Body Beginner     | Rest                | Full Body           | Rest                | Full Body           | Rest                | Full Body           | Rest                | "The Everyman Circuit","Starter Strong","Total Rookie Routine","Full Circuit Rookie","Meat & Potatoes" | A simple, effective routine for beginners focusing on full-body workouts and recovery. | beginner, full body, easy, recovery, simple, strength, total body, new, all levels, general fitness
Upper/Lower Split      | Rest                | Upper Body          | Lower Body          | Rest                | Upper Body          | Lower Body          | Rest                | "Top & Bottom Shuffle","UpDown Town","Split Decision","Upper/Lower Ladder","Pants Optional" | Alternates upper and lower body days for balanced strength and muscle development. | split, upper body, lower body, balance, strength, intermediate, muscle, hypertrophy, gym, home
Push/Pull/Legs         | Rest                | Push Day            | Pull Day            | Leg Day             | Rest                | Full Body           | Rest                | "Push, Pull, Party!","The Triple Threat","PPL Express","Pushy McPullface","Legs Miserables" | Classic push/pull/legs split for efficient muscle targeting and recovery. | push, pull, legs, split, muscle, recovery, intermediate, advanced, strength, hypertrophy, gym
Classic 3-Day Split    | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Rest                | Leg Day             | Rest                | "Brofessor's Choice","Old School Swole","Three-Peat Treat","Classic Mass","Bench Press & Chill" | Old-school bodybuilding split for building mass and strength. | bodybuilding, split, mass, strength, classic, chest, back, arms, legs, intermediate, advanced
Athlete Performance    | Rest                | Athletic Speed      | Plyometrics         | Endurance           | Rest                | Powerlifting        | Rest                | "The Olympian Week","Game Changer","Pro Circuit","Athlete's Arsenal","Track Star Starter Pack" | Designed for athletes to improve speed, power, and endurance. | athlete, performance, speed, power, endurance, sports, advanced, agility, explosive, conditioning
Fat Loss HIIT          | Rest                | HIIT                | Cardio              | HIIT                | Cardio              | HIIT                | Rest                | "Sweat Symphony","HIIT Parade","Shred Sesh","Cardio Inferno","Sweatflix Binge" | High-intensity interval training for fat loss and cardiovascular health. | HIIT, fat loss, cardio, interval, weight loss, burn, conditioning, quick, advanced, beginner, home
Strength Builder       | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                | Powerlifting        | Rest                | "Iron Repeater","Power Tower","Strength Stack","Barbell Blitz","Meathead Mondays" | Focuses on building maximum strength with heavy compound lifts. | strength, powerlifting, compound, heavy, muscle, advanced, barbell, gym, max, squat, bench, deadlift
Glute Focus            | Rest                | Glutes & Hamstrings | Lower Body          | Glutes & Hamstrings | Rest                | Full Body           | Rest                | "Peach Pursuit","Booty Builder","Gluteus Maxout","Buns of Steel","Squat Goals" | Emphasizes glute and hamstring development for lower body strength. | glutes, hamstrings, lower body, booty, strength, legs, women, hypertrophy, tone, intermediate
Core & Mobility        | Rest                | Core & Abs          | Mobility & Stretch  | Core Stability      | Mobility & Stretch  | Core & Abs          | Rest                | "Bend & Mend","Flex Appeal","Core Restore","Limber Lumber","Abs-olutely Flexible" | Improves core strength and mobility for better movement and injury prevention. | core, mobility, abs, flexibility, injury prevention, stability, beginner, all levels, stretch, pilates
Kettlebell Athlete     | Rest                | Kettlebell          | Cardio              | Kettlebell          | Rest                | Kettlebell          | Rest                | "Bell to the Metal","Swing King","Kettle-Crusher","Iron Bell Flow","Handle With Care" | Kettlebell-based routine for strength, conditioning, and versatility. | kettlebell, strength, conditioning, versatile, functional, home, gym, intermediate, power, endurance
Bodyweight Only        | Rest                | Bodyweight Only     | Cardio              | Bodyweight Only     | Cardio              | Bodyweight Only     | Rest                | "No Gym, No Problem","Anywhere Athlete","Gravity Games","Prison Yard Special","Couch Potato Redemption" | No-equipment routine using only bodyweight exercises for strength and endurance. | bodyweight, no equipment, calisthenics, home, endurance, beginner, travel, all levels, strength, mobility
Dumbbell Only          | Rest                | Dumbbell Only       | Cardio              | Dumbbell Only       | Cardio              | Dumbbell Only       | Rest                | "Dumbbell Dynasty","DB Domination","Handle It!","Dumbbell Deluge","Curl Jam" | Uses dumbbells for a full-body routine, perfect for home or gym. | dumbbell, home, full body, weights, strength, beginner, intermediate, muscle, arms, chest, legs
Machine Only           | Rest                | Machine Only        | Cardio              | Machine Only        | Cardio              | Machine Only        | Rest                | "Cyborg Circuit","Robot Routine","Selectorized Sesh","Gymbot 3000" | All-machine routine for safe, guided strength training. | machine, gym, strength, safe, guided, beginner, isolation, easy, accessible
Barbell Only           | Rest                | Barbell Only        | Cardio              | Barbell Only        | Cardio              | Barbell Only        | Rest                | "Barbell Bash","Barbell Bonanza","Iron Bar Brigade","Barbell Battalion","Barbellasaurus Rex" | Barbell-focused routine for building strength and muscle mass. | barbell, strength, muscle, gym, weights, advanced, power, compound, squat, bench, deadlift
Active Recovery        | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     | Cardio              | Active Recovery     | "Zen & Tonic","Chill Circuit","Recovery Road","Restoration Nation","Nap Gains" | Promotes recovery and mobility with light activity and stretching. | recovery, mobility, stretching, active, rest, easy, flexibility, rehab, all levels
5-Day Powerbuilder     | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Rest                | "Power Parade","Builder’s Week","Strength Streak","Rep Rally" | Intense 5-day split for building strength and muscle. | powerbuilder, split, strength, muscle, intense, advanced, hypertrophy, gym, volume
Classic Bro Split      | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Rest                | "Swole Week Classic","Bro Split Supreme","Meathead Medley","Chest Bump Week","Broscience 101" | Classic bro split for muscle isolation and hypertrophy. | bro split, muscle, isolation, hypertrophy, classic, chest, arms, abs, advanced, gym
Endurance Athlete      | Rest                | Endurance           | Cardio              | Endurance           | Cardio              | Endurance           | Rest                | "Marathoner Mode","Enduro Engine","Stamina Saga","Distance Dominator","Cardioholic" | Endurance-focused routine for runners and athletes. | endurance, running, athlete, stamina, cardio, advanced, long distance, race, aerobic
Yoga & Strength        | Rest                | Yoga Flow           | Powerlifting        | Yoga Flow           | Powerlifting        | Yoga Flow           | Rest                | "Zen & Steel","Om & Iron","Stretch & Press","Namaste & Press","Downward Dog Days" | Combines yoga and strength training for flexibility and power. | yoga, strength, flexibility, power, balance, mobility, all levels, recovery
Moderate Full Body     | Rest                | Full Body           | Cardio              | Full Body           | Cardio              | Full Body           | Rest                | "Balanced Beast","Middle Path Muscle","All-Arounder","Goldilocks Routine" | Moderate full-body routine for balanced fitness and recovery. | moderate, full body, balance, fitness, recovery, all levels, strength, easy
Moderate Upper/Lower   | Rest                | Upper Body          | Lower Body          | Cardio              | Upper Body          | Lower Body          | Rest                | "Half & Half Hero","Split the Difference","Upper/Lower Legend","Pants Optional Jr." | Moderate upper/lower split for strength and variety. | moderate, split, upper body, lower body, variety, all levels, strength, muscle
Moderate Push/Pull/Legs| Rest                | Push Day            | Pull Day            | Leg Day             | Cardio              | Full Body           | Rest                | "Push, Pull, Play","PPL Lite","Triple Play","Pushy McPullface Jr." | Moderate push/pull/legs split for all-around fitness. | moderate, push, pull, legs, split, all levels, fitness, strength
Advanced Powerbuilder  | Rest                | Push Day            | Pull Day            | Leg Day             | Upper Body          | Lower Body          | Full Body           | "Elite Engine","Powerhouse Pro","Max Out Week","Repocalypse" | Advanced powerbuilding for experienced lifters. | advanced, powerbuilder, strength, muscle, experienced, gym, volume, hypertrophy
Advanced Athlete       | Cardio              | Athletic Speed      | Plyometrics         | Endurance           | Powerlifting        | HIIT                | Full Body           | "Beast Mode Unlocked","Pro Performance","Athlete Ascend","Sweat Equity" | High-level athletic routine for peak performance. | advanced, athlete, performance, peak, high level, sports, speed, power
Advanced Bro Split     | Rest                | Chest & Triceps     | Back & Biceps       | Shoulders           | Leg Day             | Core & Abs          | Full Body           | "Brofessor's PhD","Bro Split Elite","Swole Scholar","Brolympics" | Advanced bro split for maximum muscle growth. | advanced, bro split, muscle, growth, hypertrophy, chest, arms, abs, gym
`;

export type RoutineTemplate = {
  name: string;
  description: string;
  days: { [day in DayOfWeek]: string | null };
  nicknames?: string[];
  keywords?: string[];
};

export const routineTemplates: RoutineTemplate[] = routineTemplatesData
  .trim()
  .split('\n')
  .map(line => {
    const parts = line.split('|').map(s => s.trim());
    const name = parts[0];
    const days = parts.slice(1, 8);
    const nicknameStr = parts[8] || '';
    const description = parts[9] || '';
    const keywords = parts[10] ? parts[10].split(',').map(k => k.trim()).filter(Boolean) : [];
    // Add brackets to make it a JSON array, then parse
    const nicknames: string[] = JSON.parse(`[${nicknameStr}]`);
    const daysObj = {} as { [day in DayOfWeek]: string | null };
    DAYS_OF_WEEK.forEach((day, i) => {
      const val = days[i]?.toLowerCase() === 'rest' ? null : days[i];
      daysObj[day] = val || null;
    });
    return { name, description, days: daysObj, nicknames, keywords };
  });
