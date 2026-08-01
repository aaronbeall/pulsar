import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box, // Import Switch component
  Breadcrumb, // Import Breadcrumb components
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Switch,
  Tag,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { FaChartBar, FaEdit, FaEllipsisV, FaInfoCircle, FaPlay, FaPlayCircle, FaPowerOff, FaStar, FaTimesCircle, FaTrash, FaFileExport } from 'react-icons/fa'; // Import icons
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ExerciseDetailsDialog from '../components/ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import { RoutineActivityDrawer } from '../components/RoutineActivityDrawer';
import RoutineChat from '../components/RoutineChat';
import { RoutineDisplayTable } from '../components/RoutineDisplayTable';
import { RoutineEditor } from '../components/RoutineEditor';
import SwitchRoutineDialog from '../components/SwitchRoutineDialog';
import { ExportRoutineDialog } from '../components/ExportRoutineDialog';
import type { Routine, RoutineChatMessage } from '../models/types';
import { useExercises, usePulsarStore, useRoutine, useRoutines, useWorkouts } from '../store/pulsarStore';

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>();
  const routine = useRoutine(routineId || '');
  const routines = useRoutines();
  const exercises = useExercises();
  const workouts = useWorkouts();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const updateRoutine = usePulsarStore(s => s.updateRoutine);
  const addRoutine = usePulsarStore(s => s.addRoutine);
  const removeRoutine = usePulsarStore(s => s.removeRoutine);
  const [newResponses, setNewResponses] = useState<RoutineChatMessage[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [chatHistory, setChatHistory] = useState<RoutineChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayExerciseId, setDisplayExerciseId] = useState<string | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = React.useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const cancelRef = React.useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: ?activity=1 (e.g. from the History view) opens the Activity drawer on arrival.
  useEffect(() => {
    if (searchParams.get('activity')) {
      onOpen();
      setSearchParams((prev) => {
        prev.delete('activity');
        return prev;
      }, { replace: true });
    }
  }, [searchParams, onOpen, setSearchParams]);

  useEffect(() => {
    if (routine) {
      setChatHistory(routine.chatHistory);
      setNewResponses(routine.chatHistory.filter(m => m.role === 'ai' && !m.dismissed));
    }
  }, [routine]);

  const dismissResponse = async (id: string) => {
    if (!routine) return;
    const updatedChatHistory = routine.chatHistory.map(m => m.id === id ? { ...m, dismissed: true } : m);
    await updateRoutine({ ...routine, chatHistory: updatedChatHistory });
    setNewResponses((prev) => prev.filter(m => m.id !== id));
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

  // Save As from EditableRoutine
  const handleSaveAs = (edited: Routine) => {
    addRoutine(edited);
    setIsEditing(false);
    navigate(`/workout/routine/${edited.id}`);
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
    <Flex direction="column" align="center" width="100%">
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
        {/* Minimalistic routine status banner — hidden while editing, RoutineEditor's SaveBar takes over as the header */}
        {!isEditing && routine.active && (
          <Box mb={4}>
            <RoutineStatusBanner routine={routine} />
          </Box>
        )}
        {!isEditing && (
        <Box
          position="relative"
          bg={cardBg}
          borderWidth="1px"
          borderColor={cardBorder}
          borderRadius="xl"
          boxShadow="sm"
          p={{ base: 4, sm: 5 }}
          mb={6}
        >
        <Flex
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', sm: 'center' }}
          gap={3}
        >
          <Heading fontSize={{ base: 'xl', sm: '2xl' }} bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text" display="flex" alignItems="center" gap={2} pr={{ base: 10, sm: 0 }}>
            {routine.name}
            {routine.favorite && (
              <Box as="span" color="yellow.400" ml={1} fontSize="1.1em" title="Favorite">
                <FaStar />
              </Box>
            )}
          </Heading>
          <Flex gap={3} align="center" justify={{ base: 'flex-start', sm: 'flex-end' }}>
            {/* Status, not an action — set apart as a chip rather than a button */}
            <Flex
              gap={2}
              align="center"
              pl={3}
              pr={2}
              py={1}
              borderRadius="full"
              bg={routine.active ? 'green.50' : 'gray.100'}
              borderWidth="1px"
              borderColor={routine.active ? 'green.200' : 'gray.200'}
              _dark={{
                bg: routine.active ? 'rgba(72,187,120,0.12)' : 'gray.700',
                borderColor: routine.active ? 'green.700' : 'gray.600',
              }}
            >
              <Text fontSize="sm" fontWeight="medium" color={routine.active ? 'green.700' : 'gray.500'} _dark={{ color: routine.active ? 'green.300' : 'gray.400' }}>
                Active
              </Text>
              <Switch
                colorScheme="green"
                size="sm"
                isChecked={routine.active}
                onChange={toggleActiveState}
              />
            </Flex>
            {/* Primary action */}
            <Button
              leftIcon={<FaEdit />}
              colorScheme="cyan"
              variant="solid"
              size="sm"
              fontWeight="bold"
              onClick={() => setIsEditing(isEditing ? false : true)}
            >
              Edit
            </Button>
            {/* Secondary action */}
            <Button
              leftIcon={<FaChartBar />}
              colorScheme="cyan"
              variant="outline"
              size="sm"
              onClick={onOpen}
            >
              Activity
            </Button>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FaEllipsisV />}
                variant="ghost"
                size="sm"
                aria-label="More options"
                position={{ base: 'absolute', sm: 'static' }}
                top={{ base: 4, sm: 0 }}
                right={{ base: 4, sm: 0 }}
              />
              <MenuList shadow="lg">
                <MenuItem
                  icon={<FaFileExport />} // Use export icon
                  onClick={() => setShowExportDialog(true)}
                >
                  Export...
                </MenuItem>
                <MenuItem
                  icon={<Box as={FaStar} color={routine.favorite ? 'yellow.500' : 'gray.400'} />}
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
        {routine.description && (
          <Text fontSize="sm" color={mutedColor} fontStyle="italic" mt={3}>
            {routine.description}
          </Text>
        )}
        </Box>
        )}
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
            onSave={handleSave}
            onSaveAs={handleSaveAs}
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
      <ExportRoutineDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        routine={routine}
      />
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
