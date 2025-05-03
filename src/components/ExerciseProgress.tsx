import React, { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, CircularProgress, CircularProgressLabel, Flex, HStack, Circle, Icon, Spinner } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaCheck } from 'react-icons/fa';
import { Exercise } from '../models/types';

const popIn = keyframes`
  0% { transform: scale(0); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const activePulse = keyframes`
  0% { transform: scale(1); background: var(--chakra-colors-cyan-500); }
  50% { transform: scale(1.1); background: var(--chakra-colors-cyan-500); }
  100% { transform: scale(1); background: var(--chakra-colors-cyan-500); }
`;

interface SetIndicatorProps {
  index: number;
  currentSet: number;
  completedSetIndex: number;
  isActive: boolean;
  isRestPeriod: boolean;
}

const SetIndicator: React.FC<SetIndicatorProps> = ({
  index,
  currentSet,
  completedSetIndex,
  isActive,
  isRestPeriod,
}) => {
  const isCompleted = index <= completedSetIndex;
  const isCurrent = index === currentSet;
  const isJustCompleted = index === completedSetIndex && isRestPeriod;
  
  // Show completed set with checkmark
  if (isCompleted) {
    return (
      <Circle
        size="24px"
        bg="green.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          animation={isJustCompleted ? `${popIn} 0.3s ease-out` : undefined}
        >
          <Icon as={FaCheck} fontSize="12px" />
        </Box>
      </Circle>
    );
  }

  // Show current set
  if (isCurrent) {
    return (
      <Circle
        size="24px"
        bg={isActive ? undefined : "transparent"}
        borderWidth="3px"
        borderColor="cyan.500"
        animation={isActive ? `${activePulse} 2s ease-in-out infinite` : undefined}
        sx={{
          willChange: 'transform',
        }}
      />
    );
  }

  // Show future set
  return (
    <Circle
      size="24px"
      borderWidth="3px"
      borderColor="gray.200"
      _dark={{ borderColor: 'gray.600' }}
    />
  );
};

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
  const [isRestPeriod, setIsRestPeriod] = useState(false);
  const [restTimeElapsed, setRestTimeElapsed] = useState(0);
  const [completedSetIndex, setCompletedSetIndex] = useState(currentSet - 1);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && !isRestPeriod) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const next = prev + 1;
          if (exercise.duration && next >= exercise.duration) {
            setIsActive(false);
            setIsRestPeriod(true);
            return 0;
          }
          return next;
        });
      }, 1000);
    } else if (isRestPeriod) {
      interval = setInterval(() => {
        setRestTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, isRestPeriod, exercise.duration]);

  const handleStart = () => {
    setIsActive(true);
    setTimeElapsed(0);
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsRestPeriod(true);
    setRestTimeElapsed(0);
    setCompletedSetIndex(currentSet);
  };

  const handleNext = () => {
    setIsRestPeriod(false);
    setRestTimeElapsed(0);
    onNext();
    // Immediately start the next set
    setIsActive(true);
    setTimeElapsed(0);
  };

  const progress = exercise.duration 
    ? (timeElapsed / exercise.duration) * 100
    : (timeElapsed / 60) * 100;

  return (
    <Box 
      p={6} 
      borderRadius="lg" 
      borderWidth="1px" 
      bg="white" 
      _dark={{ bg: 'gray.800' }}
      width="100%"
    >
      <VStack spacing={4} align="center">
        <Text fontSize="xl" fontWeight="bold" color={isRestPeriod ? "gray.500" : undefined}>
          {exerciseDetail?.name || 'Exercise'}
        </Text>
        
        <HStack spacing={4} my={2}>
          {Array.from({ length: exercise.sets }).map((_, idx) => (
            <SetIndicator
              key={`set-${idx}`}
              index={idx}
              currentSet={currentSet}
              completedSetIndex={completedSetIndex}
              isActive={isActive}
              isRestPeriod={isRestPeriod}
            />
          ))}
        </HStack>
        
        <Text fontSize="sm" color="gray.500" mt={-2}>
          Set {currentSet + 1} of {exercise.sets}
          {exercise.reps && ` • ${exercise.reps} reps`}
        </Text>

        {isRestPeriod ? (
          <>
            <Text fontSize="lg" fontWeight="bold" color="orange.500">
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
              Start Next Set
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </VStack>
    </Box>
  );
};

export default ExerciseProgress;