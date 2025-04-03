import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Heading, Text, SimpleGrid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import { getRoutines, getWorkouts } from '../db/indexedDb';
import { Routine, Workout } from '../models/types';

const Home: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchData = async () => {
      const routinesData = await getRoutines();
      const workoutsData = await getWorkouts();
      setRoutines(routinesData);
      setWorkouts(workoutsData);
    };
    fetchData();
  }, []);

  const renderStreakCalendar = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const streak = Array(7).fill(false);

    workouts.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      const diff = today.getDay() - workoutDate.getDay();
      if (diff >= 0 && diff < 7) {
        streak[workoutDate.getDay()] = true;
      }
    });

    return (
      <SimpleGrid columns={7} spacing={2}>
        {days.map((day, index) => (
          <Box
            key={day}
            bg={streak[index] ? 'green.500' : 'gray.300'}
            w={8}
            h={8}
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="sm" color="white">
              {day[0]}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    );
  };

  return (
    <Flex direction="column" p={4} width="100%">
      {routines.length === 0 ? (
        <Box textAlign="center">
          <Heading size="lg" mb={4}>
            Welcome to Pulsar PWA!
          </Heading>
          <Text mb={4}>Get started by creating your first workout routine.</Text>
          <Button colorScheme="cyan" onClick={() => navigate('/workout')}>
            Create My First Workout
          </Button>
        </Box>
      ) : (
        <Box textAlign="center">
          <Heading size="lg" mb={4}>
            Ready to Workout?
          </Heading>
          <Button colorScheme="cyan" mb={4}>
            Start Workout
          </Button>
          {workouts.length > 0 && (
            <Box>
              <Heading size="md" mb={2}>
                Weekly Streak
              </Heading>
              {renderStreakCalendar()}
            </Box>
          )}
        </Box>
      )}
    </Flex>
  );
};

export default Home;
