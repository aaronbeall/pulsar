// The exercises the planner can choose from, each tagged with the movement slots it fills,
// the equipment it needs, how hard it is, which injured areas it loads, and activity tags
// that dislikes and conditions filter on. Names match the curated exercise list
// (exerciseTemplates.ts) or free-exercise-db where possible, so they resolve to known
// exercises with descriptions and photos.
//
// Table format, one exercise per line:
//   Name | slots | equipment | level | limits | tags | seconds | priority
// - equipment: alternatives separated by "/", items within one alternative by "+", "-" for
//   none. "-/dumbbell" means it works with no equipment or with dumbbells.
// - level: 1 (anyone) to 3 (experienced).
// - limits: injured areas it's unsuitable for (see Limit in profile.ts).
// - tags: Activity names plus impact, supine (lying on the back), prone (on the belly),
//   overhead, heavy, hang.
// - seconds: set when it's done for time rather than reps.
// - priority: 1-3, how much of a staple it is for its slot.

import type { Activity, Equipment, Limit } from './profile';

export type Slot =
  | 'squat' | 'hinge' | 'lunge' | 'glute' | 'quad' | 'hamstring' | 'calf'
  | 'hPush' | 'vPush' | 'chestIso' | 'shoulderIso' | 'rearDelt' | 'hPull' | 'vPull' | 'biceps' | 'triceps'
  | 'core' | 'carry' | 'cond' | 'cardio' | 'mobility';

export type ExerciseTag = Activity | 'impact' | 'supine' | 'prone' | 'overhead' | 'heavy' | 'hang';

export interface CatalogExercise {
  name: string;
  slots: Slot[];
  /** Any one of these sets of equipment is enough; an empty set means bodyweight. */
  equipment: Equipment[][];
  level: 1 | 2 | 3;
  limits: Limit[];
  tags: ExerciseTag[];
  seconds?: number;
  priority: number;
}

const CATALOG_DATA = `
Bodyweight Squat        | squat                 | -                          | 1 | knee                    | squats                              |    | 2
Goblet Squat            | squat                 | dumbbell/kettlebell        | 1 |                         | squats                              |    | 3
Barbell Squat           | squat                 | barbell                    | 2 | knee,back,neck          | squats,heavy                        |    | 3
Front Squat             | squat                 | barbell                    | 3 | knee,back,wrist         | squats,heavy                        |    | 2
Leg Press               | squat,quad            | machine                    | 1 |                         |                                     |    | 3
Box Squat               | squat                 | -                          | 1 |                         | squats                              |    | 2
Sumo Squat              | squat                 | -/dumbbell/kettlebell      | 1 | knee,hip                | squats                              |    | 1
Wall Sit                | quad                  | -                          | 1 |                         |                                     | 40 | 1
Romanian Deadlift       | hinge,hamstring       | barbell/dumbbell/kettlebell| 2 | back                    | deadlifts                           |    | 3
Deadlift                | hinge                 | barbell                    | 2 | back                    | deadlifts,heavy                     |    | 3
Kettlebell Deadlift     | hinge                 | kettlebell                 | 1 |                         | deadlifts                           |    | 2
Glute Bridge            | hinge,glute           | -                          | 1 |                         | floor,supine                        |    | 2
Single Leg Glute Bridge | glute                 | -                          | 2 |                         | floor,supine                        |    | 1
Hip Thrust              | glute,hinge           | barbell+bench/dumbbell     | 1 |                         |                                     |    | 3
Band Good Morning       | hinge,hamstring       | band                       | 1 | back                    |                                     |    | 1
Superman                | hinge,core            | -                          | 1 |                         | floor,prone                             |    | 1
Leg Curl                | hamstring             | machine                    | 1 |                         |                                     |    | 2
Nordic Curl             | hamstring             | -                          | 3 | knee                    | floor                               |    | 1
Reverse Lunge           | lunge                 | -/dumbbell/kettlebell      | 1 | knee                    | lunges                              |    | 3
Lunge                   | lunge                 | -/dumbbell                 | 1 | knee                    | lunges                              |    | 2
Step-up                 | lunge,quad            | -/dumbbell                 | 1 |                         | stairs                              |    | 2
Split Squats            | lunge,quad            | -/dumbbell                 | 2 | knee                    | lunges                              |    | 2
Side Lunge              | lunge                 | -/dumbbell                 | 1 | knee,hip                | lunges                              |    | 1
Donkey Kick             | glute                 | -                          | 1 | wrist                   | floor                               |    | 1
Fire Hydrant            | glute                 | -                          | 1 | wrist                   | floor                               |    | 1
Clamshell               | glute                 | -/band                     | 1 |                         | floor                               |    | 1
Hip Abduction           | glute                 | machine/band               | 1 |                         |                                     |    | 1
Glute Kickback          | glute                 | cable/band                 | 1 |                         |                                     |    | 2
Monster Walk            | glute                 | band                       | 1 |                         |                                     |    | 2
Leg Extension           | quad                  | machine                    | 1 | knee                    |                                     |    | 2
Calf Raise              | calf                  | -/dumbbell                 | 1 | ankle                   |                                     |    | 2
Seated Calf Raise       | calf                  | machine                    | 1 |                         |                                     |    | 1
Push-up                 | hPush                 | -                          | 1 | wrist                   | pushups,floor                       |    | 3
Incline Push-Up         | hPush                 | -                          | 1 | wrist                   | pushups                             |    | 2
Bench Press             | hPush                 | barbell+bench              | 2 | shoulder                | heavy,supine                        |    | 3
Dumbbell Bench Press    | hPush                 | dumbbell+bench             | 1 |                         | supine                              |    | 3
Dumbbell Floor Press    | hPush                 | dumbbell                   | 1 |                         | supine,floor                        |    | 2
Incline Dumbbell Press  | hPush,chestIso        | dumbbell+bench             | 1 | shoulder                |                                     |    | 2
Cable Chest Press       | hPush                 | cable/machine              | 1 |                         |                                     |    | 2
Band Chest Press        | hPush                 | band                       | 1 |                         |                                     |    | 1
Chest Fly               | chestIso              | dumbbell+bench/cable/machine| 1 | shoulder               | supine                              |    | 2
Bench Dips              | triceps               | -                          | 1 | shoulder,wrist,elbow    |                                     |    | 1
Overhead Press          | vPush                 | barbell/dumbbell           | 1 | shoulder,neck           | overhead                            |    | 3
Arnold Press            | vPush                 | dumbbell                   | 2 | shoulder                | overhead                            |    | 1
Kettlebell Press        | vPush                 | kettlebell                 | 1 | shoulder                | overhead                            |    | 2
Band Shoulder Press     | vPush                 | band                       | 1 | shoulder                | overhead                            |    | 1
Pike Push-up            | vPush                 | -                          | 2 | shoulder,wrist          | overhead,floor                      |    | 2
Lateral Raise           | shoulderIso           | dumbbell/cable/band        | 1 |                         |                                     |    | 3
Front Raise             | shoulderIso           | dumbbell                   | 1 | shoulder                |                                     |    | 1
Rear Delt Fly           | rearDelt              | dumbbell/cable/machine     | 1 |                         |                                     |    | 2
Face Pull               | rearDelt              | cable/band                 | 1 |                         |                                     |    | 3
Band Pull Apart         | rearDelt              | band                       | 1 |                         |                                     |    | 2
Bent-over Row           | hPull                 | barbell/dumbbell           | 1 | back                    |                                     |    | 3
One-Arm Dumbbell Row    | hPull                 | dumbbell                   | 1 |                         |                                     |    | 3
Seated Row              | hPull                 | cable/machine              | 1 |                         |                                     |    | 3
Inverted Row            | hPull                 | barbell                    | 2 |                         |                                     |    | 2
Kettlebell Row          | hPull                 | kettlebell                 | 1 |                         |                                     |    | 2
Band Row                | hPull                 | band                       | 1 |                         |                                     |    | 2
Doorway Row             | hPull                 | -                          | 1 |                         |                                     |    | 1
Pull-up                 | vPull                 | pullupBar                  | 2 | shoulder,elbow          | pullups,hang                        |    | 3
Chin-up                 | vPull,biceps          | pullupBar                  | 2 | shoulder,elbow          | pullups,hang                        |    | 2
Band Assisted Pull-Up   | vPull                 | pullupBar+band             | 1 | shoulder                | pullups,hang                        |    | 2
Pull-down               | vPull                 | cable/machine              | 1 |                         |                                     |    | 3
Band Pulldown           | vPull                 | band                       | 1 |                         |                                     |    | 1
Bicep Curl              | biceps                | dumbbell/barbell/cable/band| 1 |                         |                                     |    | 3
Hammer Curl             | biceps                | dumbbell                   | 1 |                         |                                     |    | 2
Tricep Kickback         | triceps               | dumbbell                   | 1 |                         |                                     |    | 2
Tricep Extension        | triceps               | dumbbell/cable/band        | 1 | elbow                   |                                     |    | 3
Skullcrusher            | triceps               | barbell+bench/dumbbell+bench| 2 | elbow                  | supine                              |    | 1
Cable Pushdown          | triceps               | cable                      | 1 |                         |                                     |    | 3
Plank                   | core                  | -                          | 1 |                         | planks,floor                        | 30 | 3
Side Plank              | core                  | -                          | 1 | shoulder                | planks,floor                        | 25 | 2
Dead Bug                | core                  | -                          | 1 |                         | floor,supine                        |    | 3
Bird Dog                | core                  | -                          | 1 | wrist                   | floor                               |    | 2
Crunch                  | core                  | -                          | 1 | neck,back               | crunches,floor,supine               |    | 1
Bicycle Crunch          | core                  | -                          | 1 | neck,back               | crunches,floor,supine               |    | 2
Russian Twist           | core                  | -                          | 1 | back                    | floor                               |    | 1
Leg Raise               | core                  | -                          | 2 | back                    | floor,supine                        |    | 1
Hanging Leg Raise       | core                  | pullupBar                  | 3 | shoulder,back           | hang                                |    | 2
Pallof Press            | core                  | cable/band                 | 1 |                         |                                     |    | 3
Cable Crunch            | core                  | cable                      | 1 |                         |                                     |    | 1
Woodchopper             | core                  | cable/band                 | 1 |                         |                                     |    | 2
Standing Knee Raise     | core                  | -                          | 1 |                         |                                     |    | 1
Farmer's Walk           | carry,core            | dumbbell/kettlebell        | 1 |                         |                                     | 40 | 2
Shoulder Tap            | core                  | -                          | 1 | wrist                   | floor                               | 30 | 1
Jumping Jack            | cond                  | -                          | 1 | knee,ankle              | jumping,impact                      | 30 | 2
High Knees              | cond                  | -                          | 1 | knee,ankle              | jumping,impact,running              | 30 | 2
Burpee                  | cond                  | -                          | 2 | knee,wrist,back,ankle   | burpees,jumping,impact,floor        | 30 | 2
Mountain Climber        | cond,core             | -                          | 1 | wrist                   | floor                               | 30 | 2
Jump Rope               | cond                  | jumpRope                   | 1 | knee,ankle              | jumping,impact                      | 45 | 2
Jump Squat              | cond                  | -                          | 2 | knee,ankle              | jumping,impact,squats               | 30 | 1
Kettlebell Swing        | cond,hinge            | kettlebell                 | 2 | back                    |                                     | 30 | 3
Boxing                  | cond                  | -                          | 1 | shoulder                | boxing                              | 40 | 2
Marching in Place       | cond                  | -                          | 1 |                         | walking                             | 40 | 1
Bear Crawl              | cond                  | -                          | 2 | wrist                   | floor                               | 30 | 1
Air Bike                | cond,cardio           | bike                       | 1 |                         | cycling                             | 45 | 2
Row Machine             | cond,cardio           | rower                      | 1 | back                    | rowing                              | 45 | 2
Running                 | cardio                | -/treadmill                | 1 | knee,ankle,hip          | running,impact                      |    | 3
Walking                 | cardio                | -/treadmill                | 1 |                         | walking                             |    | 2
Cycling                 | cardio                | bike                       | 1 |                         | cycling                             |    | 3
Elliptical              | cardio                | elliptical                 | 1 |                         |                                     |    | 2
Swimming                | cardio                | pool                       | 1 |                         | swimming                            |    | 3
Stair Climber           | cardio                | machine                    | 1 | knee                    | stairs                              |    | 1
Cat Stretch             | mobility              | -                          | 1 | wrist                   | yoga,floor                          | 40 | 2
Child's Pose            | mobility              | -                          | 1 | knee                    | yoga,floor                          | 40 | 2
World's Greatest Stretch| mobility              | -                          | 1 | wrist,knee              | yoga,floor                          | 40 | 3
Hamstring Stretch       | mobility              | -                          | 1 |                         | yoga                                | 40 | 2
Kneeling Hip Flexor     | mobility              | -                          | 1 | knee                    | yoga,floor                          | 40 | 2
Standing Hip Flexors    | mobility              | -                          | 1 |                         | yoga                                | 40 | 2
Calf Stretch Hands Against Wall | mobility      | -                          | 1 |                         |                                     | 40 | 1
Chair Lower Back Stretch| mobility              | -                          | 1 |                         |                                     | 40 | 1
Round The World Shoulder Stretch | mobility     | -                          | 1 |                         |                                     | 40 | 1
Downward Dog            | mobility              | -                          | 1 | wrist,shoulder          | yoga,floor                          | 40 | 2
Cobra                   | mobility              | -                          | 1 | back,wrist              | yoga,floor,prone                        | 30 | 1
`;

export const exerciseCatalog: CatalogExercise[] = CATALOG_DATA.trim().split('\n').map(line => {
  const [name, slots, equipment, level, limits, tags, seconds, priority] = line.split('|').map(s => s.trim());
  const list = (s: string) => (s ? s.split(',').map(x => x.trim()).filter(Boolean) : []);
  return {
    name,
    slots: list(slots) as Slot[],
    equipment: equipment.split('/').map(alt => (alt.trim() === '-' ? [] : alt.split('+').map(e => e.trim() as Equipment))),
    level: Number(level) as 1 | 2 | 3,
    limits: list(limits) as Limit[],
    tags: list(tags) as ExerciseTag[],
    seconds: seconds ? Number(seconds) : undefined,
    priority: Number(priority),
  };
});
