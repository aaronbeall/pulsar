import React from 'react';
import { Badge, Box, Button, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
import { FaCalendarAlt, FaCheckCircle, FaChevronRight, FaClock, FaPlayCircle, FaStar } from 'react-icons/fa';
import { Routine, Workout } from '../models/types';
import { getRoutineName, getWorkoutKind, isPerfectWorkout } from '../utils/historyStats';
import DayKindBadge from './DayKindBadge';

const PAGE_SIZE = 10;

interface WorkoutHistoryListProps {
  workouts: Workout[]; // pre-sorted, newest first
  routines: Routine[];
}

const WorkoutHistoryList: React.FC<WorkoutHistoryListProps> = ({ workouts, routines }) => {
  const [showAll, setShowAll] = React.useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.100', 'gray.700');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');

  if (workouts.length === 0) {
    return <Text fontSize="sm" color={mutedColor}>No workouts yet.</Text>;
  }

  const visible = showAll ? workouts : workouts.slice(0, PAGE_SIZE);

  return (
    <>
      <VStack align="stretch" spacing={0}>
        {visible.map((workout, i) => {
          const kind = getWorkoutKind(workout, routines);
          return (
            <Flex
              key={workout.id}
              as={RouterLink}
              to={`/workout/session/${workout.id}`}
              align="center"
              gap={3}
              py={3}
              borderTopWidth={i === 0 ? 0 : '1px'}
              borderColor={rowBorder}
              _hover={{ bg: rowHoverBg }}
            >
              <Icon
                as={workout.completedAt ? FaCheckCircle : FaPlayCircle}
                color={workout.completedAt ? 'green.400' : 'blue.400'}
                boxSize={4}
                flexShrink={0}
              />
              <Box flex={1} minW={0}>
                <Flex align="center" gap={2} mb={0.5} wrap="wrap">
                  <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                    {workout.nickname}
                  </Text>
                  {kind && <DayKindBadge kind={kind} />}
                  {isPerfectWorkout(workout) && (
                    <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1} flexShrink={0}>
                      <Icon as={FaStar} boxSize={2} />
                      Perfect
                    </Badge>
                  )}
                </Flex>
                <Text fontSize="10px" color={mutedColor} fontWeight="medium" mb={1} noOfLines={1}>
                  {getRoutineName(workout.routineId, routines)}
                </Text>
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
                    <Text ml={1} color="blue.400" fontWeight="medium">In progress</Text>
                  )}
                </Flex>
              </Box>
              <Icon as={FaChevronRight} boxSize={3} color={mutedColor} flexShrink={0} />
            </Flex>
          );
        })}
      </VStack>
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
