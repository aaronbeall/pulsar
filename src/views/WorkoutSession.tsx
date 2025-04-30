import React from 'react';
import { Box, Button, Flex, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getRoutines, getWorkout, addWorkout, getRoutine, getWorkouts } from '../db/indexedDb';
import { Routine, Workout } from '../models/types';
import { findExercisesForToday, findRoutineForToday, findWorkoutForToday } from '../utils/workoutUtils';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomName } from '../utils/nameUtils';

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
      const routine = await getRoutine(routineId || '');
      if (!routine) {
        navigate('/workout', { replace: true });
        return;
      }

      // Check if there's already a workout for today's routine
      const workouts = await getWorkouts();
      const existingWorkoutForToday = findWorkoutForToday(workouts, [routine]);
      if (existingWorkoutForToday) {
        navigate(`/workout/session/${existingWorkoutForToday.id}`, { replace: true });
        return;
      }

      // Create new workout
      const newWorkout: Workout = {
        id: uuidv4(),
        nickname: generateRandomName(),
        routineId: routine.id,
        startedAt: Date.now(),
        completedExercises: []
      }
      
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

  return (
    <Flex direction="column" p={4} width="100%">
      <Heading size="lg" mb={4}>{workout.nickname}</Heading>
      <VStack spacing={4} align="stretch">
        {findExercisesForToday(routine).map((exercise, idx) => (
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