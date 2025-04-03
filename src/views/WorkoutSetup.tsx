import React, { useState, useRef } from 'react';
import { Box, Button, Flex, Heading, Input, Text, Progress } from '@chakra-ui/react'; // Import Progress
import { useNavigate } from 'react-router-dom';

export const WorkoutSetup: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input field
  const navigate = useNavigate();

  const prompts = [
    {
      question: "What are your goals?",
      placeholder: "Ex. lose weight, get stronger, arms and upper body, or be healthier",
      key: "goals",
    },
    {
      question: "What equipment will you use?",
      placeholder: "Ex. dumbbells, bands, treadmill, whatever I need, or nothing",
      key: "equipment",
    },
    {
      question: "How much time can you workout?",
      placeholder: "Ex. 30 min daily, as much as I need, or very little",
      key: "time",
    },
    {
      question: "Anything else I should know?",
      placeholder: "Ex. I have asthma, I hate running, or I'm overweight",
      key: "additionalInfo",
    },
  ];

  const handleInputChange = (key: string, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (step < prompts.length) {
      setStep(step + 1);
    } else {
      // Final step: navigate to the next screen or save the routine
      console.log("User responses:", responses);
      navigate('/workout'); // Navigate back to the workout screen
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext(); // Proceed to the next question on Enter
    }
  };

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus(); // Auto-focus the input field
    }
  }, [step]);

  return (
    <Flex direction="column" p={4} align="center" justify="center" height="100%" width="100%">
      <Box textAlign="center" mb={6} width="100%" maxWidth="400px">
        <Heading size="lg" mb={4}>
          {prompts[step - 1].question}
        </Heading>
        <Input
          ref={inputRef} // Attach the ref to the input field
          value={responses[prompts[step - 1].key] || ''}
          onChange={(e) => handleInputChange(prompts[step - 1].key, e.target.value)}
          onKeyDown={handleKeyDown} // Handle Enter key press
          mb={2}
          width="100%"
        />
        <Text fontSize="sm" color="gray.500">
          {prompts[step - 1].placeholder}
        </Text>
      </Box>
      {/* <Box width="100%" maxWidth="400px" mb={4}>
        <Progress value={(step / prompts.length) * 100} size="sm" colorScheme="cyan" />
      </Box> */}
      <Button colorScheme="cyan" onClick={handleNext}>
        {step < prompts.length ? "Next" : "Make my routine!"}
      </Button>
    </Flex>
  );
};
