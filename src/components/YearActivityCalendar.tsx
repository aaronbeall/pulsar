import React from 'react';
import { Box, Flex, Icon, IconButton, Text, useColorModeValue, useToken } from '@chakra-ui/react';
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

      <Flex direction="column" gap={1.5} mb={4}>
        {MONTH_NAMES.map((label, monthIdx) => (
          <Flex key={label} align="center" gap={2}>
            <Text w="26px" flexShrink={0} fontSize="10px" fontWeight="bold" color={monthLabelColor}>
              {label}
            </Text>
            <Flex gap="3px" wrap="wrap" flex={1}>
              {Array.from({ length: daysInMonth(monthIdx) }, (_, dayIdx) => {
                const date = new Date(year, monthIdx, dayIdx + 1);
                const day = activity[date.toDateString()];
                if (!day) return null;
                const isToday = date.toDateString() === new Date().toDateString();
                const isMissed = !day.future && !day.rest && !day.completed;
                const title = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${
                  day.future ? ' · upcoming' : day.rest ? ' · rest' : day.completed ? ' · workout done' : ' · missed'
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
                    bg={day.future ? 'transparent' : day.rest ? restColor : completedColor}
                    border={day.future ? '1px solid' : undefined}
                    borderColor={day.future ? futureColor : undefined}
                    opacity={day.future ? 0.5 : day.rest ? 0.55 : 1}
                    boxShadow={ringShadow}
                    title={title}
                  />
                );
              })}
            </Flex>
          </Flex>
        ))}
      </Flex>

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
