import React, { useRef, useState } from 'react';
import { Box, VStack, Text, Flex, Button, Collapse, IconButton, Input, useToast } from '@chakra-ui/react';
import { FaRobot, FaPaperPlane, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { Routine, RoutineChange, RoutineChatMessage } from '../models/types';
import { useExercises, usePulsarStore } from '../store/pulsarStore';
import { AIError, getActiveAIProvider } from '../services/ai';
import { resolveAIExercises } from '../services/routineBuilderService';
import RoutineChangeCard from './RoutineChangeCard';

interface RoutineChatProps {
  routine: Routine;
}

const RoutineChat: React.FC<RoutineChatProps> = ({ routine }) => {
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const addExercise = usePulsarStore(s => s.addExercise);
  const exercises = useExercises();
  const toast = useToast();
  const [chatInput, setChatInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const chatHistory = routine.chatHistory;
  const changes = routine.changes || [];

  // Scroll chat container to bottom when new messages arrive
  React.useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory.length, isOpen]);

  const handleSend = async () => {
    if (!chatInput.trim() || isSending) return;
    const userMessage: RoutineChatMessage = { id: uuidv4(), role: 'user', message: chatInput.trim(), date: Date.now() };
    const historyWithUser = [...chatHistory, userMessage];
    setChatInput('');
    await updateRoutine({ ...routine, chatHistory: historyWithUser });

    const provider = getActiveAIProvider();
    setIsSending(true);
    try {
      if (provider) {
        // The model only ever sees/produces exercise names, never our internal ids.
        const scheduleForPrompt = routine.dailySchedule.map(day => ({
          day: day.day,
          kind: day.kind,
          exercises: day.exercises.map(ex => ({
            name: exercises.find(e => e.id === ex.exerciseId)?.name || 'Unknown exercise',
            sets: ex.sets,
            reps: ex.reps,
            duration: ex.duration,
          })),
        }));
        const response = await provider.suggestRoutineChange(routine, scheduleForPrompt, userMessage.message);

        const hasScheduleOps = !!response.patch.dailySchedule?.length;
        const hasDescriptionChange = response.patch.description !== undefined;
        let updatedChanges = changes;
        let aiMessage: RoutineChatMessage;

        if (hasScheduleOps || hasDescriptionChange) {
          // Resolve each setDay's exercise names -> real ScheduledExercise entries,
          // threading "known" sequentially so repeated names across days in one patch
          // don't create duplicate exercises.
          let known = exercises;
          const resolvedOps = [];
          for (const op of response.patch.dailySchedule || []) {
            if (op.op === 'clearDay') {
              resolvedOps.push(op);
            } else {
              const { scheduled, newExercises } = await resolveAIExercises(op.exercises, known, addExercise);
              known = [...known, ...newExercises];
              resolvedOps.push({ op: 'setDay' as const, day: op.day, kind: op.kind, exercises: scheduled });
            }
          }
          const change: RoutineChange = {
            id: uuidv4(),
            status: 'pending',
            patch: { dailySchedule: resolvedOps, description: response.patch.description },
          };
          updatedChanges = [...changes, change];
          aiMessage = { id: uuidv4(), role: 'ai', message: response.commentary, date: Date.now(), pendingChangeId: change.id };
        } else {
          aiMessage = { id: uuidv4(), role: 'ai', message: response.commentary, date: Date.now() };
        }

        await updateRoutine({ ...routine, chatHistory: [...historyWithUser, aiMessage], changes: updatedChanges });
      } else {
        // No AI provider set up — keep the harmless mock echo so the chat stays functional.
        await new Promise((resolve) => setTimeout(resolve, 600));
        const aiMessage: RoutineChatMessage = {
          id: uuidv4(),
          role: 'ai',
          message: `AI: I received your message: "${userMessage.message}"`,
          date: Date.now(),
        };
        await updateRoutine({ ...routine, chatHistory: [...historyWithUser, aiMessage] });
      }
    } catch (e) {
      toast({
        title: 'AI request failed',
        description: e instanceof AIError ? e.message : 'Something went wrong talking to the AI.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptChange = async (change: RoutineChange) => {
    let dailySchedule = routine.dailySchedule;
    if (change.patch.dailySchedule?.length) {
      dailySchedule = [...dailySchedule];
      for (const op of change.patch.dailySchedule) {
        const idx = dailySchedule.findIndex(d => d.day === op.day);
        if (op.op === 'clearDay') {
          if (idx !== -1) dailySchedule.splice(idx, 1);
        } else {
          const newDay = { day: op.day, kind: op.kind, exercises: op.exercises };
          if (idx !== -1) dailySchedule[idx] = newDay;
          else dailySchedule.push(newDay);
        }
      }
    }
    const description = change.patch.description ?? routine.description;
    const updatedChanges = changes.map(c => c.id === change.id ? { ...c, status: 'accepted' as const } : c);
    await updateRoutine({ ...routine, dailySchedule, description, changes: updatedChanges });
  };

  const handleRejectChange = async (change: RoutineChange) => {
    const updatedChanges = changes.map(c => c.id === change.id ? { ...c, status: 'rejected' as const } : c);
    await updateRoutine({ ...routine, changes: updatedChanges });
  };

  return (
    <Box w="100%" maxW="600px" mb={6} p={4} borderWidth="1px" borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.700' }}>
      <Flex align="center" justify="space-between" mb={isOpen ? 2 : 0}>
        <Flex align="center" gap={2}>
          <FaRobot size={18} color="#6B7280" />
          <Text fontWeight="bold" color="gray.600" fontSize="md">Pulsar AI</Text>
        </Flex>
        <IconButton
          aria-label={isOpen ? 'Collapse chat' : 'Expand chat'}
          icon={isOpen ? <FaChevronUp /> : <FaChevronDown />}
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen((v) => !v)}
        />
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        <VStack
          align="stretch"
          spacing={3}
          maxH="300px"
          overflowY="auto"
          ref={chatContainerRef}
        >
          {chatHistory.length === 0 && (
            <Text color="gray.500" fontSize="sm">Ask anything about this routine, or request changes!</Text>
          )}
          {chatHistory.map((msg) => {
            const change = msg.pendingChangeId ? changes.find(c => c.id === msg.pendingChangeId) : undefined;
            return (
              <Flex key={msg.id} direction="column" gap={1} align={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Box
                  bg={msg.role === 'user' ? 'cyan.400' : 'gray.200'}
                  color={msg.role === 'user' ? 'white' : 'gray.800'}
                  px={3} py={2} borderRadius="xl" maxW="80%"
                  fontSize="md"
                  display="flex"
                  flexDirection="column"
                  alignItems={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                  gap={1}
                >
                  {msg.role === 'ai' && (
                    <Box mb={0.5} color="gray.400" display="flex" alignItems="center" justifyContent="flex-start" fontWeight="bold" fontSize="sm" gap={1} lineHeight={1}>
                      <FaRobot size={16} />
                      <span style={{ fontWeight: 600, fontSize: '0.93em', color: '#6B7280', lineHeight: 1 }}>Pulsar AI</span>
                    </Box>
                  )}
                  <span style={{ marginTop: 0 }}>{msg.message}</span>
                </Box>
                {change && (
                  <Box maxW="80%" w="100%">
                    <RoutineChangeCard
                      change={change}
                      onAccept={() => handleAcceptChange(change)}
                      onReject={() => handleRejectChange(change)}
                    />
                  </Box>
                )}
              </Flex>
            );
          })}
        </VStack>
        <Flex ml="1px" mb="1px" mt={3} gap={2}>
          <Input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Suggest changes or ask a question..."
            borderRadius={16}
            fontSize="1em"
            bg="gray.50"
            _dark={{ bg: 'gray.700', color: 'gray.100', borderColor: 'gray.600' }}
            _focus={{ bg: 'white', _dark: { bg: 'gray.800' } }}
            color="gray.800"
            borderColor="gray.200"
            flex={1}
            transition="background 0.2s, color 0.2s"
            isDisabled={isSending}
          />
          <Button colorScheme="cyan" onClick={handleSend} borderRadius="full" px={3} minW={10} aria-label="Send" isLoading={isSending}>
            <FaPaperPlane />
          </Button>
        </Flex>
      </Collapse>
    </Box>
  );
};

export default RoutineChat;
