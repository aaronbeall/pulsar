import React, { useMemo } from 'react';
import { Box, Circle, Flex, Icon, SimpleGrid, Text, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { CheckIcon } from '@chakra-ui/icons';
import { keyframes } from '@emotion/react';
import { FaChevronRight, FaTimes } from 'react-icons/fa';
import { formatDistanceToNowStrict } from 'date-fns';
import { Routine, Workout } from '../models/types';
import { getActivitySummary, WeekDay } from '../utils/activitySummary';
import { formatTotalDuration } from '../utils/historyStats';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
  70% { box-shadow: 0 0 0 7px rgba(255, 255, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
`;

const WeekStrip: React.FC<{ week: WeekDay[]; accent: string }> = ({ week, accent }) => (
  <SimpleGrid columns={7} spacing={1}>
    {week.map(({ date, label }, i) => (
      <Flex key={date.toDateString()} direction="column" align="center" gap={1}>
        <Text fontSize="10px" fontWeight="bold" opacity={0.8}>{DAY_LETTERS[i]}</Text>
        <Circle
          size="26px"
          bg={label === 'done' ? 'white' : label === 'rest' ? 'whiteAlpha.200' : 'transparent'}
          borderWidth={label === 'today' || label === 'planned' ? '2px' : 0}
          borderStyle={label === 'planned' ? 'dashed' : 'solid'}
          borderColor="whiteAlpha.800"
          animation={label === 'today' ? `${pulse} 1.8s infinite` : undefined}
          title={`${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${label}`}
        >
          {label === 'done' && <CheckIcon boxSize="11px" color={accent} />}
          {label === 'missed' && <Icon as={FaTimes} boxSize="12px" opacity={0.7} />}
        </Circle>
      </Flex>
    ))}
  </SimpleGrid>
);

/** This week's progress as a ring: days done out of days planned. */
const WeekRing: React.FC<{ done: number; planned: number }> = ({ done, planned }) => {
  const size = 76;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = planned > 0 ? Math.min(done / planned, 1) : 0;
  return (
    <Box position="relative" boxSize={`${size}px`} flexShrink={0}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <Flex position="absolute" inset={0} direction="column" align="center" justify="center" lineHeight={1}>
        <Text fontSize="lg" fontWeight="black">{done}/{planned}</Text>
        <Text fontSize="9px" fontWeight="bold" textTransform="uppercase" opacity={0.85} mt={0.5}>this week</Text>
      </Flex>
    </Box>
  );
};

const Chip: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box bg="whiteAlpha.200" borderRadius="lg" px={2.5} py={1.5} minW={0}>
    <Text fontSize="md" fontWeight="extrabold" lineHeight={1.2} noOfLines={1}>{value}</Text>
    <Text fontSize="10px" fontWeight="semibold" textTransform="uppercase" opacity={0.85} noOfLines={1}>{label}</Text>
  </Box>
);

interface ActivitySummaryCardProps {
  workouts: Workout[];
  routines: Routine[];
  title?: string;
  /** Link target, or a handler (e.g. opening a sheet). The whole card is the touch target. */
  to?: string;
  onOpen?: () => void;
  cta?: string;
  /** Lead with the streak; where a streak calendar already shows it, lead with this month instead. */
  showStreak?: boolean;
  /** For a retired routine: its streak is where it ended, not a live one. */
  ended?: boolean;
}

/**
 * The "how am I doing" band: a bold, full-bleed gradient on phones (rounded card on wider
 * screens) so it reads as a summary, not another content card. The whole band is tappable.
 */
const ActivitySummaryCard: React.FC<ActivitySummaryCardProps> = ({
  workouts, routines, title = 'Activity', to, onOpen, cta = 'See all', showStreak = true, ended = false,
}) => {
  const summary = useMemo(() => getActivitySummary(workouts, routines), [workouts, routines]);
  const live = !ended && summary.status !== 'expired' && summary.streak > 0;
  const liveGradient = useColorModeValue('linear(135deg, orange.400, pink.500 60%, purple.500)', 'linear(135deg, orange.600, pink.700 60%, purple.800)');
  const quietGradient = useColorModeValue('linear(135deg, gray.500, gray.600)', 'linear(135deg, gray.600, gray.700)');
  const accent = useColorModeValue('#ED64A6', '#B83280'); // pink.400 / pink.700, for checks on white
  const gradient = ended ? quietGradient : liveGradient;

  // Without the streak, lead with this month, or all time early in a month with none yet.
  const useMonth = summary.monthDone > 0;
  const count = useMonth ? summary.monthDone : summary.totalDone;
  const leadValue = showStreak ? summary.streak : count;
  const leadLabel = showStreak
    ? (ended ? 'day streak when it ended' : 'day streak')
    : `${count === 1 ? 'workout' : 'workouts'} ${useMonth ? 'this month' : 'so far'}`;

  const frame = {
    display: 'block',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
    color: 'white',
    bgGradient: gradient,
    // Full-bleed on phones: break out of the page's side padding to the screen edges.
    w: { base: '100vw', md: '100%' },
    ml: { base: 'calc(50% - 50vw)', md: 0 },
    borderRadius: { base: 0, md: '2xl' },
    boxShadow: 'lg',
    px: { base: 5, md: 6 },
    py: 5,
    transition: 'filter 0.2s',
    _hover: { filter: 'brightness(1.05)' },
    _active: { filter: 'brightness(0.97)' },
    'data-testid': 'activity-summary',
  } as const;

  const content = (
    <>
      {/* Decorative flame watermark */}
      <Text
        aria-hidden
        position="absolute"
        right="-14px"
        top="-26px"
        fontSize="130px"
        lineHeight={1}
        opacity={0.12}
        transform="rotate(12deg)"
        pointerEvents="none"
        sx={{ filter: 'grayscale(1) brightness(3)' }}
      >
        🔥
      </Text>

      <Flex align="center" justify="space-between" mb={3} position="relative">
        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" opacity={0.9}>
          {title}
        </Text>
        <Flex align="center" gap={1} bg="whiteAlpha.300" borderRadius="full" px={3} py={1} fontSize="xs" fontWeight="bold">
          {cta}
          <Icon as={FaChevronRight} boxSize={2.5} />
        </Flex>
      </Flex>

      <Flex align="center" justify="space-between" gap={4} mb={4} position="relative">
        <Box minW={0}>
          <Flex align="baseline" gap={2}>
            {showStreak && (
              <Text fontSize="3xl" lineHeight={1} sx={live ? undefined : { filter: 'grayscale(1)', opacity: 0.7 }}>🔥</Text>
            )}
            <Text fontSize="5xl" fontWeight="black" lineHeight={1} letterSpacing="tight">
              {leadValue}
            </Text>
          </Flex>
          <Text fontWeight="bold" mt={1}>{leadLabel}</Text>
          {summary.best > 0 && (showStreak ? summary.best > summary.streak : true) && (
            <Text fontSize="sm" opacity={0.85}>Best streak {summary.best}</Text>
          )}
        </Box>
        {!ended && <WeekRing done={summary.weekDone} planned={summary.weekPlanned} />}
      </Flex>

      {!ended && (
        <Box mb={4} position="relative">
          <WeekStrip week={summary.week} accent={accent} />
        </Box>
      )}

      <SimpleGrid columns={2} spacing={2} position="relative">
        <Chip label="Workouts" value={summary.totalDone} />
        <Chip label="Total time" value={formatTotalDuration(summary.totalTimeMs)} />
      </SimpleGrid>
      {summary.lastWorkoutAt && (
        <Text fontSize="xs" opacity={0.85} mt={2} position="relative">
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
