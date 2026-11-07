import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, Text, Flex, Button, Collapse, IconButton, Input, useToast } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaRobot, FaPaperPlane, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useAIGate } from '../hooks/useAIGate';
import { v4 as uuidv4 } from 'uuid';
import { Routine, RoutineChange, RoutineChatMessage } from '../models/types';
import { useExercises, usePulsarStore } from '../store/pulsarStore';
import { AIError, getActiveAIProvider } from '../services/ai';
import { applyRoutineChange } from '../utils/routineChangeUtils';
import { resolveAIExercises } from '../services/routineBuilderService';
import RoutineChangeCard from './RoutineChangeCard';
import ThinkingIndicator from './ThinkingIndicator';

const blink = keyframes`
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
`;

/** The streamed reply's state while a message is in flight: null until the first words arrive. */
interface StreamingReply {
  text: string;
  done: boolean;
}

interface RoutineChatProps {
  routine: Routine;
  /** The non-AI way to change the routine, offered when AI access is needed. */
  onEditManually?: () => void;
}

const RoutineChat: React.FC<RoutineChatProps> = ({ routine, onEditManually }) => {
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const addExercise = usePulsarStore(s => s.addExercise);
  const exercises = useExercises();
  const toast = useToast();
  const [chatInput, setChatInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streaming, setStreaming] = useState<StreamingReply | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const aiGate = useAIGate();

  const chatHistory = routine.chatHistory;
  const changes = routine.changes || [];

  // Scroll chat container to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory.length, isOpen, isSending, streaming?.text]);

  // Always build on the latest stored routine: the prop can be a render behind, e.g. right
  // after the user's own message was saved.
  const getLatestRoutine = () => usePulsarStore.getState().routines.find(r => r.id === routine.id) ?? routine;

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || isSending) return;
    // Without AI access this prompts for it, then sends the same message once unlocked.
    aiGate.requireAI(() => sendMessage(text), {
      reason: 'Chatting with your routine uses Pulsar AI.',
      alternative: onEditManually && { label: 'Edit the routine myself', onClick: onEditManually },
    });
  };

  const sendMessage = async (text: string) => {
    const provider = getActiveAIProvider();
    if (!provider) return;

    const priorHistory = getLatestRoutine().chatHistory;
    const userMessage: RoutineChatMessage = { id: uuidv4(), role: 'user', message: text, date: Date.now() };
    setChatInput('');
    await updateRoutine({ ...getLatestRoutine(), chatHistory: [...priorHistory, userMessage] });

    setIsSending(true);
    try {
      const current = getLatestRoutine();
      const knownExercises = usePulsarStore.getState().exercises;
      // The model only ever sees/produces exercise names, never our internal ids.
      const scheduleForPrompt = current.dailySchedule.map(day => ({
        day: day.day,
        kind: day.kind,
        exercises: day.exercises.map(ex => ({
          name: knownExercises.find(e => e.id === ex.exerciseId)?.name || 'Unknown exercise',
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
        })),
      }));
      const history = priorHistory.map(m => ({ role: m.role, message: m.message }));
      const response = await provider.suggestRoutineChange(current, scheduleForPrompt, history, text, {
        onCommentary: (partial, done) => setStreaming({ text: partial, done }),
      });

      const hasScheduleOps = !!response.patch.dailySchedule?.length;
      const hasDescriptionChange = response.patch.description !== undefined;
      let newChange: RoutineChange | undefined;

      if (hasScheduleOps || hasDescriptionChange) {
        // Resolve each setDay's exercise names -> real ScheduledExercise entries,
        // threading "known" sequentially so repeated names across days in one patch
        // don't create duplicate exercises.
        let known = usePulsarStore.getState().exercises;
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
        newChange = {
          id: uuidv4(),
          status: 'pending',
          patch: { dailySchedule: resolvedOps, description: response.patch.description },
        };
      }

      const aiMessage: RoutineChatMessage = {
        id: uuidv4(),
        role: 'ai',
        message: response.commentary,
        date: Date.now(),
        ...(newChange ? { pendingChangeId: newChange.id } : {}),
      };
      const latest = getLatestRoutine();
      await updateRoutine({
        ...latest,
        chatHistory: [...latest.chatHistory, aiMessage],
        changes: newChange ? [...(latest.changes || []), newChange] : latest.changes,
      });
    } catch (e) {
      toast({
        title: 'AI request failed',
        description: e instanceof AIError ? e.message : 'Something went wrong talking to the AI.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
      setStreaming(null);
    }
  };

  const handleAcceptChange = async (change: RoutineChange) => {
    const latest = getLatestRoutine();
    const { dailySchedule, description } = applyRoutineChange(latest, change);
    const updatedChanges = (latest.changes || []).map(c => c.id === change.id ? { ...c, status: 'accepted' as const } : c);
    await updateRoutine({ ...latest, dailySchedule, description, changes: updatedChanges });
  };

  const handleRejectChange = async (change: RoutineChange) => {
    const latest = getLatestRoutine();
    const updatedChanges = (latest.changes || []).map(c => c.id === change.id ? { ...c, status: 'rejected' as const } : c);
    await updateRoutine({ ...latest, changes: updatedChanges });
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
            <Text color="gray.500" fontSize="sm">Ask anything about this routine, or ask for changes, like "make Wednesday a rest day" or "no jumping, my knees hurt".</Text>
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
                  {msg.role === 'ai' && <AIBubbleHeader />}
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
          {isSending && (
            // The reply being written: a thinking cue until the first words arrive, then the
            // text as it streams in, then a quieter cue while any routine change is drafted.
            <Flex direction="column" gap={1} align="flex-start" data-testid="ai-streaming-reply">
              <Box bg="gray.200" color="gray.800" px={3} py={2} borderRadius="xl" maxW="80%" fontSize="md" display="flex" flexDirection="column" gap={1}>
                <AIBubbleHeader />
                {streaming?.text ? (
                  <span style={{ whiteSpace: 'pre-wrap' }}>
                    {streaming.text}
                    {!streaming.done && (
                      <Box
                        as="span"
                        display="inline-block"
                        w="0.5em"
                        h="1em"
                        ml="1px"
                        verticalAlign="text-bottom"
                        bg="cyan.400"
                        borderRadius="sm"
                        animation={`${blink} 1s step-end infinite`}
                        sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
                        aria-hidden
                      />
                    )}
                  </span>
                ) : (
                  <ThinkingIndicator labels={['Thinking', 'Looking over your routine', 'Still thinking']} />
                )}
              </Box>
              {streaming?.done && <ThinkingIndicator labels={['Checking for changes', 'Drafting changes']} />}
            </Flex>
          )}
        </VStack>
        <Flex ml="1px" mb="1px" mt={3} gap={2}>
          <Input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
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
        {aiGate.gate}
      </Collapse>
    </Box>
  );
};

const AIBubbleHeader: React.FC = () => (
  <Box mb={0.5} color="gray.400" display="flex" alignItems="center" justifyContent="flex-start" fontWeight="bold" fontSize="sm" gap={1} lineHeight={1}>
    <FaRobot size={16} />
    <span style={{ fontWeight: 600, fontSize: '0.93em', color: '#6B7280', lineHeight: 1 }}>Pulsar AI</span>
  </Box>
);

export default RoutineChat;
