import React from 'react';
import { Box, Button, Flex, Alert, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { findRoutineForToday, findWorkoutForToday, getWorkoutStatusForToday } from '../utils/workoutUtils';
import StatusBadge from './StatusBadge';

interface TimeToWorkoutAlertProps {
  routines: Routine[];
  workouts: Workout[];
}

const TimeToWorkoutAlert: React.FC<TimeToWorkoutAlertProps> = ({ routines, workouts }) => {
  const navigate = useNavigate();
  const status = getWorkoutStatusForToday(workouts, routines);

  return (
    <Alert status="success" variant="solid" borderRadius="md" mb={6} p={6}>
      <Box fontSize="7em" mr={4}>🏋️‍♂️</Box>
      <Flex direction="column" align="start">
        <AlertTitle fontSize="2xl" fontWeight="bold">
          It's time to workout!
        </AlertTitle>
        <AlertDescription fontSize="lg">
          You have an active routine for today. Click below to start your workout now!
        </AlertDescription>
        <Box position="relative" mt={4}>
          <Button
            size="lg"
            colorScheme="cyan"
            onClick={() => {
              const todayRoutine = findRoutineForToday(routines);
              if (!todayRoutine) return;
              const startedWorkout = findWorkoutForToday(workouts, routines);
              navigate(
                startedWorkout
                  ? `/workout/session/${startedWorkout.id}`
                  : `/workout/session/?routineId=${todayRoutine.id}`
              );
            }}
          >
            {{
              "not started": 'Start Workout',
              "in progress": 'Continue Workout',
              "completed": 'View Workout',
            }[status]}
          </Button>
          <StatusBadge status={status} />
        </Box>
      </Flex>
    </Alert>
  );
};

export default TimeToWorkoutAlert;
