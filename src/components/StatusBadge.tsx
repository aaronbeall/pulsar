import React from 'react';
import { Circle, Box, usePrefersReducedMotion } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaCheck, FaSpinner } from 'react-icons/fa';
import { WorkoutStatus } from '../utils/workoutUtils';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface StatusBadgeProps {
  status: WorkoutStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const spinAnimation = prefersReducedMotion
    ? undefined
    : `${spin} 2s linear infinite`;

  if (status === 'not started') {
    return null;
  }

  return (
    <Circle
      size="20px"
      position="absolute"
      top="-4px"
      right="-4px"
      bg={status === 'completed' ? 'green.500' : 'blue.500'}
      color="white"
      boxShadow="0px 0px 4px rgba(0, 0, 0, 0.2)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transform="scale(0.8)"
    >
      {status === 'completed' ? (
        <FaCheck size="12px" />
      ) : (
        <Box as={FaSpinner} size="12px" animation={spinAnimation} />
      )}
    </Circle>
  );
};

export default StatusBadge;