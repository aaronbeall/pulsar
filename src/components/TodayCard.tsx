import React, { useState, useEffect } from 'react';
import { Box, Button, Flex, Heading, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { findRoutineForToday, findWorkoutForToday, WorkoutStatus } from '../utils/workoutUtils';
import { WEIGHTLIFTING_EMOJIS } from '../constants/emojis';
import { FaPlay, FaPlayCircle, FaChartBar } from 'react-icons/fa';
import StatusBadge from './StatusBadge';

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;

interface TodayCardProps {
  status: 'rest' | WorkoutStatus;
  routines: Routine[];
  workouts: Workout[];
}

const getButtonIcon = (status: WorkoutStatus) => {
  switch (status) {
    case 'not started': return FaPlay;
    case 'in progress': return FaPlayCircle;
    case 'completed': return FaChartBar;
  }
};

const getButtonText = (status: WorkoutStatus) => {
  switch (status) {
    case 'not started': return 'Start Workout';
    case 'in progress': return 'Continue Workout';
    case 'completed': return 'View Workout';
  }
};

const TodayCard: React.FC<TodayCardProps> = ({ status, routines, workouts }) => {
  const navigate = useNavigate();
  const [emoji, setEmoji] = useState(WEIGHTLIFTING_EMOJIS[0]);
  const glassBg = useColorModeValue('whiteAlpha.700', 'blackAlpha.400');
  const glassBorder = useColorModeValue('whiteAlpha.800', 'whiteAlpha.100');
  const mutedColor = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    if (status !== 'not started' && status !== 'in progress') return;
    const interval = setInterval(() => {
      setEmoji(WEIGHTLIFTING_EMOJIS[Math.floor(Math.random() * WEIGHTLIFTING_EMOJIS.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'rest') {
    return (
      <Box
        borderRadius="2xl"
        p={{ base: 6, sm: 8 }}
        bg={glassBg}
        backdropFilter="blur(20px) saturate(180%)"
        border="1px solid"
        borderColor={glassBorder}
        boxShadow="0 8px 32px rgba(0,0,0,0.1)"
        textAlign="center"
      >
        <Box fontSize={{ base: '3em', sm: '3.5em' }} mb={2}>🌙</Box>
        <Heading fontSize={{ base: 'lg', sm: 'xl' }} mb={1}>
          Rest Day
        </Heading>
        <Text color={mutedColor} fontSize="sm">
          Recovery is part of the plan — your next workout is coming up soon.
        </Text>
      </Box>
    );
  }

  const isCompleted = status === 'completed';
  const gradient = isCompleted
    ? 'linear(to-br, yellow.400, orange.400)'
    : 'linear(to-br, cyan.400, blue.500)';
  const title = isCompleted
    ? 'Nice work today! 🎉'
    : status === 'in progress'
    ? 'Keep the momentum going'
    : 'Ready when you are';
  const subtitle = isCompleted
    ? 'You crushed it. Recovery starts now.'
    : "Your routine's ready — let's make it count.";

  const handleClick = () => {
    const startedWorkout = findWorkoutForToday(workouts, routines);
    if (startedWorkout) {
      navigate(`/workout/session/${startedWorkout.id}`);
      return;
    }
    const todayRoutine = findRoutineForToday(routines);
    if (todayRoutine) {
      navigate(`/workout/session/?routineId=${todayRoutine.id}`);
    }
  };

  return (
    <Box
      borderRadius="2xl"
      p={{ base: 6, sm: 8 }}
      bgGradient={gradient}
      color="white"
      boxShadow="0 12px 32px rgba(0,0,0,0.25)"
      _hover={{ transform: 'translateY(-2px)' }}
      transition="transform 0.2s"
    >
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        align="center"
        gap={{ base: 3, sm: 6 }}
      >
        <Box
          fontSize={{ base: '3.5em', sm: '4.5em' }}
          lineHeight={1}
          animation={isCompleted ? undefined : `${bounce} 2s ease-in-out infinite`}
        >
          {isCompleted ? '🏆' : emoji}
        </Box>
        <Box flex={1} textAlign={{ base: 'center', sm: 'left' }}>
          <Heading fontSize={{ base: 'xl', sm: '2xl' }} fontWeight="extrabold" mb={1}>
            {title}
          </Heading>
          <Text fontSize={{ base: 'sm', sm: 'md' }} opacity={0.9} mb={5}>
            {subtitle}
          </Text>
          <Box position="relative" display="inline-block">
            <Button
              size="lg"
              bg="whiteAlpha.900"
              color={isCompleted ? 'orange.600' : 'blue.600'}
              fontWeight="extrabold"
              _hover={{ bg: 'white', transform: 'scale(1.03)' }}
              _active={{ transform: 'scale(0.98)' }}
              transition="all 0.2s"
              leftIcon={<Icon as={getButtonIcon(status)} />}
              onClick={handleClick}
            >
              {getButtonText(status)}
            </Button>
            <StatusBadge status={status} />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default TodayCard;
