import React from 'react';
import { Box, Button, Container, Flex, Heading, Text, useColorModeValue, Highlight, Spinner, Icon } from '@chakra-ui/react';
import { format } from 'date-fns';
import { FaDumbbell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useExercises, useRoutines, useWorkouts } from '../store/pulsarStore';
import { findExercisesForToday, findRoutineForToday, getWorkoutStatusForToday, hasRoutineForToday } from '../utils/workoutUtils';
import StreakCalendar from '../components/StreakCalendar';
import InstallAppAlert from '../components/InstallAppAlert';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';
import NoActiveRoutinesAlert from '../components/NoActiveRoutinesAlert';
import { pickTodaysHomeBackground } from '../assets/homeBackgrounds';

const getGreeting = (hour: number): string => {
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Home: React.FC = () => {
  const routines = useRoutines();
  const workouts = useWorkouts();
  const exercises = useExercises();
  const isLoading = routines === undefined || workouts === undefined;
  const navigate = useNavigate();
  const now = new Date();
  const glassBg = useColorModeValue('whiteAlpha.700', 'blackAlpha.400');
  const glassBorder = useColorModeValue('whiteAlpha.800', 'whiteAlpha.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');
  const backgroundTint = useColorModeValue(
    'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.32) 100%)',
    'linear-gradient(135deg, rgba(30,30,40,0.45) 0%, rgba(0,0,0,0.32) 100%)'
  );

  const activeRoutines = React.useMemo(() => routines.filter(r => r.active), [routines]);

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
        {routines.length === 0 ? (
          <Flex align="center" justify="center" minH="calc(100vh - 200px)" w="100%" p={{ base: 4, md: 8 }}>
            <Box
              textAlign="center"
              maxW="440px"
              w="100%"
              borderRadius="2xl"
              p={{ base: 8, sm: 10 }}
              bg={glassBg}
              backdropFilter="blur(20px) saturate(180%)"
              border="1px solid"
              borderColor={glassBorder}
              boxShadow="0 8px 32px rgba(0,0,0,0.12)"
            >
              <Flex
                align="center"
                justify="center"
                borderRadius="full"
                boxSize={{ base: '88px', sm: '104px' }}
                bgGradient="linear(to-br, cyan.400, blue.500)"
                color="white"
                mx="auto"
                mb={5}
                boxShadow="0 8px 24px rgba(0,0,0,0.25)"
              >
                <Icon as={FaDumbbell} boxSize={{ base: 9, sm: 10 }} />
              </Flex>
              <Heading size="lg" mb={2}>
                <Highlight
                  query="Pulsar"
                  styles={{
                    display: 'inline-block',
                    color: 'cyan.500',
                    fontWeight: 'black',
                  }}
                >
                  Welcome to Pulsar!
                </Highlight>
              </Heading>
              <Text color={mutedColor} mb={6}>Get started by creating your first workout routine.</Text>
              <Button
                size="lg"
                bgGradient="linear(to-r, cyan.400, blue.500)"
                color="white"
                fontWeight="bold"
                _hover={{ transform: 'scale(1.03)' }}
                _active={{ transform: 'scale(0.98)' }}
                transition="all 0.2s"
                onClick={() => navigate('/workout')}
              >
                Create My First Workout
              </Button>
            </Box>
          </Flex>
        ) : (
          <Box w="100%" minH="calc(100vh - 200px)">
            <Box mb={{ base: 4, sm: 5 }} px={1}>
              <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
                {getGreeting(now.getHours())}
              </Text>
              <Heading fontSize={{ base: 'xl', sm: '2xl' }}>
                {format(now, 'EEEE, MMMM d')}
              </Heading>
            </Box>
            {activeRoutines.length === 0 ? (
              <NoActiveRoutinesAlert
                onCreate={() => navigate('/workout/setup')}
                onStartRoutine={() => navigate('/workout')}
              />
            ) : hasRoutineForToday(activeRoutines) ? (
              getWorkoutStatusForToday(workouts, activeRoutines) === 'completed' ? (
                <FinishedWorkoutAlert routines={activeRoutines} workouts={workouts} />
              ) : (
                <TimeToWorkoutAlert routines={activeRoutines} workouts={workouts} />
              )
            ) : (
              <RestDayAlert />
            )}
            {workouts.length > 0 && <StreakCalendar workouts={workouts} routines={routines} />}
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Home;
