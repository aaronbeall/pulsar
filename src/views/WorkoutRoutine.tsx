import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { Routine } from '../models/types';
import { getRoutines } from '../db/indexedDb';

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>(); // Get routineId from route params
  const [routine, setRoutine] = useState<Routine | null>(null);

  useEffect(() => {
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
    <Box p={4}>
      <Heading size="lg" mb={4}>
        {routine.name}
      </Heading>
      <Text fontSize="md" mb={4}>
        Goals: {routine.prompts.goals}
      </Text>
      <Text fontSize="md" mb={4}>
        Equipment: {routine.prompts.equipment}
      </Text>
      <Text fontSize="md" mb={4}>
        Time: {routine.prompts.time}
      </Text>
      <Text fontSize="md" mb={4}>
        Additional Info: {routine.prompts.additionalInfo}
      </Text>
      <Heading size="md" mb={4}>
        Daily Schedule
      </Heading>
      <VStack align="start" spacing={4}>
        {routine.dailySchedule.map((day, index) => (
          <Box key={index} p={4} borderWidth="1px" borderRadius="md" width="100%">
            <Heading size="sm" mb={2}>
              {day.day}
            </Heading>
            {day.exercises.map((exercise, idx) => (
              <Text key={idx}>
                Exercise ID: {exercise.exerciseId}, Reps: {exercise.reps || 'N/A'}, Sets: {exercise.sets || 'N/A'}, Duration: {exercise.duration || 'N/A'}s
              </Text>
            ))}
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default WorkoutRoutine;
