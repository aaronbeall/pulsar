import React from 'react';
import { SimpleGrid, Circle, Flex, Text, Box } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { hasRoutineForDay, findRoutineForDay, findWorkoutForDay, getWorkoutStatusForDay } from '../utils/workoutUtils';
import StatusBadge from './StatusBadge';

interface TimelineProps {
  activeRoutines: Routine[];
  workouts: Workout[];
}

const Timeline: React.FC<TimelineProps> = ({ activeRoutines, workouts }) => {
  const today = new Date().getDay();
  const navigate = useNavigate();

  const handleDayClick = (index: number, hasWorkout: boolean, isPastDay: boolean) => {
    if (!hasWorkout || !isPastDay) return;
    
    const dayOfWeek = DAYS_OF_WEEK[index];
    const routineForDay = findRoutineForDay(activeRoutines, dayOfWeek);

    if (!routineForDay) return;

    // Find workout for this specific day if it exists
    const workoutForDay = findWorkoutForDay(workouts, [routineForDay], dayOfWeek);

    if (workoutForDay) {
      navigate(`/workout/session/${workoutForDay.id}`);
    } else {
      navigate(`/workout/session?routineId=${routineForDay.id}&day=${dayOfWeek}`);
    }
  };

  return (
    <Box
      position="relative"
      width="100%"
      borderWidth="none"
      borderRadius="full"
      p={4}
      bg="gray.50"
      _dark={{ bg: "gray.800" }}
      boxShadow="sm"
      mb={6}
    >
      {/* Background line */}
      <Box
        position="absolute"
        top="34px"
        left="7%"
        right="7%"
        height="4px"
        bg="gray.400"
        zIndex="0"
        opacity={0.25}
      />
      {/* Fill line up to the current day */}
      <Box
        position="absolute"
        top="34px"
        left="7%"
        right={`${(6 - today) * (100 / 7) + (100 / 14)}%`}
        height="4px"
        bg="yellow.400"
        zIndex="1"
      />
      <SimpleGrid columns={7} spacing={4} position="relative" zIndex="2">
        {DAYS_OF_WEEK.map((day, index) => {
          const hasWorkout = hasRoutineForDay(activeRoutines, day);
          const isToday = index === today;
          const isPastDay = index < today;

          const status = hasWorkout 
            ? getWorkoutStatusForDay(workouts, activeRoutines, day)
            : 'not started';

          let emoji = '💤';
          let color = isToday ? 'yellow.100' : isPastDay ? 'yellow.100' : 'gray.400';

          if (hasWorkout) {
            if (isPastDay && status === 'not started') {
              emoji = '❌';
              color = 'red.100';
            } else {
              emoji = '🔥';
              if (status === 'completed') {
                color = 'orange.200';
              }
            }
          }

          return (
            <Flex key={day} direction="column" align="center" position="relative">
              <Box position="relative">
                <Circle
                  size="40px"
                  bg={color}
                  color="white"
                  borderColor="yellow.400"
                  borderWidth={isToday ? '2px' : 'none'}
                  boxShadow={isToday ? '0px 0px 8px rgba(236, 201, 75, 0.6)' : 'none'}
                  transform={isToday ? 'scale(1.75)' : 'scale(1)'}
                  cursor={hasWorkout && isPastDay ? 'pointer' : 'default'}
                  onClick={() => handleDayClick(index, hasWorkout, isPastDay)}
                  _hover={hasWorkout && isPastDay ? {
                    opacity: 0.8,
                    transform: isToday ? 'scale(1.75)' : 'scale(1.1)'
                  } : undefined}
                >
                  {emoji}
                </Circle>
                {hasWorkout && (isPastDay || isToday) && (
                  <StatusBadge status={status} />
                )}
              </Box>
              <Text 
                fontSize="sm" 
                position="relative" 
                top={isToday ? 3 : 0} 
                mt={2} 
                fontWeight={isToday ? "bold" : "normal"} 
                color={isToday ? 'yellow.500' : 'gray.600'}
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
