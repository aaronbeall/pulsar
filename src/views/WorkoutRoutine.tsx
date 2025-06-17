import {
  Alert,
  AlertDescription,
  Badge,
  Box, // Import Switch component
  Breadcrumb, // Import Breadcrumb components
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Switch,
  Tag,
  Text,
  useDisclosure,
  VStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue
} from '@chakra-ui/react';
import { format } from 'date-fns'; // Import date-fns for formatting dates
import React, { useEffect, useState } from 'react';
import { FaEdit, FaInfoCircle, FaStar, FaTimesCircle, FaTrash, FaPowerOff, FaEllipsisV, FaChartBar, FaPlay, FaMagic, FaPlayCircle, FaTrophy, FaCheckCircle } from 'react-icons/fa'; // Import icons
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { RoutineEditor } from '../components/RoutineEditor';
import ExerciseDetailsDialog from '../components/ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import RoutineChat, { ChatMessage } from '../components/RoutineChat';
import { RoutineDisplayTable } from '../components/RoutineDisplayTable';
import { workoutPrompts } from '../constants/prompts'; // Import prompts
import { useRoutine, useRoutines, useExercises, usePulsarStore, useWorkouts } from '../store/pulsarStore';
import { Routine, Exercise, Workout } from '../models/types';
import SwitchRoutineDialog from '../components/SwitchRoutineDialog';
import { RoutineActivityDrawer } from '../components/RoutineActivityDrawer';

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>();
  const routine = useRoutine(routineId || '');
  const routines = useRoutines();
  const exercises = useExercises();
  const workouts = useWorkouts();
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const removeRoutine = usePulsarStore(s => s.removeRoutine);
  const [newResponses, setNewResponses] = useState<Routine['responses']>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayExerciseId, setDisplayExerciseId] = useState<string | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = React.useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cancelRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (routine) {
      setNewResponses(routine.responses.filter((response) => !response.dismissed));
      // Build chat history as a conversation: AI prompt, then user response, for each prompt
      const introChat: ChatMessage[] = [];
      workoutPrompts.forEach((prompt) => {
        const userVal = routine.prompts[prompt.key];
        if (userVal) {
          introChat.push({ role: 'ai', message: prompt.question });
          introChat.push({ role: 'user', message: userVal });
        }
      });
      setChatHistory([
        ...introChat,
        ...routine.responses.map(r => ({ role: 'ai' as const, message: r.response }))
      ]);
    }
  }, [routine]);

  const dismissResponse = async (index: number) => {
    if (!routine) return;
    const updatedResponses = [...routine.responses];
    const dismissedResponse = newResponses[index];
    const responseIndex = updatedResponses.findIndex((r) => r.date === dismissedResponse.date);
    if (responseIndex !== -1) {
      updatedResponses[responseIndex].dismissed = true;
    }
    const updatedRoutine = { ...routine, responses: updatedResponses };
    updateRoutine(updatedRoutine);
    setNewResponses((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove old activeRoutines usage in toggleActiveState
  const toggleActiveState = async () => {
    if (!routine) return;
    // Only show confirmation dialog if enabling and there is another active routine
    if (!routine.active && routines.some(r => r.active && r.id !== routine.id)) {
      setShowSwitchConfirm(true);
      return;
    }
    if (routine.active && routines.filter(r => r.active).length === 1) {
      setShowDeactivateConfirm(true);
      return;
    }
    const updatedRoutine = { ...routine, active: !routine.active };
    updateRoutine(updatedRoutine);
  };

  const handleDeactivateConfirm = () => {
    if (!routine) return;
    const updatedRoutine = { ...routine, active: false };
    updateRoutine(updatedRoutine);
    setShowDeactivateConfirm(false);
  };
  const handleDeactivateCancel = () => setShowDeactivateConfirm(false);

  // Save changes from EditableRoutine
  const handleSave = async (edited: Routine) => {
    updateRoutine(edited);
    setIsEditing(false);
  };

  // Revert changes from EditableRoutine
  const handleRevert = () => {
    setIsEditing(false);
  };

  const handleSwitchDialogClose = () => setShowSwitchConfirm(false);

  if (!routine) {
    return (
      <Flex align="center" justify="center" h="60vh" w="100%">
        <Box textAlign="center">
          <Spinner size="xl" color="cyan.400" thickness="4px" speed="0.7s" />
        </Box>
      </Flex>
    );
  }

  return (
    <Flex direction="column" align="center" p={4} width="100%">
      <Breadcrumb mb={4} width="100%">
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/workout">
            Workout
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Routine</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      {/* AI Chat Interface */}
      <RoutineChat chatHistory={chatHistory} setChatHistory={setChatHistory} />
      <Box width="100%" maxWidth="1200px">
        {/* Minimalistic routine status banner */}
        {routine.active && (
          <Box mb={4}>
            <RoutineStatusBanner routine={routine} />
          </Box>
        )}
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text" display="flex" alignItems="center" gap={2}>
            {routine.name}
            {routine.favorite && (
              <Box as="span" color="yellow.400" ml={1} fontSize="1.1em" title="Favorite">
                <FaStar />
              </Box>
            )}
          </Heading>
          <Flex gap={2} align="center">
            <Text fontSize="sm" color="gray.600">
              Active
            </Text>
            <Switch
              colorScheme="cyan"
              isChecked={routine.active}
              onChange={toggleActiveState}
            />
            <Button
              leftIcon={<FaEdit />} 
              colorScheme="cyan"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(isEditing ? false : true)}
            >
              Edit
            </Button>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
                aria-label="More options"
              />
              <MenuList shadow="lg">
                <MenuItem
                  icon={<FaChartBar />}
                  onClick={onOpen}
                >
                  Activity
                </MenuItem>
                <MenuItem
                  icon={<FaStar />}
                  color={routine.favorite ? 'yellow.500' : 'gray.400'}
                  onClick={async () => {
                    await updateRoutine({ ...routine, favorite: !routine.favorite });
                  }}
                >
                  {routine.favorite ? 'Remove from favorites' : 'Add to favorites'}
                </MenuItem>
                <MenuItem
                  icon={<FaTrash />}
                  color="red.500"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
        {isOpen && (
          <RoutineActivityDrawer routine={routine} workouts={workouts} isOpen={isOpen} onClose={onClose} />
        )}
        {/* Routine display table and editable routine */}
        {!isEditing && (
          <>
            <RoutineDisplayTable
              routine={routine}
              exercises={exercises}
              onShowExerciseDetails={setDisplayExerciseId}
            />
            {displayExerciseId && (
              <ExerciseDetailsDialog
                exerciseId={displayExerciseId}
                onClose={() => setDisplayExerciseId(null)}
                mode="view"
              />
            )}
          </>
        )}
        {isEditing && routine && (
          <RoutineEditor
            initialRoutine={routine}
            exercises={exercises}
            onSave={handleSave}
            onRevert={handleRevert}
          />
        )}
      </Box>
      <SwitchRoutineDialog
        isOpen={showSwitchConfirm}
        onClose={handleSwitchDialogClose}
        routine={routine}
      />
      {/* Deactivate only active routine confirmation dialog */}
      <AlertDialog
        isOpen={showDeactivateConfirm}
        leastDestructiveRef={cancelRef}
        onClose={handleDeactivateCancel}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent borderRadius="xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" display="flex" alignItems="center" gap={2}>
              <Box as={FaInfoCircle} color="red.400" fontSize="2xl" mr={2} />
              Deactivate Routine
            </AlertDialogHeader>
            <AlertDialogBody>
              This is the only active routine. Are you sure you want to deactivate it? You will not have any active routines.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleDeactivateCancel} leftIcon={<FaTimesCircle />} variant="ghost">
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeactivateConfirm} ml={3} leftIcon={<FaPowerOff />}> 
                Deactivate
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      {/* Delete routine confirmation dialog */}
      <AlertDialog
        isOpen={showDeleteConfirm}
        leastDestructiveRef={cancelRef}
        onClose={() => setShowDeleteConfirm(false)}
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
              <Button ref={cancelRef} onClick={() => setShowDeleteConfirm(false)} leftIcon={<FaTimesCircle />} variant="ghost">
                Cancel
              </Button>
              <Button colorScheme="red" ml={3} onClick={async () => { await removeRoutine(routine.id); setShowDeleteConfirm(false); }} leftIcon={<FaTrash />}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
};

// Add this component above WorkoutRoutine
const RoutineStatusBanner: React.FC<{ routine: Routine }> = ({ routine }) => {
  const workouts = usePulsarStore(s => s.workouts);
  const navigate = useNavigate();
  const today = new Date();
  const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todayWorkouts = workouts.filter(w => w.routineId === routine.id && new Date(w.startedAt).toDateString() === today.toDateString());
  const isRestDay = !routine.dailySchedule.some(d => d.day === todayDay && d.exercises.length > 0);
  const hasWorkouts = workouts.some(w => w.routineId === routine.id);

  // Use Chakra's color mode hook for theme-aware colors
  const bgIcon = useColorModeValue(isRestDay ? 'gray.100' : 'green.50', isRestDay ? 'gray.700' : 'green.800');
  const bg = useColorModeValue(isRestDay ? 'gray.50' : todayWorkouts.length > 0 ? 'green.50' : 'blue.50', isRestDay ? 'gray.800' : todayWorkouts.length > 0 ? 'green.900' : 'blue.900');
  const border = useColorModeValue(isRestDay ? 'gray.200' : todayWorkouts.length > 0 ? 'green.200' : 'blue.200', isRestDay ? 'gray.700' : todayWorkouts.length > 0 ? 'green.700' : 'blue.700');
  const todayWorkout = todayWorkouts[0];
  const isTodayComplete = !!todayWorkout && !!todayWorkout.completedAt;
  const isComplete = hasWorkouts && isTodayComplete;
  const iconColor = isRestDay
    ? useColorModeValue('gray.400', 'gray.500')
    : isComplete
      ? useColorModeValue('yellow.500', 'yellow.300')
      : 'cyan.100';
  const iconBg = isRestDay
    ? useColorModeValue('gray.100', 'gray.700')
    : isComplete
      ? useColorModeValue('yellow.200', 'orange.400')
      : useColorModeValue('cyan.600', 'blue.700');
  const textColor = isRestDay
    ? useColorModeValue('gray.600', 'gray.200')
    : useColorModeValue('white', 'blue.50');

  // Banner color logic for consistency with alerts
  const isActive = !isRestDay && !isComplete;
  const bannerBg = isRestDay
    ? bg
    : isComplete
      ? 'linear(to-r, yellow.400, orange.400)'
      : 'linear(to-r, cyan.500, blue.500)';
  const bannerBoxShadow = isComplete ? '2xl' : 'xl';

  return (
    <Flex
      p={hasWorkouts ? 4 : 3}
      borderRadius="md"
      align="center"
      justify="space-between"
      bgGradient={bannerBg}
      borderWidth={1}
      borderColor={border}
      boxShadow={bannerBoxShadow}
      gap={hasWorkouts ? undefined : 3}
    >
      <Flex align="center" gap={hasWorkouts ? 3 : 2}>
        <Box
          p={hasWorkouts ? 3 : 2}
          borderRadius="full"
          bg={iconBg}
          color={iconColor}
          boxShadow="md"
          fontSize={hasWorkouts ? undefined : 'lg'}
        >
          {isRestDay
            ? <FaPowerOff />
            : isComplete
              ? <FaChartBar />
              : todayWorkouts.length > 0 && !isTodayComplete
                ? <FaPlay />
                : <FaPlayCircle />}
        </Box>
        <Flex direction="column">
          <Text fontSize="xs" color={textColor} fontWeight="bold" letterSpacing="wide" textTransform="uppercase" mb={0.5}>
            NEXT STEPS
          </Text>
          <Text fontSize="sm" color={textColor} fontWeight="medium">
            Review, make changes
            {isRestDay
              ? ', and rest for your next workout.'
              : hasWorkouts && isTodayComplete
                ? ', and view your completed workout.'
                : todayWorkouts.length > 0 && !isTodayComplete
                  ? ", and continue today's workout."
                  : ', and start your first workout.'}
          </Text>
        </Flex>
      </Flex>
      {!isRestDay && (
        <Button
          colorScheme={isComplete ? 'yellow' : 'cyan'}
          size="sm"
          variant={isComplete ? 'outline' : 'solid'}
          leftIcon={
            isComplete
              ? <FaChartBar />
              : todayWorkouts.length > 0 && !isTodayComplete
                ? <FaPlay />
                : <FaPlayCircle />
          }
          onClick={() => {
            if (isComplete) {
              if (todayWorkout) {
                navigate(`/workout/session/${todayWorkout.id}`);
              }
            } else {
              const startedWorkout = todayWorkouts.find(w => new Date(w.startedAt).toDateString() === today.toDateString());
              if (startedWorkout) {
                navigate(`/workout/session/${startedWorkout.id}`);
              } else {
                navigate(`/workout/session/?routineId=${routine.id}`);
              }
            }
          }}
        >
          {isComplete
            ? 'View'
            : todayWorkouts.length > 0 && !isTodayComplete
              ? 'Continue'
              : 'Start'}
        </Button>
      )}
      {isRestDay && (
        <Tag colorScheme="gray" size="sm" fontWeight="bold">
          Rest Day
        </Tag>
      )}
    </Flex>
  );
};

export default WorkoutRoutine;
