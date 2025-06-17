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
import { useRoutines, useWorkouts } from '../store/pulsarStore';
import { FaPlus, FaDumbbell, FaStar } from 'react-icons/fa';
import Timeline from '../components/Timeline';
import { hasRoutineForToday, getWorkoutStatusForToday } from '../utils/workoutUtils';
import RoutineCard from '../components/RoutineCard';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';
import NoActiveRoutinesAlert from '../components/NoActiveRoutinesAlert';

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
  const routines = useRoutines();
  const workouts = useWorkouts();
  const navigate = useNavigate();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isLoading = routines === undefined || workouts === undefined;

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Use useMemo for active/inactive routines
  const activeRoutines = React.useMemo(() =>
    routines.filter(r => r.active && (!showFavoritesOnly || r.favorite)),
    [routines, showFavoritesOnly]
  );
  const inactiveRoutines = React.useMemo(() =>
    routines.filter(r => !r.active && (!showFavoritesOnly || r.favorite)),
    [routines, showFavoritesOnly]
  );

  const hasFavorites = React.useMemo(() => routines.some(r => r.favorite), [routines]);

  React.useEffect(() => {
    if (!isLoading && routines.length === 0) {
      navigate('setup', { replace: true });
    }
  }, [isLoading, routines, navigate]);

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
          {activeRoutines.length === 0 && inactiveRoutines.length > 0 ? (
            <NoActiveRoutinesAlert 
              onCreate={() => navigate('/workout/setup')}
              onStartRoutine={() => {
                const el = document.getElementById('inactive-routines-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          ) : hasRoutineForToday(activeRoutines) ? (
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
              {hasFavorites && (
                <Button
                  leftIcon={<FaStar />}
                  colorScheme={showFavoritesOnly ? 'yellow' : undefined}
                  variant={showFavoritesOnly ? 'solid' : 'ghost'}
                  size="sm"
                  onClick={() => setShowFavoritesOnly(fav => !fav)}
                  aria-pressed={showFavoritesOnly}
                  sx={!showFavoritesOnly ? {
                    color: useColorModeValue('#B89C3A', '#FFD600'),
                    border: '1.5px solid',
                    borderColor: useColorModeValue('#F5E7B2', '#FFD60055'),
                    background: useColorModeValue('#FFFBEA', 'rgba(255,214,0,0.07)'),
                    boxShadow: 'none',
                    opacity: 0.92,
                    fontWeight: 500,
                    _hover: {
                      color: '#FFD600',
                      borderColor: '#FFD600',
                      background: useColorModeValue('#FFF9E1', '#FFD60022'),
                      opacity: 1,
                    },
                  } : {}}
                >
                  {showFavoritesOnly ? 'Show All' : 'Show Favorites'}
                </Button>
              )}
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
                <Box id="inactive-routines-section">
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