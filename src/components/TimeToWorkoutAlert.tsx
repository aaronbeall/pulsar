import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Alert, AlertTitle, AlertDescription, SlideFade, Icon } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { findRoutineForToday, findWorkoutForToday, getWorkoutStatusForToday, WorkoutStatus } from '../utils/workoutUtils';
import { WEIGHTLIFTING_EMOJIS } from '../constants/emojis';
import { FaPlay, FaPlayCircle, FaChartBar } from 'react-icons/fa';
import StatusBadge from './StatusBadge';

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

interface TimeToWorkoutAlertProps {
  routines: Routine[];
  workouts: Workout[];
}

const TimeToWorkoutAlert: React.FC<TimeToWorkoutAlertProps> = ({ routines, workouts }) => {
  const navigate = useNavigate();
  const status = getWorkoutStatusForToday(workouts, routines);
  const [emoji, setEmoji] = useState(WEIGHTLIFTING_EMOJIS[0]);

  // Rotate through emojis every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji(WEIGHTLIFTING_EMOJIS[Math.floor(Math.random() * WEIGHTLIFTING_EMOJIS.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getButtonIcon = (status: WorkoutStatus) => {
    switch (status) {
      case 'not started':
        return FaPlay;
      case 'in progress':
        return FaPlayCircle;
      case 'completed':
        return FaChartBar;
    }
  };

  const getButtonText = (status: WorkoutStatus) => {
    switch (status) {
      case 'not started':
        return 'Start Workout';
      case 'in progress':
        return 'Continue Workout';
      case 'completed':
        return 'View Workout';
    }
  };

  return (
    <SlideFade in={true} offsetY="20px">
      <Alert 
        status="success" 
        variant="solid" 
        borderRadius="xl" 
        mb={6} 
        p={8}
        bgGradient="linear(to-r, cyan.500, blue.500)"
        boxShadow="xl"
        _hover={{ transform: 'scale(1.01)', transition: 'transform 0.2s' }}
      >
        <Box 
          fontSize="7em" 
          mr={6}
          animation={`${bounce} 2s ease-in-out infinite`}
          cursor="pointer"
          onClick={() => setEmoji(WEIGHTLIFTING_EMOJIS[Math.floor(Math.random() * WEIGHTLIFTING_EMOJIS.length)])}
          transition="transform 0.2s"
          _hover={{ transform: 'scale(1.1)' }}
        >
          {emoji}
        </Box>
        <Flex direction="column" align="start">
          <AlertTitle
            fontSize="3xl"
            fontWeight="extrabold"
            mb={2}
          >
            Time to crush your workout! 💪
          </AlertTitle>
          <AlertDescription
            fontSize="lg"
            mb={6}
            opacity={1}
            color={{ base: 'gray.900', _dark: 'orange.100' }}
            textShadow={{ base: '0 1px 6px #fff', _dark: '0 1px 6px #7c2d12' }}
          >
            Your active routine is ready for today. Let's make it count!
          </AlertDescription>
          <Box position="relative">
            <Button
              size="lg"
              variant="solid"
              color={{ base: 'white', _dark: 'orange.400' }}
              bgGradient={{ base: 'linear(to-r, cyan.600, blue.400, pink.400)', _dark: 'linear(to-r, orange.500, orange.400, yellow.400)' }}
              fontWeight="extrabold"
              letterSpacing="wide"
              boxShadow={{ base: '0 4px 24px 0 #90cdf4', _dark: '0 4px 24px 0 #fbbf24' }}
              _hover={{
                bgGradient: {
                  base: 'linear(to-r, cyan.700, blue.500, pink.500)',
                  _dark: 'linear(to-r, orange.400, yellow.400, yellow.300)'
                },
                color: { base: 'white', _dark: 'gray.900' },
                boxShadow: { base: '0 6px 32px 0 #38bdf8', _dark: '0 6px 32px 0 #f59e42' }
              }}
              _active={{ transform: 'scale(0.98)' }}
              leftIcon={<Icon as={getButtonIcon(status)} />}
              transition="all 0.2s"
              onClick={() => {
                const todayRoutine = findRoutineForToday(routines);
                if (!todayRoutine) return;
                const startedWorkout = findWorkoutForToday(workouts, routines);
                navigate(
                  startedWorkout
                    ? `/workout/session/${startedWorkout.id}`
                    : `/workout/session/?routineId=${todayRoutine.id}`
                );
              }}
            >
              {getButtonText(status)}
            </Button>
            <StatusBadge status={status} />
          </Box>
        </Flex>
      </Alert>
    </SlideFade>
  );
};

export default TimeToWorkoutAlert;
