import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  VStack, 
  Text, 
  CircularProgress, 
  CircularProgressLabel, 
  Flex, 
  HStack, 
  useColorModeValue,
  Heading,
  Icon,
  ScaleFade,
  useBreakpointValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaPlay, FaCheck, FaStopwatch } from 'react-icons/fa';
import { Exercise, ScheduledExercise } from '../models/types';

const breathe = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const MotionBox = motion(Box);

const SetIndicator: React.FC<{
  isCompleted: boolean;
  isActive: boolean;
  isCurrentSet: boolean;
}> = ({ isCompleted, isActive, isCurrentSet }) => {
  const activeBg = useColorModeValue('cyan.500', 'cyan.400');
  const completedBg = useColorModeValue('green.500', 'green.400');
  const inactiveBg = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <MotionBox
      width="30px"
      height="30px"
      borderRadius="full"
      bg={isCompleted ? completedBg : isCurrentSet ? activeBg : inactiveBg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      initial={false}
      animate={{
        scale: isCurrentSet && isActive ? 1.1 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      {isCompleted && (
        <Icon as={FaCheck} color="white" fontSize="xs" />
      )}
    </MotionBox>
  );
};

interface ExerciseProgressProps {
  exercise: ScheduledExercise;
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
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const activeColor = useColorModeValue('cyan.500', 'cyan.400');
  const restBgColor = useColorModeValue('orange.50', 'orange.900');
  const restTextColor = useColorModeValue('orange.600', 'orange.200');
  
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
    onComplete();
  };

  const handleNext = () => {
    setIsRestPeriod(false);
    setRestTimeElapsed(0);
    onNext();
    setIsActive(true);
    setTimeElapsed(0);
  };

  const progress = exercise.duration 
    ? (timeElapsed / exercise.duration) * 100
    : (timeElapsed / 60) * 100;

  const isLastSet = currentSet === exercise.sets - 1;

  const fontSize = useBreakpointValue({ base: "4xl", md: "5xl" });
  const repsFontSize = useBreakpointValue({ base: "2xl", md: "3xl" });
  const timeFontSize = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box 
      p={6} 
      borderRadius="xl"
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="lg"
      width="100%"
      maxWidth="500px"
      mx="auto"
      position="relative"
      overflow="hidden"
    >
      <VStack spacing={6} align="center">
        <VStack spacing={1} textAlign="center">
          <Heading 
            size="lg" 
            color={isRestPeriod ? restTextColor : activeColor}
            transition="color 0.2s"
          >
            {exerciseDetail?.name || 'Exercise'}
          </Heading>
          <Text fontSize="sm" color="gray.500" fontWeight="medium">
            Set {currentSet + 1} of {exercise.sets}
          </Text>
        </VStack>
        
        <HStack spacing={2} justify="center" my={4}>
          {Array.from({ length: exercise.sets }).map((_, idx) => (
            <SetIndicator
              key={idx}
              isCompleted={idx < currentSet}
              isActive={isActive}
              isCurrentSet={idx === currentSet}
            />
          ))}
        </HStack>
        
        {isRestPeriod ? (
          <MotionBox
            p={6}
            borderRadius="xl"
            bg={restBgColor}
            width="100%"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <VStack spacing={3}>
              <Icon as={FaStopwatch} fontSize="2xl" color={restTextColor} />
              <Text
                fontSize="3xl"
                fontWeight="bold"
                color={restTextColor}
                animation={`${breathe} 2s ease-in-out infinite`}
              >
                Rest Time: {restTimeElapsed}s
              </Text>
              <Button 
                colorScheme="cyan"
                size="lg"
                width="100%"
                onClick={handleNext}
                leftIcon={<FaPlay />}
              >
                {isLastSet ? "Start Next Exercise" : "Start Next Set"}
              </Button>
            </VStack>
          </MotionBox>
        ) : (
          <VStack spacing={6} width="100%">
            <Box position="relative">
              <CircularProgress
                isIndeterminate={!exercise.duration && isActive}
                value={exercise.duration ? (isActive ? progress : 0) : 0}
                color={activeColor}
                size="180px"
                thickness="4px"
                trackColor={useColorModeValue('gray.100', 'gray.700')}
                capIsRound
              >
                <CircularProgressLabel>
                  <VStack spacing={2} align="center">
                    {exercise.reps && isActive ? (
                      <>
                        <ScaleFade in={true} initialScale={0.9}>
                          <Text 
                            fontSize={repsFontSize} 
                            fontWeight="bold"
                            color={activeColor}
                            animation={isActive ? `${breathe} 2s ease-in-out infinite` : undefined}
                          >
                            {exercise.reps} reps
                          </Text>
                        </ScaleFade>
                        <Text 
                          fontSize={timeFontSize} 
                          color="gray.500"
                          fontWeight="medium"
                        >
                          {timeElapsed}s
                        </Text>
                      </>
                    ) : exercise.duration ? (
                      <Text fontSize={fontSize} fontWeight="bold">
                        {exercise.duration - timeElapsed}s
                      </Text>
                    ) : exercise.reps ? (
                      <Text fontSize={repsFontSize} fontWeight="bold" color={activeColor}>
                        {exercise.reps} reps
                      </Text>
                    ) : (
                      <Text fontSize={fontSize} fontWeight="bold">
                        {timeElapsed}s
                      </Text>
                    )}
                  </VStack>
                </CircularProgressLabel>
              </CircularProgress>
            </Box>

            {!isActive ? (
              <Button 
                colorScheme="cyan"
                size="lg"
                width="100%"
                onClick={handleStart}
                leftIcon={<FaPlay />}
              >
                Start Set {currentSet + 1}
              </Button>
            ) : (
              <Button 
                colorScheme="green"
                size="lg"
                width="100%"
                onClick={handleComplete}
                leftIcon={<FaCheckCircle />}
              >
                Complete {exercise.reps} Reps
              </Button>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default ExerciseProgress;