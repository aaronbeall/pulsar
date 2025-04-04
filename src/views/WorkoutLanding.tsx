import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine } from '../models/types';
import { getRoutines } from '../db/indexedDb';

export const WorkoutLanding: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeTodayRoutines, setActiveTodayRoutines] = useState<Routine[]>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]);
  const [inactiveRoutines, setInactiveRoutines] = useState<Routine[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoutines = async () => {
      const routinesData = await getRoutines();

    // Redirect to setup if no routines exist
    if (routinesData.length === 0) {
        navigate('setup', { replace: true }); // Replace history stack
    }

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      const activeToday = routinesData.filter(
        (routine) =>
          routine.active &&
          routine.dailySchedule.some((schedule) => schedule.day === today)
      );

      const active = routinesData.filter(
        (routine) =>
          routine.active &&
          !routine.dailySchedule.some((schedule) => schedule.day === today)
      );

      const inactive = routinesData.filter((routine) => !routine.active);

      setRoutines(routinesData);
      setActiveTodayRoutines(activeToday);
      setActiveRoutines(active);
      setInactiveRoutines(inactive);
    };
    fetchRoutines();
  }, []);

  return (
    <Flex direction="column" p={4} align="center" width="100%">
      <Flex justify="space-between" align="center" width="100%" mb={4}>
        <Heading size="lg">My Workouts</Heading>
        <Button colorScheme="cyan" onClick={() => navigate('/workout/setup')}>
          Create New Workout
        </Button>
      </Flex>
      {activeTodayRoutines.length > 0 && (
        <Box width="100%" mb={4}>
          <Heading size="md" mb={2}>Active Today</Heading>
          <VStack spacing={4} align="start" width="100%">
            {activeTodayRoutines.map((routine) => (
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
                    onClick={() => navigate(`/workout/session/${routine.id}`)}
                  >
                    Start Workout
                  </Button>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      )}
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