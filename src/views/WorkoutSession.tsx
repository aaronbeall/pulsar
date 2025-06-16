import React from 'react';
import { Box, Button, Flex, Heading, Spinner, Text, VStack, Breadcrumb, BreadcrumbItem, BreadcrumbLink, SlideFade } from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useExercises, useRoutines, useWorkouts, useRoutine, useWorkout, usePulsarStore } from '../store/pulsarStore';
import { Routine, Workout, DayOfWeek, Exercise, WorkoutExercise } from '../models/types';
import { getTodayDayOfWeek, findWorkoutForDay, findExercisesForDay } from '../utils/workoutUtils';
import { DAYS_OF_WEEK } from '../constants/days';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomName } from '../utils/nameUtils';
import TimeElapsed from '../components/TimeElapsed';
import WorkoutTimeline from '../components/WorkoutTimeline';
import ExerciseProgress from '../components/ExerciseProgress';
import { useEffect } from 'react';

export const WorkoutSession: React.FC = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exercises = useExercises();
  const routines = useRoutines();
  const workouts = useWorkouts();
  const addWorkout = usePulsarStore(s => s.addWorkout);
  const updateWorkout = usePulsarStore(s => s.updateWorkout);
  const [workout, setWorkout] = React.useState<Workout | null>(null);
  const [routine, setRoutine] = React.useState<Routine | null>(null);

  React.useEffect(() => {
    // If sessionId is present, find the workout in store
    if (sessionId && workouts.length > 0) {
      const existingWorkout = workouts.find(w => w.id === sessionId);
      if (existingWorkout) {
        setWorkout(existingWorkout);
        // Use findRoutineForDay from utils to get the routine for the workout's day
        const workoutRoutine = routines.find(r => r.id === existingWorkout.routineId) || null;
        setRoutine(workoutRoutine);
        return;
      }
    }
    // If no sessionId, try to create/init a new workout
    const routineId = searchParams.get('routineId');
    const dayParam = searchParams.get('day') as DayOfWeek | null;
    // Use findRoutineForDay to get the routine
    const routine = routines.find(r => r.id === routineId) || null;
    if (!routine) {
      navigate('/workout', { replace: true });
      return;
    }
    // Use getTodayDayOfWeek from utils
    const workoutDay = dayParam && DAYS_OF_WEEK.includes(dayParam) ? dayParam : getTodayDayOfWeek();
    // Use findWorkoutForDay from utils
    const existingWorkoutForDay = findWorkoutForDay(workouts, [routine], workoutDay);
    if (existingWorkoutForDay) {
      navigate(`/workout/session/${existingWorkoutForDay.id}`, { replace: true });
      return;
    }
    // Use findExercisesForDay from utils
    const scheduledExercises = findExercisesForDay(routine, workoutDay);
    const newWorkout: Workout = {
      id: sessionId || uuidv4(),
      day: workoutDay,
      nickname: generateRandomName(),
      routineId: routine.id,
      startedAt: Date.now(),
      exercises: scheduledExercises.map(exercise => ({
        ...exercise,
        completedSets: 0,
        completedDuration: 0,
        startedAt: undefined,
        completedAt: undefined,
        skipped: false
      }))
    };
    addWorkout(newWorkout);
    setWorkout(newWorkout);
    setRoutine(routine);
    navigate(`/workout/session/${newWorkout.id}`, { replace: true });
  }, [sessionId, workouts, routines, exercises, searchParams, navigate, addWorkout]);

  React.useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        // Ignore errors (e.g., not supported)
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock && wakeLock.release) {
        wakeLock.release();
      }
    };
  }, []);

  const handleComplete = async (exerciseIndex: number) => {
    if (!workout) return;
    const updatedWorkout = { ...workout };
    const exercise = updatedWorkout.exercises[exerciseIndex];
    if (exercise.duration) {
      exercise.completedDuration = exercise.duration;
      exercise.completedAt = Date.now();
    } else {
      exercise.completedSets = (exercise.completedSets || 0) + 1;
      if (exercise.completedSets === exercise.sets) {
        exercise.completedAt = Date.now();
      }
    }
    // Set workout.completedAt if all exercises are complete
    const allCompleted = updatedWorkout.exercises.every(ex => ex.completedAt);
    if (allCompleted && !updatedWorkout.completedAt) {
      updatedWorkout.completedAt = Date.now();
    }
    await updateWorkout(updatedWorkout);
    setWorkout(updatedWorkout);
  };

  const handleStart = (exerciseIndex: number) => {
    if (!workout) return;
    const updatedWorkout = { ...workout };
    const exercise = updatedWorkout.exercises[exerciseIndex];
    if (!exercise.startedAt) {
      exercise.startedAt = Date.now();
      exercise.completedSets = 0;
      exercise.completedDuration = 0;
    }
    setWorkout(updatedWorkout);
  };

  const getCurrentExercise = () => {
    if (!workout) return null;
    return workout.exercises.find(ex => !ex.completedAt) || null;
  };

  if (!routine || !workout) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.500" mb={4} />
      </Flex>
    );
  }

  const currentExercise = getCurrentExercise();
  const currentExerciseIndex = currentExercise ? workout.exercises.indexOf(currentExercise) : -1;
  const currentExerciseDetail = currentExercise ? exercises.find(e => e.id === currentExercise.exerciseId) : null;
  const currentSetIndex = currentExercise ? (currentExercise.completedSets || 0) : 0;

  return (
    <Flex direction="column" p={4} width="100%">
      <Breadcrumb mb={4}>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/workout">
            Workout
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>{workout.day}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Flex justify="space-between" align="start" mb={6}>
        <Box>
          <Text as={RouterLink} to={`/workout/routine/${routine.id}`} fontSize="sm" color="gray.500" mb={1}>{routine.name}</Text>
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
          {currentExercise && currentExerciseDetail && (
            <ExerciseProgress 
              exercise={currentExercise}
              currentSet={currentSetIndex}
              exerciseDetail={currentExerciseDetail}
              onComplete={() => handleComplete(currentExerciseIndex)}
              onNext={() => handleStart(currentExerciseIndex)}
            />
          )}
        </SlideFade>
        
        <WorkoutTimeline 
          exercises={workout.exercises}
          currentExerciseIndex={currentExerciseIndex}
          currentSetIndex={currentSetIndex}
          exerciseDetails={exercises}
        />
      </VStack>
    </Flex>
  );
};