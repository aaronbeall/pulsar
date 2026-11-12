import { useMemo, useState } from 'react';
import { Box, Button, Flex, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { FaDumbbell } from 'react-icons/fa';
import { Exercise, Workout } from '../models/types';
import { useUrlModal } from '../hooks/useUrlModal';
import { useWeightUnit } from '../store/unitsStore';
import { getLiftSummaries } from '../utils/liftStats';
import { displayWeight } from '../utils/units';
import SectionCard from './SectionCard';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';

const SHOWN = 3;

/**
 * "Your lifts": every exercise with a weight logged, most-logged first, with a trend line,
 * heaviest set and 3-month change. Tapping one opens its progress. Hidden until a weight
 * has been logged. Self-contained so the Activity page can place it anywhere.
 */
const LiftsCard: React.FC<{ workouts: Workout[]; exercises: Exercise[] }> = ({ workouts, exercises }) => {
  const [unit] = useWeightUnit();
  const summaries = useMemo(() => getLiftSummaries(workouts, Date.now()), [workouts]);
  const [showAll, setShowAll] = useState(false);
  const details = useUrlModal('exercise');
  const rowHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  if (!summaries.length) return null;
  const shown = showAll ? summaries : summaries.slice(0, SHOWN);

  return (
    <SectionCard icon={FaDumbbell} title="Your lifts">
      <VStack align="stretch" spacing={0} data-testid="lifts-card">
        {shown.map(s => {
          const name = exercises.find(e => e.id === s.exerciseId)?.name ?? 'Exercise';
          const change = s.changeKg === null ? null : displayWeight(s.changeKg, unit);
          return (
            <Flex
              key={s.exerciseId} as="button" onClick={() => details.open(s.exerciseId)}
              align="center" gap={3} minH="48px" px={2} mx={-2} borderRadius="md" _hover={{ bg: rowHover }} textAlign="left"
            >
              <Text flex={1} minW={0} noOfLines={1} fontWeight="medium">{name}</Text>
              <Sparkline values={s.series} />
              <Box textAlign="right" minW="72px">
                <Text fontWeight="bold" lineHeight={1.2} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {displayWeight(s.bestKg, unit)} <Text as="span" fontSize="xs" fontWeight="normal" color="gray.500">{unit}</Text>
                </Text>
                <Text fontSize="xs" color={change && change > 0 ? 'green.500' : 'gray.500'}>
                  {change === null || change === 0 ? `${s.sessionCount} ${s.sessionCount === 1 ? 'session' : 'sessions'}` : `${change > 0 ? '+' : '−'}${Math.abs(change)} in 3 mo`}
                </Text>
              </Box>
            </Flex>
          );
        })}
        {summaries.length > SHOWN && (
          <Button variant="ghost" size="sm" colorScheme="cyan" alignSelf="center" mt={1} onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show fewer' : `See all ${summaries.length} lifts`}
          </Button>
        )}
      </VStack>
      {summaries.map(s => details.isOpenFor(s.exerciseId) && (
        <ExerciseDetailsDialog key={s.exerciseId} exerciseId={s.exerciseId} onClose={details.close} mode="view" />
      ))}
    </SectionCard>
  );
};

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const color = useColorModeValue('var(--chakra-colors-cyan-500)', 'var(--chakra-colors-cyan-300)');
  if (values.length < 2) return <Box w="56px" />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${(2 + (i / (values.length - 1)) * 52).toFixed(1)},${(18 - ((v - lo) / span) * 14).toFixed(1)}`).join(' ');
  return (
    <Box as="svg" viewBox="0 0 56 20" w="56px" h="20px" flexShrink={0} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Box>
  );
};

export default LiftsCard;
