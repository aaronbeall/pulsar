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
  Spinner,
  Switch,
  Tag,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { useMemo, useRef, useState } from 'react';
import { FaChartBar, FaEdit, FaEllipsisV, FaInfoCircle, FaPlay, FaPlayCircle, FaPowerOff, FaStar, FaTimesCircle, FaTrash, FaFileExport } from 'react-icons/fa'; // Import icons
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useUrlModal } from '../hooks/useUrlModal';
import ExerciseDetailsDialog from '../components/ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import { RoutineActivityDrawer } from '../components/RoutineActivityDrawer';
import RoutineChat from '../components/RoutineChat';
import { RoutineDisplayTable } from '../components/RoutineDisplayTable';
import { RoutineEditor } from '../components/RoutineEditor';
import SwitchRoutineDialog from '../components/SwitchRoutineDialog';
import { ExportRoutineDialog } from '../components/ExportRoutineDialog';
import { DescriptionProposalPanel } from '../components/RoutineChangeDiff';
import { useRoutineChangeActions } from '../hooks/useRoutineChangeActions';
import type { Routine } from '../models/types';
import { getPendingProposals, summarizeRoutineEdit } from '../utils/routineChangeUtils';
import { v4 as uuidv4 } from 'uuid';
import { useExercises, usePulsarStore, useRoutine, useRoutines, useWorkouts } from '../store/pulsarStore';
import { PortalMenuList } from '../components/PortalMenuList';
import ActivitySummaryCard from '../components/ActivitySummaryCard';

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
  const [isEditing, setIsEditing] = useState(false);
  // Every overlay on this page lives in the URL so Back closes it. ?activity=1 also works as a
  // deep link (e.g. from the History view).
  const activity = useUrlModal('activity');
  const exerciseDetails = useUrlModal('exercise');
  const switchDialog = useUrlModal('switchRoutine');
  const deactivateDialog = useUrlModal('deactivate');
  const deleteDialog = useUrlModal('deleteRoutine');
  const exportDialog = useUrlModal('export');
  const cancelRef = useRef(null);
  const navigate = useNavigate();
  const decideChange = useRoutineChangeActions(routineId || '');
  const proposals = useMemo(() => getPendingProposals({ changes: routine?.changes }), [routine?.changes]);
  const routineWorkouts = useMemo(() => workouts.filter(w => w.routineId === routine?.id), [workouts, routine?.id]);
  const routineAsList = useMemo(() => (routine ? [routine] : []), [routine]);

  const dismissResponse = async (id: string) => {
    if (!routine) return;
    const updatedChatHistory = routine.chatHistory.map(m => m.id === id ? { ...m, dismissed: true } : m);
    await updateRoutine({ ...routine, chatHistory: updatedChatHistory });
  };

  // Remove old activeRoutines usage in toggleActiveState
  const toggleActiveState = async () => {
    if (!routine) return;
    // Only show confirmation dialog if enabling and there is another active routine
    if (!routine.active && routines.some(r => r.active && r.id !== routine.id)) {
      switchDialog.open(routine.id);
      return;
    }
    if (routine.active && routines.filter(r => r.active).length === 1) {
      deactivateDialog.open();
      return;
    }
    const updatedRoutine = { ...routine, active: !routine.active };
    updateRoutine(updatedRoutine);
  };

  const handleDeactivateConfirm = () => {
    if (!routine) return;
    const updatedRoutine = { ...routine, active: false };
    updateRoutine(updatedRoutine);
    deactivateDialog.close();
  };
  const handleDeactivateCancel = () => deactivateDialog.close();

  // Save changes from EditableRoutine
  // Only the fields the editor owns are taken from the draft; everything else (chat, AI
  // suggestions and decisions made while editing) comes from the latest stored routine, so
  // saving never rolls those back. The edit is logged in the routine's history.
  const handleSave = async (edited: Routine) => {
    const latest = usePulsarStore.getState().routines.find(r => r.id === edited.id) ?? edited;
    const summary = summarizeRoutineEdit(latest, edited);
    updateRoutine({
      ...latest,
      name: edited.name,
      description: edited.description,
      dailySchedule: edited.dailySchedule,
      revisions: summary
        ? [...(latest.revisions || []), { id: uuidv4(), date: Date.now(), source: 'manual', summary }]
        : latest.revisions,
    });
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
      <RoutineChat routine={routine} onEditManually={() => setIsEditing(true)} />
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
              <PortalMenuList shadow="lg">
                <MenuItem
                  icon={<FaFileExport />} // Use export icon
                  onClick={() => exportDialog.open(routine.id)}
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
                  onClick={() => deleteDialog.open(routine.id)}
                >
                  Delete
                </MenuItem>
              </PortalMenuList>
            </Menu>
          </Flex>
        </Flex>
        {proposals.description ? (
          <Box mt={3}>
            <DescriptionProposalPanel
              current={routine.description}
              proposed={proposals.description.text}
              onAccept={() => decideChange(proposals.description!.change.id, ['description'], 'accepted')}
              onReject={() => decideChange(proposals.description!.change.id, ['description'], 'rejected')}
            />
          </Box>
        ) : routine.description && (
          <Text fontSize="sm" color={mutedColor} fontStyle="italic" mt={3}>
            {routine.description}
          </Text>
        )}
        </Box>
        )}
        {!isEditing && (
          <Box mb={4}>
            <ActivitySummaryCard
              workouts={routineWorkouts}
              routines={routineAsList}
              title="Activity"
              cta="Details"
              onOpen={() => activity.open()}
              ended={!routine.active && routineWorkouts.length > 0}
            />
          </Box>
        )}
        {activity.isOpen && (
          <RoutineActivityDrawer routine={routine} workouts={workouts} isOpen onClose={activity.close} />
        )}
        {/* Routine display table and editable routine */}
        {!isEditing && (
          <>
            <RoutineDisplayTable
              routine={routine}
              exercises={exercises}
              onShowExerciseDetails={exerciseDetails.open}
              proposals={proposals}
              onDecide={decideChange}
            />
            {exerciseDetails.value && (
              <ExerciseDetailsDialog
                exerciseId={exerciseDetails.value}
                onClose={exerciseDetails.close}
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
            proposals={proposals}
            onDecide={decideChange}
          />
        )}
      </Box>
      <SwitchRoutineDialog
        isOpen={switchDialog.isOpenFor(routine.id)}
        onClose={switchDialog.close}
        routine={routine}
      />
      {/* Deactivate only active routine confirmation dialog */}
      <AlertDialog
        isOpen={deactivateDialog.isOpen}
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
        isOpen={deleteDialog.isOpenFor(routine.id)}
        leastDestructiveRef={cancelRef}
        onClose={deleteDialog.close}
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
              <Button ref={cancelRef} onClick={deleteDialog.close} leftIcon={<FaTimesCircle />} variant="ghost">
                Cancel
              </Button>
              <Button colorScheme="red" ml={3} onClick={async () => { await deleteDialog.leaveTo('/workout', { replace: true }); await removeRoutine(routine.id); }} leftIcon={<FaTrash />}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <ExportRoutineDialog
        isOpen={exportDialog.isOpenFor(routine.id)}
        onClose={exportDialog.close}
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
