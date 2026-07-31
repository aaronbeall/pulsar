import React from 'react';
import { Box, Flex, Heading, Icon, useColorModeValue } from '@chakra-ui/react';

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, children }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
      <Flex align="center" gap={2} mb={4}>
        <Icon as={icon} color="cyan.500" />
        <Heading size="sm">{title}</Heading>
      </Flex>
      {children}
    </Box>
  );
};

export default React.memo(SectionCard);
