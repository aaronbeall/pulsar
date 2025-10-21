import React from 'react';
import { Text } from '@chakra-ui/react';
import { useExercise } from '../store/pulsarStore';
import type { ScheduledExercise } from '../models/types';



interface ExerciseNameProps {
  exerciseId: string;
  schedule?: ScheduledExercise;
}


export function ExerciseName({ exerciseId, schedule }: ExerciseNameProps) {
  const exercise = useExercise(exerciseId);
  let notation = '';
  if (schedule && schedule.sets) {
    if (schedule.reps !== undefined) {
      notation = `${schedule.sets} × ${schedule.reps}`;
    } else if (schedule.duration !== undefined) {
      notation = `${schedule.sets} × ${schedule.duration}s`;
    } else {
      notation = `${schedule.sets}`;
    }
  }
  return (
    <>
      {exercise?.name || exerciseId}
      {notation && (
        <Text as="span" fontSize="sm" ml={2} color={{ base: 'gray.500', _dark: 'gray.400' }}>
          {notation}
        </Text>
      )}
    </>
  );
}
