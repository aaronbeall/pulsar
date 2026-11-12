// Offered on a finished workout when the routine's recent workouts keep feeling too hard, too
// easy, too long or too short (utils/routineFeedback.ts spots it). Like routine creation,
// Pulsar AI is the main action, behind the AI gate, and the rule-based Pulsar Planner is the
// no-AI alternative. Either way the result is a suggested change the user reviews day by day
// on the routine page.

import { Box, Button, CloseButton, Flex, Icon, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaListUl, FaMagic, FaSlidersH } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAIGate } from '../hooks/useAIGate';
import type { Routine, RoutineChange } from '../models/types';
import { usePulsarStore } from '../store/pulsarStore';
import { supersedePendingItems } from '../utils/routineChangeUtils';
import { adjustmentRequest, adjustRoutine, describeTrend, describeWant, type RoutineTrend } from '../utils/routineFeedback';
import { listText } from '../services/routinePlanner/planRoutine';

/** Navigation state the routine page's chat reads to send this request by itself. */
export interface AutoSendState {
  aiRequest?: string;
}

export default function RoutineAdjustOffer({ routine, trend }: { routine: Routine; trend: RoutineTrend }) {
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const navigate = useNavigate();
  const toast = useToast();
  const bg = useColorModeValue('cyan.50', 'rgba(0, 163, 196, 0.08)');
  const border = useColorModeValue('cyan.100', 'cyan.800');

  const latest = () => usePulsarStore.getState().routines.find(r => r.id === routine.id) ?? routine;
  const markHandled = (extra: Partial<Routine> = {}) => updateRoutine({ ...latest(), ...extra, feedbackHandledAt: Date.now() });

  const adjustWithAI = async () => {
    await markHandled();
    const state: AutoSendState = { aiRequest: adjustmentRequest(trend) };
    navigate(`/workout/routine/${routine.id}`, { state });
  };

  const adjustWithPlanner = async () => {
    const current = latest();
    const ops = adjustRoutine(current, trend);
    if (!ops.length) {
      await markHandled();
      toast({ title: 'Nothing to change', description: "Your routine is already as far as the Planner adjusts it. Try editing it yourself.", status: 'info', duration: 5000, isClosable: true });
      return;
    }
    const change: RoutineChange = {
      id: uuidv4(),
      status: 'pending',
      createdAt: Date.now(),
      source: 'planner',
      patch: { dailySchedule: ops },
    };
    await markHandled({ changes: [...supersedePendingItems(current.changes || [], change), change] });
    navigate(`/workout/routine/${routine.id}`);
    toast({
      title: `The Planner suggested changes for ${listText(ops.map(o => o.day))}`,
      description: 'Accept or reject each day on your routine.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  const aiGate = useAIGate({ key: `adjust:${routine.id}`, kind: 'edit', onResume: () => void adjustWithAI() });

  const handleAdjust = () => aiGate.requireAI(() => void adjustWithAI(), {
    kind: 'edit',
    reason: 'Adjusting your routine uses Pulsar AI.',
    alternative: {
      label: 'Use the free Pulsar Planner',
      description: `It makes the routine ${describeWant(trend)} by changing sets, reps and exercises. Runs on your phone, no AI.`,
      icon: FaListUl,
      onClick: () => void adjustWithPlanner(),
    },
  });

  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" px={3} py={3} data-testid="routine-adjust-offer">
      <Flex gap={2} align="flex-start" mb={2}>
        <Icon as={FaSlidersH} color="cyan.500" boxSize={3.5} mt="3px" flexShrink={0} />
        <Text fontSize="sm" flex={1}>
          {describeTrend(trend)} Make {routine.name} {describeWant(trend)}?
        </Text>
        <CloseButton size="sm" mt={-1} mr={-1} color="gray.500" aria-label="Not now" onClick={() => void markHandled()} />
      </Flex>
      <Flex gap={1} align="center">
        <Button colorScheme="cyan" size="sm" h="36px" leftIcon={<FaMagic />} onClick={handleAdjust}>
          Adjust with Pulsar AI
        </Button>
        <Button size="sm" h="36px" variant="ghost" onClick={() => void adjustWithPlanner()}>Use the free Planner</Button>
      </Flex>
      {aiGate.gate}
    </Box>
  );
}
