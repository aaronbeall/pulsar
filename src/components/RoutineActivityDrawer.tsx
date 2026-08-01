import {
  Badge,
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Text,
  useColorModeValue
} from '@chakra-ui/react';
import { format } from 'date-fns'; // Import date-fns for formatting dates
import React from 'react';
import { FaCheckCircle, FaInfoCircle, FaPlay, FaPowerOff, FaTimes, FaTrophy } from 'react-icons/fa'; // Import icons
import { Routine, Workout } from '../models/types';
import { getRoutineStats } from '../utils/workoutUtils';
import WeeklyActivityGraph from './WeeklyActivityGraph';

const RoutineStatsBox: React.FC<{ routine: Routine, workouts: Workout[] }> = React.memo(({ routine, workouts }) => {
  const stats = getRoutineStats(routine, workouts);
  return (
    <Flex mb={4} p={3} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')} boxShadow="sm" align="center" gap={6} wrap="wrap">
      <Box>
        <Text fontSize="sm" color="gray.500">Created</Text>
        <Text fontWeight="bold">{stats.createdAgo}</Text>
      </Box>
      <Box>
        <Text fontSize="sm" color="gray.500">Workouts</Text>
        <Flex gap={2} align="center" wrap="wrap">
          <Badge colorScheme="cyan" display="flex" alignItems="center" px={2} py={1} borderRadius="md">
            <Box as={FaPlay} mr={1} />
            {stats.totalStarted}
          </Badge>
          <Badge colorScheme="green" display="flex" alignItems="center" px={2} py={1} borderRadius="md">
            <Box as={FaCheckCircle} mr={1} />
            {stats.totalCompleted}
          </Badge>
          <Badge colorScheme="yellow" display="flex" alignItems="center" px={2} py={1} borderRadius="md">
            <Box as={FaTrophy} mr={1} />
            {stats.totalPerfect}
          </Badge>
          <Badge colorScheme="red" display="flex" alignItems="center" px={2} py={1} borderRadius="md">
            <Box as={FaTimes} mr={1} />
            {stats.missedCount}
          </Badge>
        </Flex>
      </Box>
      <Box textAlign="left" minW={20}>
        <Text fontSize="sm" color="gray.500">Streak</Text>
        <Flex align="center" justify="center" mt={1} mb={0.5} gap={1}>
          <Text
            fontSize="2xl"
            fontWeight="extrabold"
            color={stats.streak > 0 ? 'orange.400' : 'gray.400'}
            lineHeight={1}
            display="flex"
            alignItems="center"
            gap={1}
          >
            {stats.streak > 0 ? (
              '🔥'
            ) : (
              <span style={{ filter: 'grayscale(1)', opacity: 0.7, display: 'inline-block' }}>🔥</span>
            )}
            {stats.streak}
            <Text as="span" fontSize="md" color={stats.streak > 0 ? 'orange.400' : 'gray.400'} fontWeight="semibold" ml={1}>
              {stats.streak === 1 ? 'day' : 'days'}
            </Text>
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
});

export const RoutineActivityDrawer: React.FC<{ routine: Routine, workouts: Workout[], isOpen: boolean, onClose: () => void }> = ({ routine, workouts, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Routine Activity</DrawerHeader>
        <DrawerBody>
          <RoutineStatsBox routine={routine} workouts={workouts} />
          <Box mb={4}>
            <WeeklyActivityGraph title="Weekly Activity" workouts={workouts.filter(w => w.routineId === routine.id)} />
          </Box>
          <Divider my={4} />
          <Box position="relative" pl={0} pr={2} py={2}>
            <ActivityTimeline routine={routine} workouts={workouts} />
          </Box>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

const ActivityTimeline: React.FC<{
  routine: Routine;
  workouts: Workout[];
}> = React.memo(({ routine, workouts }) => {
  // Compute timelineEvents inside the component
  const timelineEvents = React.useMemo(() => [
    ...workouts
      .filter(w => w.routineId === routine.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .map((w) => {
        const isCompleted = !!w.completedAt;
        const isPerfect = isCompleted && w.exercises.length > 0 && w.exercises.every(ex => ex.completedAt && !ex.skipped);
        return {
          type: 'workout',
          id: w.id,
          date: w.startedAt,
          label: isPerfect ? 'Perfect' : isCompleted ? 'Completed' : 'Started',
          color: isPerfect ? 'yellow' : isCompleted ? 'green' : 'cyan',
          name: w.nickname || 'Workout',
        };
      }),
    {
      type: 'created',
      id: 'created',
      date: routine.createdAt || 0,
      label: 'Created',
      color: 'gray',
      name: '',
    }
  ], [workouts, routine]);

  const eventTypeIcon = {
    Perfect: <FaTrophy style={{ verticalAlign: 'middle' }} />,
    Completed: <FaCheckCircle style={{ verticalAlign: 'middle' }} />,
    Started: <FaPlay style={{ verticalAlign: 'middle' }} />,
    Created: <FaPowerOff style={{ verticalAlign: 'middle' }} />,
  };
  const eventTypeColorScheme = {
    Perfect: 'yellow',
    Completed: 'green',
    Started: 'cyan',
    Created: 'gray',
  };
  return (
    <Flex align="flex-start" w="100%" direction="column" gap={0}>
      {timelineEvents.map((event, idx) => {
        const badgeLabel = event.label;
        const badgeIcon = eventTypeIcon[badgeLabel as keyof typeof eventTypeIcon] || <FaInfoCircle />;
        const badgeColor = eventTypeColorScheme[badgeLabel as keyof typeof eventTypeColorScheme] || 'gray';
        return (
          <Flex key={event.id} direction="row" align="center" h={24} position="relative">
            {/* Left border and dot */}
            <Box
              minW={5}
              maxW={5}
              h="100%"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              position="relative"
              borderLeftWidth={3}
              borderLeftColor={useColorModeValue('gray.200', 'gray.600')}
            >
              <Box
                position="absolute"
                left={-2.5}
                top="50%"
                transform="translateY(-50%)"
                width={4}
                height={4}
                borderRadius="full"
                bg={event.color === 'yellow' ? '#facc15' : event.color === 'green' ? '#22c55e' : event.color === 'cyan' ? '#06b6d4' : 'gray.400'}
                border={event.color === 'gray' ? '2px solid #a0aec0' : 'none'}
                boxShadow={event.color !== 'gray' ? `0 0 0 2px ${useColorModeValue('#fff', '#1a202c')}` : undefined}
                zIndex={1}
              />
            </Box>
            {/* Text area: badge, date, name stacked vertically */}
            <Box flex={1} ml={2} display="flex" flexDirection="column" justifyContent="center">
              <Badge
                colorScheme={badgeColor}
                px={2}
                py={0.5}
                borderRadius="md"
                fontSize="xs"
                fontWeight="bold"
                display="inline-flex"
                alignItems="center"
                minW={0}
                mb={1}
                maxW="fit-content"
              >
                <Box as="span" mr={1} display="flex" alignItems="center" fontSize="sm">
                  {badgeIcon}
                </Box>
                {badgeLabel}
              </Badge>
              <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }} fontWeight="bold">
                {event.date ? format(new Date(event.date), 'EEEE, MMMM d, yyyy') : 'Unknown date'}
              </Text>
              {event.name && (
                <Text fontSize="md" color="gray.700" _dark={{ color: 'gray.200' }} mt={0.5}>
                  "{event.name}"
                </Text>
              )}
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
});

