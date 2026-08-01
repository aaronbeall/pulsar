import React from 'react';
import { Box, Flex, Icon, IconButton, SimpleGrid, Text, useColorModeValue, useToken } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FaTimes } from 'react-icons/fa';
import { Routine, Workout } from '../models/types';
import { getYearActivity } from '../utils/workoutUtils';

interface YearActivityCalendarProps {
  workouts: Workout[];
  routines: Routine[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LegendItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const textColor = useColorModeValue('gray.600', 'gray.400');
  return (
    <Flex align="center" gap={1.5}>
      <Flex align="center" justify="center" boxSize="10px" flexShrink={0}>
        {children}
      </Flex>
      <Text fontSize="xs" color={textColor}>{label}</Text>
    </Flex>
  );
};

const YearActivityCalendar: React.FC<YearActivityCalendarProps> = ({ workouts, routines }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(currentYear);

  const activity = React.useMemo(() => getYearActivity(year, workouts, routines), [year, workouts, routines]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const navHoverBg = useColorModeValue('gray.100', 'gray.700');
  const monthLabelColor = useColorModeValue('gray.500', 'gray.400');
  const completedColor = 'green.400';
  const restColor = useColorModeValue('gray.300', 'gray.600');
  const missedColor = restColor;
  const futureColor = useColorModeValue('gray.300', 'gray.600');
  const [todayRingColor] = useToken('colors', [useColorModeValue('cyan.500', 'cyan.300')]);

  // How many days are in each month of the viewed year (handles leap Februarys).
  const daysInMonth = (monthIdx: number) => new Date(year, monthIdx + 1, 0).getDate();
  // Day-of-week (0=Sun) that the 1st of the month falls on, so dots align into weekday columns.
  const leadingBlanks = (monthIdx: number) => new Date(year, monthIdx, 1).getDay();

  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
      <Flex align="center" justify="space-between" mb={3}>
        <IconButton
          aria-label="Previous year"
          icon={<ChevronLeftIcon boxSize={5} />}
          size="sm"
          variant="ghost"
          borderRadius="full"
          _hover={{ bg: navHoverBg }}
          onClick={() => setYear(y => y - 1)}
        />
        <Text fontWeight="bold" fontSize="sm">
          {year} Activity
        </Text>
        <IconButton
          aria-label="Next year"
          icon={<ChevronRightIcon boxSize={5} />}
          size="sm"
          variant="ghost"
          borderRadius="full"
          _hover={{ bg: navHoverBg }}
          onClick={() => setYear(y => y + 1)}
          isDisabled={year >= currentYear}
        />
      </Flex>

      {/* One mini calendar per month, dots aligned into weekday columns via a 7-col grid */}
      <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={4} mb={4}>
        {MONTH_NAMES.map((label, monthIdx) => (
          <Box key={label}>
            <Text fontSize="10px" fontWeight="bold" color={monthLabelColor} mb={1}>
              {label}
            </Text>
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap="3px" justifyItems="center">
              {Array.from({ length: leadingBlanks(monthIdx) }, (_, i) => (
                <Box key={`blank-${i}`} boxSize="7px" />
              ))}
              {Array.from({ length: daysInMonth(monthIdx) }, (_, dayIdx) => {
                const date = new Date(year, monthIdx, dayIdx + 1);
                const day = activity[date.toDateString()];
                if (!day) return <Box key={dayIdx} boxSize="7px" />;
                const isToday = date.toDateString() === new Date().toDateString();
                const isMissed = !day.future && !day.rest && !day.completed;
                const title = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${
                  day.future ? ' · upcoming' : day.completed ? ' · workout done' : day.rest ? ' · rest' : ' · missed'
                }`;
                const ringShadow = isToday ? `0 0 0 1.5px ${todayRingColor}` : undefined;

                if (isMissed) {
                  return (
                    <Flex
                      key={dayIdx}
                      boxSize="7px"
                      align="center"
                      justify="center"
                      borderRadius="full"
                      opacity={0.55}
                      boxShadow={ringShadow}
                      title={title}
                    >
                      <Icon as={FaTimes} boxSize="10px" color={missedColor} />
                    </Flex>
                  );
                }
                return (
                  <Box
                    key={dayIdx}
                    boxSize="7px"
                    borderRadius="full"
                    bg={day.future ? 'transparent' : day.completed ? completedColor : restColor}
                    border={day.future ? '1px solid' : undefined}
                    borderColor={day.future ? futureColor : undefined}
                    opacity={day.future ? 0.5 : day.completed ? 1 : 0.55}
                    boxShadow={ringShadow}
                    title={title}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </SimpleGrid>

      <Flex gap={4} wrap="wrap">
        <LegendItem label="Workout">
          <Box boxSize="8px" borderRadius="full" bg={completedColor} />
        </LegendItem>
        <LegendItem label="Missed">
          <Icon as={FaTimes} boxSize="10px" color={missedColor} opacity={0.55} />
        </LegendItem>
        <LegendItem label="Rest">
          <Box boxSize="8px" borderRadius="full" bg={restColor} opacity={0.55} />
        </LegendItem>
        <LegendItem label="Upcoming">
          <Box boxSize="8px" borderRadius="full" bg="transparent" border="1px solid" borderColor={futureColor} opacity={0.5} />
        </LegendItem>
      </Flex>
    </Box>
  );
};

export default YearActivityCalendar;
