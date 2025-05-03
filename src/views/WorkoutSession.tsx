import React from 'react';
import { Box, Button, Flex, Heading, Spinner, Text, VStack, Breadcrumb, BreadcrumbItem, BreadcrumbLink, SlideFade } from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { getRoutines, getWorkout, addWorkout, getRoutine, getWorkouts, getExercises } from '../db/indexedDb';
import { Routine, Workout, DayOfWeek, Exercise } from '../models/types';
import { getTodayDayOfWeek, findWorkoutForDay, findExercisesForDay } from '../utils/workoutUtils';
import { DAYS_OF_WEEK } from '../constants/days';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomName } from '../utils/nameUtils';
import TimeElapsed from '../components/TimeElapsed';
import WorkoutTimeline from '../components/WorkoutTimeline';
import ExerciseProgress from '../components/ExerciseProgress';

export const WorkoutSession: React.FC = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = React.useState<Workout | null>(null);
  const [routine, setRoutine] = React.useState<Routine | null>(null);
  const [exercises, setExercises] = React.useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = React.useState(0);
  const [currentSetIndex, setCurrentSetIndex] = React.useState(0);

  React.useEffect(() => {
    const initSession = async () => {
      const exerciseData = await getExercises();
      setExercises(exerciseData);
      
      // Load existing workout by sessionId
      if (sessionId) {
        const existingWorkout = await getWorkout(sessionId);
        if (existingWorkout) {
          setWorkout(existingWorkout);
          const workoutRoutine = await getRoutine(existingWorkout.routineId);
          setRoutine(workoutRoutine || null);
          return;
        }
      }

      // Initialize workout by routineId
      const routineId = searchParams.get('routineId');
      const dayParam = searchParams.get('day') as DayOfWeek | null;
      const routine = await getRoutine(routineId || '');
      
      if (!routine) {
        navigate('/workout', { replace: true });
        return;
      }

      // Use provided day or today's day, ensuring it's a valid DayOfWeek
      const workoutDay = dayParam && DAYS_OF_WEEK.includes(dayParam) ? dayParam : getTodayDayOfWeek();

      // Check if there's already a workout for this specific day and routine
      const workouts = await getWorkouts();
      const existingWorkoutForDay = findWorkoutForDay(workouts, [routine], workoutDay);

      if (existingWorkoutForDay) {
        navigate(`/workout/session/${existingWorkoutForDay.id}`, { replace: true });
        return;
      }

      // Create new workout
      const newWorkout: Workout = {
        id: uuidv4(),
        day: workoutDay,
        nickname: generateRandomName(),
        routineId: routine.id,
        startedAt: Date.now(),
        completedExercises: []
      };
      
      await addWorkout(newWorkout);

      setWorkout(newWorkout);
      setRoutine(routine);
      navigate(`/workout/session/${newWorkout.id}`, { replace: true });
    };

    initSession();
  }, [sessionId, navigate]);

  const handleNext = () => {
    const routineExercises = findExercisesForDay(routine!, workout!.day);
    const currentExercise = routineExercises[currentExerciseIndex];
    
    if (currentSetIndex + 1 < currentExercise.sets) {
      // Move to next set of current exercise
      setCurrentSetIndex(currentSetIndex + 1);
    } else if (currentExerciseIndex + 1 < routineExercises.length) {
      // Move to next exercise
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
    } else {
      // Workout complete
      // TODO: Handle workout completion
      alert('Workout complete!');
    }
  };

  if (!routine || !workout) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.500" mb={4} />
      </Flex>
    );
  }

  const routineExercises = findExercisesForDay(routine, workout.day);
  const currentExercise = routineExercises[currentExerciseIndex];
  const currentExerciseDetail = exercises.find(e => e.id === currentExercise?.exerciseId);

  return (
    <Flex direction="column" p={4} width="100%">
      <Breadcrumb mb={4}>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/workout">
            Workouts
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to={`/workout/routine/${routine.id}`}>
            Routine
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>{workout.day}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Flex justify="space-between" align="start" mb={6}>
        <Box>
          <Text fontSize="sm" color="gray.500" mb={1}>{routine.name}</Text>
          <Heading size="lg" mb={2} bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
            "{workout.nickname}"
          </Heading>
        </Box>
        <TimeElapsed startTime={workout.startedAt} />
      </Flex>

      <VStack spacing={6} align="stretch">
        <SlideFade 
          in={true} 
          offsetY={20}
          style={{ width: '100%' }}
          key={currentExerciseIndex}
        >
          <ExerciseProgress 
            exercise={currentExercise}
            currentSet={currentSetIndex}
            exerciseDetail={currentExerciseDetail}
            onComplete={() => {}}
            onNext={handleNext}
          />
        </SlideFade>
        
        <WorkoutTimeline 
          exercises={routineExercises}
          currentExerciseIndex={currentExerciseIndex}
          currentSetIndex={currentSetIndex}
          exerciseDetails={exercises}
        />
      </VStack>
    </Flex>
  );
};