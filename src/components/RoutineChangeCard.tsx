import React from 'react';
import { Badge, Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { FaCheck, FaExpandAlt, FaTimes } from 'react-icons/fa';
import type { Routine, RoutineChange, RoutineChangeItemKey } from '../models/types';
import { dayAfterOp, getChangeItemKeys, getDayOp, getItemStatus, getPendingItemKeys } from '../utils/routineChangeUtils';
import { ChangeStatusIcon, ExerciseDiffList, KindDiff } from './RoutineChangeDiff';

interface RoutineChangeCardProps {
  change: RoutineChange;
  routine: Routine;
  onDecide: (keys: RoutineChangeItemKey[], status: 'accepted' | 'rejected') => void;
  onReview: () => void;
  onJumpToDay?: (day: string) => void;
}

/** What a day looked like before this change: the replaced day once accepted, else the current one. */
export function dayBeforeChange(change: RoutineChange, routine: Routine, day: string) {
  const decision = change.decisions?.[day as RoutineChangeItemKey];
  if (decision?.status === 'accepted' && decision.previousDay !== undefined) return decision.previousDay;
  return routine.dailySchedule.find(d => d.day === day) ?? null;
}

export function descriptionBeforeChange(change: RoutineChange, routine: Routine) {
  const decision = change.decisions?.description;
  if (decision?.status === 'accepted' && decision.previousDescription !== undefined) return decision.previousDescription;
  return routine.description;
}

// The summary under an AI chat message that proposes a routine change: one row per day (and
// the description) with what's removed or replaced struck through, a green check / red x as
// each item is decided (here, in the review view, or inline in the routine list), and
// Accept all / Reject all for whatever is still waiting.
const RoutineChangeCard: React.FC<RoutineChangeCardProps> = ({ change, routine, onDecide, onReview, onJumpToDay }) => {
  const cardBg = useColorModeValue('cyan.50', 'cyan.900');
  const cardBorder = useColorModeValue('cyan.200', 'cyan.700');

  const keys = getChangeItemKeys(change);
  const pending = getPendingItemKeys(change);
  if (keys.length === 0) return null;

  const someDecided = pending.length < keys.length;

  return (
    <Box borderWidth="1px" borderColor={cardBorder} bg={cardBg} borderRadius="lg" p={3} fontSize="sm">
      <Flex direction="column" gap={2.5} mb={3}>
        {keys.map(key => {
          const status = getItemStatus(change, key);
          const faded = status === 'rejected' ? 0.55 : 1;
          if (key === 'description') {
            const before = descriptionBeforeChange(change, routine);
            return (
              <Flex key={key} gap={2} opacity={faded}>
                <Box pt={0.5}><ChangeStatusIcon status={status} /></Box>
                <Box minW={0} flex={1}>
                  <Text fontWeight="bold">Description</Text>
                  {before && <Text as="s" display="block" fontSize="xs" color="red.600" _dark={{ color: 'red.300' }} noOfLines={2}>{before}</Text>}
                  <Text fontSize="xs" color="green.700" _dark={{ color: 'green.300' }} noOfLines={2}>{change.patch.description}</Text>
                </Box>
              </Flex>
            );
          }
          const op = getDayOp(change, key)!;
          const before = dayBeforeChange(change, routine, key);
          const after = dayAfterOp(op);
          return (
            <Flex key={key} gap={2} opacity={faded}>
              <Box pt={0.5}><ChangeStatusIcon status={status} /></Box>
              <Box minW={0} flex={1}>
                <Flex
                  as={onJumpToDay ? 'button' : 'div'}
                  onClick={onJumpToDay ? () => onJumpToDay(key) : undefined}
                  align="center"
                  gap={2}
                  wrap="wrap"
                  textAlign="left"
                  mb={0.5}
                >
                  <Text fontWeight="bold">{key}</Text>
                  <KindDiff before={before} after={after} />
                </Flex>
                <ExerciseDiffList before={before?.exercises || []} after={after?.exercises || []} compact maxRows={3} />
              </Box>
            </Flex>
          );
        })}
      </Flex>

      <Flex gap={2} align="center" wrap="wrap">
        {pending.length > 0 ? (
          <>
            <Button size="sm" colorScheme="cyan" leftIcon={<FaCheck />} onClick={() => onDecide(pending, 'accepted')}>
              {someDecided ? 'Accept rest' : 'Accept all'}
            </Button>
            <Button size="sm" variant="ghost" colorScheme="gray" leftIcon={<FaTimes />} onClick={() => onDecide(pending, 'rejected')}>
              {someDecided ? 'Reject rest' : 'Reject all'}
            </Button>
          </>
        ) : (
          <Badge colorScheme={change.status === 'accepted' ? 'green' : change.status === 'rejected' ? 'red' : 'yellow'}>
            {change.status === 'accepted' ? 'Accepted' : change.status === 'rejected' ? 'Rejected' : 'Partly accepted'}
          </Badge>
        )}
        <Button size="sm" variant="ghost" colorScheme="cyan" leftIcon={<FaExpandAlt />} onClick={onReview} ml="auto">
          Review
        </Button>
      </Flex>
    </Box>
  );
};

export default React.memo(RoutineChangeCard);
