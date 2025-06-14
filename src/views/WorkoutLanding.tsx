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
  Spinner,
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

const AddRoutineCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Box
      as="button"
      onClick={onClick}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      borderRadius="xl"
      p={8}
      mb={8}
      w="100%"
      bg={useColorModeValue('gray.50', 'gray.900')}
      boxShadow="none"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      transition="box-shadow 0.2s, border-color 0.2s, transform 0.2s"
      _hover={{
        borderColor: 'cyan.400',
        boxShadow: 'sm',
        transform: 'translateY(-2px) scale(1.02)',
        bg: useColorModeValue('white', 'gray.800'),
      }}
      _active={{
        borderColor: 'cyan.600',
        boxShadow: 'none',
        transform: 'scale(0.98)',
      }}
    >
      <Icon as={FaPlus} boxSize={12} color={useColorModeValue('gray.300', 'gray.600')} mb={2} />
      <Heading size="md" color={useColorModeValue('gray.400', 'gray.500')} fontWeight="semibold">
        Create New Routine
      </Heading>
    </Box>
  );
};

export const WorkoutLanding: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Use useMemo for active/inactive routines
  const activeRoutines = React.useMemo(() => routines.filter(r => r.active), [routines]);
  const inactiveRoutines = React.useMemo(() => routines.filter(r => !r.active), [routines]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const routinesData = await getRoutines();
        const workoutsData = await getWorkouts();

        if (routinesData.length === 0) {
          navigate('setup', { replace: true });
        }

        setRoutines(routinesData);
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
        <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" mb={4} />
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

            {/* Add Routine Placeholder Card */}
            <AddRoutineCard onClick={() => navigate('/workout/setup')} />

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
                        <RoutineCard routine={routine} />
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