import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Alert, AlertTitle, AlertDescription, SlideFade, Icon } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { findRoutineForToday, findWorkoutForToday } from '../utils/workoutUtils';
import { FaTrophy, FaRedo, FaChartBar } from 'react-icons/fa';

const confetti = keyframes`
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-8px) rotate(-5deg); }
  40% { transform: translateY(-16px) rotate(5deg); }
  60% { transform: translateY(-8px) rotate(-3deg); }
  80% { transform: translateY(-4px) rotate(3deg); }
`;

interface FinishedWorkoutAlertProps {
  routines: Routine[];
  workouts: Workout[];
}

const FinishedWorkoutAlert: React.FC<FinishedWorkoutAlertProps> = ({ routines, workouts }) => {
  const navigate = useNavigate();
  const emoji = '🏆';

  return (
    <SlideFade in={true} offsetY="20px">
      <Alert 
        status="success" 
        variant="solid" 
        borderRadius="xl" 
        mb={6} 
        p={8}
        bgGradient="linear(to-r, yellow.400, orange.400)"
        boxShadow="2xl"
        _hover={{ transform: 'scale(1.01)', transition: 'transform 0.2s' }}
      >
        <Box 
          fontSize="7em" 
          mr={6}
          animation={`${confetti} 2.5s ease-in-out infinite`}
          cursor="pointer"
          transition="transform 0.2s"
          _hover={{ transform: 'scale(1.1)' }}
        >
          {emoji}
        </Box>
        <Flex direction="column" align="start">
          <AlertTitle fontSize="3xl" fontWeight="extrabold" mb={2}>
            Awesome work! 🎉
          </AlertTitle>
          <AlertDescription fontSize="lg" mb={6} opacity={0.95}>
            You crushed your workout today. Keep up the amazing work and enjoy your progress!
          </AlertDescription>
          <Flex gap={3}>
            <Button
              size="lg"
              colorScheme="yellow"
              variant="solid"
              leftIcon={<Icon as={FaChartBar} />}
              onClick={() => {
                const startedWorkout = findWorkoutForToday(workouts, routines);
                if (startedWorkout) {
                  navigate(`/workout/session/${startedWorkout.id}`);
                }
              }}
            >
              View Workout
            </Button>
            <Button
              size="lg"
              colorScheme="orange"
              variant="outline"
              leftIcon={<Icon as={FaRedo} />}
              onClick={() => navigate('/workout/session')}
            >
              Start Again
            </Button>
          </Flex>
        </Flex>
      </Alert>
    </SlideFade>
  );
};

export default FinishedWorkoutAlert;
