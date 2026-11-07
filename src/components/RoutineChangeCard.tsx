import React from 'react';
import { Badge, Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { FaBed, FaCalendarDay, FaCheck, FaTimes } from 'react-icons/fa';
import { RoutineChange } from '../models/types';

interface RoutineChangeCardProps {
  change: RoutineChange;
  onAccept: () => void;
  onReject: () => void;
}

// Renders inline under an ai chat message that proposes a routine change: a compact
// per-day diff (which days are changing, and how), plus Accept/Reject when still pending.
const RoutineChangeCard: React.FC<RoutineChangeCardProps> = ({ change, onAccept, onReject }) => {
  const cardBg = useColorModeValue('cyan.50', 'cyan.900');
  const cardBorder = useColorModeValue('cyan.200', 'cyan.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const dayOps = change.patch.dailySchedule || [];
  const hasDescriptionChange = change.patch.description !== undefined;

  if (dayOps.length === 0 && !hasDescriptionChange) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor={cardBorder}
      bg={cardBg}
      borderRadius="lg"
      p={3}
      fontSize="sm"
      opacity={change.status === 'rejected' ? 0.6 : 1}
    >
      <Flex direction="column" gap={1} mb={2}>
        {dayOps.map((op, i) => (
          <Flex key={i} align="center" gap={2}>
            <Box as={op.op === 'clearDay' ? FaBed : FaCalendarDay} color="cyan.500" boxSize={3} flexShrink={0} />
            <Text fontWeight="bold">{op.day}</Text>
            {op.op === 'clearDay' ? (
              <Badge colorScheme="gray">Rest day</Badge>
            ) : (
              <Text color={mutedColor} noOfLines={1}>
                {op.kind ? `${op.kind} — ` : ''}{op.exercises.length} exercise{op.exercises.length === 1 ? '' : 's'}
              </Text>
            )}
          </Flex>
        ))}
        {hasDescriptionChange && (
          <Text fontSize="xs" color={mutedColor} fontStyle="italic">Also updates the routine description</Text>
        )}
      </Flex>

      {change.status === 'pending' ? (
        <Flex gap={2}>
          <Button size="xs" colorScheme="cyan" leftIcon={<FaCheck />} onClick={onAccept}>
            Accept
          </Button>
          <Button size="xs" variant="ghost" colorScheme="gray" leftIcon={<FaTimes />} onClick={onReject}>
            Reject
          </Button>
        </Flex>
      ) : (
        <Badge colorScheme={change.status === 'accepted' ? 'green' : 'gray'}>
          {change.status === 'accepted' ? 'Accepted' : 'Rejected'}
        </Badge>
      )}
    </Box>
  );
};

export default React.memo(RoutineChangeCard);
