import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Heading, Text, useToken, Highlight } from '@chakra-ui/react';
import { FaDumbbell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getRoutines, getWorkouts } from '../db/indexedDb';
import { Routine, Workout } from '../models/types';
import TimeToWorkoutAlert from '../components/TimeToWorkoutAlert';
import FinishedWorkoutAlert from '../components/FinishedWorkoutAlert';
import RestDayAlert from '../components/RestDayAlert';
import { findRoutineForToday, findWorkoutForToday, getWorkoutStatusForToday, hasRoutineForToday } from '../utils/workoutUtils';
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

  const todayStatus = routines.length > 0 && hasRoutineForToday(routines)
    ? getWorkoutStatusForToday(workouts, routines)
    : 'rest';

  return (
    <Flex direction="column" p={4} align="center" justify="center" height="100%" width="100%">
      {routines.length === 0 ? (
        <>
          <Box textAlign="center" mb={6}>
            <FaDumbbell size="100px" color={red500} />
          </Box>
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
                Welcome to Pulsar!
              </Highlight>
            </Heading>
            <Text mb={4}>Get started by creating your first workout routine.</Text>
            <Button colorScheme="cyan" onClick={() => navigate('/workout')}>
              Create My First Workout
            </Button>
          </Box>
        </>
      ) : (
        <Box>
          {todayStatus === 'rest' && <RestDayAlert />}
          {todayStatus === 'not started' && <TimeToWorkoutAlert routines={routines} workouts={workouts} />}
          {todayStatus === 'in progress' && <TimeToWorkoutAlert routines={routines} workouts={workouts} />}
          {todayStatus === 'completed' && <FinishedWorkoutAlert routines={routines} workouts={workouts} />}
          {workouts.length > 0 && <StreakCalendar workouts={workouts} routines={routines} />}
        </Box>
      )}
    </Flex>
  );
};

export default Home;
