import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Flex, Heading, Input, Text, Spinner, Skeleton, VStack, useColorModeValue } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { usePulsarStore, useExercises } from '../store/pulsarStore';
import { generateRoutine, createRoutineFromTemplate } from '../services/routineBuilderService';
import { workoutPrompts } from '../constants/prompts'; // Import reusable prompts
import { RoutinePromptKey, Routine } from '../models/types';
import { RoutineTemplate } from '../services/routineTemplates';
import type { NavigateFunction } from 'react-router-dom';
import { FaArrowRight, FaMagic, FaBook } from 'react-icons/fa';
import { RoutineTemplateChooser } from '../components/RoutineTemplateChooser';

const initialPromptState = { goals: '', equipment: '', time: '', additionalInfo: '' };

export const WorkoutSetup: React.FC = () => {
  // Hoist all hooks to the top
  const [step, setStep] = useState<number>(1);
  const [responses, setResponses] = useState<Record<RoutinePromptKey, string>>(initialPromptState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addExercise = usePulsarStore(s => s.addExercise);
  const addRoutine = usePulsarStore(s => s.addRoutine);
  const exercises = useExercises();
  const routines = usePulsarStore(s => s.routines);

  // Hoist all useColorModeValue hooks
  const orTextColor = useColorModeValue('gray.300', 'gray.600');
  const chooseBtnColor = useColorModeValue('gray', 'cyan');
  const chooseBtnOpacity = useColorModeValue(0.85, 0.95);
  const chooseBtnHoverBg = useColorModeValue('gray.100', 'cyan.900');

  const handleInputChange = (key: RoutinePromptKey, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const addRoutineAndNavigate = async (
    routine: Routine,
  ) => {
    // Only set active if there are no active routines
    const hasActive = routines.some((r: Routine) => r.active);
    const routineToAdd = hasActive ? { ...routine, active: false } : { ...routine, active: true };
    await addRoutine(routineToAdd);
    navigate(`/workout/routine/${routine.id}`, { replace: true });
  };

  const handleTemplateSelect = async (template: RoutineTemplate) => {
    setIsLoading(true);
    const { routine } = await createRoutineFromTemplate(template, exercises, addExercise);
    await addRoutineAndNavigate(routine);
    setIsLoading(false);
    setShowTemplateChooser(false);
  };

  const handleNext = async () => {
    if (step < workoutPrompts.length) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      const { routine } = await generateRoutine(responses, exercises, addExercise);
      await addRoutineAndNavigate(routine);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.500" mb={4} />
        <Text fontSize="lg" color="gray.600" mb={4}>
          Building your customized routine based on your answers.
        </Text>
        <VStack spacing={4} align="stretch" width="80%">
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </VStack>
      </Flex>
    );
  }

  if (showTemplateChooser) {
    return (
      <RoutineTemplateChooser
        userInput={Object.values(responses).join(' ')}
        onSelect={handleTemplateSelect}
        onBack={() => setShowTemplateChooser(false)}
        onStartOver={() => {
          setShowTemplateChooser(false);
          setStep(1);
          setResponses(initialPromptState);
        }}
      />
    );
  }

  return (
    <Flex direction="column" p={4} align="center" justify="center" height="100%" width="100%">
      <Box textAlign="center" mb={6}>
        <Heading size="lg" mb={4}>
          {workoutPrompts[step - 1].question}
        </Heading>
        <Input
          ref={inputRef}
          value={responses[workoutPrompts[step - 1].key] || ''}
          onChange={(e) => handleInputChange(workoutPrompts[step - 1].key, e.target.value)}
          onKeyDown={handleKeyDown}
          mb={2}
          width="100%"
        />
        <Text fontSize="sm" color="gray.500">
          {workoutPrompts[step - 1].placeholder}
        </Text>
      </Box>
      {step < workoutPrompts.length ? (
        <Button colorScheme="cyan" onClick={handleNext} leftIcon={<FaArrowRight />}>
          Next
        </Button>
      ) : (
        <Box w="100%" textAlign="center">
          <Button colorScheme="cyan" onClick={handleNext} leftIcon={<FaMagic />} mb={2}>
            Make my routine!
          </Button>
          <Text fontSize="sm" color={orTextColor} my={1} fontWeight="normal" letterSpacing="wider">
            or
          </Text>
          <Button
            variant="ghost"
            colorScheme={chooseBtnColor}
            onClick={() => setShowTemplateChooser(true)}
            fontWeight="normal"
            fontSize="sm"
            leftIcon={<FaBook style={{marginRight:4}} />}
            opacity={chooseBtnOpacity}
            _hover={{ opacity: 1, bg: chooseBtnHoverBg }}
          >
            Choose from a template...
          </Button>
        </Box>
      )}
    </Flex>
  );
};
