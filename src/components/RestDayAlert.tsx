import React from 'react';
import { Box, Flex, Alert, AlertTitle, AlertDescription, Button } from '@chakra-ui/react';
import { FaBed, FaChevronRight } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { getTodayDayOfWeek } from '../utils/workoutUtils';

const RestDayAlert: React.FC = () => {
  return (
    <Alert
      status="info"
      variant="subtle"
      borderRadius="md"
      mb={4}
      p={4}
      bg="transparent"
      opacity={0.9}
      _dark={{ bg: 'transparent' }}
      justifyContent="center"
    >
      <Box fontSize="3em" mr={3} color="gray.500">
        <FaBed />
      </Box>
      <Flex direction="column" align="start">
        <AlertTitle fontSize="lg" fontWeight="medium" color="gray.600" _dark={{ color: 'gray.300' }}>
          Rest Day
        </AlertTitle>
        <AlertDescription fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }}>
          Take it easy today - your next workout is coming up soon!
        </AlertDescription>
        <Button
          as={RouterLink}
          to={`/workout/rest/${getTodayDayOfWeek()}`}
          size="sm"
          variant="link"
          colorScheme="purple"
          mt={2}
          minH="32px"
          rightIcon={<FaChevronRight />}
        >
          Rest day tips
        </Button>
      </Flex>
    </Alert>
  );
};

export default RestDayAlert;
