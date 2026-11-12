import { useMemo, useState } from 'react';
import { Box, Button, ButtonGroup, Flex, HStack, SimpleGrid, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useWorkouts } from '../store/pulsarStore';
import { useWeightUnit } from '../store/unitsStore';
import {
  LiftMetric,
  LiftRange,
  LiftSession,
  getChangeKg,
  getLiftSessions,
  metricValue,
  sessionsInRange,
} from '../utils/liftStats';
import { WeightUnit, displayWeight, fromKg } from '../utils/units';

const METRICS: { value: LiftMetric; label: string }[] = [
  { value: 'weight', label: 'Heaviest' },
  { value: 'e1rm', label: 'Est. 1RM' },
  { value: 'volume', label: 'Volume' },
];
const RANGES: LiftRange[] = ['1M', '3M', '1Y', 'All'];
const DAY_MS = 24 * 60 * 60 * 1000;

const formatMetric = (kg: number, metric: LiftMetric, unit: WeightUnit) =>
  metric === 'volume' ? Math.round(fromKg(kg, unit)).toLocaleString() : `${displayWeight(kg, unit)}`;

/** Progress for one weighted exercise: three numbers, a chart and the recent sessions. */
const LiftProgress: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
  const workouts = useWorkouts();
  const [unit] = useWeightUnit();
  const sessions = useMemo(() => getLiftSessions(exerciseId, workouts), [exerciseId, workouts]);
  const now = Date.now();
  const spanDays = sessions.length ? (now - sessions[0].date) / DAY_MS : 0;
  const [range, setRange] = useState<LiftRange>(spanDays > 91 ? '3M' : 'All');
  const [metric, setMetric] = useState<LiftMetric>('weight');
  const panelBg = useColorModeValue('gray.50', 'gray.900');

  if (!sessions.length) {
    return (
      <Text fontSize="sm" color="gray.500" data-testid="lift-progress-empty">
        Log a weight during a workout to see your progress here.
      </Text>
    );
  }

  const best = Math.max(...sessions.map(s => s.topKg));
  const bestE1rm = Math.max(...sessions.map(s => s.e1rmKg));
  const change = getChangeKg(sessions, now);
  const shown = sessionsInRange(sessions, range, now);
  const recent = [...sessions].reverse().slice(0, 5);

  return (
    <VStack align="stretch" spacing={3} data-testid="lift-progress">
      <SimpleGrid columns={3} spacing={2}>
        <Stat value={`${displayWeight(best, unit)}`} label={`heaviest ${unit}`} />
        <Stat value={`${displayWeight(bestE1rm, unit)}`} label={`est. 1RM ${unit}`} />
        <Stat
          value={change === null ? '–' : `${change >= 0 ? '+' : '−'}${displayWeight(Math.abs(change), unit)}`}
          label="in 3 months"
          color={change && change > 0 ? 'green.500' : undefined}
        />
      </SimpleGrid>
      <Box bg={panelBg} borderRadius="lg" p={2}>
        <ButtonGroup size="xs" isAttached variant="outline" w="100%" mb={1}>
          {METRICS.map(m => (
            <Button
              key={m.value} flex={1} minH="32px"
              colorScheme={metric === m.value ? 'cyan' : 'gray'}
              variant={metric === m.value ? 'solid' : 'outline'}
              aria-pressed={metric === m.value}
              onClick={() => setMetric(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </ButtonGroup>
        <LiftChart sessions={shown} metric={metric} unit={unit} />
        <HStack justify="center" spacing={1}>
          {RANGES.map(r => (
            <Button
              key={r} size="xs" minW="44px" minH="32px" borderRadius="full"
              variant={range === r ? 'solid' : 'ghost'} colorScheme={range === r ? 'cyan' : 'gray'}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </HStack>
      </Box>
      <VStack align="stretch" spacing={1}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wider">Recent</Text>
        {recent.map(s => (
          <Flex key={s.workoutId} justify="space-between" gap={3} fontSize="sm">
            <Text whiteSpace="nowrap">{format(s.date, 'EEE d MMM')}</Text>
            <Text color="gray.500" textAlign="right">
              {s.sets.map(set => `${displayWeight(set.weightKg, unit)}×${set.reps}`).join(' · ')}
            </Text>
          </Flex>
        ))}
      </VStack>
    </VStack>
  );
};

const Stat: React.FC<{ value: string; label: string; color?: string }> = ({ value, label, color }) => (
  <VStack spacing={0} borderWidth="1px" borderRadius="lg" py={2} px={1}>
    <Text fontSize="lg" fontWeight="bold" color={color} lineHeight={1.2} sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
    <Text fontSize="2xs" color="gray.500" textAlign="center">{label}</Text>
  </VStack>
);

const W = 320;
const H = 150;
const PAD = { left: 40, right: 12, top: 14, bottom: 22 };

/** Hand-drawn SVG line chart of one metric per session, with the best point marked. */
const LiftChart: React.FC<{ sessions: LiftSession[]; metric: LiftMetric; unit: WeightUnit }> = ({ sessions, metric, unit }) => {
  const gridColor = useColorModeValue('var(--chakra-colors-gray-200)', 'var(--chakra-colors-gray-700)');
  const textColor = useColorModeValue('var(--chakra-colors-gray-500)', 'var(--chakra-colors-gray-400)');
  const lineColor = useColorModeValue('var(--chakra-colors-cyan-500)', 'var(--chakra-colors-cyan-300)');
  const bestColor = useColorModeValue('var(--chakra-colors-green-500)', 'var(--chakra-colors-green-300)');

  if (!sessions.length) {
    return (
      <Flex h={`${H}px`} align="center" justify="center">
        <Text fontSize="sm" color="gray.500">No sessions in this range</Text>
      </Flex>
    );
  }

  const values = sessions.map(s => metricValue(s, metric));
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < hi * 0.05) {
    const pad = Math.max(hi * 0.05, 1);
    lo -= pad;
    hi += pad;
  }
  const t0 = sessions[0].date;
  const t1 = sessions[sessions.length - 1].date;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => (t1 === t0 ? PAD.left + innerW / 2 : PAD.left + ((t - t0) / (t1 - t0)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;
  const points = sessions.map((s, i) => [x(s.date), y(values[i])] as const);
  const bestIdx = values.indexOf(Math.max(...values));
  const line = points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const bottom = PAD.top + innerH;
  const area = `${points[0][0].toFixed(1)},${bottom} ${line} ${points[points.length - 1][0].toFixed(1)},${bottom}`;
  const ticks = [hi, (hi + lo) / 2, lo];

  return (
    <Box as="svg" viewBox={`0 0 ${W} ${H}`} w="100%" h="auto" role="img" aria-label={`${METRICS.find(m => m.value === metric)?.label} per session`} data-testid="lift-chart">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={1} strokeDasharray={i === 2 ? undefined : '3 3'} fill="none" />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill={textColor}>{formatMetric(v, metric, unit)}</text>
        </g>
      ))}
      {points.length > 1 && (
        <>
          <polygon points={area} fill={lineColor} opacity={0.12} />
          <polyline points={line} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
      {points.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={i === bestIdx ? 5 : 3} fill={i === bestIdx ? bestColor : lineColor} />
      ))}
      <text x={PAD.left} y={H - 6} fontSize="10" fill={textColor}>{format(t0, 'd MMM')}</text>
      {t1 !== t0 && <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={textColor}>{format(t1, 'd MMM')}</text>}
    </Box>
  );
};

export default LiftProgress;
