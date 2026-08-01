import React from 'react';
import { Badge, Box, Button, Circle, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
import { FaCalendarAlt, FaCheck, FaClock, FaTrophy } from 'react-icons/fa';
import { Routine, Workout } from '../models/types';
import { getRoutineName, getWorkoutKind, isPerfectWorkout } from '../utils/historyStats';
import DayKindBadge from './DayKindBadge';

const PAGE_SIZE = 10;
const DOT_CENTER = '16px'; // Circle is 16px, row has px={2} (8px) — 8 + 8 = 16.

interface WorkoutHistoryListProps {
  workouts: Workout[]; // pre-sorted, newest first
  routines: Routine[];
  showRoutineName?: boolean; // hide when every workout is already known to belong to one routine (e.g. shown on that routine's own page)
}

const WorkoutHistoryList: React.FC<WorkoutHistoryListProps> = ({ workouts, routines, showRoutineName = true }) => {
  const [showAll, setShowAll] = React.useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');
  const connectorColor = useColorModeValue('gray.200', 'gray.700');
  const completedColor = useColorModeValue('green.500', 'green.400');
  const inProgressColor = useColorModeValue('cyan.500', 'cyan.400');
  const inProgressGlow = useColorModeValue('cyan.50', 'rgba(6, 182, 212, 0.15)');

  if (workouts.length === 0) {
    return <Text fontSize="sm" color={mutedColor}>No workouts yet.</Text>;
  }

  const visible = showAll ? workouts : workouts.slice(0, PAGE_SIZE);

  return (
    <>
      <Box position="relative">
        {visible.length > 1 && (
          <Box position="absolute" left={DOT_CENTER} top="20px" bottom="20px" width="2px" bg={connectorColor} />
        )}
        <VStack spacing={0} align="stretch">
          {visible.map((workout) => {
            const kind = getWorkoutKind(workout, routines);
            const isCompleted = !!workout.completedAt;
            return (
              <Flex
                key={workout.id}
                as={RouterLink}
                to={`/workout/session/${workout.id}`}
                align="center"
                gap={4}
                py={3}
                px={2}
                borderRadius="lg"
                transition="background-color 0.2s"
                _hover={{ bg: rowHoverBg }}
              >
                <Circle
                  size="16px"
                  bg={isCompleted ? completedColor : inProgressColor}
                  boxShadow={!isCompleted ? `0 0 0 4px ${inProgressGlow}` : undefined}
                  position="relative"
                  zIndex={1}
                  flexShrink={0}
                >
                  {isCompleted && <Icon as={FaCheck} boxSize="8px" color="white" />}
                </Circle>
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2} mb={0.5} wrap="wrap">
                    <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                      {workout.nickname}
                    </Text>
                    {kind && <DayKindBadge kind={kind} />}
                    {isPerfectWorkout(workout) && (
                      <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1} flexShrink={0}>
                        <Icon as={FaTrophy} boxSize={2} />
                        Perfect
                      </Badge>
                    )}
                  </Flex>
                  {showRoutineName && (
                    <Text fontSize="10px" color={mutedColor} fontWeight="medium" mb={1} noOfLines={1}>
                      {getRoutineName(workout.routineId, routines)}
                    </Text>
                  )}
                  <Flex align="center" gap={1} fontSize="xs" color={mutedColor}>
                    <Icon as={FaCalendarAlt} boxSize={2.5} />
                    <Text>{format(workout.startedAt, 'MMM d, yyyy')}</Text>
                    {workout.completedAt ? (
                      <>
                        <Text mx={0.5}>·</Text>
                        <Icon as={FaClock} boxSize={2.5} />
                        <Text>{formatDistance(workout.startedAt, workout.completedAt)}</Text>
                      </>
                    ) : (
                      <Text ml={1} color={inProgressColor} fontWeight="medium">In progress</Text>
                    )}
                  </Flex>
                </Box>
              </Flex>
            );
          })}
        </VStack>
      </Box>
      {workouts.length > PAGE_SIZE && (
        <Button
          size="sm"
          variant="ghost"
          colorScheme="cyan"
          w="100%"
          mt={2}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Show less' : `Show all ${workouts.length} workouts`}
        </Button>
      )}
    </>
  );
};

export default React.memo(WorkoutHistoryList);
