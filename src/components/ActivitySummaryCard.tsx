import React, { useMemo } from 'react';
import { Box, Circle, Flex, Icon, SimpleGrid, Text, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { CheckIcon } from '@chakra-ui/icons';
import { FaChevronRight, FaTimes } from 'react-icons/fa';
import { formatDistanceToNowStrict } from 'date-fns';
import { Routine, Workout } from '../models/types';
import { getActivitySummary, WeekDay } from '../utils/activitySummary';
import { formatTotalDuration } from '../utils/historyStats';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const WeekStrip: React.FC<{ week: WeekDay[] }> = ({ week }) => {
  const doneBg = useColorModeValue('orange.400', 'orange.500');
  const restBg = useColorModeValue('gray.100', 'gray.700');
  const ring = useColorModeValue('orange.300', 'orange.400');
  const missed = useColorModeValue('gray.400', 'gray.500');
  const letter = useColorModeValue('gray.500', 'gray.400');
  return (
    <SimpleGrid columns={7} spacing={1}>
      {week.map(({ date, label }, i) => (
        <Flex key={date.toDateString()} direction="column" align="center" gap={1}>
          <Text fontSize="10px" fontWeight="bold" color={letter}>{DAY_LETTERS[i]}</Text>
          <Circle
            size="22px"
            bg={label === 'done' ? doneBg : label === 'rest' ? restBg : 'transparent'}
            borderWidth={label === 'today' || label === 'planned' ? '2px' : 0}
            borderStyle={label === 'planned' ? 'dashed' : 'solid'}
            borderColor={ring}
            title={`${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${label}`}
          >
            {label === 'done' && <CheckIcon boxSize="10px" color="white" />}
            {label === 'missed' && <Icon as={FaTimes} boxSize="12px" color={missed} />}
          </Circle>
        </Flex>
      ))}
    </SimpleGrid>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  const muted = useColorModeValue('gray.500', 'gray.400');
  return (
    <Box minW={0}>
      <Text fontSize="lg" fontWeight="extrabold" lineHeight={1.2} noOfLines={1}>{value}</Text>
      <Text fontSize="xs" color={muted} noOfLines={1}>{label}</Text>
    </Box>
  );
};

interface ActivitySummaryCardProps {
  workouts: Workout[];
  routines: Routine[];
  title?: string;
  /** Link target, or a handler (e.g. opening a sheet). The whole card is the touch target. */
  to?: string;
  onOpen?: () => void;
  cta?: string;
  /** Hide the streak line where a streak calendar already shows it. */
  showStreak?: boolean;
  /** For a retired routine: its streak is where it ended, not a live one. */
  ended?: boolean;
}

/** A small, tappable "how am I doing" card: streak, this week, and totals. */
const ActivitySummaryCard: React.FC<ActivitySummaryCardProps> = ({
  workouts, routines, title = 'Activity', to, onOpen, cta = 'See all', showStreak = true, ended = false,
}) => {
  const summary = useMemo(() => getActivitySummary(workouts, routines), [workouts, routines]);
  const cardBg = useColorModeValue('white', 'gray.800');
  const border = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const muted = useColorModeValue('gray.500', 'gray.400');
  const live = !ended && summary.status !== 'expired' && summary.streak > 0;

  const frame = {
    display: 'block',
    w: '100%',
    textAlign: 'left',
    bg: cardBg,
    borderWidth: '1px',
    borderColor: border,
    borderRadius: 'xl',
    boxShadow: 'sm',
    p: 4,
    transition: 'background-color 0.2s',
    _hover: { bg: hoverBg },
    'data-testid': 'activity-summary',
  } as const;

  const content = (
    <>
      <Flex align="center" justify="space-between" mb={3}>
        <Text fontWeight="bold">{title}</Text>
        <Flex align="center" gap={1} color="cyan.500" fontSize="sm" fontWeight="semibold">
          {cta}
          <Icon as={FaChevronRight} boxSize={3} />
        </Flex>
      </Flex>

      {showStreak && (
        <Flex align="baseline" gap={2} mb={3} wrap="wrap">
          <Text fontSize="2xl" lineHeight={1} sx={live ? undefined : { filter: 'grayscale(1)', opacity: 0.6 }}>🔥</Text>
          <Text fontSize="2xl" fontWeight="black" lineHeight={1} color={live ? 'orange.400' : muted}>
            {summary.streak}
          </Text>
          <Text fontWeight="semibold" color={live ? 'orange.400' : muted}>
            {ended ? 'day streak when it ended' : 'day streak'}
          </Text>
          {summary.best > summary.streak && (
            <Text fontSize="sm" color={muted} fontWeight="semibold">· Best {summary.best}</Text>
          )}
        </Flex>
      )}

      {!ended && (
        <Box mb={3}>
          <WeekStrip week={summary.week} />
        </Box>
      )}

      <SimpleGrid columns={3} spacing={3}>
        <Stat label="This week" value={ended ? '—' : `${summary.weekDone}/${summary.weekPlanned}`} />
        <Stat label="Workouts" value={summary.totalDone} />
        <Stat label="Total time" value={formatTotalDuration(summary.totalTimeMs)} />
      </SimpleGrid>
      {summary.lastWorkoutAt && (
        <Text fontSize="xs" color={muted} mt={2}>
          Last workout {formatDistanceToNowStrict(summary.lastWorkoutAt, { addSuffix: true })}
        </Text>
      )}
    </>
  );

  return to ? (
    <Box as={RouterLink} to={to} {...frame}>{content}</Box>
  ) : (
    <Box as="button" type="button" onClick={onOpen} {...frame}>{content}</Box>
  );
};

export default React.memo(ActivitySummaryCard);
