import React from 'react';
import { Box, VStack, HStack, Text, Circle, Flex } from '@chakra-ui/react';
import { Exercise } from '../models/types';

interface WorkoutTimelineProps {
  exercises: Array<{
    exerciseId: string;
    sets: number;
    reps?: number;
    duration?: number;
  }>;
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
  return (
    <Box position="relative">
      {/* Main connector line */}
      <Box
        position="absolute"
        left="20px"
        top={exercises.length > 1 ? "32px" : 0}
        height={exercises.length > 1 ? `calc(100% - 64px)` : 0}
        width="2px"
        bg="gray.300"
        _dark={{ bg: 'gray.700' }}
      />
      
      <VStack spacing={0} align="stretch">
        {exercises.map((exercise, exerciseIdx) => {
          const detail = exerciseDetails.find(e => e.id === exercise.exerciseId);
          const isCurrentExercise = exerciseIdx === currentExerciseIndex;
          const isCompleted = exerciseIdx < currentExerciseIndex;
          
          return (
            <Box
              key={exerciseIdx}
              width="100%"
              opacity={isCompleted ? 0.6 : 1}
              transition="all 0.3s ease"
            >
              <Flex 
                p={4} 
                align="center" 
                bg={isCurrentExercise ? "blackAlpha.50" : "transparent"}
                _dark={{ bg: isCurrentExercise ? "whiteAlpha.50" : "transparent" }}
                borderRadius="md"
              >
                <Circle 
                  size="10px" 
                  bg={isCompleted ? "green.500" : 
                      isCurrentExercise ? "cyan.500" : "gray.300"}
                  position="relative"
                  zIndex={1}
                  boxShadow={isCurrentExercise ? "0 0 0 2px rgba(0,200,255,0.2)" : undefined}
                />

                <VStack align="start" spacing={2} ml={4} flex={1}>
                  <HStack spacing={3} width="100%" justify="space-between">
                    <Text 
                      fontWeight={isCurrentExercise ? "bold" : "medium"}
                      fontSize="md"
                      color={isCurrentExercise ? "cyan.500" : undefined}
                    >
                      {detail?.name || 'Exercise'}
                    </Text>
                    <Text 
                      color={isCurrentExercise ? "cyan.500" : "gray.500"} 
                      fontSize="sm"
                      fontWeight={isCurrentExercise ? "semibold" : "normal"}
                    >
                      {exercise.duration ? 
                        `${exercise.duration}s` : 
                        `${exercise.sets} × ${exercise.reps}`}
                    </Text>
                  </HStack>

                  <HStack spacing={2}>
                    {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                      <Circle
                        key={setIdx}
                        size="6px"
                        bg={
                          exerciseIdx < currentExerciseIndex ? "green.500" :
                          exerciseIdx === currentExerciseIndex && setIdx < currentSetIndex ? "green.500" :
                          exerciseIdx === currentExerciseIndex && setIdx === currentSetIndex ? "cyan.500" :
                          "gray.300"
                        }
                        transition="all 0.2s ease"
                        transform={
                          exerciseIdx === currentExerciseIndex && setIdx === currentSetIndex
                            ? "scale(1.2)"
                            : "scale(1)"
                        }
                      />
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