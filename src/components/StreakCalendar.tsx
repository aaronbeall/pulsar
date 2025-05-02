import React from 'react';
import { Box, SimpleGrid, Text, Heading, Circle, VStack } from '@chakra-ui/react';
import { Workout } from '../models/types';

interface StreakCalendarProps {
  workouts: Workout[];
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({ workouts }) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const streak = Array(7).fill(false);

  workouts.forEach((workout) => {
    const workoutDate = new Date(workout.startedAt);
    const diff = today.getDay() - workoutDate.getDay();
    if (diff >= 0 && diff < 7) {
      streak[workoutDate.getDay()] = true;
    }
  });

  return (
    <Box>
      <Heading size="md" mb={4}>
        Weekly Streak
      </Heading>
      <SimpleGrid columns={7} spacing={4}>
        {days.map((day, index) => {
          const isToday = index === today.getDay();
          const isPast = index < today.getDay();
          const isCompleted = streak[index];

          return (
            <VStack key={day} spacing={2}>
              <Text 
                fontSize="sm" 
                color={isToday ? "cyan.500" : "gray.500"}
                fontWeight={isToday ? "bold" : "normal"}
              >
                {day[0]}
              </Text>
              <Box 
                position="relative" 
                height="8" 
                width="8" 
                display="flex" 
                alignItems="center"
                justifyContent="center"
              >
                {isToday && (
                  <Circle
                    size="32px"
                    position="absolute"
                    borderWidth="2px"
                    borderColor="cyan.500"
                    opacity={0.3}
                  />
                )}
                <Circle
                  size="6px"
                  bg={
                    isCompleted
                      ? 'cyan.500'
                      : isPast
                      ? 'red.200'
                      : 'gray.200'
                  }
                  opacity={isPast || isCompleted ? 1 : 0.5}
                />
              </Box>
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default StreakCalendar;