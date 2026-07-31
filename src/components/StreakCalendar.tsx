import React from 'react';
import { Box, Flex, IconButton, Text, useColorModeValue, useToken } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Workout, Routine } from '../models/types';
import { getStreakInfo, StreakDay, getDayOfWeek, findRoutineForDay, findExercisesForDay, findWorkoutForDay } from '../utils/workoutUtils';
import { DAYS_OF_WEEK } from '../constants/days';
import { usePulsarStore } from '../store/pulsarStore';
import { v4 as uuidv4 } from 'uuid';

interface StreakCalendarProps {
  workouts: Workout[];
  routines: Routine[];
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({ workouts, routines }) => {
  // Only use active routines for streak info
  const activeRoutines = React.useMemo(() => routines.filter(r => r.active), [routines]);
  const { days, streak, status } = React.useMemo(() => getStreakInfo(workouts, activeRoutines), [workouts, activeRoutines]);
  const isGrayed = status !== 'up_to_date';
  const isPending = status === 'pending';
  const flameColor = isGrayed ? 'gray.400' : 'orange.400';
  const streakTextColor = isGrayed ? 'gray.400' : 'orange.500';
  const [bgActiveColor] = useToken('colors', [useColorModeValue('orange.300', 'orange.700')]);
  const [bgInactiveColor] = useToken('colors', [useColorModeValue('gray.200', 'gray.600')]);
  const [futureBgColor] = useToken('colors', [useColorModeValue('gray.100', 'gray.700')]);
  const bgActive = useColorModeValue('orange.300', 'orange.700');
  const bgInactive = useColorModeValue('gray.200', 'gray.600');
  const bgFuture = useColorModeValue('gray.100', 'gray.700');
  const borderActive = useColorModeValue('orange.400', 'orange.300');
  const borderInactive = useColorModeValue('gray.300', 'gray.500');
  const pendingDotBg = useColorModeValue('yellow.300', 'yellow.400');
  const cardBg = useColorModeValue('white', 'gray.800');
  const navHoverBg = useColorModeValue('gray.100', 'gray.700');

  // Which month is currently displayed — defaults to the current month, independent of
  // the rolling streak count above (the streak/flame always reflects "now", not the
  // month being browsed).
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewDate, setViewDate] = React.useState(() => startOfMonth(new Date()));
  const isCurrentMonthView = isSameMonth(viewDate, today);
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays: { date: Date; isCurrentMonth: boolean; streakDay: StreakDay | null }[] = React.useMemo(
    () =>
      eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
        date,
        isCurrentMonth: isSameMonth(date, viewDate),
        streakDay: days[date.toDateString()] || null,
      })),
    [gridStart, gridEnd, viewDate, days]
  );

  // Group into weeks
  const weeks: typeof calendarDays[] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Find today's date string for highlight
  const todayStr = today.toDateString();

  const addWorkout = usePulsarStore(s => s.addWorkout);

  const handleDayClick = async (date: Date, isCurrentMonth: boolean) => {
    // Only allow for days in the viewed month that are past or today
    if (!isCurrentMonth) return;
    if (date > today) return;
    // Use findRoutineForDay and findExercisesForDay from workoutUtils
    const dayOfWeek = getDayOfWeek(date);
    const routine = findRoutineForDay(routines, dayOfWeek);
    if (!routine) return;
    const exercises = findExercisesForDay(routine, dayOfWeek);
    if (!exercises.length) return;
    // Check if a workout already exists for this day
    const existing = findWorkoutForDay(workouts, [routine], dayOfWeek, date);
    if (existing) return;
    // Create a completed workout object
    const workout = {
      id: uuidv4(),
      nickname: 'Manual Entry',
      routineId: routine.id,
      day: dayOfWeek,
      startedAt: new Date(date.setHours(0,0,0,0)).getTime(),
      completedAt: new Date(date.setHours(23,59,59,999)).getTime(),
      exercises: exercises.map(ex => ({ ...ex })),
    };
    await addWorkout(workout);
    location.reload(); // Reload to reflect changes
  };

  // Add pulsate animation keyframes
  const pulsate = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(237, 137, 54, 0.7); }
    70% { box-shadow: 0 0 0 8px rgba(237, 137, 54, 0); }
    100% { box-shadow: 0 0 0 0 rgba(237, 137, 54, 0); }
  `;

  return (
    <Box mt={6} mb={2}>
      <Flex align="center" justify="center" mb={2} alignItems='center'>
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color={streakTextColor}
          mr={2}
          display="flex"
          alignItems="center"
          sx={{
            textShadow: isGrayed
              ? undefined
              : '0 0 16px #FFD600, 0 0 32px #FFA500, 0 0 48px #FF9100, 0 0 64px #FF9100',
            filter: isGrayed ? 'grayscale(1)' : undefined,
          }}
        >
          <span
            role="img"
            aria-label="flame"
            style={{
              color: flameColor,
              fontSize: '1.5em',
              marginRight: 6,
              filter: isGrayed ? 'grayscale(1)' : undefined,
              textShadow: isGrayed
                ? undefined
                : '0 0 8px #FFD600, 0 0 16px #FFA500, 0 0 32px #FF9100',
              verticalAlign: 'middle',
            }}
          >
            🔥
          </span>
          <span style={{
            display: 'inline-block',
            background: isGrayed
              ? undefined
              : 'linear-gradient(90deg, #FFD600 0%, #FF9100 60%, #FF3C00 100%)',
            backgroundClip: isGrayed ? undefined : 'text',
            color: isGrayed ? streakTextColor : 'transparent',
            textShadow: isGrayed
              ? undefined
              : '0 0 24px #FFD600, 0 0 48px #FFA500, 0 0 96px #FF9100, 0 0 128px #FF9100',
            filter: isGrayed ? 'grayscale(1)' : undefined,
            fontWeight: 900,
            fontSize: '1.3em',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>{streak}</span>
        </Text>
        <Text color={streakTextColor} fontWeight="medium">day streak</Text>
        {isPending && (
          <Flex align="center" ml={3} color={useColorModeValue('#E53E3E', '#F56565')} fontWeight="semibold" fontSize="sm">
            <FaExclamationTriangle style={{ marginRight: 4 }} />
            Expiring today
          </Flex>
        )}
      </Flex>
      <Box display="flex" flexDirection="column" alignItems="center" bg={cardBg} borderRadius="lg" p={3} boxShadow="md">
        {/* Month navigator */}
        <Flex align="center" justify="space-between" w="100%" mb={2}>
          <IconButton
            aria-label="Previous month"
            icon={<ChevronLeftIcon boxSize={5} />}
            size="sm"
            variant="ghost"
            borderRadius="full"
            _hover={{ bg: navHoverBg }}
            onClick={() => setViewDate((d) => subMonths(d, 1))}
          />
          <Text
            fontSize="sm"
            fontWeight="bold"
            cursor={isCurrentMonthView ? 'default' : 'pointer'}
            onClick={() => !isCurrentMonthView && setViewDate(startOfMonth(new Date()))}
            title={isCurrentMonthView ? undefined : 'Jump to current month'}
          >
            {format(viewDate, 'MMMM yyyy')}
          </Text>
          <IconButton
            aria-label="Next month"
            icon={<ChevronRightIcon boxSize={5} />}
            size="sm"
            variant="ghost"
            borderRadius="full"
            _hover={{ bg: navHoverBg }}
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            isDisabled={isCurrentMonthView}
          />
        </Flex>
        {/* Day labels */}
        <Flex mb={1} gap={0}>
          {DAYS_OF_WEEK.map((day, i) => (
            <Box
              key={i}
              w={8}
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
            {week.map(({ date, isCurrentMonth, streakDay }, dayIdx) => {
              const isToday = date.toDateString() === todayStr;
              const isFuture = date > today;
              const isStreak = streakDay?.inStreak;
              const isCompleted = streakDay?.completed;
              // Today's not-yet-done cell should read as neutral/pending, not a miss —
              // independent of the whole-calendar `status === 'pending'` flag, which is
              // only true when today continues an existing streak (see getStreakInfo).
              const isTodayPendingCell = isToday && !isCompleted && !isFuture && !!streakDay && !streakDay.rest;
              // Styling for all cases
              const bg = isFuture ? bgFuture : isStreak ? bgActive : bgInactive;
              const bgColor = isFuture ? futureBgColor : isStreak ? bgActiveColor : bgInactiveColor;
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
              const canLog = isCurrentMonth && !!findRoutineForDay(routines, getDayOfWeek(date));
              // Outer box: no margin between days
              return (
                <Box
                  key={dayIdx}
                  w={8}
                  h={8}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  opacity={isCurrentMonth ? 1 : 0.35}
                  title={date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  onClick={() => handleDayClick(date, isCurrentMonth)}
                  cursor={canLog ? 'pointer' : undefined}
                >
                  {/* Inner pill/dot for all days, style toggled by state */}
                  {(!isCompleted && !isPending && !isTodayPendingCell && !isFuture && streakDay && !streakDay.rest) ? (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      w={isStreak && !isFuture ? '100%' : '60%'}
                      h={isStreak && !isFuture ? '100%' : '60%'}
                      position="relative"
                      zIndex={isStreak ? 1 : 0}
                    >
                      <FaTimes
                        size={22}
                        color={bgColor}
                      />
                    </Box>
                  ) : (
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
                      color={bgColor}
                      fontWeight="bold"
                      fontSize="md"
                      boxShadow={isStreak && !isFuture ? 'md' : undefined}
                      opacity={isFuture ? 0.3 : 1}
                      position="relative"
                      zIndex={isStreak && isCompleted ? 1 : 0}
                    >
                      {isCompleted && !isFuture && (
                        <CheckIcon
                          boxSize={isStreak ? 5 : 4}
                          color={isStreak ? 'white' : 'gray.300'}
                          sx={isStreak ? { filter: 'drop-shadow(0 0 6px #FFD600) drop-shadow(0 0 12px #FFD600)' } : undefined}
                        />
                      )}
                      {(isPending || isTodayPendingCell) && isToday && (
                        <Box
                          position="absolute"
                          top="50%"
                          left="50%"
                          transform="translate(-50%, -50%)"
                          w={isStreak && !isFuture ? '80%' : '65%'}
                          h={isStreak && !isFuture ? '80%' : '65%'}
                          borderRadius="9999px"
                          bg={pendingDotBg}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          boxShadow={isStreak ? '0 0 6px #FFD600' : undefined}
                          animation={`${pulsate} 1.5s infinite`}
                        />
                      )}
                    </Box>
                  )}
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
