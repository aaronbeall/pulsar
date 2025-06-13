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
  useBreakpointValue,
  IconButton
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaPlay, FaCheck, FaStopwatch, FaQuestionCircle } from 'react-icons/fa';
import { Exercise, WorkoutExercise } from '../models/types';

const breathe = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const MotionBox = motion(Box);
const MotionIcon = motion(Icon);

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
      <AnimatePresence mode="wait">
        {isCompleted && (
          <MotionBox
            key="check-container"
            display="flex"
            alignItems="center"
            justifyContent="center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 10,
              mass: 0.75
            }}
          >
            <Icon
              as={FaCheck}
              color="white"
              fontSize="xs"
            />
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  );
};

interface ExerciseProgressProps {
  exercise: WorkoutExercise;
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
  const [timeElapsed, setTimeElapsed] = useState(exercise.completedDuration || 0);
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
            return exercise.duration;
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
    if (!exercise.startedAt) {
      onNext(); // This will mark the exercise as started
    }
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
    setIsActive(true);
    setTimeElapsed(0);
    onNext();
  };

  const progress = exercise.duration 
    ? (timeElapsed / exercise.duration) * 100
    : 0;

  const isLastSet = currentSet === exercise.sets - 1;
  const isCompleted = exercise.completedAt !== undefined;

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
      {/* Exercise image background and How To button overlay */}
      {exerciseDetail?.coverImageUrl && (
        <Box
          position="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          bg="gray.100"
          _dark={{ bg: 'gray.800' }}
        >
          <img
            src={exerciseDetail.coverImageUrl}
            alt={exerciseDetail.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }}
          />
        </Box>
      )}
      {exerciseDetail?.howToUrl && (
        <IconButton
          as="a"
          href={exerciseDetail.howToUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          colorScheme="cyan"
          variant="ghost"
          aria-label="How To (help)"
          icon={<FaQuestionCircle />}
          position="absolute"
          top={2}
          right={2}
          zIndex={2}
          bg="rgba(255,255,255,0.7)"
          _dark={{ bg: 'rgba(26,32,44,0.7)' }}
          _hover={{ bg: 'rgba(56,189,248,0.8)', opacity: 1 }}
          opacity={0.7}
          boxShadow="sm"
          transition="opacity 0.2s"
        />
      )}
      <VStack spacing={6} align="center" position="relative">
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
                    {exercise.duration ? (
                      <Text fontSize={fontSize} fontWeight="bold">
                        {`${exercise.duration - timeElapsed}s`}
                      </Text>
                    ) : (
                      <>
                        <Text 
                          fontSize={repsFontSize} 
                          fontWeight="bold"
                          color={isActive ? activeColor : undefined}
                          animation={isActive ? `${breathe} 2s ease-in-out infinite` : undefined}
                        >
                          {exercise.reps} reps
                        </Text>
                        {isActive && (
                          <Text 
                            fontSize={timeFontSize} 
                            color="gray.500"
                            fontWeight="medium"
                          >
                            {timeElapsed}s
                          </Text>
                        )}
                      </>
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