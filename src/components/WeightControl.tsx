import { useEffect, useState } from 'react';
import { Button, Flex, HStack, IconButton, Input, Text } from '@chakra-ui/react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import { FaWeightHanging } from 'react-icons/fa';
import { WeightUnit, displayWeight, stepWeightKg, toKg, formatWeight } from '../utils/units';

interface WeightControlProps {
  /** The weight for the set, kg; undefined when none. */
  weightKg: number | undefined;
  unit: WeightUnit;
  /** kg, or undefined to clear it. */
  onChange: (weightKg: number | undefined) => void;
  /** Quiet line under the control, e.g. "Last time 3 × 8 @ 135 lb". */
  hint?: string;
  /** One step heavier than last time, offered as a tap-to-apply link. */
  suggestionKg?: number;
  /** Start with the input showing (no "Add weight" link), e.g. in the edit-set sheet. */
  alwaysShown?: boolean;
  label?: string;
}

/**
 * A quiet weight input for a set: "+ Add weight" until there's a weight, then the number
 * with − and + either side. Tap the number to type one. Never required.
 */
const WeightControl: React.FC<WeightControlProps> = ({ weightKg, unit, onChange, hint, suggestionKg, alwaysShown, label = 'Weight' }) => {
  const shown = weightKg !== undefined ? displayWeight(weightKg, unit) : undefined;
  const [text, setText] = useState(shown !== undefined ? String(shown) : '');
  const [focused, setFocused] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!focused) setText(shown !== undefined ? String(shown) : '');
  }, [shown, focused]);

  const commit = () => {
    setFocused(false);
    setAdding(false);
    const value = parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      if (weightKg !== undefined) onChange(undefined);
      return;
    }
    if (value !== shown) onChange(toKg(value, unit));
  };

  const suggestion = suggestionKg !== undefined && displayWeight(suggestionKg, unit) !== shown ? suggestionKg : undefined;

  if (weightKg === undefined && !adding && !alwaysShown) {
    return (
      <Button
        size="sm" variant="ghost" colorScheme="gray" color="gray.500" fontWeight="medium"
        leftIcon={<FaWeightHanging />} onClick={() => setAdding(true)} data-testid="add-weight"
      >
        Add weight
      </Button>
    );
  }

  return (
    <Flex direction="column" align="center" gap={0.5} data-testid="weight-control">
      <HStack spacing={1}>
        <IconButton
          aria-label="Lighter" icon={<LuMinus />} size="md" variant="ghost" borderRadius="full" color="gray.500"
          isDisabled={weightKg === undefined}
          onClick={() => weightKg !== undefined && onChange(stepWeightKg(weightKg, unit, -1) || undefined)}
        />
        <HStack spacing={1} align="baseline">
          <Input
            aria-label={`${label} in ${unit}`}
            data-testid="weight-input"
            value={text}
            placeholder="0"
            inputMode="decimal"
            enterKeyHint="done"
            autoFocus={adding}
            variant="unstyled"
            textAlign="right"
            fontSize="xl"
            fontWeight="bold"
            w={`${Math.max(2, text.length || 1) + 0.6}ch`}
            minW="2.6ch"
            onFocus={e => { setFocused(true); e.target.select(); }}
            onChange={e => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
          <Text fontSize="sm" color="gray.500">{unit}</Text>
        </HStack>
        <IconButton
          aria-label="Heavier" icon={<LuPlus />} size="md" variant="ghost" borderRadius="full" color="gray.500"
          onClick={() => onChange(stepWeightKg(weightKg ?? 0, unit, 1))}
        />
      </HStack>
      {(hint || suggestion !== undefined) && (
        <HStack spacing={2} fontSize="xs" color="gray.500" flexWrap="wrap" justify="center">
          {hint && <Text data-testid="weight-hint">{hint}</Text>}
          {suggestion !== undefined && (
            <Button
              variant="link" size="xs" colorScheme="cyan" onClick={() => onChange(suggestion)}
              data-testid="weight-suggestion"
            >
              Try {formatWeight(suggestion, unit)}?
            </Button>
          )}
        </HStack>
      )}
    </Flex>
  );
};

export default WeightControl;
