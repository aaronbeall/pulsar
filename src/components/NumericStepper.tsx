import React from "react";
import { HStack, IconButton, Text } from "@chakra-ui/react";
import { LuMinus, LuPlus } from "react-icons/lu";

interface NumericStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  label?: string;
}

const NumericStepper: React.FC<NumericStepperProps> = ({ value, min = 1, max, onChange, label }) => {
  const display = label ? `${value}` : value;
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  // Hold-to-increment/decrement logic
  const holdTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const holdInterval = React.useRef<NodeJS.Timeout | null>(null);

  const handleHold = (type: 'inc' | 'dec') => {
    let current = value;
    const doAction = () => {
      if (type === 'inc' && (max === undefined || current < max)) {
        current += 1;
        onChange(current);
      } else if (type === 'dec' && current > min) {
        current -= 1;
        onChange(current);
      }
    };
    doAction();
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(() => {
        doAction();
      }, 60); // Fast repeat
    }, 400); // Initial delay
  };

  const clearHold = () => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  React.useEffect(() => () => clearHold(), []);

  return (
    <HStack gap={1} mr={2} align="center">
      <IconButton
        aria-label={`Decrement ${label || ''}`}
        icon={<LuMinus />}
        size="sm"
        variant="solid"
        colorScheme="gray"
        borderRadius="full"
        isDisabled={!canDecrement}
        onPointerDown={() => handleHold('dec')}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
      />
      <Text fontSize="md" fontWeight="medium" minW="2.5em" textAlign="center" px={2}>
        {display}
        {label && (
          <Text as="span" fontSize="10px" color="gray.400" fontWeight="normal" ml={1} textTransform="uppercase" letterSpacing="wider">
            {label}
          </Text>
        )}
      </Text>
      <IconButton
        aria-label={`Increment ${label || ''}`}
        icon={<LuPlus />}
        size="sm"
        variant="solid"
        colorScheme="gray"
        borderRadius="full"
        isDisabled={!canIncrement}
        onPointerDown={() => handleHold('inc')}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
      />
    </HStack>
  );
};

export default NumericStepper;
