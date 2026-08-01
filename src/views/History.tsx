import React from 'react';
import { Flex, Heading, SimpleGrid, Spinner, Text } from '@chakra-ui/react';
import { FaChartBar, FaClipboardList, FaClock, FaDumbbell, FaFire, FaHistory, FaLayerGroup, FaTrophy } from 'react-icons/fa';
import { useRoutines, useWorkouts } from '../store/pulsarStore';
import { formatTotalDuration, getHistorySummaryStats, getHistoryTimeline, getRoutineTimeline } from '../utils/historyStats';
import YearActivityCalendar from '../components/YearActivityCalendar';
import StatCard from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import RoutineHistoryList from '../components/RoutineHistoryList';
import WorkoutHistoryList from '../components/WorkoutHistoryList';
import WeeklyActivityGraph from '../components/WeeklyActivityGraph';

const History: React.FC = () => {
  const routines = useRoutines();
  const workouts = useWorkouts();
  const isLoading = routines === undefined || workouts === undefined;

  const summary = React.useMemo(
    () => (routines && workouts ? getHistorySummaryStats(workouts, routines) : null),
    [workouts, routines]
  );

  const routineTimeline = React.useMemo(
    () => (routines && workouts ? getRoutineTimeline(routines, workouts) : []),
    [routines, workouts]
  );

  const historyTimeline = React.useMemo(
    () => (routines && workouts ? getHistoryTimeline(workouts, routines) : []),
    [workouts, routines]
  );

  if (isLoading || !summary) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh" w="100%">
        <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" mb={4} />
        <Text color="gray.500" fontSize="lg">Loading your history...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap={{ base: 4, sm: 5 }}>
      <Heading
        fontSize={{ base: 'xl', sm: '2xl' }}
        bgGradient="linear(to-r, cyan.400, blue.500)"
        bgClip="text"
        mb={1}
      >
        History
      </Heading>

      <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={{ base: 3, sm: 4 }}>
        <StatCard icon={FaFire} label="Day streak" value={summary.streak} color="orange.400" />
        <StatCard icon={FaDumbbell} label="Workouts done" value={summary.totalCompleted} color="cyan.500" />
        <StatCard icon={FaTrophy} label="Perfect workouts" value={summary.perfectWorkouts} color="yellow.400" />
        <StatCard icon={FaClipboardList} label="Active routines" value={summary.activeRoutineCount} color="green.400" />
        <StatCard icon={FaClock} label="Total workout time" value={formatTotalDuration(summary.totalWorkoutTimeMs)} color="purple.400" />
        <StatCard icon={FaLayerGroup} label="Exercises done" value={summary.uniqueExercisesDone} color="pink.400" />
      </SimpleGrid>

      <YearActivityCalendar workouts={workouts} routines={routines} />

      <SectionCard icon={FaChartBar} title="Weekly Activity">
        <WeeklyActivityGraph workouts={workouts} />
      </SectionCard>

      <SectionCard icon={FaClipboardList} title="Routine History">
        <RoutineHistoryList entries={routineTimeline} />
      </SectionCard>

      <SectionCard icon={FaHistory} title="Workout History">
        <WorkoutHistoryList items={historyTimeline} routines={routines} />
      </SectionCard>
    </Flex>
  );
};

export default History;
