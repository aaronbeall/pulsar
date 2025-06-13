import { Badge, Box } from '@chakra-ui/react';
import { FaEdit } from 'react-icons/fa';
import React from 'react';

// Presentational badge for routine kind or rest day
export const DayKindBadge: React.FC<{
  kind?: string;
  onClick?: () => void;
  editable?: boolean;
  variant?: 'default' | 'rest';
}> = ({ kind, onClick, editable, variant = 'default' }) => {
  const isRest = variant === 'rest';
  return (
    <Badge
      colorScheme={isRest ? undefined : kind ? 'cyan' : undefined}
      fontSize="0.8em"
      ml={2}
      px={2}
      py={0.5}
      bg={isRest ? 'gray.100' : !kind ? 'gray.50' : undefined}
      color={isRest ? 'gray.600' : !kind ? 'gray.400' : undefined}
      _dark={isRest ? { bg: 'gray.800', color: 'gray.500' } : !kind ? { bg: 'gray.900', color: 'gray.500' } : undefined}
      cursor={editable && !isRest ? 'pointer' : undefined}
      onClick={editable && !isRest ? onClick : undefined}
      display="flex"
      alignItems="center"
      borderStyle={!kind && !isRest ? 'dashed' : undefined}
      borderColor={!kind && !isRest ? 'gray.300' : undefined}
    >
      {isRest ? 'Rest day' : (kind || 'Add label...')}
      {!isRest && editable && <Box as={FaEdit} ml={1} fontSize="0.8em" opacity={0.5} />}
    </Badge>
  );
};

export default DayKindBadge;
