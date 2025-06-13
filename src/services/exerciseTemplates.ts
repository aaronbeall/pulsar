// Exercise suggestions data and parsing logic extracted from routineBuilderService.ts

export interface ExerciseTemplate {
  name: string;
  description: string;
  targetMuscles: string[];
  timed?: boolean;
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
Bench Press            | Chest,Triceps,Shoulders           |         | Classic barbell chest press.                       |
Incline Bench Press    | Chest,Shoulders,Triceps           |         | Barbell or dumbbell incline press.                 |
Decline Bench Press    | Chest,Triceps,Shoulders           |         | Barbell or dumbbell decline press.                 |
Chest Fly              | Chest,Shoulders                   |         | Dumbbell or cable chest fly.                       |
Overhead Press         | Shoulders,Triceps                 |         | Barbell or dumbbell shoulder press.                |
Arnold Press           | Shoulders,Triceps                 |         | Dumbbell rotational shoulder press.                |
Lateral Raise          | Shoulders                         |         | Dumbbell side raise for delts.                     |
Front Raise            | Shoulders                         |         | Dumbbell front raise for delts.                    |
Rear Delt Fly          | Shoulders,Back                    |         | Dumbbell or cable rear delt fly.                   |
Pull-down              | Back,Biceps                       |         | Lat pulldown machine exercise.                     |
Chin-up                | Back,Biceps                       |         | Underhand grip pull-up.                            |
Bent-over Row          | Back,Biceps                       |         | Barbell or dumbbell row.                           |
Seated Row             | Back,Biceps                       |         | Cable or machine seated row.                       |
Face Pull              | Shoulders,Back                    |         | Cable face pull for rear delts.                    |
Bicep Curl             | Biceps                            |         | Dumbbell, barbell, or cable curl.                  |
Hammer Curl            | Biceps,Forearms                   |         | Neutral grip dumbbell curl.                        |
Tricep Extension       | Triceps                           |         | Overhead or cable tricep extension.                |
Skullcrusher           | Triceps                           |         | Lying barbell/dumbbell tricep extension.           |
Tricep Kickback        | Triceps                           |         | Dumbbell tricep kickback.                          |
Cable Pushdown         | Triceps                           |         | Cable tricep pushdown.                             |
Squat Jump             | Quadriceps,Glutes,Hamstrings      | timed   | Explosive plyometric squat.                        |
Goblet Squat           | Quadriceps,Glutes,Hamstrings      |         | Dumbbell/kettlebell squat.                         |
Front Squat            | Quadriceps,Glutes,Hamstrings      |         | Barbell front squat.                               |
Sumo Squat             | Quadriceps,Glutes,Adductors       |         | Wide-stance squat.                                 |
Leg Press              | Quadriceps,Glutes,Hamstrings      |         | Machine leg press.                                 |
Leg Extension          | Quadriceps                        |         | Machine leg extension.                             |
Leg Curl               | Hamstrings                        |         | Machine leg curl.                                  |
Romanian Deadlift      | Hamstrings,Glutes,Back            |         | Barbell or dumbbell RDL.                           |
Deadlift               | Hamstrings,Glutes,Back            |         | Conventional barbell deadlift.                     |
Sumo Deadlift          | Hamstrings,Glutes,Back,Adductors  |         | Wide-stance barbell deadlift.                      |
Good Morning           | Hamstrings,Glutes,Back            |         | Barbell good morning.                              |
Calf Press             | Calves                            |         | Machine calf press.                                |
Standing Calf Raise    | Calves                            |         | Bodyweight or dumbbell calf raise.                 |
Farmer's Walk          | Full Body,Grip                    | timed   | Carrying heavy weights for distance/time.          |
Shrug                  | Traps,Shoulders                   |         | Dumbbell or barbell shrug.                         |
Ab Wheel Rollout       | Abs,Back                          |         | Ab wheel or barbell rollout.                       |
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
Hip Abduction          | Glutes,Hip Abductors              |         | Machine or band hip abduction.                     |
Hip Adduction          | Adductors                         |         | Machine or band hip adduction.                     |
Cable Crunch           | Abs                               |         | Cable machine crunch.                              |
Woodchopper            | Abs,Obliques                      |         | Cable or band diagonal chop.                       |
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
Turkish Get-Up         | Full Body,Core                    |         | Kettlebell get-up from floor.                      |
Kettlebell Swing       | Glutes,Hamstrings,Back            | timed   | Explosive kettlebell swing.                        |
Kettlebell Clean       | Full Body                         |         | Kettlebell clean movement.                         |
Kettlebell Snatch      | Full Body                         |         | Kettlebell snatch movement.                        |
Kettlebell Goblet Squat| Quadriceps,Glutes,Hamstrings      |         | Kettlebell squat.                                  |
Kettlebell Deadlift    | Hamstrings,Glutes,Back            |         | Kettlebell deadlift.                               |
Kettlebell Press       | Shoulders,Triceps                 |         | Kettlebell overhead press.                         |
Kettlebell Row         | Back,Biceps                       |         | Kettlebell row.                                    |
Kettlebell Lunge       | Quadriceps,Glutes,Hamstrings      |         | Kettlebell lunge.                                  |
Kettlebell Windmill    | Core,Shoulders                    |         | Kettlebell windmill.                               |
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
    const [name, muscles, timed, description] = line.split('|');
    return {
      name: name.trim(),
      description: description.trim(),
      targetMuscles: muscles.split(',').map(m => m.trim()),
      ...(timed && timed.trim().toLowerCase() === 'timed' ? { timed: true } : {}),
    };
  });
