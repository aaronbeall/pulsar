// Exercise suggestions data and parsing logic extracted from routineBuilderService.ts

export interface ExerciseTemplate {
  name: string;
  description: string;
  targetMuscles: string[];
  timed?: boolean;
  relativeWeight: number; // 0 (lightest) to 1 (heaviest)
}

export const exerciseTemplatesData = `
Push-up                | Chest,Triceps,Shoulders           |         | A basic upper body exercise.                       |
Squat                  | Quadriceps,Glutes,Hamstrings      |         | A fundamental lower body exercise.                 |
Plank                  | Abs,Back,Shoulders                | timed   | A core strengthening exercise.                     |
Lunge                  | Quadriceps,Glutes,Hamstrings      |         | A lower body exercise for balance and strength.    |
Burpee                 | Full Body                         | timed   | A full-body cardio exercise.                       |
Pull-up                | Back,Biceps,Shoulders             |         | An upper body pulling exercise.                    |
Sit-up                 | Abs,Hip Flexors                   |         | A classic core exercise.                           |
Crunch                 | Abs                               |         | A focused abdominal exercise.                      |
Mountain Climber       | Abs,Shoulders,Legs                | timed   | A dynamic core and cardio move.                    |
Jumping Jack           | Full Body                         | timed   | A full-body warmup and cardio move.                |
Tricep Dip             | Triceps,Shoulders                 |         | Targets the triceps and shoulders.                 |
Glute Bridge           | Glutes,Hamstrings                 |         | Strengthens glutes and hamstrings.                 |
Russian Twist          | Abs,Obliques                      |         | A rotational core exercise.                        |
Superman               | Back,Glutes,Hamstrings            |         | Back and posterior chain exercise.                 |
High Knees             | Legs,Abs                          | timed   | Cardio and leg endurance.                          |
Wall Sit               | Quadriceps,Glutes,Abs             | timed   | Isometric leg and core hold.                       |
Side Plank             | Obliques,Abs,Shoulders            | timed   | Oblique and core isometric hold.                   |
Calf Raise             | Calves                            |         | Strengthens calves.                                |
Bicycle Crunch         | Abs,Obliques                      |         | Dynamic core exercise.                             |
Step-up                | Quadriceps,Glutes,Hamstrings      |         | Leg and glute strength.                            |
Shoulder Tap           | Shoulders,Abs                     | timed   | Core and shoulder stability.                       |
Bear Crawl             | Full Body                         | timed   | Full-body movement.                                |
Dead Bug               | Abs,Hip Flexors                   |         | Core stability exercise.                           |
Reverse Lunge          | Quadriceps,Glutes,Hamstrings      |         | Leg and glute strength.                            |
Hip Thrust             | Glutes,Hamstrings                 |         | Glute and hamstring strength.                      |
Leg Raise              | Abs,Hip Flexors                   |         | Lower abs exercise.                                |
Jump Squat             | Quadriceps,Glutes,Hamstrings      | timed   | Explosive leg power.                               |
Forearm Plank          | Abs,Shoulders,Back                | timed   | Core and shoulder isometric hold.                  |
Side Lunge             | Quadriceps,Glutes,Hamstrings      |         | Lateral leg strength.                              |
Box Jump               | Quadriceps,Glutes,Hamstrings      |         | Plyometric leg power.                              |
Jump Rope              | Full Body                         | timed   | Cardio and coordination.                           |
Bench Press            | Chest,Triceps,Shoulders           |         | Classic barbell chest press.                       | 1
Incline Bench Press    | Chest,Shoulders,Triceps           |         | Barbell or dumbbell incline press.                 | 0.9
Decline Bench Press    | Chest,Triceps,Shoulders           |         | Barbell or dumbbell decline press.                 | 0.9
Chest Fly              | Chest,Shoulders                   |         | Dumbbell or cable chest fly.                       | 0.6
Overhead Press         | Shoulders,Triceps                 |         | Barbell or dumbbell shoulder press.                | 0.8
Arnold Press           | Shoulders,Triceps                 |         | Dumbbell rotational shoulder press.                | 0.7
Lateral Raise          | Shoulders                         |         | Dumbbell side raise for delts.                     | 0.4
Front Raise            | Shoulders                         |         | Dumbbell front raise for delts.                    | 0.4
Rear Delt Fly          | Shoulders,Back                    |         | Dumbbell or cable rear delt fly.                   | 0.4
Pull-down              | Back,Biceps                       |         | Lat pulldown machine exercise.                     | 0.7
Chin-up                | Back,Biceps                       |         | Underhand grip pull-up.                            |
Bent-over Row          | Back,Biceps                       |         | Barbell or dumbbell row.                           | 0.8
Seated Row             | Back,Biceps                       |         | Cable or machine seated row.                       | 0.7
Face Pull              | Shoulders,Back                    |         | Cable face pull for rear delts.                    | 0.4
Bicep Curl             | Biceps                            |         | Dumbbell, barbell, or cable curl.                  | 0.5
Hammer Curl            | Biceps,Forearms                   |         | Neutral grip dumbbell curl.                        | 0.5
Tricep Extension       | Triceps                           |         | Overhead or cable tricep extension.                | 0.5
Skullcrusher           | Triceps                           |         | Lying barbell/dumbbell tricep extension.           | 0.6
Tricep Kickback        | Triceps                           |         | Dumbbell tricep kickback.                          | 0.4
Cable Pushdown         | Triceps                           |         | Cable tricep pushdown.                             | 0.5
Squat Jump             | Quadriceps,Glutes,Hamstrings      | timed   | Explosive plyometric squat.                        |
Goblet Squat           | Quadriceps,Glutes,Hamstrings      |         | Dumbbell/kettlebell squat.                         | 0.7
Front Squat            | Quadriceps,Glutes,Hamstrings      |         | Barbell front squat.                               | 0.9
Sumo Squat             | Quadriceps,Glutes,Adductors       |         | Wide-stance squat.                                 |
Leg Press              | Quadriceps,Glutes,Hamstrings      |         | Machine leg press.                                 | 0.9
Leg Extension          | Quadriceps                        |         | Machine leg extension.                             | 0.5
Leg Curl               | Hamstrings                        |         | Machine leg curl.                                  | 0.5
Romanian Deadlift      | Hamstrings,Glutes,Back            |         | Barbell or dumbbell RDL.                           | 0.9
Deadlift               | Hamstrings,Glutes,Back            |         | Conventional barbell deadlift.                     | 1
Sumo Deadlift          | Hamstrings,Glutes,Back,Adductors  |         | Wide-stance barbell deadlift.                      | 1
Good Morning           | Hamstrings,Glutes,Back            |         | Barbell good morning.                              | 0.7
Calf Press             | Calves                            |         | Machine calf press.                                | 0.5
Standing Calf Raise    | Calves                            |         | Bodyweight or dumbbell calf raise.                 | 0.3
Farmer's Walk          | Full Body,Grip                    | timed   | Carrying heavy weights for distance/time.          |
Shrug                  | Traps,Shoulders                   |         | Dumbbell or barbell shrug.                         | 0.6
Ab Wheel Rollout       | Abs,Back                          |         | Ab wheel or barbell rollout.                       | 0.4
Hanging Leg Raise      | Abs,Hip Flexors                   |         | Hanging from bar, raise legs.                      |
Toe Touch              | Abs,Hamstrings                    |         | Lying or standing toe touch.                       |
V-Up                   | Abs,Hip Flexors                   |         | Simultaneous leg and torso raise.                  |
Flutter Kick           | Abs,Hip Flexors                   | timed   | Alternating leg kicks.                             |
Scissor Kick           | Abs,Hip Flexors                   | timed   | Alternating crossing legs.                         |
Plank Up-Down          | Abs,Shoulders,Triceps             | timed   | Alternating forearm and hand plank.                |
Bird Dog               | Abs,Back,Glutes                   |         | Quadruped opposite arm/leg raise.                  |
Donkey Kick            | Glutes,Hamstrings                 |         | Quadruped glute kickback.                          |
Fire Hydrant           | Glutes,Hip Abductors              |         | Quadruped lateral leg raise.                       |
Clamshell              | Glutes,Hip Abductors              |         | Side-lying hip abduction.                          |
Hip Abduction          | Glutes,Hip Abductors              |         | Machine or band hip abduction.                     | 0.4
Hip Adduction          | Adductors                         |         | Machine or band hip adduction.                     | 0.4
Cable Crunch           | Abs                               |         | Cable machine crunch.                              | 0.5
Woodchopper            | Abs,Obliques                      |         | Cable or band diagonal chop.                       | 0.4
Medicine Ball Slam     | Full Body,Abs                     | timed   | Overhead slam with medicine ball.                  |
Sled Push              | Full Body,Legs                    | timed   | Weighted sled push.                                |
Battle Rope Wave       | Shoulders,Arms,Abs                | timed   | Alternating rope waves.                            |
Boxing                 | Full Body,Arms,Abs                | timed   | Shadow boxing or bag work.                         |
Rowing                 | Full Body,Back,Legs               | timed   | Rowing machine.                                    |
Cycling                | Legs,Cardio                       | timed   | Stationary or outdoor cycling.                     |
Running                | Legs,Cardio                       | timed   | Treadmill or outdoor running.                      |
Walking                | Legs,Cardio                       | timed   | Brisk walking.                                     |
Stair Climber          | Legs,Cardio                       | timed   | Stair machine or stairs.                           |
Elliptical             | Full Body,Cardio                  | timed   | Elliptical machine.                                |
Swimming               | Full Body,Cardio                  | timed   | Lap swimming.                                      |
Jump Rope              | Full Body                         | timed   | Cardio and coordination.                           |
Ski Erg                | Full Body,Cardio                  | timed   | Ski erg machine.                                   |
Row Machine            | Full Body,Back,Legs               | timed   | Rowing machine.                                    |
Sled Drag              | Full Body,Legs                    | timed   | Weighted sled drag.                                |
Turkish Get-Up         | Full Body,Core                    |         | Kettlebell get-up from floor.                      | 0.7
Kettlebell Swing       | Glutes,Hamstrings,Back            | timed   | Explosive kettlebell swing.                        | 0.6
Kettlebell Clean       | Full Body                         |         | Kettlebell clean movement.                         | 0.7
Kettlebell Snatch      | Full Body                         |         | Kettlebell snatch movement.                        | 0.8
Kettlebell Goblet Squat| Quadriceps,Glutes,Hamstrings      |         | Kettlebell squat.                                  | 0.7
Kettlebell Deadlift    | Hamstrings,Glutes,Back            |         | Kettlebell deadlift.                               | 0.8
Kettlebell Press       | Shoulders,Triceps                 |         | Kettlebell overhead press.                         | 0.7
Kettlebell Row         | Back,Biceps                       |         | Kettlebell row.                                    | 0.7
Kettlebell Lunge       | Quadriceps,Glutes,Hamstrings      |         | Kettlebell lunge.                                  | 0.6
Kettlebell Windmill    | Core,Shoulders                    |         | Kettlebell windmill.                               | 0.5
Pistol Squat           | Quadriceps,Glutes,Hamstrings      |         | Single-leg squat.                                  |
Nordic Curl            | Hamstrings,Glutes                 |         | Assisted hamstring curl.                           |
Glute Ham Raise        | Hamstrings,Glutes                 |         | GHR machine or partner.                            |
Sissy Squat            | Quadriceps                        |         | Deep knee squat.                                   |
Reverse Hyper          | Glutes,Hamstrings,Back            |         | Reverse hyperextension machine.                    |
Weighted Carry         | Full Body,Grip                    | timed   | Carrying heavy weights.                            |
Farmer's Walk          | Full Body,Grip                    | timed   | Carrying heavy weights for distance/time.          |
Stretch                | Full Body                         | timed   | General stretching routine for flexibility and recovery. |
`;

export const exerciseTemplates: ExerciseTemplate[] = exerciseTemplatesData
  .trim()
  .split('\n')
  .map(line => {
    const [name, muscles, timed, description, relativeWeight] = line.split('|');
    return {
      name: name.trim(),
      description: description.trim(),
      targetMuscles: muscles.split(',').map(m => m.trim()),
      ...(timed && timed.trim().toLowerCase() === 'timed' ? { timed: true } : {}),
      relativeWeight: relativeWeight ? parseFloat(relativeWeight.trim()) : 0.0,
    };
  });
