// Building blocks for showing an AI-suggested routine change: what's removed or replaced is
// struck through, what's new is highlighted. Used by the chat summary, the full review view,
// and the suggestions shown inline in the routine list (view and edit modes).

import React from 'react';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import { FaArrowRight, FaCheck, FaCheckCircle, FaMinus, FaPlus, FaRegCircle, FaListUl, FaRobot, FaTimes, FaTimesCircle } from 'react-icons/fa';
import type { RoutineChangeOp, RoutineDay, ScheduledExercise } from '../models/types';
import { useExercise } from '../store/pulsarStore';
import { ChangeItemStatus, dayAfterOp, diffExercises, ExerciseDiffRow } from '../utils/routineChangeUtils';

const REMOVED = { color: 'red.600', _dark: { color: 'red.300' } };
const ADDED = { color: 'green.700', _dark: { color: 'green.300' } };

export function volumeLabel(ex: ScheduledExercise): string {
  if (ex.duration !== undefined) return `${ex.sets} × ${ex.duration}s`;
  if (ex.reps !== undefined) return `${ex.sets} × ${ex.reps}`;
  return `${ex.sets} sets`;
}

const ExerciseLabel: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
  const exercise = useExercise(exerciseId);
  return <>{exercise?.name || 'Unknown exercise'}</>;
};

const DiffRow: React.FC<{ row: ExerciseDiffRow }> = ({ row }) => {
  if (row.type === 'changed') {
    return (
      <Flex align="baseline" gap={2} pl={5} wrap="wrap">
        <Text fontWeight="medium"><ExerciseLabel exerciseId={row.after.exerciseId} /></Text>
        <Text as="s" fontSize="xs" {...REMOVED}>{volumeLabel(row.before)}</Text>
        <Text fontSize="xs" fontWeight="semibold" {...ADDED}>{volumeLabel(row.after)}</Text>
      </Flex>
    );
  }
  const removed = row.type === 'removed';
  const added = row.type === 'added';
  return (
    <Flex align="baseline" gap={2} {...(removed ? REMOVED : added ? ADDED : {})} opacity={row.type === 'same' ? 0.75 : 1}>
      <Box w={3} flexShrink={0} display="flex" alignSelf="center">
        {removed && <Icon as={FaMinus} boxSize={2.5} aria-label="Removed" />}
        {added && <Icon as={FaPlus} boxSize={2.5} aria-label="Added" />}
      </Box>
      <Text as={removed ? 's' : 'span'} fontWeight={added ? 'semibold' : 'medium'}>
        <ExerciseLabel exerciseId={row.exercise.exerciseId} />
      </Text>
      <Text as={removed ? 's' : 'span'} fontSize="xs" opacity={0.8} whiteSpace="nowrap">{volumeLabel(row.exercise)}</Text>
    </Flex>
  );
};

/** The day's label ("Upper Body"), struck through and replaced when the change renames it. */
export const KindDiff: React.FC<{ before: RoutineDay | null; after: RoutineDay | null }> = ({ before, after }) => {
  const beforeLabel = before && before.exercises.length > 0 ? before.kind || 'Workout' : 'Rest day';
  const afterLabel = after ? after.kind || 'Workout' : 'Rest day';
  if (beforeLabel === afterLabel) return <Text as="span" color="gray.500" _dark={{ color: 'gray.400' }}>{afterLabel}</Text>;
  return (
    <Flex as="span" display="inline-flex" align="center" gap={1.5} wrap="wrap" minW={0}>
      <Text as="s" {...REMOVED}>{beforeLabel}</Text>
      <Icon as={FaArrowRight} boxSize={2.5} color="gray.400" />
      <Text as="span" fontWeight="semibold" {...ADDED}>{afterLabel}</Text>
    </Flex>
  );
};

/**
 * One day's exercises before vs after. `compact` (the chat summary) lists only what changes,
 * with a count of what stays, and caps the length; the full form shows every exercise.
 */
export const ExerciseDiffList: React.FC<{
  before: ScheduledExercise[];
  after: ScheduledExercise[];
  compact?: boolean;
  maxRows?: number;
}> = ({ before, after, compact, maxRows = 4 }) => {
  const rows = diffExercises(before, after);
  const changedRows = compact ? rows.filter(r => r.type !== 'same') : rows;
  const unchanged = rows.length - rows.filter(r => r.type !== 'same').length;
  const shown = compact ? changedRows.slice(0, maxRows) : changedRows;
  const hidden = changedRows.length - shown.length;
  if (rows.length === 0) return null;
  return (
    <Flex direction="column" gap={0.5} fontSize="sm">
      {shown.map((row, i) => <DiffRow key={i} row={row} />)}
      {compact && (hidden > 0 || unchanged > 0) && (
        <Text fontSize="xs" color="gray.500" _dark={{ color: 'gray.400' }} pl={5}>
          {[hidden > 0 && `${hidden} more change${hidden === 1 ? '' : 's'}`, unchanged > 0 && `${unchanged} unchanged`].filter(Boolean).join(' · ')}
        </Text>
      )}
      {compact && changedRows.length === 0 && (
        <Text fontSize="xs" color="gray.500" pl={5}>Same exercises</Text>
      )}
    </Flex>
  );
};

/** A whole day's change: its label and its exercises. */
export const DayChangeDiff: React.FC<{
  before: RoutineDay | null;
  after: RoutineDay | null;
  compact?: boolean;
}> = ({ before, after, compact }) => (
  <Flex direction="column" gap={1}>
    {!compact && (
      <Box fontSize="sm"><KindDiff before={before} after={after} /></Box>
    )}
    <ExerciseDiffList before={before?.exercises || []} after={after?.exercises || []} compact={compact} />
  </Flex>
);

/** Old description struck through, new one highlighted. */
export const DescriptionDiff: React.FC<{ before: string; after: string }> = ({ before, after }) => (
  <Flex direction="column" gap={1} fontSize="sm" fontStyle="italic">
    {before && <Text as="s" {...REMOVED}>{before}</Text>}
    <Text {...ADDED}>{after}</Text>
  </Flex>
);

export const ChangeStatusIcon: React.FC<{ status: ChangeItemStatus }> = ({ status }) => {
  if (status === 'accepted') return <Icon as={FaCheckCircle} color="green.400" boxSize={4} aria-label="Accepted" flexShrink={0} />;
  if (status === 'rejected') return <Icon as={FaTimesCircle} color="red.400" boxSize={4} aria-label="Rejected" flexShrink={0} />;
  return <Icon as={FaRegCircle} color="cyan.400" boxSize={4} aria-label="Waiting for review" flexShrink={0} />;
};

/** Accept / Reject for one item, sized for a thumb. */
export const DecisionButtons: React.FC<{ onAccept: () => void; onReject: () => void; size?: 'xs' | 'sm' }> = ({ onAccept, onReject, size = 'sm' }) => (
  <Flex gap={2} flexShrink={0}>
    <Button size={size} variant="ghost" colorScheme="red" leftIcon={<FaTimes />} onClick={onReject}>
      Reject
    </Button>
    <Button size={size} colorScheme="green" leftIcon={<FaCheck />} onClick={onAccept}>
      Accept
    </Button>
  </Flex>
);

/**
 * A pending suggestion for one day, shown right inside the routine list (view and edit mode)
 * with its own Accept / Reject. `current` is what the day looks like now — in edit mode, the
 * unsaved draft — so the diff is always against what the user is looking at.
 */
export const DayProposalPanel: React.FC<{
  current: RoutineDay | null;
  op: RoutineChangeOp;
  /** Who suggested it: Pulsar AI unless it came from the rule-based Planner. */
  source?: 'ai' | 'planner';
  onAccept: () => void;
  onReject: () => void;
}> = ({ current, op, source, onAccept, onReject }) => (
  <Box
    borderWidth="2px"
    borderColor="cyan.400"
    borderStyle="dashed"
    borderRadius="md"
    bg="cyan.50"
    _dark={{ bg: 'rgba(0, 163, 196, 0.08)', borderColor: 'cyan.600' }}
    p={3}
  >
    <Flex align="center" gap={2} mb={2} fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="cyan.700" _dark={{ color: 'cyan.300' }}>
      <Icon as={source === 'planner' ? FaListUl : FaRobot} />
      {source === 'planner' ? 'Planner suggestion' : 'Suggested change'}
    </Flex>
    <DayChangeDiff before={current && current.exercises.length > 0 ? current : null} after={dayAfterOp(op)} />
    <Flex justify="flex-end" mt={3}>
      <DecisionButtons onAccept={onAccept} onReject={onReject} />
    </Flex>
  </Box>
);

/** A pending description suggestion, shown in place under the routine name. */
export const DescriptionProposalPanel: React.FC<{
  current: string;
  proposed: string;
  onAccept: () => void;
  onReject: () => void;
}> = ({ current, proposed, onAccept, onReject }) => (
  <Box borderWidth="2px" borderColor="cyan.400" borderStyle="dashed" borderRadius="md" bg="cyan.50" _dark={{ bg: 'rgba(0, 163, 196, 0.08)', borderColor: 'cyan.600' }} p={3}>
    <Flex align="center" gap={2} mb={2} fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide" color="cyan.700" _dark={{ color: 'cyan.300' }}>
      <Icon as={FaRobot} />
      Suggested description
    </Flex>
    <DescriptionDiff before={current} after={proposed} />
    <Flex justify="flex-end" mt={3}>
      <DecisionButtons onAccept={onAccept} onReject={onReject} />
    </Flex>
  </Box>
);
