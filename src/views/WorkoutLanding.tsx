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
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine } from '../models/types';
import { getRoutines, getWorkouts } from '../db/indexedDb'; // Import getWorkouts
import { FaPlus } from 'react-icons/fa'; // Import the add icon
import Timeline from '../components/Timeline'; // Import the Timeline component
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK

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

      setActiveRoutines(active);
      setInactiveRoutines(inactive);
      setWorkouts(workoutsData); // Set workouts state
    };
    fetchData();
  }, []);

  return (
    <Flex direction="column" p={4} align="center" width="100%">
      {activeRoutines.some((routine) =>
        routine.dailySchedule.some(
          (schedule) =>
            schedule.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
        )
      ) && (
        <Alert status="success" variant="solid" borderRadius="md" mb={6} p={6}>
          <Box fontSize="7em" mr={4}>🏋️‍♂️</Box> {/* Workout emoji */}
          <Flex direction="column" align="start">
            <AlertTitle fontSize="2xl" fontWeight="bold">
              It's time to workout!
            </AlertTitle>
            <AlertDescription fontSize="lg">
              You have an active routine for today. Click below to start your workout now!
            </AlertDescription>
            <Button
              mt={4}
              size="lg"
              colorScheme="cyan"
              onClick={() => {
                const todayRoutine = activeRoutines.find((routine) =>
                  routine.dailySchedule.some(
                    (schedule) =>
                      schedule.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
                  )
                );
                const startedWorkout = workouts.find(
                  (workout) =>
                    workout.routineId === todayRoutine?.id &&
                    new Date(workout.date).toDateString() === new Date().toDateString() &&
                    !workout.completedAt
                );
                navigate(
                  startedWorkout
                    ? `/workout/session/${startedWorkout.id}` // Continue workout
                    : `/workout/session/${todayRoutine?.id}` // Start workout
                );
              }}
            >
              {workouts.some(
                (workout) =>
                  workout.routineId === activeRoutines.find((routine) =>
                    routine.dailySchedule.some(
                      (schedule) =>
                        schedule.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })
                    )
                  )?.id &&
                  new Date(workout.date).toDateString() === new Date().toDateString() &&
                  !workout.completedAt
              )
                ? 'Continue Workout'
                : 'Start Workout'}
            </Button>
          </Flex>
        </Alert>
      )}
      <Timeline activeRoutines={activeRoutines} workouts={workouts} />
      <Flex justify="space-between" align="center" width="100%" mb={4}>
        <Heading size="lg">My Workouts</Heading>
        <Button colorScheme="cyan" leftIcon={<FaPlus />} onClick={() => navigate('/workout/setup')}>
          New Routine
        </Button>
      </Flex>
      {activeRoutines.length > 0 && (
        <Box width="100%" mb={4}>
          <Heading size="md" mb={2}>Active</Heading>
          <VStack spacing={4} align="start" width="100%">
            {activeRoutines.map((routine) => (
              <Card key={routine.id} width="100%" variant="elevated" borderRadius="md">
                <CardHeader>
                  <Heading size="md">{routine.name}</Heading>
                </CardHeader>
                <CardBody>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {routine.description}
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="cyan"
                    onClick={() => navigate(`/workout/routine/${routine.id}`)}
                  >
                    View Routine
                  </Button>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      )}
      {inactiveRoutines.length > 0 && (
        <Box width="100%">
          <Heading size="md" mb={2}>Inactive</Heading>
          <VStack spacing={4} align="start" width="100%">
            {inactiveRoutines.map((routine) => (
              <Card key={routine.id} width="100%" variant="outline" borderRadius="md">
                <CardHeader>
                  <Heading size="md">{routine.name}</Heading>
                </CardHeader>
                <CardBody>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {routine.description}
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="cyan"
                    onClick={() => navigate(`/workout/routine/${routine.id}`)}
                  >
                    View Routine
                  </Button>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      )}
    </Flex>
  );
};