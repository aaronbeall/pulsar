import React from 'react';
import { Box, Button, Container, Flex, Heading, Text, useToken, useColorModeValue, Highlight, Spinner } from '@chakra-ui/react';
import { FaDumbbell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useExercises, useRoutines, useWorkouts } from '../store/pulsarStore';
import { Routine, Workout } from '../models/types';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';
import { findExercisesForToday, findRoutineForToday, getWorkoutStatusForToday, hasRoutineForToday } from '../utils/workoutUtils';
import StreakCalendar from '../components/StreakCalendar';
import InstallAppAlert from '../components/InstallAppAlert';
import { pickTodaysHomeBackground } from '../assets/homeBackgrounds';

const Home: React.FC = () => {
  const routines = useRoutines();
  const workouts = useWorkouts();
  const exercises = useExercises();
  const isLoading = routines === undefined || workouts === undefined;
  const navigate = useNavigate();
  const [red500] = useToken('colors', ['red.500']);
  const backgroundTint = useColorModeValue(
    'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.32) 100%)',
    'linear-gradient(135deg, rgba(30,30,40,0.45) 0%, rgba(0,0,0,0.32) 100%)'
  );

  const todayStatus = routines.length > 0 && hasRoutineForToday(routines)
    ? getWorkoutStatusForToday(workouts, routines)
    : 'rest';

  // Cover images of whatever's scheduled today, for the workout-day background pick to
  // draw from alongside the curated photo pool (see pickTodaysHomeBackground).
  const todaysExerciseImages = React.useMemo(() => {
    const todayRoutine = findRoutineForToday(routines);
    if (!todayRoutine) return [];
    return findExercisesForToday(todayRoutine)
      .map(scheduled => exercises.find(e => e.id === scheduled.exerciseId)?.coverImageUrl)
      .filter((url): url is string => !!url);
  }, [routines, exercises]);

  const background = React.useMemo(
    () => pickTodaysHomeBackground(todayStatus === 'rest', todaysExerciseImages),
    [todayStatus, todaysExerciseImages]
  );

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" w="100%">
        <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" mb={4} />
        <Text color="gray.500" fontSize="lg">Loading your fitness journey...</Text>
      </Flex>
    );
  }

  return (
    // Full-bleed background spanning the entire content area with no margin — breaks out
    // of the parent route Container's max-width (left:50%/-50vw trick) AND its py={6}
    // vertical padding (mt/mb: -6, the matching negative token) so the image runs flush
    // against the header/footer bars above/below it, with nothing — including
    // InstallAppAlert — outside its bounds. Tinted the same way as the exercise session
    // screen.
    <Box position="relative" left="50%" marginLeft="-50vw" width="100vw" mt={-6} mb={-6} overflow="hidden">
      <Box position="absolute" top={0} left={0} w="100%" h="100%" zIndex={0}>
        <img
          src={background.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22 }}
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          pointerEvents="none"
          style={{ background: backgroundTint, mixBlendMode: 'multiply' }}
        />
      </Box>
      <Container maxW="container.lg" position="relative" zIndex={1} pt={6} pb={6}>
        <InstallAppAlert />
        <Flex direction="column" align="center" justify="center" minH="calc(100vh - 200px)" w="100%" p={{ base: 4, md: 8 }}>
          {routines.length === 0 ? (
            <>
              <Box textAlign="center" mb={6}>
                <FaDumbbell size="100px" color={red500} />
              </Box>
              <Box textAlign="center">
                <Heading size="lg" mb={4}>
                  <Highlight
                    query="Pulsar"
                    styles={{
                      display: 'inline-block',
                      color: 'cyan.500',
                      fontWeight: 'bold',
                    }}
                  >
                    Welcome to Pulsar!
                  </Highlight>
                </Heading>
                <Text mb={4}>Get started by creating your first workout routine.</Text>
                <Button colorScheme="cyan" onClick={() => navigate('/workout')}>
                  Create My First Workout
                </Button>
              </Box>
            </>
          ) : (
            <Box w="100%">
              {todayStatus === 'rest' && <RestDayAlert />}
              {todayStatus === 'not started' && <TimeToWorkoutAlert routines={routines} workouts={workouts} />}
              {todayStatus === 'in progress' && <TimeToWorkoutAlert routines={routines} workouts={workouts} />}
              {todayStatus === 'completed' && <FinishedWorkoutAlert routines={routines} workouts={workouts} />}
              {workouts.length > 0 && <StreakCalendar workouts={workouts} routines={routines} />}
            </Box>
          )}
        </Flex>
      </Container>
    </Box>
  );
};

export default Home;
