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
Chair Squat             | squat                 | -                          | 1 |                         | squats                              |    | 2
Dumbbell Squat          | squat                 | dumbbell                   | 1 | knee                    | squats                              |    | 2
Kettlebell Goblet Squat | squat                 | kettlebell                 | 1 |                         | squats                              |    | 1
Hack Squat              | squat,quad            | machine                    | 2 | knee                    | squats                              |    | 2
Pistol Squat            | squat,quad            | -                          | 3 | knee,ankle              | squats                              |    | 1
Sissy Squat             | quad                  | -                          | 3 | knee                    | squats                              |    | 1
Single-Leg Leg Extension| quad                  | machine                    | 1 | knee                    |                                     |    | 1
Good Morning            | hinge,hamstring       | barbell                    | 2 | back                    | heavy                               |    | 1
Sumo Deadlift           | hinge,glute           | barbell                    | 2 | back,hip                | deadlifts,heavy                     |    | 2
Single Leg Deadlift     | hinge,hamstring       | -/dumbbell/kettlebell      | 2 | ankle                   | deadlifts                           |    | 2
Hyperextensions (Back Extensions) | hinge,glute | machine                   | 1 |                         | prone                               |    | 2
Reverse Hyper           | glute,hinge           | machine                    | 2 |                         | prone                               |    | 1
Pull Through            | hinge,glute           | cable/band                 | 1 |                         |                                     |    | 2
Seated Band Hamstring Curl | hamstring          | band                       | 1 |                         |                                     |    | 2
Glute Ham Raise         | hamstring             | machine                    | 3 | knee                    | prone                               |    | 1
Sliding Leg Curl        | hamstring,glute       | -                          | 2 |                         | floor,supine                        |    | 2
Barbell Glute Bridge    | glute,hinge           | barbell                    | 1 |                         | floor,supine                        |    | 2
Frog Pump               | glute                 | -/dumbbell                 | 1 |                         | floor,supine                        |    | 1
Cable Hip Abduction     | glute                 | cable                      | 1 |                         |                                     |    | 1
Hip Adduction           | glute                 | machine/band               | 1 | hip                     |                                     |    | 1
Standing Hip Circles    | glute,mobility        | -                          | 1 |                         |                                     | 30 | 1
Curtsy Lunge            | lunge,glute           | -/dumbbell                 | 2 | knee                    | lunges                              |    | 2
Bulgarian Split Squat   | lunge,quad            | -/dumbbell                 | 2 | knee                    | lunges                              |    | 3
Bodyweight Walking Lunge| lunge                 | -                          | 1 | knee                    | lunges                              |    | 2
Barbell Lunge           | lunge                 | barbell                    | 2 | knee                    | lunges,heavy                        |    | 1
Kettlebell Lunge        | lunge                 | kettlebell                 | 1 | knee                    | lunges                              |    | 1
Step-up with Knee Raise | lunge,glute           | -                          | 1 |                         | stairs                              |    | 1
Barbell Step Ups        | lunge,quad            | barbell+bench              | 2 | knee                    | stairs,heavy                        |    | 1
Standing Calf Raise     | calf                  | machine                    | 1 | ankle                   |                                     |    | 2
Calf Press              | calf                  | machine                    | 1 |                         |                                     |    | 1
Single Leg Calf Raise   | calf                  | -/dumbbell                 | 2 | ankle                   |                                     |    | 1
Calf Raises - With Bands| calf                  | band                       | 1 | ankle                   |                                     |    | 1
Standing Barbell Calf Raise | calf              | barbell                    | 2 | ankle                   |                                     |    | 1
Tibialis Raise          | calf                  | -                          | 1 |                         |                                     |    | 1
Knee Push-up            | hPush                 | -                          | 1 | wrist,knee              | pushups,floor                       |    | 2
Wall Push-up            | hPush                 | -                          | 1 |                         | pushups                             |    | 2
Decline Push-Up         | hPush                 | -                          | 2 | wrist,shoulder          | pushups,floor                       |    | 1
Push-Up Wide            | hPush,chestIso        | -                          | 1 | wrist,shoulder          | pushups,floor                       |    | 1
Diamond Push-up         | hPush,triceps         | -                          | 2 | wrist,elbow             | pushups,floor                       |    | 2
Incline Bench Press     | hPush,chestIso        | barbell+bench              | 2 | shoulder                | heavy                               |    | 2
Decline Bench Press     | hPush                 | barbell+bench              | 2 | shoulder                | heavy                               |    | 1
Machine Bench Press     | hPush                 | machine                    | 1 |                         |                                     |    | 2
Close-Grip Barbell Bench Press | hPush,triceps  | barbell+bench              | 2 | wrist,elbow             | heavy,supine                        |    | 1
Close-Grip Dumbbell Press | triceps,hPush       | dumbbell                   | 1 | elbow                   | supine                              |    | 1
Dips - Chest Version    | hPush,triceps         | machine                    | 3 | shoulder,elbow          |                                     |    | 1
Cable Crossover         | chestIso              | cable                      | 1 |                         |                                     |    | 2
Incline Cable Flye      | chestIso              | cable+bench                | 1 |                         |                                     |    | 1
Incline Dumbbell Flyes  | chestIso              | dumbbell+bench             | 1 | shoulder                |                                     |    | 1
Band Chest Fly          | chestIso              | band                       | 1 |                         |                                     |    | 2
Push-up Plus            | chestIso,core         | -                          | 1 | wrist                   | pushups,floor                       |    | 1
Straight-Arm Dumbbell Pullover | chestIso,vPull | dumbbell+bench             | 2 | shoulder                | supine,overhead                     |    | 1
Push Press              | vPush                 | barbell/dumbbell           | 2 | shoulder,back,knee      | overhead                            |    | 1
Seated Dumbbell Press   | vPush                 | dumbbell+bench             | 1 | shoulder                | overhead                            |    | 2
Seated Cable Shoulder Press | vPush             | cable/machine              | 1 | shoulder                | overhead                            |    | 2
Landmine Press          | vPush                 | barbell                    | 1 |                         |                                     |    | 2
Handstand Push-Ups      | vPush                 | -                          | 3 | shoulder,wrist,neck     | overhead                            |    | 1
Wall Walk               | vPush,core            | -                          | 3 | shoulder,wrist          | overhead,floor                      |    | 1
Kettlebell Windmill     | core,vPush            | kettlebell                 | 3 | shoulder,back           | overhead                            |    | 1
Upright Row - With Bands| shoulderIso           | band                       | 1 | shoulder                |                                     |    | 1
Upright Barbell Row     | shoulderIso           | barbell/dumbbell/cable     | 1 | shoulder                |                                     |    | 1
Arm Circles             | shoulderIso,mobility  | -                          | 1 |                         |                                     | 30 | 1
Plank to Downward Dog   | shoulderIso,core      | -                          | 1 | wrist                   | planks,floor                        |    | 1
Shrug                   | shoulderIso           | dumbbell/barbell           | 1 | neck                    |                                     |    | 1
Lu Raise                | shoulderIso           | dumbbell                   | 2 | shoulder                | overhead                            |    | 1
Prone Y Raise           | rearDelt,shoulderIso  | -/dumbbell                 | 1 |                         | floor,prone                         |    | 2
Reverse Snow Angel      | rearDelt              | -                          | 1 |                         | floor,prone                         |    | 2
Seated Bent-Over Rear Delt Raise | rearDelt     | dumbbell                   | 1 |                         |                                     |    | 1
Cable Rope Rear-Delt Rows | rearDelt,hPull      | cable                      | 1 |                         |                                     |    | 1
Back Flyes - With Bands | rearDelt              | band                       | 1 |                         |                                     |    | 1
Dumbbell Incline Row    | hPull                 | dumbbell+bench             | 1 |                         | prone                               |    | 2
T-Bar Row with Handle   | hPull                 | barbell/machine            | 2 | back                    | heavy                               |    | 2
Alternating Renegade Row| hPull,core            | dumbbell                   | 2 | wrist                   | floor                               |    | 1
Towel Row               | hPull,biceps          | -                          | 1 |                         |                                     |    | 1
Table Row               | hPull                 | -                          | 2 |                         | supine                              |    | 1
Negative Pull-up        | vPull                 | pullupBar                  | 1 | shoulder,elbow          | pullups,hang                        |    | 2
Scapular Pull-up        | vPull                 | pullupBar                  | 1 | shoulder                | pullups,hang                        |    | 1
Dead Hang               | vPull,mobility        | pullupBar                  | 1 | shoulder                | hang                                | 20 | 1
Straight-Arm Pulldown   | vPull                 | cable/band                 | 1 |                         |                                     |    | 2
Close-Grip Front Lat Pulldown | vPull,biceps    | cable/machine              | 1 |                         |                                     |    | 1
Concentration Curls     | biceps                | dumbbell                   | 1 |                         |                                     |    | 2
Incline Dumbbell Curl   | biceps                | dumbbell+bench             | 1 |                         |                                     |    | 1
EZ-Bar Curl             | biceps                | barbell                    | 1 |                         |                                     |    | 2
Preacher Curl           | biceps                | barbell+bench/dumbbell+bench/machine | 1 | elbow        |                                     |    | 1
Doorway Curl            | biceps                | -                          | 1 |                         |                                     |    | 1
Dumbbell One-Arm Triceps Extension | triceps    | dumbbell                   | 1 | elbow,shoulder          | overhead                            |    | 1
Cable Rope Overhead Triceps Extension | triceps | cable                     | 1 | elbow                   | overhead                            |    | 1
Dip Machine             | triceps               | machine                    | 1 | shoulder                |                                     |    | 2
Tricep Dip              | triceps,hPush         | -                          | 2 | shoulder,wrist,elbow    |                                     |    | 1
Band Pushdown           | triceps               | band                       | 1 |                         |                                     |    | 2
Reverse Crunch          | core                  | -                          | 1 | back                    | crunches,floor,supine               |    | 2
Sit-up                  | core                  | -                          | 1 | neck,back               | crunches,floor,supine               |    | 1
Hollow Body Hold        | core                  | -                          | 2 | back                    | floor,supine                        | 25 | 2
V-Up                    | core                  | -                          | 3 | back                    | floor,supine                        |    | 1
Flutter Kick            | core                  | -                          | 1 | back                    | floor,supine                        | 30 | 1
Scissor Kick            | core                  | -                          | 1 | back                    | floor,supine                        | 30 | 1
Forearm Plank           | core                  | -                          | 1 |                         | planks,floor                        | 30 | 2
Plank Up-Down           | core,hPush            | -                          | 2 | wrist,shoulder          | planks,floor                        | 30 | 1
Push Up to Side Plank   | core,hPush            | -                          | 2 | wrist,shoulder          | planks,pushups,floor                |    | 1
Ab Wheel Rollout        | core                  | barbell                    | 3 | back,shoulder           | floor                               |    | 1
Oblique Crunches        | core                  | -                          | 1 | neck                    | crunches,floor                      |    | 1
Toe Touchers            | core                  | -                          | 1 | neck,back               | crunches,floor,supine               |    | 1
Dumbbell Side Bend      | core                  | dumbbell/kettlebell        | 1 | back                    |                                     |    | 1
Standing Oblique Crunch | core                  | -                          | 1 |                         |                                     |    | 2
Bear Hold               | core                  | -                          | 1 | wrist                   | floor                               | 25 | 1
Hanging Knee Raise      | core                  | pullupBar                  | 2 | shoulder                | hang                                |    | 1
Ab Crunch Machine       | core                  | machine                    | 1 | neck                    | crunches                            |    | 1
Seated Leg Tucks        | core                  | -/bench                    | 1 | back                    |                                     |    | 1
Band Anti-Rotation Hold | core                  | band/cable                 | 1 |                         |                                     | 25 | 1
Suitcase Carry          | carry,core            | dumbbell/kettlebell        | 1 |                         |                                     | 40 | 2
Overhead Carry          | carry,core            | dumbbell/kettlebell        | 2 | shoulder,neck           | overhead                            | 30 | 1
Front Rack Carry        | carry,core            | kettlebell/dumbbell        | 2 | wrist                   |                                     | 40 | 1
Skater Hops             | cond                  | -                          | 2 | knee,ankle              | jumping,impact                      | 30 | 2
Step Jack               | cond                  | -                          | 1 |                         |                                     | 30 | 2
Squat Thrust            | cond                  | -                          | 2 | wrist,knee              | floor                               | 30 | 1
Front Box Jump          | cond                  | bench                      | 2 | knee,ankle              | jumping,impact                      | 30 | 1
Knee Tuck Jump          | cond                  | -                          | 3 | knee,ankle,back         | jumping,impact                      | 20 | 1
Plank Jack              | cond,core             | -                          | 2 | wrist                   | jumping,planks,floor                | 30 | 1
Single Leg Butt Kick    | cond                  | -                          | 1 | knee,ankle              | running,impact                      | 30 | 1
Lateral Shuffle         | cond                  | -                          | 1 | knee                    |                                     | 30 | 1
Scissors Jump           | cond                  | -                          | 3 | knee,ankle              | jumping,impact,lunges               | 20 | 1
Inchworm                | cond,mobility         | -                          | 1 | wrist,back              | floor                               | 30 | 1
Squat to Press          | cond,squat            | dumbbell                   | 1 | shoulder,knee           | overhead,squats                     | 30 | 2
Kettlebell Thruster     | cond                  | kettlebell                 | 2 | shoulder,knee           | overhead,squats                     | 30 | 1
Kettlebell Snatch       | cond                  | kettlebell                 | 3 | shoulder,back           | overhead                            | 30 | 1
Kettlebell Clean        | cond,hinge            | kettlebell                 | 2 | back,wrist              |                                     | 30 | 1
Turkish Get-Up          | core,cond             | kettlebell/dumbbell        | 3 | shoulder,wrist          | overhead,floor,supine               |    | 1
Shadow Boxing           | cond                  | -                          | 1 |                         | boxing                              | 40 | 1
Standing Cross Crunch   | cond,core             | -                          | 1 |                         |                                     | 30 | 2
Recumbent Bike          | cardio                | bike                       | 1 |                         | cycling                             |    | 2
Hiking                  | cardio                | -                          | 1 | knee,ankle              | walking                             |    | 1
Incline Treadmill Walk  | cardio                | treadmill                  | 1 |                         | walking                             |    | 2
Water Aerobics          | cardio                | pool                       | 1 |                         | swimming                            |    | 2
Chest And Front Of Shoulder Stretch | mobility  | -                          | 1 |                         |                                     | 30 | 1
Quad Stretch            | mobility              | -                          | 1 | knee                    | yoga                                | 30 | 2
Seated Hamstring and Calf Stretch | mobility    | -                          | 1 |                         | floor                               | 30 | 1
Spinal Stretch          | mobility              | -                          | 1 | back                    | floor                               | 30 | 2
Middle Back Stretch     | mobility              | -                          | 1 |                         |                                     | 30 | 1
Chin To Chest Stretch   | mobility              | -                          | 1 |                         |                                     | 30 | 1
Ankle Circles           | mobility              | -                          | 1 |                         |                                     | 30 | 1
90/90 Hamstring         | mobility              | -                          | 1 |                         | floor,supine                        | 30 | 1
IT Band and Glute Stretch | mobility            | -                          | 1 |                         | floor                               | 30 | 1
Pigeon Pose             | mobility              | -                          | 2 | knee,hip                | yoga,floor                          | 40 | 2
Thread the Needle       | mobility              | -                          | 1 | wrist,knee              | yoga,floor                          | 30 | 1
Happy Baby              | mobility              | -                          | 1 |                         | yoga,floor,supine                   | 40 | 1
Hug Knees To Chest      | mobility              | -                          | 1 |                         | floor,supine                        | 30 | 1
Leg Swings              | mobility              | -                          | 1 |                         |                                     | 30 | 1
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
