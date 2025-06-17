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
  VStack,
  Flex,
  useToast,
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
  FaChartLine,
  FaLayerGroup,
  FaTimesCircle,
} from 'react-icons/fa';
import { usePulsarStore } from '../store/pulsarStore';
import SwitchRoutineDialog from './SwitchRoutineDialog';

interface RoutineCardProps {
  routine: Routine;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ routine }) => {
  const navigate = useNavigate();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure();
  const deleteCancelRef = React.useRef<HTMLButtonElement>(null);
  const removeRoutine = usePulsarStore(s => s.removeRoutine);
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const toast = useToast();
  const [showSwitchConfirm, setShowSwitchConfirm] = React.useState(false);
  const [favoriteLoading, setFavoriteLoading] = React.useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const activeTagColor = useColorModeValue('cyan.50', 'cyan.900');
  const activeTagTextColor = useColorModeValue('cyan.800', 'cyan.100');
  const statsColor = useColorModeValue('gray.600', 'gray.400');

  const totalExercises = routine.dailySchedule.reduce(
    (sum, day) => sum + day.exercises.length,
    0
  );

  const handleDelete = async () => {
    await removeRoutine(routine.id);
    toast({
      title: 'Routine deleted',
      description: `${routine.name} has been removed.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
    onDeleteClose();
  };

  return (
    <Card
      width="100%"
      variant={routine.active ? "elevated" : "outline"}
      borderRadius="xl"
      bg={bgColor}
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px) scale(1.01)',
        boxShadow: '2xl',
        cursor: 'pointer',
        borderColor: 'cyan.400',
        borderWidth: '2px',
        bg: routine.active ? useColorModeValue('cyan.50', 'gray.700') : useColorModeValue('gray.50', 'gray.800'),
        filter: 'brightness(1.03)',
      }}
      overflow="visible"
      onClick={e => {
        // Only navigate if the click target is not a button or inside a button (but allow the card itself)
        if (
          e.target instanceof HTMLElement &&
          (e.target === e.currentTarget || !e.target.closest('button, [role="button"]'))
        ) {
          navigate(`/workout/routine/${routine.id}`);
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={`View details for ${routine.name}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/workout/routine/${routine.id}`);
        }
      }}
    >
      <CardHeader pb={2}>
        <VStack align="stretch" spacing={3}>
          <Flex justify="space-between" align="flex-start">
            <VStack align="start" spacing={1}>
              <Heading
                size="md"
                color={routine.active ? 'cyan.500' : 'gray.400'}
                _hover={{ color: 'cyan.500' }}
                transition="color 0.2s"
                cursor="pointer"
                onClick={() => navigate(`/workout/routine/${routine.id}`)}
                display="flex"
                alignItems="center"
                gap={2}
              >
                {routine.name}
                {routine.favorite && (
                  <Box as="span" color="yellow.400" ml={1} fontSize="1.1em" title="Favorite">
                    <FaStar />
                  </Box>
                )}
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
            </VStack>

            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
                color={iconColor}
                _hover={{ bg: 'gray.100', color: 'cyan.500' }}
                _dark={{ _hover: { bg: 'gray.700' } }}
              />
              <MenuList shadow="lg">
                {!routine.active && (
                  <MenuItem
                    icon={<FaExchangeAlt />}
                    color="cyan.500"
                    _hover={{ bg: 'cyan.50' }}
                    _dark={{ _hover: { bg: 'cyan.900' } }}
                    onClick={() => setShowSwitchConfirm(true)}
                  >
                    Switch to this routine
                  </MenuItem>
                )}
                <MenuItem
                  icon={<FaStar />}
                  color={routine.favorite ? 'yellow.500' : 'gray.400'}
                  _hover={{ bg: 'yellow.50' }}
                  _dark={{ _hover: { bg: 'yellow.900' } }}
                  onClick={async () => {
                    setFavoriteLoading(true);
                    await updateRoutine({ ...routine, favorite: !routine.favorite });
                    setFavoriteLoading(false);
                    toast({
                      title: routine.favorite ? 'Removed from favorites' : 'Added to favorites',
                      description: routine.favorite
                        ? `${routine.name} was removed from your favorites.`
                        : `${routine.name} was added to your favorites!`,
                      status: 'success',
                      duration: 1800,
                      isClosable: true,
                    });
                  }}
                  isDisabled={favoriteLoading}
                >
                  {routine.favorite ? 'Remove from favorites' : 'Add to favorites'}
                </MenuItem>
                <MenuItem
                  icon={<FaShare />}
                  _hover={{ bg: 'gray.50' }}
                  _dark={{ _hover: { bg: 'gray.700' } }}
                >
                  Share routine
                </MenuItem>
                <MenuItem
                  icon={<FaTrash />}
                  color="red.500"
                  _hover={{ bg: 'red.50' }}
                  _dark={{ _hover: { bg: 'red.900' } }}
                  onClick={onDeleteOpen}
                >
                  Delete routine
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>

          <HStack spacing={2} wrap="wrap">
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
        </VStack>
      </CardHeader>

      <CardBody>
        <VStack align="stretch" spacing={4}>
          <Text
            fontSize="sm"
            color={routine.active ? undefined : "gray.500"}
            noOfLines={2}
          >
            {routine.description}
          </Text>

          <HStack spacing={4} color={statsColor} fontSize="sm">
            <Flex align="center" gap={2}>
              <FaChartLine />
              <Text>{totalExercises} exercises</Text>
            </Flex>
          </HStack>

          <HStack justify="space-between">
            <HStack spacing={1}>
              <Tooltip label="Like routine" hasArrow>
                <IconButton
                  aria-label="Like routine"
                  icon={<FaThumbsUp />}
                  size="sm"
                  variant="ghost"
                  color={routine.liked ? "cyan.500" : iconColor}
                  _hover={{ color: "cyan.500", bg: "cyan.50" }}
                  _dark={{ _hover: { bg: "cyan.900" } }}
                />
              </Tooltip>
              <Tooltip label="Dislike routine" hasArrow>
                <IconButton
                  aria-label="Dislike routine"
                  icon={<FaThumbsDown />}
                  size="sm"
                  variant="ghost"
                  color={routine.disliked ? "red.500" : iconColor}
                  _hover={{ color: "red.500", bg: "red.50" }}
                  _dark={{ _hover: { bg: "red.900" } }}
                />
              </Tooltip>
            </HStack>
          </HStack>
        </VStack>

        <AlertDialog
          isOpen={isDeleteOpen}
          leastDestructiveRef={deleteCancelRef}
          onClose={onDeleteClose}
          isCentered
        >
          <AlertDialogOverlay>
            <AlertDialogContent borderRadius="xl">
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Delete Routine
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to delete {routine.name}? This action cannot be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={deleteCancelRef} onClick={onDeleteClose} leftIcon={<FaTimesCircle />} variant="ghost">
                  Cancel
                </Button>
                <Button colorScheme="red" ml={3} onClick={handleDelete} leftIcon={<FaTrash />}>
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
        {/* Switch routine confirmation dialog */}
        <SwitchRoutineDialog
          isOpen={showSwitchConfirm}
          onClose={() => setShowSwitchConfirm(false)}
          routine={routine}
        />
      </CardBody>
    </Card>
  );
};

export default RoutineCard;
