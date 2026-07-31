import React from 'react';
import { Box, Icon, Text, useColorModeValue } from '@chakra-ui/react';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
      <Icon as={icon} boxSize={5} color={color} mb={2} />
      <Text fontSize="2xl" fontWeight="extrabold" lineHeight={1}>
        {value}
      </Text>
      <Text fontSize="xs" color={mutedColor} fontWeight="medium">
        {label}
      </Text>
    </Box>
  );
};

export default React.memo(StatCard);
