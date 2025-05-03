import React from 'react';
import { Box, VStack, HStack, Text, Circle, Flex, useColorModeValue, Icon } from '@chakra-ui/react';
import { Exercise, ScheduledExercise } from '../models/types';
import { motion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

const MotionCircle = motion(Circle);
const MotionBox = motion(Box);

interface WorkoutTimelineProps {
  exercises: ScheduledExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  exerciseDetails: Exercise[];
}

const WorkoutTimeline: React.FC<WorkoutTimelineProps> = ({
  exercises,
  currentExerciseIndex,
  currentSetIndex,
  exerciseDetails
}) => {
  const connectorColor = useColorModeValue('gray.200', 'gray.700');
  const activeColor = useColorModeValue('cyan.500', 'cyan.400');
  const completedColor = useColorModeValue('green.500', 'green.400');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.500');
  const activeBgColor = useColorModeValue('cyan.50', 'rgba(0, 255, 255, 0.08)');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box position="relative">
      {/* Main connector line */}
      <Box
        position="absolute"
        left="20px"
        top={exercises.length > 1 ? "32px" : 0}
        height={exercises.length > 1 ? `calc(100% - 64px)` : 0}
        width="2px"
        bg={connectorColor}
        transition="background-color 0.2s"
      />
      
      <VStack spacing={1} align="stretch">
        {exercises.map((exercise, exerciseIdx) => {
          const detail = exerciseDetails.find(e => e.id === exercise.exerciseId);
          const isCurrentExercise = exerciseIdx === currentExerciseIndex;
          const isCompleted = exerciseIdx < currentExerciseIndex;
          
          return (
            <Box
              key={exerciseIdx}
              width="100%"
              opacity={isCompleted ? 0.7 : 1}
              transition="all 0.3s ease"
              initial={false}
            >
              <Flex 
                p={4} 
                align="center"
                bg={isCurrentExercise ? activeBgColor : 'transparent'}
                borderRadius="xl"
                transition="all 0.2s"
                cursor="pointer"
                _hover={{
                  bg: isCurrentExercise ? activeBgColor : hoverBgColor
                }}
                role="group"
              >
                <MotionCircle 
                  size="10px" 
                  bg={isCompleted ? completedColor : 
                      isCurrentExercise ? activeColor : connectorColor}
                  position="relative"
                  zIndex={1}
                  initial={false}
                  animate={{
                    scale: isCurrentExercise ? 1.3 : 1
                  }}
                  transition={{ duration: 0.2 }}
                  boxShadow={isCurrentExercise ? `0 0 0 4px ${activeBgColor}` : undefined}
                />

                <VStack align="start" spacing={2} ml={4} flex={1}>
                  <HStack spacing={3} width="100%" justify="space-between">
                    <Text 
                      fontWeight={isCurrentExercise ? "bold" : "medium"}
                      fontSize="md"
                      color={isCurrentExercise ? activeColor : textColor}
                      transition="all 0.2s"
                      _groupHover={{
                        color: isCurrentExercise ? activeColor : mutedTextColor
                      }}
                    >
                      {detail?.name || 'Exercise'}
                    </Text>
                    <Text 
                      color={isCurrentExercise ? activeColor : mutedTextColor}
                      fontSize="sm"
                      fontWeight={isCurrentExercise ? "semibold" : "normal"}
                      transition="all 0.2s"
                    >
                      {exercise.duration ? 
                        `${exercise.duration}s` : 
                        exercise.sets > 1 ? `${exercise.sets} × ${exercise.reps}` : `${exercise.reps} reps`}
                    </Text>
                  </HStack>

                  <HStack spacing={2}>
                    {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                      <MotionCircle
                        key={setIdx}
                        size="6px"
                        bg={
                          exerciseIdx < currentExerciseIndex ? completedColor :
                          exerciseIdx === currentExerciseIndex && setIdx < currentSetIndex ? completedColor :
                          exerciseIdx === currentExerciseIndex && setIdx === currentSetIndex ? activeColor :
                          connectorColor
                        }
                        initial={false}
                        animate={{
                          scale: exerciseIdx === currentExerciseIndex && setIdx === currentSetIndex ? 1.5 : 1
                        }}
                        transition={{ duration: 0.2 }}
                        position="relative"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {exerciseIdx < currentExerciseIndex || 
                         (exerciseIdx === currentExerciseIndex && setIdx < currentSetIndex) ? (
                          <Icon 
                            as={FaCheck} 
                            fontSize="4px" 
                            color="white"
                            opacity={0.8}
                          />
                        ) : null}
                      </MotionCircle>
                    ))}
                  </HStack>
                </VStack>
              </Flex>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};

export default WorkoutTimeline;