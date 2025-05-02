import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Button,
  HStack,
  Tag,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useColorModeValue,
  Box,
  Tooltip,
} from '@chakra-ui/react';
import { Routine } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import {
  FaThumbsUp,
  FaThumbsDown,
  FaEllipsisV,
  FaStar,
  FaExchangeAlt,
  FaTrash,
  FaShare,
  FaArrowRight,
} from 'react-icons/fa';

interface RoutineCardProps {
  routine: Routine;
  variant?: string;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ routine, variant }) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const activeTagColor = useColorModeValue('cyan.50', 'cyan.900');
  const activeTagTextColor = useColorModeValue('cyan.800', 'cyan.100');
  
  return (
    <Card 
      width="100%" 
      variant={variant || (routine.active ? "elevated" : "outline")} 
      borderRadius="xl"
      bg={bgColor}
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'lg',
      }}
    >
      <CardHeader>
        <HStack spacing={4} wrap="wrap" justify="space-between">
          <HStack spacing={2}>
            <Heading size="md" color={routine.active ? 'cyan.500' : undefined}>
              {routine.name}
            </Heading>
            {routine.active && (
              <Tag
                size="sm"
                bg={activeTagColor}
                color={activeTagTextColor}
                fontWeight="bold"
                borderRadius="full"
              >
                Active
              </Tag>
            )}
          </HStack>
          <HStack spacing={2}>
            {DAYS_OF_WEEK.filter(day => 
              routine.dailySchedule.some(schedule => schedule.day === day)
            ).map(day => (
              <Tag 
                key={day} 
                size="sm" 
                colorScheme="cyan" 
                variant="subtle"
                borderRadius="full"
              >
                {day.slice(0, 3)}
              </Tag>
            ))}
          </HStack>
        </HStack>
      </CardHeader>
      <CardBody>
        <Text 
          fontSize="sm" 
          color={routine.active ? undefined : "gray.500"} 
          mb={4}
          noOfLines={2}
        >
          {routine.description}
        </Text>
        <HStack justify="space-between">
          <HStack spacing={1}>
            <Tooltip label="Like routine" hasArrow>
              <IconButton
                aria-label="Like routine"
                icon={<FaThumbsUp />}
                size="sm"
                variant="ghost"
                color={routine.liked ? "cyan.500" : iconColor}
                _hover={{ color: "cyan.500" }}
              />
            </Tooltip>
            <Tooltip label="Dislike routine" hasArrow>
              <IconButton
                aria-label="Dislike routine"
                icon={<FaThumbsDown />}
                size="sm"
                variant="ghost"
                color={routine.disliked ? "red.500" : iconColor}
                _hover={{ color: "red.500" }}
              />
            </Tooltip>
            <Tooltip label="More options" hasArrow>
              <Box>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="More options"
                    icon={<FaEllipsisV />}
                    size="sm"
                    variant="ghost"
                    color={iconColor}
                  />
                  <MenuList>
                    <MenuItem icon={<FaExchangeAlt />} color="cyan.500">
                      Switch to this routine
                    </MenuItem>
                    <MenuItem icon={<FaStar />} color="yellow.500">
                      Add to favorites
                    </MenuItem>
                    <MenuItem icon={<FaShare />}>Share routine</MenuItem>
                    <MenuItem icon={<FaTrash />} color="red.500" onClick={onOpen}>
                      Delete routine
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Box>
            </Tooltip>
          </HStack>
          <Button
            size="sm"
            colorScheme="cyan"
            variant="solid"
            rightIcon={<FaArrowRight />}
            onClick={() => navigate(`/workout/routine/${routine.id}`)}
            _hover={{
              transform: 'translateX(2px)',
            }}
          >
            View Details
          </Button>
        </HStack>

        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete Routine
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to delete {routine.name}? This action cannot be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                  Cancel
                </Button>
                <Button colorScheme="red" ml={3}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </CardBody>
    </Card>
  );
};

export default RoutineCard;
