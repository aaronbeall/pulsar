import React from 'react';
import { Box, Flex, Alert, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { FaBed } from 'react-icons/fa';

const RestDayAlert: React.FC = () => {
  return (
    <Alert 
      status="info" 
      variant="subtle" 
      borderRadius="md" 
      mb={4} 
      p={4}
      bg="transparent"
      opacity={0.8}
      _dark={{ bg: 'transparent' }}
      justifyContent="center"
    >
      <Box fontSize="3em" mr={3} color="gray.500">
        <FaBed />
      </Box>
      <Flex direction="column">
        <AlertTitle fontSize="lg" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.300' }}>
          Rest Day
        </AlertTitle>
        <AlertDescription fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }}>
          Take it easy today - your next workout is coming up soon!
        </AlertDescription>
      </Flex>
    </Alert>
  );
};

export default RestDayAlert;
