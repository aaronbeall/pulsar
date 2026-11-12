import { useMemo } from 'react';
import { Box, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { FaArrowUp, FaMedal } from 'react-icons/fa';
import { Exercise, Workout } from '../models/types';
import { useUrlModal } from '../hooks/useUrlModal';
import { useWeightUnit } from '../store/unitsStore';
import { findNewBests } from '../utils/liftStats';
import { displayWeight, formatWeight } from '../utils/units';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';

/** The lifts in a finished workout that beat their best. Renders nothing when none did. */
const NewBestsCard: React.FC<{ workout: Workout; workouts: Workout[]; exercises: Exercise[] }> = ({ workout, workouts, exercises }) => {
  const [unit] = useWeightUnit();
  const bests = useMemo(() => findNewBests(workout, workouts), [workout, workouts]);
  const details = useUrlModal('exercise');
  const bg = useColorModeValue('green.50', 'rgba(72, 187, 120, 0.12)');
  const border = useColorModeValue('green.200', 'green.700');
  const rowHover = useColorModeValue('green.100', 'rgba(72, 187, 120, 0.18)');
  if (!bests.length) return null;

  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" p={4} mb={4} data-testid="new-bests">
      <Flex align="center" gap={2} mb={2}>
        <Icon as={FaMedal} color="green.400" />
        <Text fontWeight="bold">{bests.length === 1 ? 'New best' : 'New bests'}</Text>
      </Flex>
      <VStack align="stretch" spacing={0}>
        {bests.map(best => {
          const name = exercises.find(e => e.id === best.exerciseId)?.name ?? 'Exercise';
          const gain = displayWeight(best.valueKg, unit) - displayWeight(best.previousKg, unit);
          return (
            <Flex
              key={best.exerciseId} as="button" onClick={() => details.open(best.exerciseId)}
              justify="space-between" align="center" gap={3} minH="44px" px={2} mx={-2} borderRadius="md"
              _hover={{ bg: rowHover }} textAlign="left"
            >
              <Text>{name}</Text>
              <Flex align="center" gap={2} color="green.500" fontWeight="bold" whiteSpace="nowrap">
                <Text>{best.kind === 'e1rm' ? `est. 1RM ${formatWeight(best.valueKg, unit)}` : formatWeight(best.valueKg, unit)}</Text>
                {gain > 0 && (
                  <Flex align="center" fontSize="sm"><Icon as={FaArrowUp} boxSize={3} />{gain}</Flex>
                )}
              </Flex>
            </Flex>
          );
        })}
      </VStack>
      {bests.map(best => details.isOpenFor(best.exerciseId) && (
        <ExerciseDetailsDialog key={best.exerciseId} exerciseId={best.exerciseId} onClose={details.close} mode="view" />
      ))}
    </Box>
  );
};

export default NewBestsCard;
