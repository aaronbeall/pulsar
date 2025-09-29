// RoutineEditor.tsx
// Provides an interactive editor for routines, allowing drag-and-drop reordering, day/kind editing, and exercise management.

import {
  Badge,
  Box, // Import CloseButton
  Button,
  Flex,
  IconButton,
  Input, // Import Select component
  Menu, // Import Menu components
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Textarea,
  useBreakpointValue,
  useDisclosure,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Switch,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Draggable, DraggableProvided, DraggableStateSnapshot, Droppable, DroppableProvided, DroppableStateSnapshot, DropResult, OnDragEndResponder } from 'react-beautiful-dnd';
import { FaCheck, FaCheckCircle, FaCog, FaDumbbell, FaEdit, FaExchangeAlt, FaGripVertical, FaPlus, FaRegCalendarAlt, FaSearch, FaStopwatch, FaSync, FaThumbsDown, FaThumbsUp, FaTimes, FaUndo } from 'react-icons/fa'; // Import icons
import ExerciseDetailsDialog from './ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import NumericStepper from './NumericStepper';
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import type { DayOfWeek, Exercise, Routine, RoutineDay, ScheduledExercise, WorkoutExercise } from '../models/types';
import DayKindBadge from './DayKindBadge';
import DayKindEditor from './DayKindBadgeEditor';
import { Autocomplete } from './Autocomplete';
import { getAddedExercise, normalizeExerciseName, searchExerciseSuggestions } from '../services/routineBuilderService';
import { exerciseTemplates, ExerciseTemplate } from '../services/exerciseTemplates';
import { useExercise, usePulsarStore } from '../store/pulsarStore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Helper to ensure all days are present in the schedule
function ensureAllDays(schedule: Routine['dailySchedule']): Routine['dailySchedule'] {
  return DAYS_OF_WEEK.map(day => {
    const found = schedule.find(s => s.day === day);
    return found ? found : { day, kind: '', exercises: [] };
  });
}

// Deep clone helper
// TODO: Replace with immer()
function cloneRoutine(r: Routine): Routine {
  return JSON.parse(JSON.stringify(r));
}

// Editable routine with drag and drop, now using react-beautiful-dnd
export const RoutineEditor: React.FC<{
  initialRoutine: Routine;
  onSave: (routine: Routine) => void;
  onSaveAs: (routine: Routine) => void;
  onRevert: () => void;
}> = ({ initialRoutine, onSave, onSaveAs, onRevert }) => {
  const [editRoutine, setEditRoutine] = useState<Routine>(() => ({
    ...initialRoutine,
    dailySchedule: ensureAllDays(initialRoutine.dailySchedule),
  }));
  const [editChanged, setEditChanged] = useState(false);

  useEffect(() => {
    // Ensure all days are present when routine changes
    const next = cloneRoutine(initialRoutine);
    next.dailySchedule = ensureAllDays(next.dailySchedule);
    setEditRoutine(next);
    setEditChanged(false);
  }, [initialRoutine]);

  // react-beautiful-dnd handlers
  const handleExerciseDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    const sourceDayIdx = parseInt(source.droppableId.replace('day-', ''));
    const destDayIdx = parseInt(destination.droppableId.replace('day-', ''));
    if (sourceDayIdx === destDayIdx && source.index === destination.index) return;
    const newRoutine = cloneRoutine(editRoutine);
    const [moved] = newRoutine.dailySchedule[sourceDayIdx].exercises.splice(source.index, 1);
    newRoutine.dailySchedule[destDayIdx].exercises.splice(destination.index, 0, moved);
    setEditRoutine(newRoutine);
    setEditChanged(true);
  };

  // Edit exercise handler
  const handleEditExercise = (dayIdx: number, exIdx: number, newExercise: ScheduledExercise | null) => {
    const newRoutine = cloneRoutine(editRoutine);
    if (newExercise === null) {
      newRoutine.dailySchedule[dayIdx].exercises.splice(exIdx, 1);
    } else {
      newRoutine.dailySchedule[dayIdx].exercises[exIdx] = newExercise;
    }
    setEditRoutine(newRoutine);
    setEditChanged(true);
  };

  // Add exercise handler
  const handleAddExercise = (dayIdx: number, exercise: Exercise) => {
    const newRoutine = cloneRoutine(editRoutine);
    const { id: exerciseId, timed } = exercise;
    newRoutine.dailySchedule[dayIdx].exercises.push({ 
      exerciseId, 
      sets: 1, 
      // TODO: find a default value from exercises
      ...(timed ? { duration: 30 } : { reps: 10 }) 
    });
    setEditRoutine(newRoutine);
    setEditChanged(true);
  };

  // Handle changing the day for a schedule (swap days)
  const handleChangeDay = (fromDayIdx: number, newDay: string) => {
    const toDayIdx = editRoutine.dailySchedule.findIndex(s => s.day === newDay);
    if (toDayIdx === -1) return; // Should not happen
    const newRoutine = cloneRoutine(editRoutine);
    // Swap the two days' data, but also swap their 'day' fields
    const temp = { ...newRoutine.dailySchedule[fromDayIdx] };
    newRoutine.dailySchedule[fromDayIdx] = {
      ...newRoutine.dailySchedule[toDayIdx],
      day: newRoutine.dailySchedule[fromDayIdx].day,
    };
    newRoutine.dailySchedule[toDayIdx] = {
      ...temp,
      day: newRoutine.dailySchedule[toDayIdx].day,
    };
    setEditRoutine(newRoutine);
    setEditChanged(true);
  };

  const handleEditDayKind = (dayIdx: number, newKind: string) => {
    const newRoutine = cloneRoutine(editRoutine);
    newRoutine.dailySchedule[dayIdx].kind = newKind;
    setEditRoutine(newRoutine);
    setEditChanged(true);
  }

  const handleNameChange = (newName: string) => {
    setEditRoutine(r => ({ ...r, name: newName }));
    setEditChanged(true);
  }      

  // Save changes
  const handleSave = () => {
    const trimmed = cloneRoutine(editRoutine);
    trimmed.dailySchedule = trimmed.dailySchedule.filter(s => s.exercises.length > 0);
    onSave(trimmed);
    setEditChanged(false);
  };

  // Save As handler
  const handleSaveAs = (saveAsName: string) => {
    const trimmed = cloneRoutine(editRoutine);
    const { id, favorite, ...rest } = trimmed;
    const uuid = uuidv4();
    const newRoutine: Routine = {
      ...rest,
      id: uuid,
      name: saveAsName,
      dailySchedule: trimmed.dailySchedule.filter(s => s.exercises.length > 0),
      active: false,
      createdAt: Date.now(),
    };
    onSaveAs(newRoutine);
    setEditChanged(false);
  };

  // Revert changes
  const handleRevert = () => {
    setEditRoutine(cloneRoutine(initialRoutine));
    setEditChanged(false);
    onRevert();
  };

  return (
    <Box>
      <SaveBar
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onRevert={handleRevert}
        editName={editRoutine.name}
        onChangeName={handleNameChange}
        editChanged={editChanged}
      />
      
      {/* Editable description textarea under the name/save/cancel bar */}
      <Textarea
        value={editRoutine.description || ''}
        onChange={e => {
          setEditRoutine(r => ({ ...r, description: e.target.value }));
          setEditChanged(true);
        }}
        placeholder="Add a description (optional)"
        fontSize="md"
        color="gray.600"
        _dark={{ color: 'gray.300' }}
        width="100%"
        resize="vertical"
        minH="60px"
        mb={4}
      />
      <ExerciseScheduleEditor
        dailySchedule={editRoutine.dailySchedule}
        onChangeDay={(handleChangeDay)}
        onEditDayKind={handleEditDayKind}
        onEditExercise={handleEditExercise}
        onAddExercise={handleAddExercise}
        onDragExercise={handleExerciseDragEnd}
      />
    </Box>
  );
};

const SaveBar: React.FC<{
  editName: string;
  onChangeName: (newName: string) => void;
  editChanged: boolean;
  onSave: () => void;
  onSaveAs: (saveAsName: string) => void;
  onRevert: () => void;
}> = ({ editName, onChangeName: onChange, editChanged, onSave, onSaveAs, onRevert }) => {
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState(editName);
  const saveAsDisclosure = useDisclosure();

  return (
    <>
      <Box
        position="sticky"
        top={0}
        zIndex={20}
        bgGradient="linear(to-r, cyan.50, blue.50, white)"
        _dark={{ bgGradient: 'linear(to-r, gray.800, gray.900, gray.800)', borderColor: 'cyan.700' }}
        borderBottomWidth="2px"
        borderColor="cyan.300"
        boxShadow="lg"
        py={3}
        px={4}
        mb={6}
        borderRadius="md"
      >
        <Flex align="center" justify="space-between" w="100%">
          <Input
            value={editName}
            variant="flushed"
            onChange={e => {
              const newName = e.target.value;
              onChange(newName);
            }}
            size="lg"
            fontWeight="bold"
            color="cyan.700"
            borderColor="gray.200"
            _dark={{ color: 'cyan.200', borderColor: 'gray.600' }}
            _focus={{ borderColor: 'cyan.400', boxShadow: '0 0 0 1px #38bdf8' }}
            bg="transparent"
            px={3}
            py={2}
            borderRadius="md"
            maxW="340px"
            mr={4}
            placeholder="Routine Name"
          />
          <Flex gap={3}>
            {editChanged ? (
              <Button leftIcon={<FaUndo />} colorScheme="gray" size="md" fontWeight="bold" onClick={onRevert}>Revert</Button>
            ) : (
              <Button leftIcon={<FaTimes />} colorScheme="gray" size="md" fontWeight="bold" onClick={onRevert}>Cancel</Button>
            )}
            {/* Split Save/Save As button using Flex */}
            <Flex>
              <Button
                leftIcon={<FaCheck />} 
                colorScheme="green"
                size="md"
                fontWeight="bold"
                onClick={onSave}
                isDisabled={!editChanged}
                borderRightRadius={0}
                borderRightWidth={0}
              >
                Save
              </Button>
              <Menu>
                <MenuButton
                  as={Button}
                  colorScheme="green"
                  size="md"
                  borderLeftRadius={0}
                  borderLeftWidth={0}
                  px={3}
                  isDisabled={!editChanged}
                  borderLeft="1px solid"
                  borderColor="gray.300"
                  _dark={{ borderColor: 'gray.600' }}
                >
                  <Box as={FaCog} />
                </MenuButton>
                <MenuList>
                  <MenuItem icon={<FaCheck />} onClick={onSave} isDisabled={!editChanged}>Save</MenuItem>
                  <MenuItem icon={<FaEdit />} onClick={() => { setSaveAsName(editName); setShowSaveAs(true); saveAsDisclosure.onOpen(); }}>Save As...</MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          </Flex>
        </Flex>
      </Box>
      
      {/* Save As Modal */}
      <Modal isOpen={showSaveAs} onClose={() => { setShowSaveAs(false); saveAsDisclosure.onClose(); }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Routine As...</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)}
              placeholder="Routine Name"
              size="lg"
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => { setShowSaveAs(false); saveAsDisclosure.onClose(); }} mr={3} leftIcon={<FaTimes />} variant="ghost">
              Cancel
            </Button>
            <Button colorScheme="green" onClick={() => { onSaveAs(saveAsName); saveAsDisclosure.onClose(); }} isDisabled={!saveAsName.trim()} leftIcon={<FaCheck />} fontWeight="bold">
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      </>
  );
}

const ExerciseScheduleEditor: React.FC<{ 
  dailySchedule: Routine['dailySchedule'];
  onChangeDay: (dayIdx: number, newDay: DayOfWeek) => void;
  onEditDayKind: (dayIdx: number, newKind: string) => void;
  onEditExercise: (dayIdx: number, exIdx: number, ex: ScheduledExercise | null) => void;
  onAddExercise: (dayIdx: number, exercise: Exercise) => void;
  onDragExercise: OnDragEndResponder;
}> = ({ dailySchedule, onChangeDay, onEditDayKind, onEditExercise, onAddExercise, onDragExercise }) => {

  // Add state and handler for exercise details dialog
  const [exerciseDetailsId, setExerciseDetailsId] = useState<string | null>(null);
  const closeExerciseDetails = () => setExerciseDetailsId(null);

  const isMdOrLarger = useBreakpointValue({ base: false, md: true });

  return (
    <DragDropContext onDragEnd={onDragExercise}>
      <VStack align="start" spacing={4}>
        {dailySchedule.map((schedule, dayIdx) => (
          <ExerciseDayEditor 
            key={schedule.day}
            schedule={schedule}
            dailySchedule={dailySchedule}
            dayIdx={dayIdx}
            onChangeDay={onChangeDay}
            onEditDayKind={onEditDayKind}
            onEditExercise={onEditExercise}
            onAddExercise={onAddExercise}
            onOpenExerciseDetails={setExerciseDetailsId}
            isMdOrLarger={isMdOrLarger}
          />
        ))}
      </VStack>
      {/* Exercise details dialog */}
      {exerciseDetailsId && (
        <ExerciseDetailsDialog
          exerciseId={exerciseDetailsId}
          onClose={closeExerciseDetails}
          mode="edit"
        />
      )}
    </DragDropContext>
  );
}

const ExerciseDayEditor: React.FC<{ 
  schedule: RoutineDay;
  dailySchedule: Routine['dailySchedule'];
  dayIdx: number;
  onChangeDay: (dayIdx: number, newDay: DayOfWeek) => void;
  onEditDayKind: (dayIdx: number, newKind: string) => void;
  onEditExercise: (dayIdx: number, exIdx: number, ex: ScheduledExercise | null) => void;
  onAddExercise: (dayIdx: number, exercise: Exercise) => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  isMdOrLarger?: boolean;
}> = ({ schedule, dailySchedule, dayIdx, onChangeDay, onEditDayKind, onEditExercise, onOpenExerciseDetails, onAddExercise, isMdOrLarger }) => {
  // Add state and handler for editing kind
  const [editKind, setEditKind] = useState(false);
  const [editKindValue, setEditKindValue] = useState('');

  const handleAddExercise = useCallback((exercise: Exercise) => onAddExercise(dayIdx, exercise), [dayIdx, onAddExercise]);

  return (
    <Box
      key={schedule.day}
      width="100%"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      _dark={{ borderColor: 'gray.700', bg: 'gray.900' }}
      bg="gray.50"
      p={4}
      mb={2}
      boxShadow="sm"
    >
      <Flex align="center" mb={2}>
        {/* Combined day name and calendar icon as a single button */}
        <Menu>
          <MenuButton
            as={Button}
            leftIcon={<FaRegCalendarAlt />}
            size="sm"
            colorScheme="cyan"
            mr={2}
            fontWeight="bold"
            px={3}
            py={1.5}
            borderRadius="md"
            aria-label={`Move day: ${schedule.day}`}
            _focus={{ boxShadow: 'outline' }}
            variant={schedule.exercises.length === 0 ? 'outline' : undefined}
          >
            {schedule.day}
          </MenuButton>
          <MenuList>
            <Box px={3} py={1} fontWeight="bold" color="gray.600">Move to...</Box>
            {dailySchedule.map((s, idx) => {
              const isCurrent = s.day === schedule.day;
              const hasExercises = !isCurrent && s.exercises && s.exercises.length > 0;
              return (
                <MenuItem
                  key={s.day}
                  onClick={() => !isCurrent && onChangeDay(dayIdx, s.day)}
                  isDisabled={isCurrent}
                  icon={isCurrent ? <FaRegCalendarAlt color="#38bdf8" /> : hasExercises ? <FaExchangeAlt /> : undefined}
                >
                  {s.day}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
        {editKind ? (
          <DayKindEditor
            value={editKindValue}
            onChange={setEditKindValue}
            onSave={() => onEditDayKind(dayIdx, editKindValue)}
            onCancel={() => setEditKind(false)}
          />
        ) : (
          <DayKindBadge
            kind={schedule.kind}
            editable
            onClick={() => {
              setEditKind(false);
              setEditKindValue(schedule.kind || '');
            }}
          />
        )}
      </Flex>
      <Droppable droppableId={`day-${dayIdx}`}>
        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
          <VStack
          align="start"
          spacing={2}
          w="100%"
          ref={provided.innerRef}
          {...provided.droppableProps}
          bg={snapshot.isDraggingOver ? 'rgba(56, 189, 248, 0.04)' : 'transparent'}
          _dark={{ bg: snapshot.isDraggingOver ? 'rgba(56, 189, 248, 0.08)' : 'transparent' }}
          minH={10}
          borderRadius="md"
          border={
            snapshot.isDraggingOver
            ? '1px solid #38bdf8' // cyan.400
            : schedule.exercises.length === 0
            ? '1px dashed #90cdf4'
            : undefined
          }
          boxShadow={undefined}
          style={{
            transition: 'background 0.15s, border 0.15s',
          }}
          >
          {/* Draggable exercises */}
          {schedule.exercises.map((ex, exIdx: number) => (
            <DraggableExerciseEditorRow 
              key={ex.exerciseId} 
              dayIdx={dayIdx} 
              exIdx={exIdx} 
              ex={ex} 
              onEditExercise={onEditExercise}
              onOpenExerciseDetails={onOpenExerciseDetails}
              isMdOrLarger={isMdOrLarger}
              />
          ))}
          {/* Persistent empty row for adding a new exercise */}
          <AddExerciseRow isDraggingOver={snapshot.isDraggingOver} onAddExercise={handleAddExercise} />
          {provided.placeholder}
          </VStack>
        )}
      </Droppable>
    </Box>
  );
}

const DraggableExerciseEditorRow: React.FC<{ 
  dayIdx: number; 
  exIdx: number; 
  ex: ScheduledExercise; 
  onEditExercise: (dayIdx: number, exIdx: number, ex: ScheduledExercise | null) => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  isMdOrLarger?: boolean;
}> = ({ dayIdx, exIdx, ex, onEditExercise, onOpenExerciseDetails, isMdOrLarger }) => {
  const exercise = useExercise(ex.exerciseId);
  return (
    <Draggable key={`ex-${dayIdx}-${exIdx}`} draggableId={`ex-${dayIdx}-${exIdx}`} index={exIdx}>
    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
      <Flex
      align="center"
      w="100%"
      bg={snapshot.isDragging ? 'cyan.100' : 'transparent'}
      _dark={{ bg: snapshot.isDragging ? 'cyan.800' : 'transparent' }}
      p={2}
      borderRadius="md"
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.7 : 1 }}
      >
      <Box mr={2} color="gray.400" _dark={{ color: 'gray.500' }} p={1}>
        <FaGripVertical />
      </Box>
      {/* Show exercise name and gear icon beside each other */}
      <Flex align="center" flex={1} minW={0} mr={2}>
        <Text
        fontWeight="semibold"
        color="cyan.700"
        _dark={{ color: 'cyan.300' }}
        minW={0}
        isTruncated={isMdOrLarger}
        fontSize={{ base: 'sm', md: 'md' }}
        whiteSpace={isMdOrLarger ? 'nowrap' : 'normal'}
        wordBreak="break-word"
        >
        {exercise?.name || ''}
        </Text>
        <IconButton
        aria-label="Edit exercise details"
        icon={<FaEdit />}
        size="sm"
        colorScheme="gray"
        variant="ghost"
        ml={2}
        onClick={() => onOpenExerciseDetails(ex.exerciseId)}
        />
      </Flex>
      {/* Right-aligned controls */}
      <Flex align="center" ml="auto">
        <Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: 1, sm: 2 }}>
        <NumericStepper
          value={ex.sets || 1}
          onChange={(val: number) => onEditExercise(dayIdx, exIdx, { ...ex, sets: val })}
          label="sets"
        />
        {ex.reps !== undefined && (
          <NumericStepper
          value={ex.reps}
          onChange={(val: number) => onEditExercise(dayIdx, exIdx, { ...ex, reps: val })}
          label="reps"
          />
        )}
        {ex.duration !== undefined && (
          <NumericStepper
          value={ex.duration}
          onChange={(val: number) => onEditExercise(dayIdx, exIdx, { ...ex, duration: val })}
          label="sec"
          />
        )}
        </Flex>
        <Menu>
        <MenuButton
          as={IconButton}
          size="sm"
          colorScheme="gray"
          aria-label="More options"
          icon={<FaCog />} // Use a gear icon for the menu
          ml={{ base: 0, sm: 1 }}
          mt={{ base: 1, sm: 0 }}
          variant="ghost"
        />
        <MenuList>
          <MenuItem
          icon={<FaTimes color="#E53E3E" />} // Red X icon
          onClick={() => onEditExercise(dayIdx, exIdx, null)}
          >
          Remove Exercise
          </MenuItem>
          <MenuItem
          onClick={() => {
            // Toggle between reps and duration
            if (ex.reps !== undefined) {
              // Switch to duration, remove reps
              onEditExercise(dayIdx, exIdx, { ...ex, duration: 30, reps: undefined });
            } else if (ex.duration !== undefined) {
              // Switch to reps, remove duration
              onEditExercise(dayIdx, exIdx, { ...ex, reps: 10, duration: undefined });
            }
          }}
          >
          {ex.reps !== undefined ? (
            <Flex align="center">
            <Box as={FaStopwatch} color="#3182CE" mr={2} />
            Switch to Duration
            </Flex>
          ) : (
            <Flex align="center">
            <Box as={FaSync} color="#3182CE" mr={2} />
            Switch to Reps
            </Flex>
          )}
          </MenuItem>
        </MenuList>
        </Menu>
      </Flex>
      </Flex>
    )}
    </Draggable>
  );
}

const AddExerciseRow: React.FC<{ 
  onAddExercise: (exercise: Exercise) => void;
  isDraggingOver: boolean;
}> = ({ onAddExercise, isDraggingOver }) => {
  const [addExerciseInput, setAddExerciseInput] = useState("");

  const exercises = usePulsarStore(s => s.exercises);
  const addExercise = usePulsarStore(s => s.addExercise);

  const exerciseSuggestions = React.useMemo(() => {
    const exerciseNames = new Set(exercises.map(e => normalizeExerciseName(e.name)));
    const uniqueTemplates = exerciseTemplates
      .filter(t => !exerciseNames.has(normalizeExerciseName(t.name)));
    return [...exercises, ...uniqueTemplates];
  }, [exercises]);

  return (
    <Flex
      align="center"
      w="100%"
      bg="transparent"
      _dark={{ bg: 'transparent' }}
      p={2}
      borderRadius="md"
      opacity={isDraggingOver ? 0 : 1}
      pointerEvents={isDraggingOver ? 'none' : 'auto'}
    >
      <Box mr={2} color="gray.300" _dark={{ color: 'gray.600' }} p={1}>
      <FaGripVertical style={{ opacity: 0.3 }} />
      </Box>
      <Autocomplete
      items={exerciseSuggestions}
      getItemLabel={(ex: Exercise | ExerciseTemplate) => ex.name}
      getKey={(ex: Exercise | ExerciseTemplate, idx: number) => 'id' in ex ? ex.id : `template-${ex.name}`}
      value={addExerciseInput}
      onChange={setAddExerciseInput}
      onSelect={async (item: Exercise | ExerciseTemplate) => {
        if ('id' in item) {
          onAddExercise(item);
        } else {
          const newEx = await getAddedExercise(item.name, exercises, addExercise);
          onAddExercise(newEx);
        }
        setAddExerciseInput('');
      }}
      onCreate={async (input: string) => {
        const newEx = await getAddedExercise(input, exercises, addExercise);
        onAddExercise(newEx);
        setAddExerciseInput('');
      }}
      filterItems={searchExerciseSuggestions}
      placeholder="Add new exercise..."
      renderItemLabel={(item: Exercise | ExerciseTemplate, isHighlighted: boolean) => {
        const isExercise = 'id' in item && item.id && exercises.find((e: Exercise) => e.id === item.id);
        const liked = isExercise && (item as Exercise).liked;
        const disliked = isExercise && (item as Exercise).disliked;
        let icon: React.ReactNode = null;
        if (liked) {
          icon = <FaThumbsUp color={isHighlighted ? '#059669' : '#38bdf8'} style={{ marginRight: 6 }} />;
        } else if (disliked) {
          icon = <FaThumbsDown color={isHighlighted ? '#dc2626' : '#f87171'} style={{ marginRight: 6 }} />;
        } else if (isExercise) {
          icon = <FaCheck color={isHighlighted ? '#059669' : '#a0aec0'} style={{ marginRight: 6 }} />;
        } else {
          icon = <FaPlus color={isHighlighted ? '#2563eb' : '#a0aec0'} style={{ marginRight: 6 }} />;
        }
        return (
        <Flex align="center" gap={2}>
          {icon}
          <Box fontWeight={isHighlighted ? 'bold' : 'normal'}>{item.name}</Box>
          {Array.isArray(item.targetMuscles) && item.targetMuscles.length > 0 && (
          <Flex gap={1} flexWrap="wrap">
            {item.targetMuscles.map((muscle: string) => (
            <Box
              key={muscle}
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="full"
              bg={isHighlighted ? 'cyan.100' : 'gray.100'}
              color={isHighlighted ? 'cyan.700' : 'gray.600'}
              _dark={{ bg: isHighlighted ? 'cyan.900' : 'gray.700', color: isHighlighted ? 'cyan.200' : 'gray.300' }}
            >
              {muscle}
            </Box>
            ))}
          </Flex>
          )}
        </Flex>
        );
      }}
      renderCreateLabel={(input: string) => `Create "${input}"`}
      />
    </Flex>
  );
}