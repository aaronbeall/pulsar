import React, { useState } from 'react';
import { Badge, Box, Button, Circle, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { FaChevronRight, FaExchangeAlt } from 'react-icons/fa';
import { DayOfWeek, Routine } from '../models/types';
import { RoutineStint } from '../utils/historyStats';
import WorkoutHistoryRow, { ROW_DOT_CENTER } from './WorkoutHistoryRow';

const STINTS_PAGE = 4;
const ITEMS_PAGE = 5;

const shortDays = (days: DayOfWeek[]) => days.map(d => d.slice(0, 3)).join(' · ');

type StintItem =
  | { type: 'workout'; date: number; workout: RoutineStint['workouts'][number] }
  | { type: 'change'; date: number; days: DayOfWeek[] };

const StintCard: React.FC<{ stint: RoutineStint; routines: Routine[] }> = ({ stint, routines }) => {
  const [showAll, setShowAll] = useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const border = useColorModeValue('gray.200', 'gray.700');
  const headerHover = useColorModeValue('gray.50', 'gray.700');
  const connectorColor = useColorModeValue('gray.200', 'gray.700');
  const changeColor = useColorModeValue('gray.400', 'gray.500');
  const isCurrent = stint.end === undefined;

  const items: StintItem[] = [
    ...stint.workouts.map((workout): StintItem => ({ type: 'workout', date: workout.startedAt, workout })),
    ...stint.changes.map((c): StintItem => ({ type: 'change', date: c.date, days: c.days })),
  ].sort((a, b) => b.date - a.date);
  const visible = showAll ? items : items.slice(0, ITEMS_PAGE);

  return (
    <Box borderWidth="1px" borderColor={border} borderRadius="xl" overflow="hidden">
      <Flex
        as={RouterLink}
        to={`/workout/routine/${stint.routine.id}?activity=1`}
        align="center"
        gap={3}
        px={3}
        py={3}
        _hover={{ bg: headerHover }}
      >
        <Box flex={1} minW={0}>
          <Flex align="center" gap={2} mb={0.5}>
            <Text fontWeight="bold" color={isCurrent ? 'cyan.500' : undefined} noOfLines={1}>
              {stint.routine.name}
            </Text>
            {isCurrent && <Badge colorScheme="green" flexShrink={0}>Active</Badge>}
          </Flex>
          <Text fontSize="xs" color={mutedColor}>
            {format(stint.start, 'MMM d, yyyy')} – {isCurrent ? 'now' : format(stint.end!, 'MMM d, yyyy')}
            {stint.days.length > 0 && ` · ${shortDays(stint.days)}`}
          </Text>
          <Text fontSize="xs" color={mutedColor} mt={0.5}>
            {stint.completed} {stint.completed === 1 ? 'workout' : 'workouts'}
            {stint.perfect > 0 && ` · ${stint.perfect} perfect`}
            {stint.missed > 0 && ` · ${stint.missed} missed`}
          </Text>
        </Box>
        <Icon as={FaChevronRight} boxSize={3} color={mutedColor} flexShrink={0} />
      </Flex>

      {items.length > 0 && (
        <Box position="relative" px={1} pb={1} borderTopWidth="1px" borderColor={border}>
          {visible.length > 1 && (
            <Box position="absolute" left={`calc(${ROW_DOT_CENTER} + 4px)`} top="22px" bottom="22px" width="2px" bg={connectorColor} />
          )}
          <VStack spacing={0} align="stretch">
            {visible.map(item =>
              item.type === 'workout' ? (
                <WorkoutHistoryRow key={item.workout.id} workout={item.workout} routines={routines} />
              ) : (
                <Flex key={`change-${item.date}`} align="center" gap={4} py={2} px={2}>
                  <Circle size="16px" bg={changeColor} position="relative" zIndex={1} flexShrink={0}>
                    <Icon as={FaExchangeAlt} boxSize="8px" color="white" />
                  </Circle>
                  <Text fontSize="xs" color={mutedColor}>
                    {format(item.date, 'MMM d')}: schedule changed to {shortDays(item.days) || 'no days'}
                  </Text>
                </Flex>
              ),
            )}
          </VStack>
          {items.length > ITEMS_PAGE && (
            <Button size="sm" variant="ghost" colorScheme="cyan" w="100%" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Show less' : `Show all ${items.length}`}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

/** History's story: each stretch a routine was active, newest first, with its workouts inside. */
const HistoryTimeline: React.FC<{ stints: RoutineStint[]; routines: Routine[] }> = ({ stints, routines }) => {
  const [showAll, setShowAll] = useState(false);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  if (stints.length === 0) {
    return <Text fontSize="sm" color={mutedColor}>No workouts yet.</Text>;
  }
  const visible = showAll ? stints : stints.slice(0, STINTS_PAGE);
  return (
    <VStack align="stretch" spacing={3}>
      {visible.map(s => (
        <StintCard key={`${s.routine.id}-${s.start}`} stint={s} routines={routines} />
      ))}
      {stints.length > STINTS_PAGE && (
        <Button size="sm" variant="ghost" colorScheme="cyan" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show less' : `Show ${stints.length - STINTS_PAGE} older`}
        </Button>
      )}
    </VStack>
  );
};

export default React.memo(HistoryTimeline);
