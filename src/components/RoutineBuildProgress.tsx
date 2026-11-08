import React from 'react';
import { Box, Button, Flex, Grid, Heading, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import { DAYS_OF_WEEK } from '../constants/days';
import ThinkingIndicator from './ThinkingIndicator';

// The screen shown while Pulsar AI builds a routine from the setup answers. It stays alive
// the whole way: the coach's note streams in, then the week fills in day by day as the plan
// is written, then exercises are added. When the routine is saved it waits for the user to
// open it rather than jumping away mid-read.

const popIn = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  from { transform: translateY(6px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.8; }
`;

const NO_MOTION = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

export interface PlannedDay {
  day: string;
  kind: string;
}

interface RoutineBuildProgressProps {
  commentary: string;
  commentaryDone: boolean;
  plannedDays: PlannedDay[];
  /** Set once the routine is saved. */
  ready?: { name: string; onOpen: () => void };
}

/** Matches the model's day name ("Monday", "wed") to a weekday, or undefined. */
const toWeekday = (day: string) => DAYS_OF_WEEK.find(d => d.toLowerCase().startsWith(day.trim().toLowerCase().slice(0, 3)));

const RoutineBuildProgress: React.FC<RoutineBuildProgressProps> = ({ commentary, commentaryDone, plannedDays, ready }) => {
  const mutedColor = useColorModeValue('gray.600', 'gray.300');
  const restBg = useColorModeValue('gray.100', 'gray.700');
  const restColor = useColorModeValue('gray.400', 'gray.500');
  const rowBg = useColorModeValue('white', 'gray.700');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');

  const planned = plannedDays
    .map(d => ({ weekday: toWeekday(d.day), kind: d.kind }))
    .filter((d): d is { weekday: (typeof DAYS_OF_WEEK)[number]; kind: string } => !!d.weekday);
  const plannedSet = new Set(planned.map(d => d.weekday));
  const writingSchedule = commentaryDone && !ready;

  const labels = !commentary
    ? ['Reading your answers', 'Thinking about your goals', 'Still thinking']
    : !commentaryDone
      ? ['Writing your plan']
      : ['Planning your week', 'Choosing exercises', 'Adding exercises', 'Almost there'];

  return (
    <VStack spacing={5} align="stretch" w="100%" maxW="480px" mx="auto" px={4} py={6} data-testid="routine-build-progress">
      {ready ? (
        <Flex align="center" gap={3} animation={`${slideIn} 0.3s ease-out`} sx={NO_MOTION}>
          <Icon as={FaCheckCircle} boxSize={7} color="green.400" />
          <Box>
            <Heading size="md">Your routine is ready</Heading>
            <Text color={mutedColor} fontSize="sm">{ready.name}</Text>
          </Box>
        </Flex>
      ) : (
        <ThinkingIndicator size="lg" labels={labels} />
      )}

      {commentary && (
        <Text fontSize="md" color={mutedColor} whiteSpace="pre-wrap" data-testid="ai-streaming-commentary">
          {commentary}
        </Text>
      )}

      {commentaryDone && (
        <Box>
          <Grid templateColumns="repeat(7, 1fr)" gap={1.5} mb={3} aria-label="Workout days">
            {DAYS_OF_WEEK.map(day => {
              const isPlanned = plannedSet.has(day);
              return (
                <Flex
                  key={day}
                  direction="column"
                  align="center"
                  justify="center"
                  h={10}
                  borderRadius="lg"
                  fontSize="xs"
                  fontWeight="bold"
                  bg={isPlanned ? 'cyan.400' : restBg}
                  color={isPlanned ? 'white' : restColor}
                  animation={isPlanned ? `${popIn} 0.35s ease-out` : writingSchedule ? `${pulse} 1.6s ease-in-out infinite` : undefined}
                  sx={NO_MOTION}
                >
                  {day.slice(0, 3)}
                </Flex>
              );
            })}
          </Grid>
          <VStack align="stretch" spacing={2}>
            {planned.map(({ weekday, kind }) => (
              <Flex
                key={weekday}
                justify="space-between"
                align="center"
                px={3}
                py={2}
                bg={rowBg}
                borderWidth="1px"
                borderColor={rowBorder}
                borderRadius="lg"
                animation={`${slideIn} 0.3s ease-out`}
                sx={NO_MOTION}
              >
                <Text fontWeight="semibold" fontSize="sm">{weekday}</Text>
                <Text fontSize="sm" color={mutedColor}>{kind}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}

      {ready && (
        <Button colorScheme="cyan" size="lg" rightIcon={<FaArrowRight />} onClick={ready.onOpen} animation={`${slideIn} 0.3s ease-out`} sx={NO_MOTION}>
          See my routine & make changes
        </Button>
      )}
    </VStack>
  );
};

export default RoutineBuildProgress;
