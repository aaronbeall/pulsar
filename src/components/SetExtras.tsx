import { Box, Button, Collapse, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { FaChevronDown, FaRedo, FaWeightHanging } from 'react-icons/fa';
import { useStoredToggle } from '../hooks/useStoredToggle';
import { WeightUnit, formatWeight } from '../utils/units';
import WeightControl from './WeightControl';
import NumericStepper from './NumericStepper';

interface SetExtrasProps {
  unit: WeightUnit;
  /** Weighted exercises only. */
  weight?: {
    nextKg: number | undefined;
    hint?: string;
    suggestionKg?: number;
    onChange: (weightKg: number | undefined) => void;
  };
  /** Rep exercises only: reps done for this set, out of the plan. */
  reps?: { value: number; planned: number; onChange: (reps: number) => void };
}

/**
 * Optional details for a set (its weight, the reps done), each behind a small toggle that
 * shows a summary when closed. Whether each is open is remembered on this device, separately,
 * so someone who never logs reps or weights can fold them away for good.
 */
const SetExtras: React.FC<SetExtrasProps> = ({ unit, weight, reps }) => {
  const [weightOpen, toggleWeight] = useStoredToggle('pulsar:setCard:weightOpen', true);
  const [repsOpen, toggleReps] = useStoredToggle('pulsar:setCard:repsOpen', false);
  if (!weight && !reps) return null;

  const repsChanged = reps && reps.value !== reps.planned;
  return (
    <Box w="100%">
      <HStack justify="center" spacing={2}>
        {weight && (
          <ToggleChip
            icon={FaWeightHanging}
            label={weight.nextKg !== undefined ? formatWeight(weight.nextKg, unit) : 'Weight'}
            open={weightOpen}
            onClick={toggleWeight}
            testId="toggle-weight"
          />
        )}
        {reps && (
          <ToggleChip
            icon={FaRedo}
            label={repsChanged ? `${reps.value} of ${reps.planned} reps` : 'Reps'}
            open={repsOpen}
            onClick={toggleReps}
            testId="toggle-reps"
          />
        )}
      </HStack>
      {weight && (
        <Collapse in={weightOpen} animateOpacity>
          <Flex justify="center" pt={2}>
            <WeightControl
              weightKg={weight.nextKg}
              unit={unit}
              onChange={weight.onChange}
              hint={weight.hint}
              suggestionKg={weight.suggestionKg}
              alwaysShown
            />
          </Flex>
        </Collapse>
      )}
      {reps && (
        <Collapse in={repsOpen} animateOpacity>
          <Flex justify="center" align="center" gap={2} pt={2} data-testid="reps-control">
            <NumericStepper value={reps.value} min={0} onChange={reps.onChange} label="reps" />
            <Text fontSize="sm" color="gray.500">of {reps.planned}</Text>
          </Flex>
        </Collapse>
      )}
    </Box>
  );
};

const ToggleChip: React.FC<{ icon: React.ElementType; label: string; open: boolean; onClick: () => void; testId: string }> = ({
  icon, label, open, onClick, testId,
}) => (
  <Button
    size="sm" variant="ghost" colorScheme="gray" color="gray.500" fontWeight="medium" borderRadius="full"
    leftIcon={<Icon as={icon} boxSize={3} />}
    rightIcon={<Icon as={FaChevronDown} boxSize={2.5} transform={open ? 'rotate(180deg)' : undefined} transition="transform 0.2s" />}
    aria-expanded={open}
    onClick={onClick}
    data-testid={testId}
  >
    {label}
  </Button>
);

export default SetExtras;
