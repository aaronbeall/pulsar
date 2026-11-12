import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Flex, Heading, Input, Text, Skeleton, VStack, useColorModeValue, useToast } from '@chakra-ui/react';
import { usePulsarStore, useExercises } from '../store/pulsarStore';
import { generateRoutine, createRoutineFromTemplate, createRoutineFromPlan } from '../services/routineBuilderService';
import { workoutPrompts } from '../constants/prompts'; // Import reusable prompts
import { Routine } from '../models/types';
import { RoutineTemplate } from '../services/routineTemplates';
import type { NavigateFunction } from 'react-router-dom';
import { FaArrowRight, FaMagic, FaListUl } from 'react-icons/fa';
import { RoutineTemplateChooser } from '../components/RoutineTemplateChooser';
import { RoutinePlanBuilder } from '../components/RoutinePlanBuilder';
import type { RoutinePlan } from '../services/routinePlanner/planRoutine';
import { AIError } from '../services/ai';
import { useAIGate } from '../hooks/useAIGate';
import { useUrlModal } from '../hooks/useUrlModal';
import { useSessionDraft } from '../hooks/useSessionDraft';
import { useLearnedPreferences } from '../hooks/useLearnedPreferences';
import ThinkingIndicator from '../components/ThinkingIndicator';
import RoutineBuildProgress, { PlannedDay } from '../components/RoutineBuildProgress';

// Positional, matching workoutPrompts by index — no need for named keys.
const emptyResponses = () => Array(workoutPrompts.length).fill('');

export const WorkoutSetup: React.FC = () => {
  // Hoist all hooks to the top
  // Kept for the tab's session, so leaving for Google sign-in (or a reload) keeps the answers.
  const [step, setStep, clearStepDraft] = useSessionDraft<number>('pulsar:setupStep', () => 1);
  const [responses, setResponses, clearResponsesDraft] = useSessionDraft<string[]>('pulsar:setupAnswers', emptyResponses);
  const clearDraft = () => { clearStepDraft(); clearResponsesDraft(); };
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [build, setBuild] = useState<{ commentary: string; commentaryDone: boolean; plannedDays: PlannedDay[] }>({ commentary: '', commentaryDone: false, plannedDays: [] });
  const [builtRoutine, setBuiltRoutine] = useState<Routine | null>(null);
  // The template chooser is a sheet over the questions: ?templates=1, so Back returns to them.
  const templateChooser = useUrlModal('templates');
  const showTemplateChooser = templateChooser.isOpen;
  // The no-AI planner: ?plan=1, so Back returns to the questions.
  const planBuilder = useUrlModal('plan');
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  // Signing in or subscribing from the AI gate leaves the site; coming back, building continues
  // by itself (the answers and step are kept in session drafts above).
  const aiGate = useAIGate({ key: 'setup-plan', kind: 'plan', onResume: () => handleNext() });

  const addExercise = usePulsarStore(s => s.addExercise);
  const addRoutine = usePulsarStore(s => s.addRoutine);
  const exercises = useExercises();
  const routines = usePulsarStore(s => s.routines);
  const preferences = useLearnedPreferences();

  // Hoist all useColorModeValue hooks
  const orTextColor = useColorModeValue('gray.300', 'gray.600');
  const chooseBtnColor = useColorModeValue('gray', 'cyan');
  const chooseBtnOpacity = useColorModeValue(0.85, 0.95);
  const chooseBtnHoverBg = useColorModeValue('gray.100', 'cyan.900');

  const handleInputChange = (index: number, value: string) => {
    setResponses((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  const saveRoutine = async (routine: Routine) => {
    // Only set active if there are no active routines
    const hasActive = routines.some((r: Routine) => r.active);
    const routineToAdd = hasActive ? { ...routine, active: false } : { ...routine, active: true };
    await addRoutine(routineToAdd);
  };

  // Replaces the setup screen (and the template chooser's or planner's entry, if open), so Back from the new routine skips setup.
  const openRoutine = (routine: Routine) =>
    (planBuilder.isOpen ? planBuilder : templateChooser).leaveTo(`/workout/routine/${routine.id}`, { replace: true });

  const addRoutineAndNavigate = async (routine: Routine) => {
    await saveRoutine(routine);
    clearDraft();
    openRoutine(routine);
  };

  const handleTemplateSelect = async (template: RoutineTemplate) => {
    setIsLoading(true);
    const { routine } = await createRoutineFromTemplate(template, exercises, addExercise);
    await addRoutineAndNavigate(routine);
    setIsLoading(false);
  };

  const handlePlanCreate = async (plan: RoutinePlan, name: string) => {
    setIsLoading(true);
    try {
      const { routine } = await createRoutineFromPlan(plan, responses, exercises, addExercise, name);
      await addRoutineAndNavigate(routine);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (step < workoutPrompts.length) {
      setStep(step + 1);
    } else {
      aiGate.requireAI(generateWithAI, {
        kind: 'plan',
        reason: 'Building a routine from your answers uses Pulsar AI.',
        alternative: {
          label: 'Use the free Pulsar Planner',
          description: 'It reads your answers and builds a week around your days, gear and injuries, and what it\'s learned from your workouts. Runs on your phone, no AI.',
          icon: FaListUl,
          onClick: () => planBuilder.open(),
        },
      });
    }
  };

  const generateWithAI = async () => {
    setIsGeneratingWithAI(true);
    setBuild({ commentary: '', commentaryDone: false, plannedDays: [] });
    try {
      const { routine } = await generateRoutine(responses, exercises, addExercise, {
        preferences,
        onCommentary: (commentary, commentaryDone) => setBuild(b => ({ ...b, commentary, commentaryDone })),
        onScheduleDays: (plannedDays) => setBuild(b => ({ ...b, plannedDays })),
      });
      await saveRoutine(routine);
      clearDraft();
      // Show the finished week and let the user open it, rather than jumping away mid-read.
      setBuild(b => ({
        ...b,
        commentary: b.commentary || routine.chatHistory[routine.chatHistory.length - 1]?.message || '',
        commentaryDone: true,
        plannedDays: routine.dailySchedule.map(d => ({ day: d.day, kind: d.kind })),
      }));
      setBuiltRoutine(routine);
    } catch (e) {
      setIsGeneratingWithAI(false);
      // Stay on the last step with the answers intact so the user can retry or pick a template.
      toast({
        title: "Couldn't build your routine",
        description: e instanceof AIError ? e.message : 'Something went wrong talking to the AI. Try again.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  if (isGeneratingWithAI) {
    return (
      <RoutineBuildProgress
        commentary={build.commentary}
        commentaryDone={build.commentaryDone}
        plannedDays={build.plannedDays}
        ready={builtRoutine ? { name: builtRoutine.name, onOpen: () => openRoutine(builtRoutine) } : undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Box mb={4}>
          <ThinkingIndicator size="lg" labels={['Setting up your routine']} />
        </Box>
        <VStack spacing={4} align="stretch" width="80%">
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </VStack>
      </Flex>
    );
  }

  if (planBuilder.isOpen && !showTemplateChooser) {
    return (
      <RoutinePlanBuilder
        responses={responses}
        preferences={preferences}
        onCreate={handlePlanCreate}
        onBrowseTemplates={() => templateChooser.open()}
        onBack={planBuilder.close}
        onStartOver={async () => {
          await planBuilder.close();
          setStep(1);
          setResponses(emptyResponses());
        }}
      />
    );
  }

  if (showTemplateChooser) {
    return (
      <RoutineTemplateChooser
        userInput={responses.join(' ')}
        onSelect={handleTemplateSelect}
        onBack={templateChooser.close}
        onStartOver={async () => {
          await templateChooser.close();
          if (planBuilder.isOpen) await planBuilder.close();
          setStep(1);
          setResponses(emptyResponses());
        }}
      />
    );
  }

  return (
    <Flex direction="column" align="center" justify="center" minH="65vh" width="100%">
      <Box textAlign="center" mb={6} w="100%" maxW="420px">
        <Heading fontSize={{ base: 'xl', sm: '2xl' }} mb={4}>
          {workoutPrompts[step - 1].question}
        </Heading>
        <Input
          ref={inputRef}
          value={responses[step - 1] || ''}
          onChange={(e) => handleInputChange(step - 1, e.target.value)}
          onKeyDown={handleKeyDown}
          mb={2}
          width="100%"
          size="lg"
        />
        <Text fontSize="sm" color="gray.500">
          {workoutPrompts[step - 1].placeholder}
        </Text>
      </Box>
      {step < workoutPrompts.length ? (
        <Button colorScheme="cyan" size="lg" w={{ base: '100%', sm: 'auto' }} maxW="420px" onClick={handleNext} leftIcon={<FaArrowRight />}>
          Next
        </Button>
      ) : (
        <Box w="100%" maxW="420px" textAlign="center">
          <Button colorScheme="cyan" size="lg" w="100%" onClick={handleNext} leftIcon={<FaMagic />} mb={2}>
            Make my routine!
          </Button>
          <Text fontSize="sm" color={orTextColor} my={1} fontWeight="normal" letterSpacing="wider">
            or
          </Text>
          <Button
            variant="ghost"
            colorScheme={chooseBtnColor}
            onClick={() => planBuilder.open()}
            fontWeight="normal"
            fontSize="sm"
            leftIcon={<FaListUl style={{marginRight:4}} />}
            opacity={chooseBtnOpacity}
            _hover={{ opacity: 1, bg: chooseBtnHoverBg }}
          >
            Use the free Planner
          </Button>
          {aiGate.gate}
        </Box>
      )}
    </Flex>
  );
};
