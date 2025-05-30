import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Flex, Heading, Input, Text, Spinner, Skeleton, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { addRoutine, addExercise } from '../db/indexedDb';
import { generateRoutine } from '../services/routineBuilderService';
import { workoutPrompts } from '../constants/prompts'; // Import reusable prompts
import { RoutinePromptKey } from '../models/types';

export const WorkoutSetup: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [responses, setResponses] = useState<Record<RoutinePromptKey, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleInputChange = (key: RoutinePromptKey, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = async () => {
    if (step < workoutPrompts.length) {
      setStep(step + 1);
    } else {
      setIsLoading(true);
      const { routine, exercises } = await generateRoutine(responses); // Updated to handle new structure
      await Promise.all(exercises.map((exercise) => addExercise(exercise))); // Save exercises to IndexedDB
      await addRoutine(routine); // Save routine to IndexedDB
      setIsLoading(false);
      navigate(`/workout/routine/${routine.id}`, { replace: true }); // Navigate to WorkoutRoutine view
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
      <Button colorScheme="cyan" onClick={handleNext}>
        {step < workoutPrompts.length ? "Next" : "Make my routine!"}
      </Button>
    </Flex>
  );
};
