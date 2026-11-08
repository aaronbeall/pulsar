import { useMemo } from 'react';
import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  Icon,
  SlideFade,
  Spinner,
  Text,
  VStack,
  usePrefersReducedMotion,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaBed, FaChevronRight, FaLeaf } from 'react-icons/fa';
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import { DAYS_OF_WEEK } from '../constants/days';
import { DayOfWeek } from '../models/types';
import { useExercises, usePulsarLoading, useRoutines } from '../store/pulsarStore';
import { getRestDayTips } from '../utils/restDayTips';
import { findRoutineForDay, findScheduleForDay, getTodayDayOfWeek, hasRoutineForDay } from '../utils/workoutUtils';

// A slow inhale/exhale, about six breaths a minute.
const breathe = keyframes`
  0%, 100% { transform: scale(0.88); opacity: 0.55; }
  50% { transform: scale(1.08); opacity: 0.95; }
`;

const RestDay: React.FC = () => {
  const { day: dayParam } = useParams();
  const routines = useRoutines();
  const exercises = useExercises();
  const isLoading = usePulsarLoading();
  const prefersReducedMotion = usePrefersReducedMotion();

  const day: DayOfWeek = DAYS_OF_WEEK.find(d => d === dayParam) ?? getTodayDayOfWeek();
  const isToday = day === getTodayDayOfWeek();
  const activeRoutines = useMemo(() => routines.filter(r => r.active), [routines]);

  // Names and target muscles of every exercise in the active routines, for the tips.
  const exerciseTexts = useMemo(() => {
    const ids = new Set(activeRoutines.flatMap(r => r.dailySchedule.flatMap(d => d.exercises.map(e => e.exerciseId))));
    return exercises
      .filter(e => ids.has(e.id))
      .map(e => [e.name, ...(e.targetMuscles ?? [])].join(' '));
  }, [activeRoutines, exercises]);

  // Seeded by the date, so tips stay put through the day and change the next.
  const tips = useMemo(
    () => getRestDayTips(exerciseTexts, `${new Date().toDateString()}:${day}`),
    [exerciseTexts, day]
  );

  // The next scheduled workout day after this one, within the week.
  const nextWorkout = useMemo(() => {
    const start = DAYS_OF_WEEK.indexOf(day);
    for (let i = 1; i <= 7; i++) {
      const next = DAYS_OF_WEEK[(start + i) % 7];
      if (hasRoutineForDay(activeRoutines, next)) {
        return {
          day: next,
          daysAway: i,
          routine: findRoutineForDay(activeRoutines, next),
          schedule: findScheduleForDay(activeRoutines, next),
        };
      }
    }
    return null;
  }, [activeRoutines, day]);

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" />
      </Flex>
    );
  }

  // Not actually a rest day: send them to the workout screen instead.
  if (hasRoutineForDay(activeRoutines, day)) {
    return <Navigate to="/workout" replace />;
  }

  const whenLabel = nextWorkout && isToday && nextWorkout.daysAway === 1 ? 'Tomorrow' : nextWorkout?.day;

  return (
    <SlideFade in={true} offsetY="20px">
      <Flex direction="column" width="100%">
        <Breadcrumb mb={4}>
          <BreadcrumbItem>
            <BreadcrumbLink as={RouterLink} to="/workout">Workout</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{day}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {/* Calm hero */}
        <Flex
          direction="column"
          align="center"
          textAlign="center"
          borderRadius="2xl"
          px={5}
          py={{ base: 8, sm: 10 }}
          mb={6}
          bgGradient="linear(to-b, purple.50, blue.50)"
          _dark={{ bgGradient: 'linear(to-b, purple.900, gray.800)' }}
          boxShadow="sm"
        >
          <Box position="relative" boxSize="112px" mb={5}>
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              bg="purple.200"
              _dark={{ bg: 'purple.700' }}
              animation={prefersReducedMotion ? undefined : `${breathe} 10s ease-in-out infinite`}
            />
            <Flex position="absolute" inset={0} align="center" justify="center">
              <Icon as={FaBed} boxSize={12} color="purple.600" _dark={{ color: 'purple.100' }} />
            </Flex>
          </Box>
          <Text fontSize="sm" fontWeight="semibold" color="purple.600" _dark={{ color: 'purple.200' }} mb={1}>
            {isToday ? 'Today' : day}
          </Text>
          <Heading fontSize={{ base: '2xl', sm: '3xl' }} mb={2}>
            Rest day
          </Heading>
          <Text color="gray.600" _dark={{ color: 'gray.300' }} maxW="sm">
            Recovery is where the progress happens. There's nothing to track, so just take it easy.
          </Text>
          {!prefersReducedMotion && (
            <Text fontSize="xs" color="gray.500" mt={4}>
              Breathe with the circle: in as it grows, out as it shrinks.
            </Text>
          )}
        </Flex>

        {/* Tips */}
        <Heading size="md" mb={3} display="flex" alignItems="center" gap={2}>
          <Icon as={FaLeaf} color="green.400" />
          Make the most of it
        </Heading>
        <VStack spacing={3} align="stretch" mb={6} as="ul" listStyleType="none" aria-label="Rest day tips">
          {tips.map(tip => (
            <Box
              as="li"
              key={tip.id}
              bg="white"
              _dark={{ bg: 'gray.800' }}
              borderRadius="xl"
              p={4}
              boxShadow="sm"
            >
              {tip.reason && (
                <Badge colorScheme="purple" variant="subtle" mb={2} textTransform="none" fontWeight="medium">
                  {tip.reason}
                </Badge>
              )}
              <Text fontWeight="bold" mb={1}>{tip.title}</Text>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>{tip.body}</Text>
            </Box>
          ))}
        </VStack>

        {/* Next workout */}
        {nextWorkout?.routine && (
          <Box bg="white" _dark={{ bg: 'gray.800' }} borderRadius="xl" p={4} boxShadow="sm">
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
              Next workout
            </Text>
            <Text fontWeight="bold">
              {whenLabel}
              {nextWorkout.schedule?.kind ? ` · ${nextWorkout.schedule.kind}` : ''}
            </Text>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} mb={3}>
              {nextWorkout.routine.name}
              {nextWorkout.schedule ? ` · ${nextWorkout.schedule.exercises.length} exercises` : ''}
            </Text>
            <Button
              as={RouterLink}
              to={`/workout/routine/${nextWorkout.routine.id}`}
              variant="outline"
              colorScheme="cyan"
              size="md"
              width="100%"
              rightIcon={<FaChevronRight />}
            >
              View routine
            </Button>
          </Box>
        )}
      </Flex>
    </SlideFade>
  );
};

export default RestDay;
