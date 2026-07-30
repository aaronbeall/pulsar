import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Button, Flex, Heading, SlideFade, Spinner, Text, useColorModeValue, useToast, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import React from 'react';
import { FaFlagCheckered, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { CongratulatoryInterstitial } from '../components/CongratulatoryInterstitial';
import ExerciseProgress from '../components/ExerciseProgress';
import TimeElapsed from '../components/TimeElapsed';
import WorkoutTimeline from '../components/WorkoutTimeline';
import { DAYS_OF_WEEK } from '../constants/days';
import { DayOfWeek, Routine, Workout } from '../models/types';
import { useExercises, usePulsarStore, useRoutines, useWorkouts } from '../store/pulsarStore';
import { generateRandomName } from '../utils/nameUtils';
import { findExercisesForDay, findWorkoutForDay, getStreakInfo, getTodayDayOfWeek } from '../utils/workoutUtils';

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
  const [selectedExerciseIndex, setSelectedExerciseIndex] = React.useState<number | null>(null);
  const [finishDialogOpen, setFinishDialogOpen] = React.useState(false);
  const finishCancelRef = React.useRef<HTMLButtonElement>(null);
  const [showInterstitial, setShowInterstitial] = React.useState(false);
  const toast = useToast();

  // Find-or-create a workout for a given routine/day. Reads fresh store state via
  // getState() (not the reactive hook values) so the mutation itself never becomes a
  // dependency that re-triggers the effect below.
  const findOrCreateWorkoutMutation = useMutation({
    mutationFn: async ({ routineId, day }: { routineId: string; day: DayOfWeek | null }) => {
      const { routines: currentRoutines, workouts: currentWorkouts, addWorkout: addWorkoutToStore } = usePulsarStore.getState();
      const targetRoutine = currentRoutines.find(r => r.id === routineId);
      if (!targetRoutine) {
        return { redirectTo: '/workout' };
      }
      const workoutDay = day && DAYS_OF_WEEK.includes(day) ? day : getTodayDayOfWeek();
      const existingWorkoutForDay = findWorkoutForDay(currentWorkouts, [targetRoutine], workoutDay);
      if (existingWorkoutForDay) {
        return { redirectTo: `/workout/session/${existingWorkoutForDay.id}` };
      }
      const scheduledExercises = findExercisesForDay(targetRoutine, workoutDay);
      const newWorkout: Workout = {
        id: uuidv4(),
        day: workoutDay,
        nickname: generateRandomName(),
        routineId: targetRoutine.id,
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
      await addWorkoutToStore(newWorkout);
      return { redirectTo: `/workout/session/${newWorkout.id}` };
    },
    onSuccess: ({ redirectTo }) => {
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      toast({
        title: 'Could not start workout',
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  // Look up an existing workout by sessionId — pure reactive read, no writes, so no race.
  React.useEffect(() => {
    if (!sessionId) return;
    const existingWorkout = workouts.find(w => w.id === sessionId);
    if (existingWorkout) {
      setWorkout(existingWorkout);
      setRoutine(routines.find(r => r.id === existingWorkout.routineId) || null);
    }
  }, [sessionId, workouts, routines]);

  // Trigger the find-or-create mutation exactly once when there's no sessionId yet.
  // Deps intentionally exclude workouts/routines/exercises: those change as a side
  // effect of the mutation itself, which previously caused this effect to re-fire
  // mid-flight and create/redirect twice.
  const hasTriggeredCreateRef = React.useRef(false);
  React.useEffect(() => {
    if (sessionId || hasTriggeredCreateRef.current) return;
    const routineId = searchParams.get('routineId');
    if (!routineId) {
      navigate('/workout', { replace: true });
      return;
    }
    hasTriggeredCreateRef.current = true;
    const dayParam = searchParams.get('day') as DayOfWeek | null;
    findOrCreateWorkoutMutation.mutate({ routineId, day: dayParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, searchParams]);

  // Tracks whether the workout is still active, without making the wake-lock effect
  // below depend on (and re-run for) every workout state change.
  const workoutActiveRef = React.useRef(true);
  React.useEffect(() => {
    workoutActiveRef.current = !workout?.completedAt;
  }, [workout?.completedAt]);

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
    // The browser auto-releases the wake lock whenever the tab/screen is backgrounded
    // (visibilitychange), so it must be explicitly re-requested when it comes back.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && workoutActiveRef.current) {
        requestWakeLock();
      }
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      if (!exercise.completedAt) {
        exercise.completedAt = Date.now();
      }
    } else {
      exercise.completedSets = (exercise.completedSets || 0) + 1;
      if (exercise.completedSets === exercise.sets && !exercise.completedAt) {
        exercise.completedAt = Date.now();
      }
    }
    // Set workout.completedAt if all exercises are complete
    const allCompleted = updatedWorkout.exercises.every(ex => ex.completedAt);
    if (allCompleted && !updatedWorkout.completedAt) {
      updatedWorkout.completedAt = Date.now();
      setShowInterstitial(true);
    }
    await updateWorkout(updatedWorkout);
    setWorkout(updatedWorkout);
    // If the exercise is now completed, auto-advance to the first incomplete exercise (if any)
    if (exercise.completedAt) {
      const firstIncompleteIdx = updatedWorkout.exercises.findIndex(ex => !ex.completedAt);
      setSelectedExerciseIndex(firstIncompleteIdx !== -1 ? firstIncompleteIdx : null);
    }
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
    if (selectedExerciseIndex !== null) {
      return workout.exercises[selectedExerciseIndex];
    }
    return workout.exercises.find(ex => !ex.completedAt) || null;
  };

  const handleSelectExercise = (index: number) => {
    setSelectedExerciseIndex(index);
  };

  // Replace useEffect for streakCount and streakType with useMemo
  const streakInfo = React.useMemo(() => {
    if (workout && workout.completedAt) {
      return getStreakInfo(workouts, routines);
    }
    return null;
  }, [workout?.completedAt, workouts, routines]);

  const streakCount = streakInfo && streakInfo.streak > 0 && streakInfo.status !== 'expired' ? streakInfo.streak : 0;
  const streakType: 'none' | 'start' | 'continue' =
    streakInfo && streakInfo.streak > 0 && streakInfo.status !== 'expired'
      ? (streakInfo.streak === 1 ? 'start' : 'continue')
      : 'none';

  // showFinishedAlert is now derived from workout.completedAt
  const showFinishedAlert = !!(workout && workout.completedAt);

  // Helper: check if workout exercises match the routine for the day
  const isRoutineUpdated = React.useMemo(() => {
    if (!routine || !workout) return false;
    const workoutDay = workout.day;
    // Get the exercises for this day from the routine
    const routineExercises = findExercisesForDay(routine, workoutDay);
    if (routineExercises.length !== workout.exercises.length) return true;
    // Compare exercise IDs in order
    for (let i = 0; i < routineExercises.length; i++) {
      if (routineExercises[i].exerciseId !== workout.exercises[i].exerciseId) return true;
    }
    return false;
  }, [routine, workout]);

  // Handler: restart workout to match routine
  const handleRestartToRoutine = React.useCallback(() => {
    if (!routine || !workout) return;
    const workoutDay = workout.day;
    const scheduledExercises = findExercisesForDay(routine, workoutDay);
    const resetWorkout: Workout = {
      ...workout,
      startedAt: Date.now(),
      completedAt: undefined,
      exercises: scheduledExercises.map(exercise => ({
        ...exercise,
        completedSets: 0,
        completedDuration: 0,
        startedAt: undefined,
        completedAt: undefined,
        skipped: false
      }))
    };
    updateWorkout(resetWorkout);
    setWorkout(resetWorkout);
    setSelectedExerciseIndex(0);
  }, [routine, workout, updateWorkout]);

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

  if (showInterstitial) {
    const isPerfect = workout.completedAt && workout.exercises.every(ex => ex.completedAt);
    const totalWorkouts = workouts.filter(w => w.completedAt).length;
    // Find the RoutineDay for the completed workout's day
    const routineDay = routine.dailySchedule.find(day => day.day === workout.day);
    const kind = routineDay?.kind || workout.day;
    const completedExercises = workout.exercises.filter(ex => ex.completedAt).length;
    return (
      <CongratulatoryInterstitial
        streak={streakCount}
        streakType={streakType}
        isPerfect={!!isPerfect}
        totalWorkouts={totalWorkouts}
        onDismiss={() => setShowInterstitial(false)}
        nickname={workout.nickname}
        kind={kind}
        completedExercises={completedExercises}
      />
    );
  }

  return (
    <Flex direction="column" p={4} width="100%">
      {isRoutineUpdated && (
        <RoutineUpdatedBanner onRestart={handleRestartToRoutine} />
      )}
      <AnimatePresence>
        {showFinishedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
            style={{ width: '100%' }}
          >
            <WorkoutFinishedBanner streak={streakCount} streakType={streakType} />
          </motion.div>
        )}
      </AnimatePresence>

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
          <Text as={RouterLink} to={`/workout/routine/${routine.id}`} fontSize="sm" color="gray.500" mb={1} display="flex" alignItems="center" gap={1} _hover={{ color: 'cyan.500', textDecoration: 'underline' }}>
            {routine.name}
            <Box as={FaInfoCircle} fontSize="1em" ml={1} color="gray.400" _hover={{ color: 'cyan.400' }} aria-label="View routine details" />
          </Text>
          <Heading size="lg" mb={2} bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
            "{workout.nickname}"
          </Heading>
        </Box>
        <TimeElapsed startTime={workout.startedAt} endTime={workout.completedAt} />
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
          onSelectExercise={handleSelectExercise}
        />
        {/* Finish button and confirmation dialog */}
        {workout.exercises.some(ex => ex.completedAt) && !workout.completedAt && (
          <>
            <Button
              colorScheme="red"
              variant="ghost"
              mt={4}
              onClick={() => setFinishDialogOpen(true)}
              alignSelf="center"
              leftIcon={<Box as={FaFlagCheckered} fontSize="1.2em" />}
            >
              Finish
            </Button>
            <AlertDialog
              isOpen={finishDialogOpen}
              leastDestructiveRef={finishCancelRef}
              onClose={() => setFinishDialogOpen(false)}
              isCentered
            >
              <AlertDialogOverlay>
                <AlertDialogContent borderRadius="xl">
                  <AlertDialogHeader fontSize="lg" fontWeight="bold" display="flex" alignItems="center" gap={2}>
                    <Box as={FaFlagCheckered} color="blue.400" fontSize="2xl" mr={2} />
                    Finish Workout?
                  </AlertDialogHeader>
                  <AlertDialogBody>
                    Are you sure you're done?
                  </AlertDialogBody>
                  <AlertDialogFooter>
                    <Button ref={finishCancelRef} onClick={() => setFinishDialogOpen(false)} leftIcon={<FaTimesCircle />} variant="ghost">
                      Cancel
                    </Button>
                    <Button colorScheme="blue" ml={3} onClick={async () => {
                      if (!workout) return;
                      const updatedWorkout = { ...workout, completedAt: Date.now() };
                      await updateWorkout(updatedWorkout);
                      setWorkout(updatedWorkout);
                      setFinishDialogOpen(false);
                      setShowInterstitial(true);
                    }} leftIcon={<FaFlagCheckered />}>
                      Finish
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialogOverlay>
            </AlertDialog>
          </>
        )}
        {workout.completedAt && workout.exercises.every(ex => ex.completedAt) && (
          <PerfectWorkoutBanner />
        )}
        {workout.completedAt && workout.exercises.some(ex => !ex.completedAt) && (
          <IncompleteWorkoutBanner routineId={routine.id} />
        )}
      </VStack>
    </Flex>
  );
};

const WorkoutFinishedBanner: React.FC<{ streak: number; streakType: 'none' | 'start' | 'continue' }> = ({ streak, streakType }) => {
  const [prevStreak, setPrevStreak] = React.useState<number | null>(null);
  const [countStep, setCountStep] = React.useState<'none' | 'prev-in' | 'count-transition' | 'done'>('none');
  const [showFlame, setShowFlame] = React.useState(false);

  // Set prevStreak: 0 for streak start, streak-1 for continue, null otherwise
  React.useEffect(() => {
    if (streakType === 'start') {
      setPrevStreak(0);
    } else if (streak > 1) {
      setPrevStreak(streak - 1);
    } else {
      setPrevStreak(null);
    }
  }, [streak, streakType]);

  // Animation sequence
  React.useEffect(() => {
    if (streak > 0 && streakType !== 'none') {
      setShowFlame(false);
      setCountStep('none');
      setTimeout(() => setShowFlame(true), 100); // Flame pops in
      setTimeout(() => setCountStep('prev-in'), 500); // Prev count fades in
      setTimeout(() => setCountStep('count-transition'), 1100); // Prev slides up/out, new slides up/in
      setTimeout(() => setCountStep('done'), 1700); // Text slides up/in
    } else {
      setShowFlame(false);
      setCountStep('none');
    }
  }, [streak, streakType]);

  return (
    <SlideFade in={true} offsetY="12px">
      <Flex
        align="center"
        borderRadius="2xl"
        p={0}
        mb={6}
        minHeight="100px"
        justify="flex-start"
        style={{ position: 'relative' }}
      >
        {/* Outer neon border */}
        <Box
          borderRadius="1.25em"
          bgGradient="linear(90deg, #00eaff 0%, #7f5fff 50%, #ff46a1 100%)"
          p="2.5px"
          width="100%"
          height="100%"
          boxShadow="0 0 0 2px #00eaff55, 0 0 16px 0 #7f5fff33, 0 4px 32px 0 #0008"
          display="flex"
          alignItems="stretch"
        >
          {/* Inner glassy background */}
          <Flex
            align="center"
            borderRadius="1.1em"
            p={{ base: 4, md: 6 }}
            width="100%"
            minHeight="95px"
            bg="rgba(18,22,40,0.82)"
            style={{
              backdropFilter: 'blur(12px)',
              width: '100%',
            }}
            justify="flex-start"
          >
            <Box
              fontSize={{ base: '2.5em', md: '3.2em' }}
              mr={{ base: 4, md: 6 }}
              style={{
                userSelect: 'none',
                filter: 'drop-shadow(0 0 24px #00eaff) drop-shadow(0 0 48px #7f5fff) drop-shadow(0 0 64px #ff46a1)',
                textShadow: '0 0 24px #00eaff, 0 0 48px #7f5fff, 0 0 64px #ff46a1',
                transition: 'filter 0.2s',
              }}
            >
              🎯
            </Box>
            <Flex direction="column" align="flex-start" flex={1} minW={0}>
              <Text
                fontSize={{ base: 'xl', md: '2xl' }}
                fontWeight="extrabold"
                color="#fff"
                mb={1}
                letterSpacing="tight"
                style={{
                  textShadow: '0 2px 16px #00eaff99, 0 1px 0 #222',
                  lineHeight: 1.1,
                }}
              >
                Workout Complete!
              </Text>
              {streak > 0 && streakType !== 'none' && (
                <Flex align="baseline" mt={1} minH="2.7em">
                  <AnimatePresence>
                    {showFlame && (
                      <motion.span
                        key="flame"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.18, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        style={{
                          fontSize: '2.1em',
                          display: 'inline-block',
                          marginRight: 10,
                          filter: 'drop-shadow(0 0 32px #00eaff) drop-shadow(0 0 64px #7f5fff) drop-shadow(0 0 96px #ff46a1)',
                          textShadow: '0 0 24px #00eaff, 0 0 48px #7f5fff, 0 0 64px #ff46a1',
                          transition: 'filter 0.2s',
                        }}
                        aria-label="streak"
                      >
                        🔥
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Box position="relative" minW="2.7em" display="inline-block" height="2.3em" overflow="visible">
                    {/* Only two animated spans: one for previous, one for current */}
                    <AnimatePresence initial={false}>
                      {(countStep === 'prev-in' || countStep === 'count-transition') && prevStreak !== null && (
                        <motion.span
                          key="prev-count"
                          initial={countStep === 'prev-in' ? { opacity: 0 } : { y: 0, opacity: 0.5 }}
                          animate={countStep === 'prev-in' ? { opacity: 0.5, y: 0 } : { y: -36, opacity: 0 }}
                          exit={{ y: -36, opacity: 0 }}
                          transition={{ duration: 0.38, type: 'spring' }}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            fontSize: '2.3em',
                            fontWeight: 900,
                            color: '#b0b3c6',
                            opacity: 0.5,
                            textShadow: '0 0 12px #7f5fff33',
                            padding: 0,
                            marginRight: 8,
                            display: 'inline-block',
                            zIndex: 1,
                            letterSpacing: '0.08em',
                            filter: 'drop-shadow(0 0 8px #7f5fff33)',
                            borderRadius: 8,
                            textAlign: 'center',
                          }}
                        >
                          {prevStreak}
                        </motion.span>
                      )}
                      {(countStep === 'count-transition' || countStep === 'done') && (
                        <motion.span
                          key="current-count"
                          initial={countStep === 'count-transition' ? { y: 36, opacity: 0 } : { y: 0, opacity: 1 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{}}
                          transition={{ duration: 0.38, type: 'spring' }}
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            fontSize: '2.3em',
                            fontWeight: 900,
                            color: 'transparent',
                            background: 'linear-gradient(90deg, #ffb300 30%, #ff6a00 70%, #ff3c00 100%)',
                            backgroundClip: 'text',
                            textShadow: '0 0 32px #ffb300, 0 0 48px #ff6a00, 0 0 64px #ff3c00',
                            padding: 0,
                            marginRight: 8,
                            display: 'inline-block',
                            zIndex: 2,
                            letterSpacing: '0.08em',
                            filter: 'drop-shadow(0 0 16px #ffb300) drop-shadow(0 0 32px #ff6a00)',
                            borderRadius: 8,
                            textAlign: 'center',
                          }}
                        >
                          {streak}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Box>
                  <AnimatePresence>
                    {countStep === 'done' && (
                      <motion.span
                        key="streakText"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ display: 'inline-block' }}
                      >
                        <Text
                          fontSize="md"
                          fontWeight="bold"
                          color="#00eaff"
                          letterSpacing="tight"
                          ml={2}
                          style={{
                            textShadow: '0 1px 12px #00eaff99, 0 1px 0 #222',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {streakType === 'start' ? 'Streak started!' : streakType === 'continue' ? 'Streak continued!' : ''}
                        </Text>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </SlideFade>
  );
};

const IncompleteWorkoutBanner: React.FC<{ routineId: string }> = ({ routineId }) => {
  // Subtle danger (red/orange) style, smaller and less bold
  const borderGradient = useColorModeValue(
    'linear(90deg, #ffb3b3 0%, #ff9800 100%)',
    'linear(90deg, #ff6a00 0%, #ffb3b3 100%)'
  );
  const glassBg = useColorModeValue('rgba(255, 240, 235, 0.85)', 'rgba(50, 20, 20, 0.85)');
  const iconShadow = useColorModeValue(
    '0 0 4px #ff4d4f, 0 0 8px #ff9800',
    '0 0 4px #ff1744, 0 0 8px #ff6a00'
  );
  const textColor = useColorModeValue('#b71c1c', '#ffbdbd');
  const subTextColor = useColorModeValue('#ff9800', '#ffb380');

  return (
    <SlideFade in={true} offsetY="8px">
      <Flex
        align="center"
        borderRadius="lg"
        p={0}
        mb={3}
        minHeight="48px"
        width="100%"
        mx="auto"
        style={{ position: 'relative' }}
      >
        {/* Outer soft danger border */}
        <Box
          borderRadius="0.8em"
          bgGradient={borderGradient}
          p="1px"
          width="100%"
          height="100%"
          boxShadow="0 0 0 1.5px #ff4d4f33, 0 0 6px 0 #ff980022, 0 2px 8px 0 #0002"
          display="flex"
          alignItems="stretch"
        >
          {/* Inner glassy background */}
          <Flex
            align="center"
            borderRadius="0.7em"
            p={{ base: 2, md: 2.5 }}
            width="100%"
            minHeight="44px"
            bg={glassBg}
            style={{
              backdropFilter: 'blur(6px)',
              width: '100%',
            }}
            justify="flex-start"
            gap={2}
          >
            <Box
              fontSize={{ base: '1.2em', md: '1.4em' }}
              mr={{ base: 1.5, md: 2 }}
              style={{
                userSelect: 'none',
                filter: iconShadow,
                textShadow: iconShadow,
                transition: 'filter 0.2s',
              }}
              aria-label="warning"
            >
              ⚠️
            </Box>
            <Flex direction="column" align="flex-start" flex={1} minW={0}>
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="semibold"
                color={textColor}
                mb={0.5}
                letterSpacing="tight"
                style={{ textShadow: '0 1px 2px #ff4d4f44, 0 1px 0 #fff2' }}
              >
                Not all exercises were completed
              </Text>
              <Text fontSize="xs" color={subTextColor} style={{ textShadow: '0 1px 2px #ff980044' }}>
                You finished this workout, but some exercises were skipped or left incomplete. You can review and adjust your routine for next time.
              </Text>
            </Flex>
            <Button
              as={RouterLink}
              to={`/workout/routine/${routineId}`}
              size="xs"
              colorScheme="red"
              variant="ghost"
              fontWeight="medium"
              ml={2}
              style={{
                boxShadow: '0 0 4px #ff4d4f44',
                borderRadius: '0.6em',
                fontSize: '0.92em',
              }}
            >
              Edit Routine
            </Button>
          </Flex>
        </Box>
      </Flex>
    </SlideFade>
  );
};

const PerfectWorkoutBanner: React.FC = () => {
  // Bold, glowy, golden style
  const borderGradient = useColorModeValue(
    'linear(90deg, #ffe066 0%, #ffd700 60%, #ffb300 100%)',
    'linear(90deg, #ffd700 0%, #ffb300 60%, #ff6a00 100%)'
  );
  const glassBg = useColorModeValue('rgba(255, 245, 200, 0.92)', 'rgba(40, 32, 10, 0.92)');
  const iconShadow = useColorModeValue(
    '0 0 24px #ffe066, 0 0 48px #ffd700, 0 0 64px #ffb300',
    '0 0 24px #ffd700, 0 0 48px #ffb300, 0 0 64px #ff6a00'
  );
  const textColor = useColorModeValue('#a67c00', '#ffe066');
  const subTextColor = useColorModeValue('#ffb300', '#ffd700');

  return (
    <SlideFade in={true} offsetY="10px">
      <Flex
        align="center"
        borderRadius="xl"
        p={0}
        mb={4}
        minHeight="70px"
        width="100%"
        mx="auto"
        style={{ position: 'relative' }}
      >
        {/* Outer golden glow border */}
        <Box
          borderRadius="1em"
          bgGradient={borderGradient}
          p="2.5px"
          width="100%"
          height="100%"
          boxShadow="0 0 0 3px #ffd70088, 0 0 32px 0 #ffe06655, 0 2px 24px 0 #0007"
          display="flex"
          alignItems="stretch"
        >
          {/* Inner glassy background */}
          <Flex
            align="center"
            borderRadius="0.9em"
            p={{ base: 4, md: 5 }}
            width="100%"
            minHeight="66px"
            bg={glassBg}
            style={{
              backdropFilter: 'blur(14px)',
              width: '100%',
            }}
            justify="flex-start"
            gap={3}
          >
            <Box
              fontSize={{ base: '2em', md: '2.5em' }}
              mr={{ base: 3, md: 4 }}
              style={{
                userSelect: 'none',
                filter: iconShadow,
                textShadow: iconShadow,
                transition: 'filter 0.2s',
              }}
              aria-label="trophy"
            >
              🏆
            </Box>
            <Flex direction="column" align="flex-start" flex={1} minW={0}>
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                fontWeight="extrabold"
                color={textColor}
                mb={0.5}
                letterSpacing="tight"
                style={{ textShadow: '0 2px 16px #ffd700cc, 0 1px 0 #fff2' }}
              >
                Perfect Workout!
              </Text>
              <Text fontSize="sm" color={subTextColor} style={{ textShadow: '0 1px 12px #ffd70099' }}>
                You completed every exercise in this workout. Amazing job!
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </SlideFade>
  );
};

const RoutineUpdatedBanner: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
  // Bold info (blue/cyan) style, matching the visual weight of IncompleteWorkoutBanner
  // and PerfectWorkoutBanner rather than reading as a muted footnote.
  const borderGradient = useColorModeValue(
    'linear(90deg, #7dd3fc 0%, #38bdf8 60%, #0ea5e9 100%)',
    'linear(90deg, #38bdf8 0%, #0ea5e9 60%, #0284c7 100%)'
  );
  const glassBg = useColorModeValue('rgba(235, 248, 255, 0.9)', 'rgba(15, 35, 50, 0.9)');
  const iconShadow = useColorModeValue(
    '0 0 4px #38bdf8, 0 0 8px #0ea5e9',
    '0 0 4px #38bdf8, 0 0 8px #0284c7'
  );
  const textColor = useColorModeValue('#0c4a6e', '#7dd3fc');
  const subTextColor = useColorModeValue('#0284c7', '#38bdf8');

  return (
    <SlideFade in={true} offsetY="8px">
      <Flex
        align="center"
        borderRadius="lg"
        p={0}
        mb={3}
        minHeight="48px"
        width="100%"
        mx="auto"
        style={{ position: 'relative' }}
      >
        {/* Outer info glow border */}
        <Box
          borderRadius="0.8em"
          bgGradient={borderGradient}
          p="1px"
          width="100%"
          height="100%"
          boxShadow="0 0 0 1.5px #38bdf833, 0 0 6px 0 #0ea5e922, 0 2px 8px 0 #0002"
          display="flex"
          alignItems="stretch"
        >
          {/* Inner glassy background */}
          <Flex
            align="center"
            borderRadius="0.7em"
            p={{ base: 2, md: 2.5 }}
            width="100%"
            minHeight="44px"
            bg={glassBg}
            style={{
              backdropFilter: 'blur(6px)',
              width: '100%',
            }}
            justify="flex-start"
            gap={2}
          >
            <Box
              fontSize={{ base: '1.2em', md: '1.4em' }}
              mr={{ base: 1.5, md: 2 }}
              style={{
                userSelect: 'none',
                filter: iconShadow,
                textShadow: iconShadow,
                transition: 'filter 0.2s',
              }}
              aria-label="routine updated"
            >
              🔄
            </Box>
            <Flex direction="column" align="flex-start" flex={1} minW={0}>
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="semibold"
                color={textColor}
                mb={0.5}
                letterSpacing="tight"
                style={{ textShadow: '0 1px 2px #38bdf844, 0 1px 0 #fff2' }}
              >
                This routine has been updated
              </Text>
              <Text fontSize="xs" color={subTextColor}>
                Restart this workout to use the latest version of the routine.
              </Text>
            </Flex>
            <Button
              size="xs"
              colorScheme="cyan"
              variant="ghost"
              fontWeight="medium"
              ml={2}
              style={{
                boxShadow: '0 0 4px #38bdf844',
                borderRadius: '0.6em',
                fontSize: '0.92em',
              }}
              onClick={onRestart}
            >
              Restart
            </Button>
          </Flex>
        </Box>
      </Flex>
    </SlideFade>
  );
};