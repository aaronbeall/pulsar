// The short "building your plan" moment before the Pulsar Planner shows its week. The plan is
// ready instantly, but a beat of visible work reads as care rather than a canned answer, and
// each step names something real the Planner found or did (the answers it understood, what it
// learned, how many exercises it picked, the days it chose).

import { Box, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import ThinkingIndicator from './ThinkingIndicator';

export interface BuildStep {
  label: string;
  /** What it found, shown once the step is done. */
  detail?: string;
}

const STEP_MS = 520;
const HOLD_MS = 380;

const slideIn = keyframes`
  from { transform: translateY(6px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export default function PlanBuildSteps({ steps, onDone }: { steps: BuildStep[]; onDone: () => void }) {
  const [done, setDone] = useState(0);
  const muted = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    if (done < steps.length) {
      const t = setTimeout(() => setDone(d => d + 1), STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, HOLD_MS);
    return () => clearTimeout(t);
  }, [done, steps.length, onDone]);

  return (
    <VStack align="stretch" spacing={3} p={4} borderWidth={1} borderRadius="xl" bg="white" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}
      role="status" aria-live="polite" data-testid="plan-build-steps">
      {steps.slice(0, done + 1).map((step, i) => (
        <Flex key={step.label} gap={3} align="flex-start" animation={`${slideIn} 0.25s ease-out`}
          sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
          <Box w={5} pt="2px" flexShrink={0}>
            {i < done ? <Icon as={FaCheckCircle} color="cyan.400" boxSize={4} /> : null}
          </Box>
          <Box flex={1} minW={0}>
            {i < done ? (
              <>
                <Text fontWeight={600}>{step.label}</Text>
                {step.detail && <Text fontSize="sm" color={muted}>{step.detail}</Text>}
              </>
            ) : (
              <ThinkingIndicator labels={[step.label]} size="md" />
            )}
          </Box>
        </Flex>
      ))}
    </VStack>
  );
}
