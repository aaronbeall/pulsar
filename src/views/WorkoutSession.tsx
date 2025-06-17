import React from 'react';
import { Box, Button, Flex, Heading, Spinner, Text, VStack, Breadcrumb, BreadcrumbItem, BreadcrumbLink, SlideFade, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useColorModeValue } from '@chakra-ui/react';
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
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';
import { getStreakInfo } from '../utils/workoutUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { keyframes } from '@emotion/react';
import { FaFlagCheckered, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import { Counter } from '../components/Counter';

const confetti = keyframes`
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-8px) rotate(-5deg); }
  40% { transform: translateY(-16px) rotate(5deg); }
  60% { transform: translateY(-8px) rotate(-3deg); }
  80% { transform: translateY(-4px) rotate(3deg); }
`;

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
  const [showFinishedAlert, setShowFinishedAlert] = React.useState(false);
  const [streakCount, setStreakCount] = React.useState(0);
  const [streakType, setStreakType] = React.useState<'none' | 'start' | 'continue'>('none');
  const [showInterstitial, setShowInterstitial] = React.useState(false);

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

  const handleSkip = async (exerciseIndex: number) => {
    if (!workout) return;
    const updatedWorkout = { ...workout };
    const exercise = updatedWorkout.exercises[exerciseIndex];
    if (!exercise.completedAt) {
      exercise.completedAt = Date.now();
      exercise.skipped = true;
    }
    // Set workout.completedAt if all exercises are complete
    const allCompleted = updatedWorkout.exercises.every(ex => ex.completedAt);
    if (allCompleted && !updatedWorkout.completedAt) {
      updatedWorkout.completedAt = Date.now();
    }
    await updateWorkout(updatedWorkout);
    setWorkout(updatedWorkout);
    // Auto-advance to the first incomplete exercise (if any)
    const firstIncompleteIdx = updatedWorkout.exercises.findIndex(ex => !ex.completedAt);
    setSelectedExerciseIndex(firstIncompleteIdx !== -1 ? firstIncompleteIdx : null);
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

  React.useEffect(() => {
    if (workout && workout.completedAt) {
      setShowFinishedAlert(true);
      setShowInterstitial(true);
      // Calculate streak info
      const streakInfo = getStreakInfo(workouts, routines);
      if (streakInfo && streakInfo.streak > 0 && streakInfo.status !== 'expired') {
        setStreakCount(streakInfo.streak);
        setStreakType(streakInfo.streak === 1 ? 'start' : 'continue');
      } else {
        setStreakCount(0);
        setStreakType('none');
      }
    } else {
      setShowFinishedAlert(false);
      setShowInterstitial(false);
      setStreakCount(0);
      setStreakType('none');
    }
  }, [workout?.completedAt, workouts, routines]);

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
    return (
      <CongratulatoryInterstitial
        streak={streakCount}
        streakType={streakType}
        isPerfect={!!isPerfect}
        totalWorkouts={totalWorkouts}
        onDismiss={() => setShowInterstitial(false)}
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
  const bg = useColorModeValue('gray.50', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const iconColor = useColorModeValue('yellow.400', 'yellow.200');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const subTextColor = useColorModeValue('gray.400', 'gray.400');

  return (
    <Flex
      align="center"
      bg={bg}
      color={textColor}
      borderRadius="md"
      px={3}
      py={1.5}
      mb={3}
      boxShadow="none"
      borderWidth={1}
      borderColor={border}
      gap={2}
      style={{ opacity: 0.85 }}
    >
      <Box fontSize="1.1em" mr={2} aria-label="warning" color={iconColor}>⚠️</Box>
      <Box flex={1}>
        <Text fontWeight="medium" color={textColor} mb={0.5} fontSize="sm">
          Not all exercises were completed
        </Text>
        <Text fontSize="xs" color={subTextColor}>
          You finished this workout, but some exercises were skipped or left incomplete. You can review and adjust your routine for next time.
        </Text>
      </Box>
      <Button
        as={RouterLink}
        to={`/workout/routine/${routineId}`}
        size="xs"
        colorScheme="blue"
        variant="ghost"
        fontWeight="medium"
        ml={2}
      >
        Edit Routine
      </Button>
    </Flex>
  );
};

const PerfectWorkoutBanner: React.FC = () => {
  const bg = useColorModeValue('blue.50', 'gray.900');
  const border = useColorModeValue('blue.200', 'blue.700');
  const iconColor = useColorModeValue('yellow.400', 'yellow.200');
  const textColor = useColorModeValue('blue.700', 'blue.200');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Flex
      align="center"
      bg={bg}
      color={textColor}
      borderRadius="md"
      px={3}
      py={1.5}
      mb={3}
      boxShadow="none"
      borderWidth={1}
      borderColor={border}
      gap={2}
      style={{ opacity: 0.92 }}
    >
      <Box fontSize="1.2em" mr={2} aria-label="celebrate" color={iconColor}>🏆</Box>
      <Box flex={1}>
        <Text fontWeight="bold" color={textColor} mb={0.5} fontSize="sm">
          Perfect Workout!
        </Text>
        <Text fontSize="xs" color={subTextColor}>
          You completed every exercise in this workout. Amazing job!
        </Text>
      </Box>
    </Flex>
  );
};

const RoutineUpdatedBanner: React.FC<{ onRestart: () => void }> = ({ onRestart }) => {
  const bg = useColorModeValue('gray.100', 'gray.850');
  const border = useColorModeValue('gray.200', 'gray.800');
  const textColor = useColorModeValue('gray.400', 'gray.500');
  const buttonColor = useColorModeValue('blue.400', 'blue.300');
  return (
    <Flex
      align="center"
      bg={bg}
      color={textColor}
      borderRadius="md"
      px={2}
      py={0.5}
      mb={2}
      borderWidth={1}
      borderColor={border}
      fontSize="xs"
      style={{ opacity: 0.7, minHeight: 0 }}
      gap={2}
    >
      <Box flex={1}>
        This routine has been updated. Would you like to restart this workout to use the latest routine?
      </Box>
      <Button
        size="xs"
        variant="ghost"
        color={buttonColor}
        fontWeight="medium"
        px={2}
        py={0.5}
        onClick={onRestart}
      >
        Restart
      </Button>
    </Flex>
  );
};

const CongratulatoryInterstitial: React.FC<{
  streak: number;
  streakType: 'none' | 'start' | 'continue';
  isPerfect: boolean;
  totalWorkouts: number;
  onDismiss: () => void;
}> = ({ streak, streakType, isPerfect, totalWorkouts, onDismiss }) => {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setStep(1), 1200));
    if (streak > 0 && streakType !== 'none') {
      timers.push(setTimeout(() => setStep(2), 2400));
    }
    if (isPerfect) {
      timers.push(setTimeout(() => setStep(3), 3600));
    }
    timers.push(setTimeout(() => setStep(4), 4800));
    return () => timers.forEach(clearTimeout);
  }, [streak, streakType, isPerfect]);
  return (
    <Flex direction="column" align="center" minH="60vh" w="100%" p={6}>
      <AnimatePresence mode="wait">
        {step >= 0 && (
          <motion.div
            key="congrats"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
            style={{ width: '100%' }}
          >
            <Heading size="2xl" mb={2} color="cyan.400" textAlign="center">🎉 Congratulations!</Heading>
            <Text fontSize="xl" color="gray.500" mb={6} textAlign="center">You finished your workout!</Text>
          </motion.div>
        )}
        {step >= 1 && streak > 0 && streakType !== 'none' && (
          <motion.div
            key="streak"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring', bounce: 0.4 }}
            style={{ width: '100%' }}
          >
            <Flex align="center" justify="center" mb={4} gap={2}>
              <Text fontSize="2xl" fontWeight="bold" color="orange.400" mr={1} textShadow="0 2px 8px #ffb30088">🔥</Text>
              <Counter from={0} to={streak} delay={500} duration={1000} fontSize="2.7em" color="#ffb300" fontWeight={900} style={{marginRight: 6, textShadow: '0 2px 8px #ffb30088'}} />
              <Text fontSize="lg" color="orange.400" fontWeight="semibold" letterSpacing="wide" textShadow="0 1px 6px #ffb30044">day streak</Text>
            </Flex>
          </motion.div>
        )}
        {step >= 2 && isPerfect && (
          <motion.div
            key="perfect"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring', bounce: 0.4 }}
            style={{ width: '100%' }}
          >
            <Flex align="center" justify="center" mb={2} gap={2}>
              <Text fontSize="2xl" fontWeight="bold" color="yellow.400" mr={1} textShadow="0 2px 8px #ffe06688">🏆</Text>
              <Text fontSize="lg" color="yellow.500" fontWeight="semibold" letterSpacing="wide" textShadow="0 1px 6px #ffe06644">Perfect Workout!</Text>
            </Flex>
          </motion.div>
        )}
        {step >= 3 && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring', bounce: 0.4 }}
            style={{ width: '100%' }}
          >
            <Flex align="center" justify="center" mb={2} gap={2}>
              <Box as={FaFlagCheckered} color="cyan.400" fontSize="2xl" mr={1} filter="drop-shadow(0 0 8px #00eaff88)" />
              <Counter from={0} to={totalWorkouts} delay={500} duration={1000} fontSize="2.2em" color="#00eaff" fontWeight={900} style={{marginRight: 6, textShadow: '0 1px 6px #00eaff44'}} />
              <Text fontSize="lg" color="cyan.500" fontWeight="bold" letterSpacing="wide" textShadow="0 1px 6px #00eaff44">workouts completed</Text>
            </Flex>
          </motion.div>
        )}
      </AnimatePresence>
      {step >= 4 && (
        <motion.div
          key="dismiss"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.7, delay: 0.2, type: 'spring', bounce: 0.4 }}
          style={{ width: '100%' }}
        >
          <Flex justify="center">
            <Button colorScheme="cyan" size="lg" mt={6} onClick={onDismiss} leftIcon={<Box as={FaFlagCheckered} fontSize="1.3em" />}>
              Continue
            </Button>
          </Flex>
        </motion.div>
      )}
    </Flex>
  );
};