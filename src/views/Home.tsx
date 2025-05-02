import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Heading, Text, useToken, Highlight } from '@chakra-ui/react';
import { FaDumbbell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getRoutines, getWorkouts } from '../db/indexedDb';
import { Routine, Workout } from '../models/types';
import { findRoutineForToday, findWorkoutForToday } from '../utils/workoutUtils';
import StreakCalendar from '../components/StreakCalendar';

const Home: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const navigate = useNavigate();
  const [red500] = useToken('colors', ['red.500']);

  useEffect(() => {
    const fetchData = async () => {
      const routinesData = await getRoutines();
      const workoutsData = await getWorkouts();
      setRoutines(routinesData);
      setWorkouts(workoutsData);
    };
    fetchData();
  }, []);

  return (
    <Flex direction="column" p={4} align="center" justify="center" height="100%" width="100%">
      <Box textAlign="center" mb={6}>
        <FaDumbbell size="100px" color={red500} />
      </Box>
      {routines.length === 0 ? (
        <Box textAlign="center">
          <Heading size="lg" mb={4}>
            <Highlight
              query="Pulsar"
              styles={{
                display: 'inline-block',
                color: 'cyan.500',
                fontWeight: 'bold',
              }}
            >
              Welcome to Pulsar PWA!
            </Highlight>
          </Heading>
          <Text mb={4}>Get started by creating your first workout routine.</Text>
          <Button colorScheme="cyan" onClick={() => navigate('/workout')}>
            Create My First Workout
          </Button>
        </Box>
      ) : (
        <Box textAlign="center">
          <Heading size="lg" mb={4}>
            <Highlight
              query="Pulsar"
              styles={{
                display: 'inline-block',
                color: 'cyan.500',
                fontWeight: 'bold',
              }}
            >
              Ready to Workout with Pulsar?
            </Highlight>
          </Heading>
          <Button 
            colorScheme="cyan" 
            mb={4} 
            onClick={() => {
              const todayRoutine = findRoutineForToday(routines);
              const startedWorkout = findWorkoutForToday(workouts, routines);
              navigate(
                `/workout/session/${startedWorkout?.id ?? `?routineId=${todayRoutine?.id}`}`
              );
            }}
          >
            Start Workout
          </Button>
          {workouts.length > 0 && <StreakCalendar workouts={workouts} />}
        </Box>
      )}
    </Flex>
  );
};

export default Home;
