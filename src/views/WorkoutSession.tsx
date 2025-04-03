import React from 'react';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { getRoutines } from '../db/indexedDb';
import { Routine } from '../models/types';

export const WorkoutSession: React.FC<{ routineId: string }> = ({ routineId }) => {
    const [routine, setRoutine] = React.useState<Routine | null>(null);
  
    React.useEffect(() => {
      const fetchRoutine = async () => {
        const routines = await getRoutines();
        const selectedRoutine = routines.find((r) => r.id === routineId) || null;
        setRoutine(selectedRoutine);
      };
      fetchRoutine();
    }, [routineId]);
  
    if (!routine) {
      return (
        <Box textAlign="center" p={4}>
          <Heading size="lg">Routine Not Found</Heading>
        </Box>
      );
    }
  
    return (
      <Flex direction="column" p={4} width="100%">
        <Heading size="lg" mb={4}>
          {routine.name}
        </Heading>
        {routine.dailySchedule.map((day, index) => (
          <Box key={index} mb={4}>
            <Heading size="md" mb={2}>
              {day.day}
            </Heading>
            {day.exercises.map((exercise, idx) => (
              <Text key={idx}>
                Exercise ID: {exercise.exerciseId}, Reps: {exercise.reps}, Sets: {exercise.sets}, Duration: {exercise.duration}s
              </Text>
            ))}
          </Box>
        ))}
      </Flex>
    );
  };