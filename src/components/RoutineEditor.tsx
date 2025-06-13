import {
  Badge,
  Box, // Import CloseButton
  Button,
  Flex,
  Heading,
  IconButton,
  Input, // Import Select component
  Menu, // Import Menu components
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useBreakpointValue,
  VStack
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import { FaCheck, FaCog, FaEdit, FaExchangeAlt, FaGripVertical, FaPlus, FaRegCalendarAlt, FaStopwatch, FaSync, FaTimes, FaUndo } from 'react-icons/fa'; // Import icons
import ExerciseDetailsDialog from './ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import NumericStepper from './NumericStepper';
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import { Exercise, Routine } from '../models/types';

// Helper to ensure all days are present in the schedule
function ensureAllDays(schedule: Routine['dailySchedule']): Routine['dailySchedule'] {
  return DAYS_OF_WEEK.map(day => {
    const found = schedule.find(s => s.day === day);
    return found ? found : { day, kind: '', exercises: [] };
  });
}

// Editable routine with drag and drop, now using react-beautiful-dnd
export const RoutineEditor: React.FC<{
  initialRoutine: Routine;
  exercises: Exercise[];
  onSave: (routine: Routine) => void;
  onRevert: () => void;
}> = ({ initialRoutine, exercises, onSave, onRevert }) => {
  const [editRoutine, setEditRoutine] = useState<Routine>(() => {
    const initial = JSON.parse(JSON.stringify(initialRoutine));
    initial.dailySchedule = ensureAllDays(initial.dailySchedule);
    return initial;
  });
  const [editChanged, setEditChanged] = useState(false);
  const [addExerciseInput, setAddExerciseInput] = useState<Record<number, string>>({});

  // Deep clone helper
  function cloneRoutine(r: Routine): Routine {
    return JSON.parse(JSON.stringify(r));
  }

  useEffect(() => {
    // Ensure all days are present when routine changes
    const next = cloneRoutine(initialRoutine);
    next.dailySchedule = ensureAllDays(next.dailySchedule);
    setEditRoutine(next);
    setEditChanged(false);
  }, [initialRoutine]);

  // react-beautiful-dnd handlers
  const onDragEnd = (result: DropResult) => {
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
  const handleEditExercise = (dayIdx: number, exIdx: number, newExercise: any) => {
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
  const handleAddExercise = (dayIdx: number, exerciseId: string) => {
    const newRoutine = cloneRoutine(editRoutine);
    newRoutine.dailySchedule[dayIdx].exercises.push({ exerciseId, sets: 1 });
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

  // Save changes
  const handleSave = () => {
    // Remove empty days before saving
    const trimmed = cloneRoutine(editRoutine);
    trimmed.dailySchedule = trimmed.dailySchedule.filter(s => s.exercises.length > 0);
    onSave(trimmed);
    setEditChanged(false);
  };

  // Revert changes
  const handleRevert = () => {
    setEditRoutine(cloneRoutine(initialRoutine));
    setEditChanged(false);
    onRevert();
  };

  // Handle input for adding new exercise
  const handleAddExerciseInput = (dayIdx: number, value: string) => {
    setAddExerciseInput(prev => ({ ...prev, [dayIdx]: value }));
  };

  // Add state and handler for exercise details dialog
  const [exerciseDetailsId, setExerciseDetailsId] = useState<string | null>(null);
  const openExerciseDetails = (exerciseId: string) => setExerciseDetailsId(exerciseId);
  const closeExerciseDetails = () => setExerciseDetailsId(null);

  const isMdOrLarger = useBreakpointValue({ base: false, md: true });

  return (
    <Box>
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
            value={editRoutine.name}
            variant="flushed"
            onChange={e => {
              const newName = e.target.value;
              setEditRoutine(r => ({ ...r, name: newName }));
              setEditChanged(true);
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
              <Button leftIcon={<FaUndo />} colorScheme="gray" size="md" fontWeight="bold" onClick={handleRevert}>Revert</Button>
            ) : (
              <Button leftIcon={<FaTimes />} colorScheme="gray" size="md" fontWeight="bold" onClick={onRevert}>Cancel</Button>
            )}
            <Button leftIcon={<FaCheck />} colorScheme="green" size="md" fontWeight="bold" onClick={handleSave} isDisabled={!editChanged}>Save</Button>
          </Flex>
        </Flex>
      </Box>
      <DragDropContext onDragEnd={onDragEnd}>
        <VStack align="start" spacing={4}>
          {editRoutine.dailySchedule.map((schedule, dayIdx) => (
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
                {/* Move day button instead of dropdown */}
                <Menu>
                  <MenuButton as={IconButton} icon={<FaRegCalendarAlt />} size="sm" colorScheme="cyan" mr={2} aria-label="Move day" />
                  <MenuList>
                    <Box px={3} py={1} fontWeight="bold" color="gray.600">Move to...</Box>
                    {editRoutine.dailySchedule.map((s, idx) => {
                      const isCurrent = s.day === schedule.day;
                      const hasExercises = !isCurrent && s.exercises && s.exercises.length > 0;
                      return (
                        <MenuItem
                          key={s.day}
                          onClick={() => !isCurrent && handleChangeDay(dayIdx, s.day)}
                          isDisabled={isCurrent}
                          icon={isCurrent || hasExercises ? <FaExchangeAlt /> : undefined}
                        >
                          {s.day}
                          {isCurrent && (
                            <Box as="span" ml={2} color="gray.400" fontSize="sm">(current)</Box>
                          )}
                        </MenuItem>
                      );
                    })}
                  </MenuList>
                </Menu>
                <Heading size="sm" mr={2}>{schedule.day}</Heading>
                <Badge colorScheme="cyan" fontSize="0.8em">{schedule.kind}</Badge>
              </Flex>
              <Droppable droppableId={`day-${dayIdx}`}>
                {(provided, snapshot) => (
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
                    {schedule.exercises.map((ex, exIdx) => (
                      <Draggable key={`ex-${dayIdx}-${exIdx}`} draggableId={`ex-${dayIdx}-${exIdx}`} index={exIdx}>
                        {(provided, snapshot) => (
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
                                {(() => {
                                  const details = exercises.find(e => e.id === ex.exerciseId);
                                  return details ? details.name : ex.exerciseId;
                                })()}
                              </Text>
                              <IconButton
                                aria-label="Edit exercise details"
                                icon={<FaEdit />}
                                size="sm"
                                colorScheme="gray"
                                variant="ghost"
                                ml={2}
                                onClick={() => openExerciseDetails(ex.exerciseId)}
                              />
                            </Flex>
                            {/* Right-aligned controls */}
                            <Flex align="center" ml="auto">
                              <Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: 1, sm: 2 }}>
                                <NumericStepper
                                  value={ex.sets || 1}
                                  onChange={val => handleEditExercise(dayIdx, exIdx, { ...ex, sets: val })}
                                  label="sets"
                                />
                                {ex.reps !== undefined && (
                                  <NumericStepper
                                    value={ex.reps}
                                    onChange={val => handleEditExercise(dayIdx, exIdx, { ...ex, reps: val })}
                                    label="reps"
                                  />
                                )}
                                {ex.duration !== undefined && (
                                  <NumericStepper
                                    value={ex.duration}
                                    onChange={val => handleEditExercise(dayIdx, exIdx, { ...ex, duration: val })}
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
                                    onClick={() => handleEditExercise(dayIdx, exIdx, null)}
                                  >
                                    Remove Exercise
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      // Toggle between reps and duration
                                      if (ex.reps !== undefined) {
                                        // Switch to duration, remove reps
                                        handleEditExercise(dayIdx, exIdx, { ...ex, duration: 30, reps: undefined });
                                      } else if (ex.duration !== undefined) {
                                        // Switch to reps, remove duration
                                        handleEditExercise(dayIdx, exIdx, { ...ex, reps: 10, duration: undefined });
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
                    ))}
                    {/* Persistent empty row for adding a new exercise */}
                    <Flex
                      align="center"
                      w="100%"
                      bg="transparent"
                      _dark={{ bg: 'transparent' }}
                      p={2}
                      borderRadius="md"
                      opacity={snapshot.isDraggingOver ? 0 : 1}
                      pointerEvents={snapshot.isDraggingOver ? 'none' : 'auto'}
                    >
                      <Box mr={2} color="gray.300" _dark={{ color: 'gray.600' }} p={1}>
                        <FaGripVertical style={{ opacity: 0.3 }} />
                      </Box>
                      <Input
                        size="sm"
                        value={addExerciseInput?.[dayIdx] || ''}
                        placeholder="Add new exercise..."
                        mr={2}
                        onChange={e => handleAddExerciseInput(dayIdx, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && addExerciseInput?.[dayIdx]) {
                            handleAddExercise(dayIdx, addExerciseInput[dayIdx]);
                            handleAddExerciseInput(dayIdx, '');
                          }
                        }}
                        type="text"
                      />
                      <IconButton
                        size="sm"
                        colorScheme={addExerciseInput?.[dayIdx] ? 'cyan' : 'gray'}
                        aria-label="Add exercise"
                        icon={<FaPlus />}
                        onClick={() => {
                          if (addExerciseInput?.[dayIdx]) {
                            handleAddExercise(dayIdx, addExerciseInput[dayIdx]);
                            handleAddExerciseInput(dayIdx, '');
                          }
                        }}
                        isDisabled={!addExerciseInput?.[dayIdx]}
                        ml={1}
                      />
                    </Flex>
                    {provided.placeholder}
                  </VStack>
                )}
              </Droppable>
            </Box>
          ))}
        </VStack>
        {/* Exercise details dialog */}
        {exerciseDetailsId && (
          <ExerciseDetailsDialog
            exerciseId={exerciseDetailsId}
            exercises={exercises}
            onClose={closeExerciseDetails}
            mode="edit"
          />
        )}
      </DragDropContext>
    </Box>
  );
};