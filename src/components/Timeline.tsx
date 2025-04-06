import React from 'react';
import { SimpleGrid, Circle, Flex, Text, Box } from '@chakra-ui/react';
import { Routine, Workout } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK

interface TimelineProps {
  activeRoutines: Routine[];
  workouts: Workout[];
}

const Timeline: React.FC<TimelineProps> = ({ activeRoutines, workouts }) => {
  const today = new Date().getDay();

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
          const hasWorkout = activeRoutines.some((routine) =>
            routine.dailySchedule.some((schedule) => schedule.day === day)
          );
          const isToday = index === today;
          const isPastDay = index < today; // Check if the day has already passed

          // Determine if the day is completed
          const isCompleted = hasWorkout
            ? workouts.some(
                (workout) =>
                  new Date(workout.date).getDay() === index && workout.completedAt
              )
            : isPastDay;

          let emoji = '💤'; // Default emoji for rest day
          let color = 'gray.400'; // Default color for rest day

          if (hasWorkout) {
            emoji = '🔥'; // Workout day
            color = isCompleted ? 'green.500' : isPastDay ? 'gray.400' : 'cyan.500'; // Green for completed, gray for past incomplete, cyan for upcoming
          }

          return (
            <Flex key={day} direction="column" align="center" position="relative">
              <Circle
                size="40px"
                bg={color}
                color="white"
                borderColor="yellow.400"
                borderWidth={isToday ? '3px' : 'none'}
                boxShadow={isToday ? '0px 0px 8px rgba(236, 201, 75, 0.6)' : 'none'}
                transform={isToday ? 'scale(1.5)' : 'scale(1)'}
              >
                {emoji}
              </Circle>
              <Text fontSize="sm" position="relative" top={isToday ? 2 : 0} mt={ 2} fontWeight={isToday ? "bold" : "normal"} color={isToday ? 'yellow.500' : 'gray.600'}>
                {day.slice(0, 3)} {/* Abbreviated day name */}
              </Text>
            </Flex>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default Timeline;
