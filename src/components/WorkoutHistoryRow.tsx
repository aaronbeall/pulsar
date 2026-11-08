import React from 'react';
import { Badge, Box, Circle, Flex, Icon, Text, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
import { FaCalendarAlt, FaCheck, FaClock, FaTrophy } from 'react-icons/fa';
import { Routine, Workout } from '../models/types';
import { getRoutineName, getWorkoutKind, isPerfectWorkout } from '../utils/historyStats';
import DayKindBadge from './DayKindBadge';
import { getWorkoutTiming } from '../utils/workoutTiming';
import { formatSeconds } from '../utils/setProgress';

/** Horizontal center of the row's status dot, for drawing a timeline line through a list of rows. */
export const ROW_DOT_CENTER = '16px'; // Circle is 16px, row has px={2} (8px): 8 + 8 = 16.

interface WorkoutHistoryRowProps {
  workout: Workout;
  routines: Routine[];
  showRoutineName?: boolean;
  /** Called before following the link, e.g. to close the sheet the row is in. */
  onOpen?: (to: string) => void;
}

/** One workout in a history list: status dot, name, kind, date, duration. Links to the session. */
const WorkoutHistoryRow: React.FC<WorkoutHistoryRowProps> = ({ workout, routines, showRoutineName = false, onOpen }) => {
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');
  const completedColor = useColorModeValue('green.500', 'green.400');
  const inProgressColor = useColorModeValue('cyan.500', 'cyan.400');
  const inProgressGlow = useColorModeValue('cyan.50', 'rgba(6, 182, 212, 0.15)');

  const kind = getWorkoutKind(workout, routines);
  const isCompleted = !!workout.completedAt;
  const timing = getWorkoutTiming(workout);
  const to = `/workout/session/${workout.id}`;

  return (
    <Flex
      as={RouterLink}
      to={to}
      onClick={onOpen ? (e: React.MouseEvent) => { e.preventDefault(); onOpen(to); } : undefined}
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
        {timing.activeSec > 0 && (
          <Text fontSize="xs" color={mutedColor} mt={0.5}>
            Exercise {formatSeconds(timing.activeSec)} · Rest {formatSeconds(timing.restSec)}
          </Text>
        )}
      </Box>
    </Flex>
  );
};

export default React.memo(WorkoutHistoryRow);
