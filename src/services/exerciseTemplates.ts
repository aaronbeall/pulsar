// Exercise suggestions data and parsing logic extracted from routineBuilderService.ts

export interface ExerciseTemplate {
  name: string;
  description: string;
  targetMuscles: string[];
  timed?: boolean;
  relativeWeight?: number; // 0 (lightest) to 1 (heaviest)
  imageUrl?: string; // pre-resolved image (e.g. from free-exercise-db) — skips live search
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
Band Chest Press       | Chest,Triceps,Shoulders           |         | Press a band anchored behind you straight forward. | 0.2
Band Shoulder Press    | Shoulders,Triceps                 |         | Stand on a band and press it overhead.             | 0.2
Pike Push-up           | Shoulders,Triceps                 |         | Push-up with hips high, lowering the head toward the floor. |
Band Row               | Back,Biceps                       |         | Pull an anchored band toward your ribs.            | 0.2
Doorway Row            | Back,Biceps                       |         | Hold a door frame, lean back and pull yourself in. |
Band Pulldown          | Lats,Biceps                       |         | Pull a band anchored overhead down to your chest.  | 0.2
Standing Knee Raise    | Abs,Hip Flexors                   |         | Standing, drive one knee up at a time and brace.   |
Marching in Place      | Legs,Full Body                    | timed   | Brisk march on the spot with arm swing.            |
Downward Dog           | Hamstrings,Calves,Shoulders       | timed   | Yoga pose, hips high, heels reaching down.         |
Cobra                  | Back,Abs                          | timed   | Lying face down, press the chest up gently.        |
Sliding Leg Curl       | Hamstrings,Glutes                 |         | Bridge up and slide the heels in and out on a towel or sliders. |
Frog Pump              | Glutes                            |         | Short glute bridge with the soles of the feet together. |
Cable Hip Abduction    | Glutes                            |         | Swing the leg out to the side against a low cable. | 0.2
Curtsy Lunge           | Glutes,Quadriceps                 |         | Step one leg behind and across, then lower.        |
Bulgarian Split Squat  | Quadriceps,Glutes                 |         | Split squat with the back foot raised on a bench.  | 0.4
Single Leg Calf Raise  | Calves                            |         | Rise onto the toes of one foot, slow on the way down. |
Tibialis Raise         | Shins                             |         | Back against a wall, lift the toes toward the shins. |
Knee Push-up           | Chest,Triceps,Shoulders           |         | Push-up from the knees.                            |
Wall Push-up           | Chest,Triceps,Shoulders           |         | Push-up against a wall, the gentlest version.      |
Diamond Push-up        | Triceps,Chest                     |         | Push-up with the hands close under the chest.      |
Band Chest Fly         | Chest                             |         | Bring the arms together in front against a band.   | 0.2
Push-up Plus           | Serratus,Chest                    |         | From the top of a push-up, push the floor away to spread the shoulder blades. |
Landmine Press         | Shoulders,Chest,Triceps           |         | Press the end of a barbell anchored in a corner.   | 0.5
Wall Walk              | Shoulders,Core                    |         | From a push-up, walk the feet up a wall and the hands in. |
Plank to Downward Dog  | Shoulders,Core                    |         | From a high plank, push the hips up and back.      |
Lu Raise               | Shoulders                         |         | Light lateral raise all the way overhead.          | 0.2
Prone Y Raise          | Upper Back,Shoulders              |         | Face down, raise the arms in a Y.                  | 0.1
Reverse Snow Angel     | Upper Back,Shoulders              |         | Face down, sweep the arms from the hips to overhead. |
Towel Row              | Back,Biceps                       |         | Loop a towel around a sturdy post and row yourself in. |
Table Row              | Back,Biceps                       |         | Under a sturdy table, pull your chest up to the edge. |
Negative Pull-up       | Back,Biceps                       |         | Jump to the top of a pull-up and lower slowly.     |
Dead Hang              | Grip,Shoulders,Back               | timed   | Hang from a bar with relaxed shoulders.            |
Doorway Curl           | Biceps                            |         | Hold a door frame and curl your body toward it.    |
Band Pushdown          | Triceps                           |         | Press a band anchored overhead down to your thighs. | 0.2
Hollow Body Hold       | Abs                               | timed   | On your back, lift the shoulders and legs and hold. |
Standing Oblique Crunch| Obliques                          |         | Standing, bring the knee up to the same-side elbow. |
Bear Hold              | Abs,Shoulders,Quadriceps          | timed   | On hands and toes with knees just off the floor, hold. |
Hanging Knee Raise     | Abs,Hip Flexors,Grip              |         | Hang from a bar and draw the knees up.             |
Band Anti-Rotation Hold| Abs,Obliques                      | timed   | Hold an anchored band at the chest without twisting. | 0.2
Suitcase Carry         | Obliques,Grip,Full Body           | timed   | Walk tall with a weight in one hand.               | 0.6
Overhead Carry         | Shoulders,Core                    | timed   | Walk with a weight locked out overhead.            | 0.4
Front Rack Carry       | Core,Upper Back                   | timed   | Walk with weights held at the shoulders.           | 0.6
Skater Hops            | Legs,Glutes,Full Body             | timed   | Hop side to side, landing on one leg.              |
Step Jack              | Full Body                         | timed   | Low-impact jumping jack, stepping one foot out at a time. |
Squat Thrust           | Full Body                         | timed   | Squat, step or jump back to a plank, and back up.  |
Plank Jack             | Abs,Shoulders,Full Body           | timed   | In a plank, jump the feet out and in.              |
Lateral Shuffle        | Legs,Full Body                    | timed   | Quick side-to-side shuffle in an athletic stance.  |
Squat to Press         | Full Body                         | timed   | Squat with weights at the shoulders, then press overhead as you stand. | 0.4
Shadow Boxing          | Shoulders,Full Body               | timed   | Throw punch combinations in the air, light on your feet. |
Standing Cross Crunch  | Obliques,Full Body                | timed   | Standing, alternate knee to opposite elbow.        |
Hiking                 | Legs,Full Body                    | timed   | Walking outdoors over hills or trails.             |
Incline Treadmill Walk | Legs,Glutes                       | timed   | Brisk walk on a steep treadmill incline.           |
Water Aerobics         | Full Body                         | timed   | Low-impact moves in waist- to chest-deep water.    |
Pigeon Pose            | Glutes,Hips                       | timed   | Yoga hip opener with one shin folded in front.     |
Thread the Needle      | Upper Back,Shoulders              | timed   | On all fours, reach one arm under the other and rotate. |
Happy Baby             | Hips,Lower Back                   | timed   | On your back, hold the feet with the knees wide.   |
Leg Swings             | Hips,Hamstrings                   | timed   | Swing each leg front to back and side to side.     |
Single Leg Deadlift    | Hamstrings,Glutes,Balance         |         | Hinge on one leg, reaching the other leg back.     | 0.3
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
