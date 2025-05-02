import React, { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, CircularProgress, CircularProgressLabel, Flex } from '@chakra-ui/react';
import { Exercise } from '../models/types';

interface ExerciseProgressProps {
  exercise: {
    exerciseId: string;
    sets: number;
    reps?: number;
    duration?: number;
  };
  currentSet: number;
  exerciseDetail: Exercise | undefined;
  onComplete: () => void;
  onNext: () => void;
}

const ExerciseProgress: React.FC<ExerciseProgressProps> = ({
  exercise,
  currentSet,
  exerciseDetail,
  onComplete,
  onNext
}) => {
  const [isActive, setIsActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeElapsed, setRestTimeElapsed] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && !isResting) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const next = prev + 1;
          if (exercise.duration && next >= exercise.duration) {
            setIsActive(false);
            setIsResting(true);
            return 0;
          }
          return next;
        });
      }, 1000);
    } else if (isResting) {
      interval = setInterval(() => {
        setRestTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, isResting, exercise.duration]);

  const handleStart = () => {
    setIsActive(true);
    setTimeElapsed(0);
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsResting(true);
    setRestTimeElapsed(0);
  };

  const handleNext = () => {
    setIsResting(false);
    setRestTimeElapsed(0);
    onNext();
  };

  const progress = exercise.duration 
    ? (timeElapsed / exercise.duration) * 100
    : (timeElapsed / 60) * 100; // Use 60 seconds as reference for non-duration exercises

  return (
    <Box 
      p={6} 
      borderRadius="lg" 
      borderWidth="1px" 
      bg="white" 
      _dark={{ bg: 'gray.800' }}
      width="100%"
    >
      {isResting ? (
        <VStack spacing={4} align="center">
          <Text fontSize="xl" fontWeight="bold" color="orange.500">
            Rest
          </Text>
          <CircularProgress
            value={100}
            color="orange.500"
            size="120px"
            thickness="4px"
          >
            <CircularProgressLabel color="orange.500">
              {restTimeElapsed}s
            </CircularProgressLabel>
          </CircularProgress>
          <Button 
            colorScheme="cyan" 
            size="lg" 
            width="100%" 
            onClick={handleNext}
          >
            Next
          </Button>
        </VStack>
      ) : (
        <VStack spacing={4} align="center">
          <Text fontSize="xl" fontWeight="bold">
            {exerciseDetail?.name || 'Exercise'}
          </Text>
          <Text>
            Set {currentSet + 1} of {exercise.sets}
            {exercise.reps && ` • ${exercise.reps} reps`}
          </Text>
          <CircularProgress
            value={isActive ? progress : 0}
            color="cyan.500"
            size="120px"
            thickness="4px"
          >
            <CircularProgressLabel>
              {exercise.duration ? 
                `${exercise.duration - timeElapsed}s` : 
                `${timeElapsed}s`
              }
            </CircularProgressLabel>
          </CircularProgress>
          {!isActive ? (
            <Button 
              colorScheme="cyan" 
              size="lg" 
              width="100%" 
              onClick={handleStart}
            >
              Start
            </Button>
          ) : (
            <Button 
              colorScheme="green" 
              size="lg" 
              width="100%" 
              onClick={handleComplete}
            >
              Done
            </Button>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default ExerciseProgress;