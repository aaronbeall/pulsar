import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Heading, Text, Button, HStack, Tag, IconButton, Menu, MenuButton, MenuList, MenuItem, useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from '@chakra-ui/react';
import { Routine } from '../models/types';
import { DAYS_OF_WEEK } from '../constants/days';
import { FaThumbsUp, FaThumbsDown, FaEllipsisV, FaStar, FaExchangeAlt, FaTrash, FaShare } from 'react-icons/fa';

interface RoutineCardProps {
  routine: Routine;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ routine }) => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  return (
    <Card width="100%" variant={routine.active ? "elevated" : "outline"} borderRadius="md">
      <CardHeader>
        <HStack spacing={2} wrap="wrap">
          <Heading size="md">{routine.name}</Heading>
          {DAYS_OF_WEEK.filter(day => 
            routine.dailySchedule.some(schedule => schedule.day === day)
          ).map(day => (
            <Tag key={day} size="sm" colorScheme="cyan" variant="subtle">
              {day.slice(0, 3)}
            </Tag>
          ))}
        </HStack>
      </CardHeader>
      <CardBody>
        <Text fontSize="sm" color={routine.active ? undefined : "gray.600"} mb={4}>
          {routine.description}
        </Text>
        <HStack justify="space-between">
          <HStack>
            <IconButton
              aria-label="Like routine"
              icon={<FaThumbsUp />}
              size="sm"
              variant="ghost"
            />
            <IconButton
              aria-label="Dislike routine"
              icon={<FaThumbsDown />}
              size="sm"
              variant="ghost"
            />
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="More options"
                icon={<FaEllipsisV />}
                size="sm"
                variant="ghost"
              />
              <MenuList>
                <MenuItem icon={<FaExchangeAlt />}>Switch to this routine</MenuItem>
                <MenuItem icon={<FaStar />}>Add to favorites</MenuItem>
                <MenuItem icon={<FaShare />}>Share routine</MenuItem>
                <MenuItem icon={<FaTrash />} color="red.500" onClick={onOpen}>
                  Delete routine
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
          <Button
            size="sm"
            colorScheme="cyan"
            onClick={() => navigate(`/workout/routine/${routine.id}`)}
          >
            View Routine
          </Button>
        </HStack>

        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader>Delete Routine</AlertDialogHeader>
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
