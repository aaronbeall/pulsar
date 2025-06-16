// This file contains a list of baseline daily workout templates for routine generation.
// Format: Workout Type | Exercise: Sets x Reps | Exercise: Sets x Reps | ...
// Sets/reps are moderate, can be adjusted later. Use exercise names from the suggestion list.

const dailyWorkoutTemplatesData = `
Arms                | Bicep Curl: 3 x 15      | Tricep Dip: 3 x 12        | Hammer Curl: 2 x 15           | Tricep Kickback: 2 x 12      | "Gun Show","Arm Blast","Pipes Day"
Abs                 | Crunch: 3 x 20          | Plank: 3 x 30s            | Leg Raise: 2 x 15             | Russian Twist: 2 x 20        | "Six Pack","Core Crusher","Ab Attack"
Butt                | Glute Bridge: 3 x 15    | Hip Thrust: 3 x 12        | Donkey Kick: 2 x 15           | Clamshell: 2 x 15            | "Booty Day","Glutes","Peach Day"
Core                | Plank: 3 x 30s          | Dead Bug: 3 x 15          | Bird Dog: 3 x 12              | Side Plank: 2 x 30s          | "Core Strength","Midsection","Torso Day"
Legs                | Squat: 3 x 15           | Lunge: 3 x 12             | Calf Raise: 3 x 15            | Step-up: 2 x 12              | "Leg Day","Wheels","Quads & Hams"
Leg Day             | Squat: 3 x 12           | Lunge: 2 x 12             | Calf Raise: 3 x 15            | Glute Bridge: 2 x 15         | "Wheels","Lower Body","Thunder Thighs"
Push Day            | Push-up: 3 x 12         | Bench Press: 3 x 10       | Overhead Press: 2 x 10        | Tricep Dip: 2 x 12           | "Chest & Tris","Press Day","Push Power"
Pull Day            | Pull-up: 3 x 8          | Bent-over Row: 3 x 10     | Bicep Curl: 2 x 12            | Face Pull: 2 x 15            | "Back & Bis","Pull Power","Row Day"
Full Body           | Burpee: 2 x 15          | Jumping Jack: 2 x 30s     | Plank: 2 x 30s                | Mountain Climber: 2 x 30s    | "Total Body","All-In","Everything Day"
Core & Abs          | Plank: 3 x 30s          | Russian Twist: 2 x 20     | Bicycle Crunch: 2 x 20        | Leg Raise: 2 x 15            | "Ab Blast","Core Focus","Midriff"
Upper Body          | Push-up: 3 x 12         | Pull-up: 2 x 8            | Overhead Press: 2 x 10        | Bicep Curl: 2 x 12           | "Upper","Top Half","Guns & Shoulders"
Lower Body          | Squat: 3 x 12           | Step-up: 2 x 12           | Calf Raise: 3 x 15            | Hip Thrust: 2 x 15           | "Lower","Legs","Base Day"
Cardio              | Jump Rope: 3 x 30s      | High Knees: 2 x 30s       | Jumping Jack: 2 x 30s         | Mountain Climber: 2 x 30s    | "Sweat Sesh","Heart Pump","HIIT"
Glutes & Hamstrings | Hip Thrust: 3 x 12      | Romanian Deadlift: 3 x 10 | Glute Bridge: 2 x 15          | Donkey Kick: 2 x 15          | "Booty Builder","Backside","Posterior Chain"
Chest & Triceps     | Bench Press: 3 x 10     | Push-up: 2 x 15           | Tricep Dip: 2 x 12            | Chest Fly: 2 x 12            | "Chest Day","Push","Pecs & Tris"
Back & Biceps       | Pull-up: 3 x 8          | Seated Row: 3 x 10        | Bicep Curl: 2 x 12            | Face Pull: 2 x 15            | "Back Day","Pull","Lats & Bis"
Shoulders           | Overhead Press: 3 x 10  | Lateral Raise: 2 x 15     | Front Raise: 2 x 12           | Rear Delt Fly: 2 x 12        | "Delts","Shoulder Shred","Cap Day"
Mobility & Stretch  | Plank: 2 x 30s          | Bird Dog: 2 x 12          | Side Plank: 2 x 30s           | Clamshell: 2 x 15            | "Stretch","Flexibility","Mobility"
Plyometrics         | Box Jump: 3 x 8         | Jump Squat: 2 x 12        | Burpee: 2 x 12                | Mountain Climber: 2 x 30s    | "Jump Day","Explosive","Power Plyo"
Kettlebell          | Kettlebell Swing: 3 x 30s| Goblet Squat: 2 x 12     | Kettlebell Press: 2 x 10      | Kettlebell Row: 2 x 12       | "KB Day","Bell Blast","Swing Sesh"
HIIT                | Burpee: 3 x 12          | Jumping Jack: 3 x 30s     | Mountain Climber: 3 x 30s     | Plank: 3 x 30s               | "High Intensity","Quick Burn","HIIT"
Powerlifting        | Deadlift: 5 x 5         | Bench Press: 5 x 5        | Squat: 5 x 5                  | Pull-up: 3 x 8               | "Power","Strength","Big Lifts"
Hypertrophy Upper   | Bench Press: 4 x 10     | Pull-up: 4 x 8            | Overhead Press: 3 x 12        | Bicep Curl: 3 x 15           | "Upper Pump","Muscle Gain","Upper Hypertrophy"
Hypertrophy Lower   | Squat: 4 x 10           | Romanian Deadlift: 4 x 10 | Calf Raise: 3 x 20            | Lunge: 3 x 12                | "Lower Pump","Muscle Gain","Lower Hypertrophy"
Endurance           | Jump Rope: 4 x 30s      | Plank: 3 x 30s            | High Knees: 3 x 30s           | Step-up: 3 x 20              | "Stamina","Long Haul","Enduro"
Athletic Speed      | Box Jump: 3 x 10        | High Knees: 3 x 30s       | Jump Squat: 3 x 12            | Mountain Climber: 3 x 30s    | "Speed","Agility","Quickness"
Yoga Flow           | Plank: 2 x 30s          | Bird Dog: 2 x 12          | Side Plank: 2 x 30s           | Glute Bridge: 2 x 15         | "Yoga","Flow","Stretch"
Active Recovery     | Walking: 1 x 600s       | Stretch: 1 x 600s         | Bird Dog: 2 x 12              | Clamshell: 2 x 15            | "Recovery","Rest","Light Day"
Bodyweight Only     | Push-up: 3 x 15         | Squat: 3 x 15             | Plank: 3 x 30s                | Lunge: 3 x 12                | "Calisthenics","No Equipment","Bodyweight Bash","Prison Yard Pump"
Dumbbell Only       | Goblet Squat: 3 x 12    | Bicep Curl: 3 x 15        | Tricep Kickback: 3 x 12       | Lateral Raise: 3 x 15        | "DB Day","Dumbbell","Free Weights","Dumbbell Daze"
Machine Only        | Leg Press: 3 x 12       | Seated Row: 3 x 12        | Chest Fly: 3 x 12             | Leg Extension: 3 x 15        | "Machines","Gym Only","Selectorized","Robo Reps"
Barbell Only        | Deadlift: 4 x 8         | Bench Press: 4 x 8        | Bent-over Row: 4 x 10         | Front Squat: 4 x 8           | "Barbell","Free Weights","BB Day","Barbell Bonanza"
Core Stability      | Plank: 3 x 30s          | Dead Bug: 3 x 15          | Bird Dog: 3 x 12              | Russian Twist: 3 x 20        | "Stability","Core Balance","Anti-Rotation","Wobble Warrior"
Grip Strength       | Farmer's Walk: 4 x 30s  | Shrug: 3 x 15             | Deadlift: 3 x 8               | Hanging Leg Raise: 3 x 10    | "Grip","Forearms","Hold Power","Vice City"
Sprints             | Running: 8 x 30s        | Walking: 8 x 60s          | Plank: 3 x 30s                | Jumping Jack: 3 x 30s        | "Speedwork","Sprint Day","Intervals","Zoomies"
Rowing              | Row Machine: 4 x 30s    | Plank: 3 x 30s            | Push-up: 3 x 12               | Squat: 3 x 12                | "Row","Crew","Erg Day","Row Row Row"
Swimming            | Swimming: 6 x 30s       | Plank: 3 x 30s            | Push-up: 3 x 12               | Glute Bridge: 3 x 15         | "Swim","Pool","Laps","Aqua Gains"
Stair Climber       | Stair Climber: 5 x 30s  | Plank: 3 x 30s            | Lunge: 3 x 12                 | Calf Raise: 3 x 15           | "Stairs","Stepper","Climb Day","Stairway to Heaven"
Elliptical          | Elliptical: 5 x 30s     | Plank: 3 x 30s            | Push-up: 3 x 12               | Squat: 3 x 12                | "Elliptical","Cross Trainer","Cardio Machine","Ovals Only"
Sled Training       | Sled Push: 4 x 30s      | Sled Drag: 4 x 30s        | Plank: 3 x 30s                | Goblet Squat: 3 x 12         | "Sled","Push/Pull","Power Sled","Winter Games"
Battle Ropes        | Battle Rope Wave: 5 x 30s| Plank: 3 x 30s           | Push-up: 3 x 12               | Squat: 3 x 12                | "Ropes","Battle","Rope Burn","Whip It Good"
Boxing              | Boxing: 5 x 30s         | Plank: 3 x 30s            | Push-up: 3 x 12               | Jumping Jack: 3 x 30s        | "Box","Fight","Gloves","Punch Drunk"
Turkish Get-Up      | Turkish Get-Up: 3 x 8   | Plank: 3 x 30s            | Goblet Squat: 3 x 12          | Kettlebell Swing: 3 x 30s    | "TGU","Get-Up","Kettlebell Flow","Turkish Delight"
`;


export type DailyWorkoutTemplate = {
  day: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps?: number;
    duration?: number;
  }>;
  nicknames: string[];
};

export const dailyWorkoutTemplates = dailyWorkoutTemplatesData
  .trim()
  .split('\n')
  .map(line => {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    const day = parts[0];
    const exercises = parts.slice(1, -1).map(e => parseExercise(e)).filter(Boolean);
    const nicknameStr = parts[parts.length - 1] || '';
    // Add brackets to make it a JSON array, then parse
    const nicknames: string[] = JSON.parse(`[${nicknameStr}]`);
    return {
      day,
      exercises,
      nicknames,
    };
  });

// Helper to parse an exercise string like 'Plank: 3 x 30s' or 'Push-up: 3 x 12'
function parseExercise(str: string) {
  // Example: 'Plank: 3 x 30s' or 'Push-up: 3 x 12'
  const [namePart, rest] = str.split(':').map(s => s.trim());
  if (!rest) return { name: namePart, sets: 1 };
  const [setsStr, repsOrDurStr] = rest.split('x').map(s => s.trim());
  const sets = parseInt(setsStr, 10) || 1;
  if (!repsOrDurStr) return { name: namePart, sets };
  // Check for duration (ends with 's')
  if (/^\d+s$/.test(repsOrDurStr)) {
    return { name: namePart, sets, duration: parseInt(repsOrDurStr.replace('s', ''), 10) };
  }
  // Otherwise, treat as reps
  const reps = parseInt(repsOrDurStr, 10);
  if (!isNaN(reps)) {
    return { name: namePart, sets, reps };
  }
  return { name: namePart, sets };
}