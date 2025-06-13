import React from 'react';
import { SimpleGrid, Circle, Flex, Text, Box, Icon } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { hasRoutineForDay, findRoutineForDay, findWorkoutForDay, getWorkoutStatusForDay, WorkoutStatus } from '../utils/workoutUtils';
import { FaTimes, FaBed, FaFire } from 'react-icons/fa';
import StatusBadge from './StatusBadge';

const pulseAnimation = keyframes`
  0% { transform: scale(1.75); }
  50% { transform: scale(1.85); }
  100% { transform: scale(1.75); }
`;

interface TimelineProps {
  activeRoutines: Routine[];
  workouts: Workout[];
}

const Timeline: React.FC<TimelineProps> = ({ activeRoutines, workouts }) => {
  const today = new Date().getDay();
  const navigate = useNavigate();

  const handleDayClick = (index: number, hasWorkout: boolean, isPastDay: boolean, isToday: boolean) => {
    // Allow clicking if it's a workout day and either it's in the past or it's today
    if (!hasWorkout || (!isPastDay && !isToday)) return;
    
    const dayOfWeek = DAYS_OF_WEEK[index];
    const routineForDay = findRoutineForDay(activeRoutines, dayOfWeek);
    if (!routineForDay) return;

    const workoutForDay = findWorkoutForDay(workouts, [routineForDay], dayOfWeek);
    if (workoutForDay) {
      navigate(`/workout/session/${workoutForDay.id}`);
    } else {
      navigate(`/workout/session?routineId=${routineForDay.id}&day=${dayOfWeek}`);
    }
  };

  const getDayIcon = (isToday: boolean, status: WorkoutStatus, hasWorkout: boolean, isPastDay: boolean) => {
    if (isToday) {
      if (status === 'completed') return FaFire;
      if (status === 'in progress') return FaFire;
      return hasWorkout ? FaFire : FaBed;
    }
    if (status === 'completed') return FaFire;
    if (isPastDay && hasWorkout) return FaTimes;
    if (hasWorkout) return FaFire;
    return FaBed;
  };

  return (
    <Box
      position="relative"
      width="100%"
      borderRadius="2xl"
      p={6}
      bg="white"
      _dark={{ bg: "gray.800" }}
      boxShadow="lg"
      mb={6}
      overflow="visible"
    >
      {/* Timeline track */}
      <Box
        position="absolute"
        top="42px"
        left="10%"
        right="10%"
        height="3px"
        bg="gray.100"
        _dark={{ bg: "gray.700" }}
        zIndex={1}
      />
      
      {/* Progress fill */}
      <Box
        position="absolute"
        top="42px"
        left="10%"
        height="3px"
        width={`${((today + 1) / 7) * 80}%`}
        bg="linear-gradient(90deg, cyan.400, cyan.500)"
        boxShadow="0 0 8px rgba(0, 200, 255, 0.4)"
        zIndex={2}
        transition="width 0.3s ease-out"
      />

      <SimpleGrid columns={7} spacing={4} position="relative" zIndex={3}>
        {DAYS_OF_WEEK.map((day, index) => {
          const hasWorkout = hasRoutineForDay(activeRoutines, day);
          const isToday = index === today;
          const isPastDay = index < today;
          const isFutureDay = index > today;

          const status = hasWorkout 
            ? getWorkoutStatusForDay(workouts, activeRoutines, day)
            : 'not started';

          const getCircleStyles = () => {
            if (isToday) {
              return {
                bg: 'cyan.500',
                transform: 'scale(1.75)',
                animation: `${pulseAnimation} 2s infinite ease-in-out`,
                cursor: hasWorkout ? 'pointer' : 'default'
              };
            }
            if (status === 'completed') {
              return {
                bg: 'cyan.400',
                opacity: 0.9
              };
            }
            if (isPastDay && hasWorkout) {
              return {
                bg: 'red.400',
                opacity: 0.7
              };
            }
            if (isFutureDay) {
              return {
                bg: 'gray.200',
                _dark: { bg: 'gray.600' },
                opacity: 0.5
              };
            }
            return {
              bg: 'gray.300',
              _dark: { bg: 'gray.700' }
            };
          };

          return (
            <Flex key={day} direction="column" align="center">
              <Box 
                position="relative" 
                mb={2}
                transition="all 0.2s"
                zIndex={isToday ? 2 : 1}
                _hover={hasWorkout && (isPastDay || isToday) ? {
                  transform: isToday ? 'scale(1.75)' : 'scale(1.1)',
                } : undefined}
              >
                <Circle
                  size="40px"
                  cursor={hasWorkout && (isPastDay || isToday) ? 'pointer' : 'default'}
                  onClick={() => handleDayClick(index, hasWorkout, isPastDay, isToday)}
                  boxShadow={isToday ? '0 0 12px rgba(0, 200, 255, 0.5)' : undefined}
                  transition="all 0.3s"
                  {...getCircleStyles()}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon 
                    as={getDayIcon(isToday, status, hasWorkout, isPastDay)} 
                    color="white" 
                    fontSize={isToday ? "xl" : "md"}
                  />
                </Circle>
                {hasWorkout && (isPastDay || isToday) && (
                  <StatusBadge status={status} />
                )}
              </Box>
              <Text 
                fontSize="sm"
                fontWeight={isToday ? "bold" : "medium"}
                color={isToday ? 'cyan.500' : 'gray.600'}
                _dark={{ color: isToday ? 'cyan.300' : 'gray.400' }}
                transition="all 0.2s"
                mt={2}
                position="relative"
                top={isToday ? 3 : 0}
              >
                {day.slice(0, 3)}
              </Text>
            </Flex>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default Timeline;
