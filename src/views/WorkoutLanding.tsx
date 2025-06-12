import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  Container,
  SlideFade,
  useColorModeValue,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { getRoutines, getWorkouts } from '../db/indexedDb';
import { FaPlus, FaDumbbell } from 'react-icons/fa';
import Timeline from '../components/Timeline';
import { hasRoutineForToday, getWorkoutStatusForToday } from '../utils/workoutUtils';
import RoutineCard from '../components/RoutineCard';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';

export const WorkoutLanding: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]);
  const [inactiveRoutines, setInactiveRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const routinesData = await getRoutines();
        const workoutsData = await getWorkouts();

        if (routinesData.length === 0) {
          navigate('setup', { replace: true });
        }

        const active = routinesData.filter((routine) => routine.active);
        const inactive = routinesData.filter((routine) => !routine.active);

        setRoutines(routinesData);
        setActiveRoutines(active);
        setInactiveRoutines(inactive);
        setWorkouts(workoutsData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (isLoading) {
    return (
      <Flex direction="column" align="center" justify="center" height="100%" width="100%">
        <Icon as={FaDumbbell} fontSize="4xl" color="cyan.500" mb={4} />
        <Text color="gray.500" fontSize="lg">Loading your fitness journey...</Text>
      </Flex>
    );
  }

  return (
    <Container maxW="container.lg" p={4}>
      <SlideFade in={true} offsetY="20px">
        <VStack spacing={6} align="stretch" width="100%">
          {hasRoutineForToday(activeRoutines) ? (
            getWorkoutStatusForToday(workouts, activeRoutines) === 'completed' ? (
              <FinishedWorkoutAlert routines={activeRoutines} workouts={workouts} />
            ) : (
              <TimeToWorkoutAlert routines={activeRoutines} workouts={workouts} />
            )
          ) : (
            <RestDayAlert />
          )}
          
          <Timeline activeRoutines={activeRoutines} workouts={workouts} />

          <Box bg={bgColor} borderRadius="xl" p={6} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <Flex justify="space-between" align="center" mb={6}>
              <Heading size="lg" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
                My Workout
              </Heading>
              <Button
                variant="solid"
                colorScheme="cyan"
                leftIcon={<FaPlus />}
                onClick={() => navigate('/workout/setup')}
                size="md"
                boxShadow="sm"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'md',
                }}
                _active={{
                  transform: 'translateY(0)',
                  boxShadow: 'sm',
                }}
              >
                New Routine
              </Button>
            </Flex>

            {activeRoutines.length > 0 && (
              <Box mb={8}>
                <VStack spacing={4} align="stretch">
                  {activeRoutines.map((routine) => (
                    <SlideFade in={true} offsetY="20px" key={routine.id}>
                      <RoutineCard routine={routine} />
                    </SlideFade>
                  ))}
                </VStack>
              </Box>
            )}

            {inactiveRoutines.length > 0 && (
              <>
                <Divider my={6} />
                <Box>
                  <Heading size="md" mb={4} color="gray.500">
                    Inactive Routines
                  </Heading>
                  <VStack spacing={4} align="stretch">
                    {inactiveRoutines.map((routine) => (
                      <SlideFade in={true} offsetY="20px" key={routine.id}>
                        <RoutineCard routine={routine} variant="outline" />
                      </SlideFade>
                    ))}
                  </VStack>
                </Box>
              </>
            )}
          </Box>
        </VStack>
      </SlideFade>
    </Container>
  );
};