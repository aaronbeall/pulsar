// Offered on a finished workout when the routine's recent workouts keep feeling too hard, too
// easy, too long or too short (utils/routineFeedback.ts spots it). Like routine creation,
// Pulsar AI is the main action, behind the AI gate, and the rule-based Pulsar Planner is the
// no-AI alternative. Either way the result is a suggested change the user reviews day by day
// on the routine page.

import { Box, Button, Flex, Icon, Text, useColorModeValue, useToast } from '@chakra-ui/react';
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
  const bg = useColorModeValue('cyan.50', 'rgba(0, 163, 196, 0.1)');
  const border = useColorModeValue('cyan.300', 'cyan.700');

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
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" p={{ base: 4, sm: 5 }} data-testid="routine-adjust-offer">
      <Flex align="center" gap={2} mb={2}>
        <Icon as={FaSlidersH} color="cyan.500" boxSize={4} />
        <Text fontWeight="bold">Time to adjust {routine.name}?</Text>
      </Flex>
      <Text fontSize="sm" mb={4}>
        {describeTrend(trend)} Want to make it {describeWant(trend)}? You'll review each day before anything changes.
      </Text>
      <Flex direction="column" gap={2}>
        <Button colorScheme="cyan" size="lg" leftIcon={<FaMagic />} onClick={handleAdjust}>
          Adjust with Pulsar AI
        </Button>
        <Flex gap={2}>
          <Button flex={1} variant="ghost" onClick={() => void adjustWithPlanner()}>Use the free Planner</Button>
          <Button flex={1} variant="ghost" color="gray.500" onClick={() => void markHandled()}>Not now</Button>
        </Flex>
      </Flex>
      {aiGate.gate}
    </Box>
  );
}
