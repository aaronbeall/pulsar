import React from 'react';
import { Badge, Box, Flex, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { FaCalendarAlt, FaCheckCircle, FaChevronRight, FaDumbbell, FaPowerOff, FaStar } from 'react-icons/fa';
import { RoutineTimelineEntry } from '../utils/historyStats';

interface RoutineHistoryListProps {
  entries: RoutineTimelineEntry[];
}

const RoutineHistoryList: React.FC<RoutineHistoryListProps> = ({ entries }) => {
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.100', 'gray.700');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');

  if (entries.length === 0) {
    return <Text fontSize="sm" color={mutedColor}>No routines with workout history yet.</Text>;
  }

  return (
    <VStack align="stretch" spacing={0}>
      {entries.map(({ routine, firstDate, lastDate, stats }, i) => (
        <Flex
          key={routine.id}
          as={RouterLink}
          to={`/workout/routine/${routine.id}`}
          align="center"
          gap={3}
          py={3}
          borderTopWidth={i === 0 ? 0 : '1px'}
          borderColor={rowBorder}
          _hover={{ bg: rowHoverBg }}
        >
          <Icon
            as={routine.active ? FaCheckCircle : FaPowerOff}
            color={routine.active ? 'green.400' : 'gray.400'}
            boxSize={4}
            flexShrink={0}
          />
          <Box flex={1} minW={0}>
            <Flex justify="space-between" align="start" gap={2} mb={1}>
              <Text fontWeight="bold" fontSize="sm" color={routine.active ? 'cyan.500' : 'gray.400'} noOfLines={1}>
                {routine.name}
              </Text>
              <Badge colorScheme={routine.active ? 'green' : 'gray'} flexShrink={0}>
                {routine.active ? 'Active' : 'Inactive'}
              </Badge>
            </Flex>
            <Flex align="center" gap={1} color={mutedColor} fontSize="xs" mb={1}>
              <Icon as={FaCalendarAlt} boxSize={2.5} />
              <Text>
                {format(firstDate, 'MMM d, yyyy')}
                {' — '}
                {routine.active ? 'present' : format(lastDate, 'MMM d, yyyy')}
              </Text>
            </Flex>
            <Flex align="center" gap={3} fontSize="xs" color={mutedColor}>
              <Flex align="center" gap={1}>
                <Icon as={FaDumbbell} boxSize={2.5} color="cyan.500" />
                <Text>{stats.totalCompleted} of {stats.totalStarted} completed</Text>
              </Flex>
              {stats.totalPerfect > 0 && (
                <Flex align="center" gap={1}>
                  <Icon as={FaStar} boxSize={2.5} color="yellow.400" />
                  <Text>{stats.totalPerfect} perfect</Text>
                </Flex>
              )}
            </Flex>
          </Box>
          <Icon as={FaChevronRight} boxSize={3} color={mutedColor} flexShrink={0} />
        </Flex>
      ))}
    </VStack>
  );
};

export default React.memo(RoutineHistoryList);
