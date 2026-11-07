import React, { useState, useEffect } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { formatDistanceToNow, format, formatDistance } from 'date-fns';
import { formatSeconds } from '../utils/setProgress';

interface TimeElapsedProps {
  startTime: number;
  endTime?: number;
  /** Time spent in sets / resting between them, once any set is done (seconds). */
  exerciseSec?: number;
  restSec?: number;
}

const TimeElapsed: React.FC<TimeElapsedProps> = ({ startTime, endTime, exerciseSec, restSec }) => {
  const [elapsedTime, setElapsedTime] = useState<string>('');

  useEffect(() => {
    if (endTime) {
      setElapsedTime(formatDistance(startTime, endTime));
      return;
    }
    setElapsedTime(formatDistanceToNow(startTime));
    const timer = setInterval(() => {
      setElapsedTime(formatDistanceToNow(startTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  return (
    <Box 
      p={3} 
      borderRadius="lg" 
      bg="whiteAlpha.200" 
      borderWidth="1px" 
      borderColor="gray.200"
      _dark={{
        bg: "blackAlpha.200",
        borderColor: "gray.700"
      }}
    >
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} mb={1}>
        {format(startTime, 'EEEE, MMM d • h:mm a')}
      </Text>
      <Text fontSize="lg" fontWeight="bold" color="cyan.500">
        {elapsedTime}
      </Text>
      {!!exerciseSec && (
        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }} mt={1}>
          Exercise {formatSeconds(exerciseSec)} · Rest {formatSeconds(restSec ?? 0)}
        </Text>
      )}
    </Box>
  );
};

export default TimeElapsed;