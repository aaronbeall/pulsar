import React from 'react';
import { Box, Button, Flex, Heading, Spinner, Text, VStack, Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { getRoutines, getWorkout, addWorkout, getRoutine, getWorkouts } from '../db/indexedDb';
import { Routine, Workout, DayOfWeek } from '../models/types';
import { getTodayDayOfWeek, findWorkoutForDay, findExercisesForDay } from '../utils/workoutUtils';
import { DAYS_OF_WEEK } from '../constants/days';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomName } from '../utils/nameUtils';
import TimeElapsed from '../components/TimeElapsed';

export const WorkoutSession: React.FC = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = React.useState<Workout | null>(null);
  const [routine, setRoutine] = React.useState<Routine | null>(null);

  React.useEffect(() => {
    const initSession = async () => {
      
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

  if (!routine || !workout) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.500" mb={4} />
      </Flex>
    );
  }

  // Use the utility function to find exercises for the specific day
  const exercises = findExercisesForDay(routine, workout.day);

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
          <Heading size="lg" mb={2}>{workout.nickname}</Heading>
          <Text fontSize="md" color="gray.600">
            {workout.day}'s Workout
          </Text>
        </Box>
        <TimeElapsed startTime={workout.startedAt} />
      </Flex>
      <VStack spacing={4} align="stretch">
        {exercises.map((exercise, idx) => (
          <Box key={idx} p={4} borderWidth={1} borderRadius="md">
            <Text fontWeight="bold">Exercise {idx + 1}</Text>
            <Text>Sets: {exercise.sets} × Reps: {exercise.reps}</Text>
            {exercise.duration && <Text>Duration: {exercise.duration}s</Text>}
          </Box>
        ))}
      </VStack>
    </Flex>
  );
};