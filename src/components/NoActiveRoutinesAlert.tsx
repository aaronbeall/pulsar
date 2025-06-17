import React from 'react';
import { Box, Button, Flex, Alert, AlertTitle, AlertDescription, SlideFade } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaRegLightbulb, FaPlus } from 'react-icons/fa';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

interface NoActiveRoutinesAlertProps {
  onCreate: () => void;
  onStartRoutine: () => void;
}

const NoActiveRoutinesAlert: React.FC<NoActiveRoutinesAlertProps> = ({ onCreate, onStartRoutine }) => {
  return (
    <SlideFade in={true} offsetY="20px">
      <Alert
        status="warning"
        variant="solid"
        borderRadius="xl"
        mb={6}
        p={8}
        bgGradient="linear(to-r, yellow.200, orange.300)"
        boxShadow="xl"
        justifyContent="flex-start"
        alignItems="center"
      >
        <Box
          fontSize="5em"
          mr={6}
          animation={`${pulse} 2.2s ease-in-out infinite`}
          color="yellow.500"
          display="flex"
          alignItems="center"
        >
          <FaRegLightbulb />
        </Box>
        <Flex direction="column" align="start" flex={1}>
          <AlertTitle fontSize="2xl" fontWeight="extrabold" mb={2} color="yellow.900">
            No active routines
          </AlertTitle>
          <AlertDescription fontSize="lg" mb={6} color="yellow.800">
            Start an existing routine or create a new one to begin tracking your workouts.
          </AlertDescription>
          <Flex gap={3}>
            <Button
              size="lg"
              colorScheme="yellow"
              variant="solid"
              fontWeight="bold"
              onClick={onStartRoutine}
            >
              Start a Routine
            </Button>
            <Button
              size="lg"
              colorScheme="blue"
              leftIcon={<FaPlus />}
              fontWeight="bold"
              onClick={onCreate}
            >
              Create New Routine
            </Button>
          </Flex>
        </Flex>
      </Alert>
    </SlideFade>
  );
};

export default NoActiveRoutinesAlert;
