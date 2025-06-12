import React from 'react';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { Workout, Routine } from '../models/types';
import { getWorkoutStatusForToday, hasRoutineForToday, getStreakInfo, StreakDay } from '../utils/workoutUtils';
import { DAYS_OF_WEEK } from '../constants/days';

interface StreakCalendarProps {
  workouts: Workout[];
  routines: Routine[];
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({ workouts, routines }) => {
  const { days, streak, status } = getStreakInfo(workouts, routines, 28);
  console.log("Streak", { days, streak, status });
  const workoutStatus = getWorkoutStatusForToday(workouts, routines);
  const isGrayed = workoutStatus !== 'completed' && hasRoutineForToday(routines);
  const flameColor = isGrayed ? 'gray.400' : 'orange.400';
  const streakTextColor = isGrayed ? 'gray.400' : 'orange.500';
  const bgActive = useColorModeValue('orange.300', 'orange.700');
  const bgInactive = useColorModeValue('gray.200', 'gray.600');
  const borderActive = useColorModeValue('orange.400', 'orange.300');
  const borderInactive = useColorModeValue('gray.300', 'gray.500');
  const todayColor = useColorModeValue('white', 'gray.900');

  // Find the Sunday of the current week
  const today = new Date();
  const endOfCalendar = new Date(today);
  endOfCalendar.setHours(0, 0, 0, 0);
  const endDay = endOfCalendar.getDay(); // 0 = Sunday
  // The last day in the calendar is the Saturday of this week
  const lastCalendarDay = new Date(endOfCalendar);
  lastCalendarDay.setDate(endOfCalendar.getDate() + (6 - endDay));
  // The first day is 27 days before the last calendar day, aligned to Sunday
  const firstCalendarDay = new Date(lastCalendarDay);
  firstCalendarDay.setDate(lastCalendarDay.getDate() - 27);

  // Build the calendar days array (always 28 days, aligned to weeks)
  const calendarDays: { date: Date; streakDay: StreakDay | null }[] = [];
  for (let i = 0; i < 28; i++) {
    const cellDate = new Date(firstCalendarDay);
    cellDate.setDate(firstCalendarDay.getDate() + i);
    const streakDay = days[cellDate.toDateString()] || null;
    calendarDays.push({ date: new Date(cellDate), streakDay });
  }

  // Group into weeks
  const weeks: { date: Date; streakDay: StreakDay | null }[][] = [];
  for (let i = 0; i < 4; i++) {
    weeks.push(calendarDays.slice(i * 7, (i + 1) * 7));
  }

  // Find today's date string for highlight
  const todayStr = new Date().toDateString();

  return (
    <Box mt={6} mb={2}>
      <Flex align="center" justify="center" mb={2} alignItems='baseline'>
        <Text fontSize="2xl" fontWeight="bold" color={streakTextColor} mr={2}>
          <span role="img" aria-label="flame" style={{ color: flameColor, fontSize: '1.5em', filter: isGrayed ? 'grayscale(1)' : 'none' }}>🔥</span> {streak}
        </Text>
        <Text color={streakTextColor} fontWeight="medium">day streak</Text>
      </Flex>
      <Box display="flex" flexDirection="column" alignItems="center" bg={useColorModeValue('white', 'gray.800')} borderRadius="lg" p={3} boxShadow="md">
        {/* Day labels */}
        <Flex mb={1} gap={0}>
          {DAYS_OF_WEEK.map((day, i) => (
            <Box
              key={i}
              w={7}
              h={7}
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="sm"
              color="gray.400"
              fontWeight="bold"
              letterSpacing="wide"
              borderRadius="full"
            >
              {day.charAt(0)}
            </Box>
          ))}
        </Flex>
        {weeks.map((week, weekIdx) => (
          <Flex key={weekIdx} mb={0.5} gap={0}>
            {week.map(({ date, streakDay }, dayIdx) => {
              const isToday = date.toDateString() === todayStr;
              const isFuture = date > today;
              const isStreak = streakDay?.inStreak;
              const isCompleted = streakDay?.completed;
              // Styling for all cases
              const bg = isFuture ? useColorModeValue('gray.100', 'gray.700') : isStreak ? bgActive : bgInactive;
              const color = isStreak ? 'orange.700' : 'gray.400';
              let border = isFuture ? 'none' : isStreak ? `2.5px solid ${borderActive}` : `1.5px solid ${borderInactive}`;
              if (isToday && !isFuture) border = isStreak ? `2.5px solid ${borderActive}` : `2.5px solid ${borderInactive}`;
              let borderRadius = '9999px';
              let borderLeft = border;
              let borderRight = border;
              if (isStreak && !isFuture) {
                const prev = week[dayIdx - 1]?.streakDay;
                const next = week[dayIdx + 1]?.streakDay;
                const prevIsStreak = prev && prev.inStreak;
                const nextIsStreak = next && next.inStreak;
                if (prevIsStreak && nextIsStreak) {
                  borderRadius = '0';
                } else if (prevIsStreak) {
                  borderRadius = '0 9999px 9999px 0';
                } else if (nextIsStreak) {
                  borderRadius = '9999px 0 0 9999px';
                } else {
                  borderRadius = '9999px';
                }
                if (prevIsStreak) borderLeft = 'none';
                if (nextIsStreak) borderRight = 'none';
              }
              // Outer box: no margin between days
              return (
                <Box
                  key={dayIdx}
                  w={7}
                  h={7}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  title={date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                >
                  {/* Inner pill/dot for all days, style toggled by state */}
                  <Box
                    w={isStreak && !isFuture ? '100%' : '60%'}
                    h={isStreak && !isFuture ? '100%' : '60%'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={borderRadius}
                    bg={bg}
                    borderLeft={borderLeft}
                    borderRight={borderRight}
                    borderTop={border}
                    borderBottom={border}
                    color={color}
                    fontWeight="bold"
                    fontSize="md"
                    boxShadow={isStreak && !isFuture ? 'md' : undefined}
                    opacity={isFuture ? 0.3 : isGrayed ? 0.5 : 1}
                    position="relative"
                    transition="background 0.2s, border 0.2s"
                    zIndex={isStreak && isCompleted ? 1 : 0}
                  >
                    {isCompleted && !isFuture && (
                      <CheckIcon
                        boxSize={isStreak ? 5 : 4}
                        color={isStreak ? 'white' : 'gray.300'}
                        sx={isStreak ? { filter: 'drop-shadow(0 0 6px #FFD600) drop-shadow(0 0 12px #FFD600)' } : undefined}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

export default StreakCalendar;