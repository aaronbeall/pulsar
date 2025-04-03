import React from 'react';
import { Routes, Route, Outlet, useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { getRoutines } from '../db/indexedDb';
import { Routine } from '../models/types';

export const WorkoutLanding: React.FC = () => {
  const [routines, setRoutines] = React.useState<Routine[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchRoutines = async () => {
      const routinesData = await getRoutines();
      setRoutines(routinesData);

      // Redirect to setup if no routines exist
      if (routinesData.length === 0) {
        navigate('setup', { replace: true }); // Replace history stack
      }
    };
    fetchRoutines();
  }, [navigate]);

  return (
    <Flex direction="column" p={4} width="100%">
      <VStack spacing={4}>
        <Heading size="lg">Your Workout Routines</Heading>
        {routines.map((routine) => (
          <Button
            key={routine.id}
            colorScheme="cyan"
            onClick={() => navigate(`session/${routine.id}`)}
          >
            {routine.name}
          </Button>
        ))}
      </VStack>
    </Flex>
  );
};