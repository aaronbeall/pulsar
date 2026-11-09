import React, { useMemo, useState } from 'react';
import { Box, Flex, Icon, IconButton, SimpleGrid, Text, useColorModeValue, useToken } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FaTimes } from 'react-icons/fa';
import { Routine, Workout } from '../models/types';
import { getYearActivity } from '../utils/workoutUtils';
import DaySheet, { useDaySheet } from './DaySheet';

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
  const [year, setYear] = useState(currentYear);

  const daySheet = useDaySheet();
  const activity = useMemo(() => getYearActivity(year, workouts, routines), [year, workouts, routines]);

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
            <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" columnGap="1px" rowGap="1px" justifyItems="center">
              {Array.from({ length: leadingBlanks(monthIdx) }, (_, i) => (
                <Box key={`blank-${i}`} h="12px" />
              ))}
              {Array.from({ length: daysInMonth(monthIdx) }, (_, dayIdx) => {
                const date = new Date(year, monthIdx, dayIdx + 1);
                const day = activity[date.toDateString()];
                if (!day) return <Box key={dayIdx} h="12px" />;
                const isToday = date.toDateString() === new Date().toDateString();
                const isMissed = !day.future && !day.rest && !day.completed;
                const title = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${
                  day.future ? (day.rest ? '' : ' · planned') : day.completed ? ' · workout done' : day.rest ? ' · rest' : ' · missed'
                }`;
                const ringShadow = isToday ? `0 0 0 1.5px ${todayRingColor}` : undefined;

                const open = () => daySheet.openDay(date);
                const cell = (dot: React.ReactNode) => (
                  <Flex
                    key={dayIdx}
                    as="button"
                    w="100%"
                    h="12px"
                    align="center"
                    justify="center"
                    title={title}
                    aria-label={title}
                    onClick={open}
                  >
                    {dot}
                  </Flex>
                );

                if (isMissed) {
                  return cell(
                    <Flex
                      boxSize="7px"
                      align="center"
                      justify="center"
                      borderRadius="full"
                      opacity={0.55}
                      boxShadow={ringShadow}
                    >
                      <Icon as={FaTimes} boxSize="10px" color={missedColor} />
                    </Flex>
                  );
                }
                const planned = day.future && !day.rest;
                return cell(
                  <Box
                    boxSize="7px"
                    borderRadius="full"
                    bg={day.future ? 'transparent' : day.completed ? completedColor : restColor}
                    border={day.future ? '1px solid' : undefined}
                    borderColor={day.future ? (planned ? completedColor : futureColor) : undefined}
                    opacity={day.future ? (planned ? 0.8 : 0.35) : day.completed ? 1 : 0.55}
                    boxShadow={ringShadow}
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
        <LegendItem label="Planned">
          <Box boxSize="8px" borderRadius="full" bg="transparent" border="1px solid" borderColor={completedColor} opacity={0.8} />
        </LegendItem>
      </Flex>
      <DaySheet workouts={workouts} routines={routines} />
    </Box>
  );
};

export default YearActivityCalendar;
