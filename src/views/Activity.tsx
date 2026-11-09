import React, { useMemo } from 'react';
import { Box, Flex, Heading, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { FaChartBar, FaClock, FaDumbbell, FaFire, FaHistory, FaLayerGroup, FaMedal, FaTrophy } from 'react-icons/fa';
import { usePulsarLoading, useRoutines, useWorkouts } from '../store/pulsarStore';
import { formatTotalDuration, getHistorySummaryStats, getRoutineStints } from '../utils/historyStats';
import YearActivityCalendar from '../components/YearActivityCalendar';
import StatCard from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import HistoryTimeline from '../components/HistoryTimeline';
import WeeklyActivityGraph from '../components/WeeklyActivityGraph';

const Activity: React.FC = () => {
  const routines = useRoutines();
  const workouts = useWorkouts();
  // routines/workouts default to [] (never undefined) even before loadAll() resolves, so
  // the store's own `loading` flag is the only reliable signal here.
  const isLoading = usePulsarLoading();

  const summary = useMemo(
    () => (routines && workouts ? getHistorySummaryStats(workouts, routines) : null),
    [workouts, routines]
  );

  const stints = useMemo(
    () => (routines && workouts ? getRoutineStints(workouts, routines) : []),
    [workouts, routines]
  );

  if (isLoading || !summary) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" w="100%">
        <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" mb={4} />
        <Text color="gray.500" fontSize="lg">Loading your activity...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap={{ base: 4, sm: 5 }}>
      <Box>
        <Heading
          fontSize={{ base: 'xl', sm: '2xl' }}
          bgGradient="linear(to-r, orange.400, pink.500)"
          bgClip="text"
        >
          Activity
        </Heading>
        <Text fontSize="sm" color="gray.500">Your streaks, workouts and routines over time.</Text>
      </Box>

      <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={{ base: 3, sm: 4 }}>
        <StatCard icon={FaFire} label="Day streak" value={summary.streak} color="orange.400" />
        <StatCard icon={FaDumbbell} label="Workouts done" value={summary.totalCompleted} color="cyan.500" />
        <StatCard icon={FaTrophy} label="Perfect workouts" value={summary.perfectWorkouts} color="yellow.400" />
        <StatCard icon={FaMedal} label="Best streak" value={summary.bestStreak} color="green.400" />
        <StatCard icon={FaClock} label="Total workout time" value={formatTotalDuration(summary.totalWorkoutTimeMs)} color="purple.400" />
        <StatCard icon={FaLayerGroup} label="Exercises done" value={summary.uniqueExercisesDone} color="pink.400" />
      </SimpleGrid>

      <YearActivityCalendar workouts={workouts} routines={routines} />

      <SectionCard icon={FaChartBar} title="Weekly Activity">
        <WeeklyActivityGraph workouts={workouts} />
      </SectionCard>

      <SectionCard icon={FaHistory} title="Timeline">
        <HistoryTimeline stints={stints} routines={routines} />
      </SectionCard>
    </Flex>
  );
};

export default Activity;
