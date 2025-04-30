import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  Alert,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Circle,
  Spinner,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { getRoutines, getWorkouts } from '../db/indexedDb'; // Import getWorkouts
import { FaPlus } from 'react-icons/fa'; // Import the add icon
import Timeline from '../components/Timeline'; // Import the Timeline component
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import { hasRoutineForToday, findRoutineForToday, findWorkoutForToday, hasStartedIncompleteWorkoutForToday, getWorkoutStatusForToday } from '../utils/workoutUtils';
import RoutineCard from '../components/RoutineCard';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';

export const WorkoutLanding: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]);
  const [inactiveRoutines, setInactiveRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]); // State for workouts
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const routinesData = await getRoutines();
      const workoutsData = await getWorkouts(); // Fetch workouts

      // Redirect to setup if no routines exist
      if (routinesData.length === 0) {
        navigate('setup', { replace: true }); // Replace history stack
      }

      const active = routinesData.filter((routine) => routine.active);
      const inactive = routinesData.filter((routine) => !routine.active);

      setRoutines(routinesData);
      setActiveRoutines(active);
      setInactiveRoutines(inactive);
      setWorkouts(workoutsData); // Set workouts state
    };
    fetchData();
  }, []);

  if (routines.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Spinner size="xl" color="cyan.500" mb={4} />
      </Flex>
    );
  }

  return (
    <Flex direction="column" p={4} align="center" width="100%">
      {hasRoutineForToday(activeRoutines) ? (
        <TimeToWorkoutAlert routines={activeRoutines} workouts={workouts} />
      ) : (
        <RestDayAlert />
      )}
      <Timeline activeRoutines={activeRoutines} workouts={workouts} />
      <Flex justify="space-between" align="center" width="100%" mb={4}>
        <Heading size="lg">My Workouts</Heading>
        <Button variant="ghost" colorScheme="cyan" leftIcon={<FaPlus />} onClick={() => navigate('/workout/setup')}>
          New Routine
        </Button>
      </Flex>
      {activeRoutines.length > 0 && (
        <Box width="100%" mb={4}>
          <Heading size="md" mb={2}>Active</Heading>
          <VStack spacing={4} align="start" width="100%">
            {activeRoutines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </VStack>
        </Box>
      )}
      {inactiveRoutines.length > 0 && (
        <Box width="100%">
          <Heading size="md" mb={2}>Inactive</Heading>
          <VStack spacing={4} align="start" width="100%">
            {inactiveRoutines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} variant="outline" />
            ))}
          </VStack>
        </Box>
      )}
    </Flex>
  );
};