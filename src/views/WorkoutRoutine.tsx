import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  Flex,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  useDisclosure,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Tag, // Import Tag component
  CloseButton, // Import CloseButton
  Button, // Import Button
  Table, // Import table components
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Switch, // Import Switch component
  Breadcrumb, // Import Breadcrumb components
  BreadcrumbItem,
  BreadcrumbLink,
  Input,
  Select, // Import Select component
  Menu, // Import Menu components
  MenuButton,
  MenuList,
  MenuItem,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { FaInfoCircle, FaEdit, FaMagic, FaDumbbell, FaPlus, FaSave, FaUndo, FaGripVertical, FaArrowsAltV, FaExchangeAlt, FaRegCalendarAlt, FaTimes, FaCheck } from 'react-icons/fa'; // Import icons
import { Routine, Exercise } from '../models/types';
import { getRoutines, addRoutine, getExercises } from '../db/indexedDb'; // Import addRoutine to update the Routine
import { workoutPrompts } from '../constants/prompts'; // Import prompts
import { format } from 'date-fns'; // Import date-fns for formatting dates
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Import RouterLink and useNavigate
import RoutineChat, { ChatMessage } from '../components/RoutineChat';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import NumericStepper from '../components/NumericStepper';

// Helper to ensure all days are present in the schedule
function ensureAllDays(schedule: any[]) {
  return DAYS_OF_WEEK.map(day => {
    const found = schedule.find(s => s.day === day);
    return found ? found : { day, kind: 'Workout', exercises: [] };
  });
}

// Routine display table (read-only)
const RoutineDisplayTable: React.FC<{
  routine: Routine;
  exercises: Exercise[];
}> = ({ routine, exercises }) => {
  return (
    <VStack align="start" spacing={4}>
      {DAYS_OF_WEEK.map((day) => {
        const scheduleForDay = routine.dailySchedule.find((schedule) => schedule.day === day);
        if (!scheduleForDay) {
          return (
            <Card key={day} width="100%" variant="outline" borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }} borderColor="gray.200">
              <CardBody>
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={2}>
                    <Box as={FaRegCalendarAlt} color="gray.300" fontSize="lg" />
                    <Heading size="sm" fontWeight="normal" bgGradient="linear(to-r, gray.400, gray.500)" bgClip="text" color="gray.400" _dark={{ color: 'gray.600' }}>
                      {day}
                    </Heading>
                  </Flex>
                  <Badge fontSize="0.8em" px={3} py={1} borderRadius="full" bg="gray.100" _dark={{ bg: 'gray.800', color: 'gray.500' }}>
                    Rest day
                  </Badge>
                </Flex>
              </CardBody>
            </Card>
          );
        }
        const hasReps = scheduleForDay.exercises.some((exercise) => exercise.reps !== undefined);
        const hasDuration = scheduleForDay.exercises.some((exercise) => exercise.duration !== undefined);
        const columnHeader = hasReps && hasDuration
          ? "Reps/Duration"
          : hasReps
          ? "Reps"
          : "Duration";
        return (
          <Card key={day} width="100%" variant="elevated" borderRadius="md">
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Box as={FaDumbbell} color="cyan.400" fontSize="lg" />
                  <Heading size="sm" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
                    {day}
                  </Heading>
                </Flex>
                <Badge colorScheme="cyan" fontSize="0.8em" px={3} py={1} borderRadius="full">
                  {scheduleForDay.kind}
                </Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <Table
                variant="simple"
                size="sm"
                width="100%"
                sx={{
                  'th, td': {
                    borderColor: 'gray.200',
                    _dark: { borderColor: 'gray.600' },
                  },
                }}
              >
                <Thead>
                  <Tr>
                    <Th width="50%">Name</Th>
                    <Th width="25%">Sets</Th>
                    <Th width="25%">{columnHeader}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scheduleForDay.exercises.map((exercise, idx) => {
                    const exerciseDetails = exercises.find((e) => e.id === exercise.exerciseId);
                    return (
                      <Tr key={idx}>
                        <Td>
                          {exerciseDetails ? (
                            <Flex align="center" gap={2}>
                              <Text fontWeight="semibold" color="cyan.700" _dark={{ color: 'cyan.300' }}>{exerciseDetails.name}</Text>
                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="cyan"
                                onClick={() => window.open(exerciseDetails.howToUrl, '_blank', 'noopener,noreferrer')}
                              >
                                How To
                              </Button>
                            </Flex>
                          ) : (
                            <Text color="gray.400">Unknown Exercise</Text>
                          )}
                        </Td>
                        <Td>{exercise.sets || 'N/A'}</Td>
                        <Td>
                          {exercise.duration ? `${exercise.duration} sec` : exercise.reps || 'N/A'}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        );
      })}
    </VStack>
  );
};

// Editable routine with drag and drop, now using react-beautiful-dnd
const EditableRoutine: React.FC<{
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
                            <Input size="sm" value={ex.exerciseId} placeholder="Exercise ID" onChange={e => handleEditExercise(dayIdx, exIdx, { ...ex, exerciseId: e.target.value })} mr={2} />
                            <NumericStepper
                              value={ex.sets || 1}
                              onChange={val => handleEditExercise(dayIdx, exIdx, { ...ex, sets: val })}
                              label="sets"
                            />
                            {/* Optionally add reps/duration input if needed */}
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
                            <IconButton
                              size="sm"
                              colorScheme="red"
                              aria-label="Remove exercise"
                              icon={<FaTimes />}
                              onClick={() => handleEditExercise(dayIdx, exIdx, null)}
                              ml={1}
                            />
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
      </DragDropContext>
    </Box>
  );
};

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [newResponses, setNewResponses] = useState<Routine['responses']>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]); // State for active routines
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchRoutine = async () => {
      const routines = await getRoutines();
      const selectedRoutine = routines.find((r) => r.id === routineId) || null;
      setRoutine(selectedRoutine);

      const active = routines.filter((r) => r.active);
      setActiveRoutines(active);

      if (selectedRoutine) {
        setNewResponses(selectedRoutine.responses.filter((response) => !response.dismissed));
        // Add all responses (dismissed or not) to chat history as AI messages
        setChatHistory(selectedRoutine.responses.map(r => ({ role: 'ai', message: r.response })));
      }
    };
    fetchRoutine();
  }, [routineId]);

  useEffect(() => {
    const fetchExercises = async () => {
      const exerciseData = await getExercises();
      setExercises(exerciseData);
    };
    fetchExercises();
  }, []);

  const dismissResponse = async (index: number) => {
    if (!routine) return;

    // Update the dismissed status in the Routine object
    const updatedResponses = [...routine.responses];
    const dismissedResponse = newResponses[index];
    const responseIndex = updatedResponses.findIndex((r) => r.date === dismissedResponse.date);

    if (responseIndex !== -1) {
      updatedResponses[responseIndex].dismissed = true;
    }

    const updatedRoutine = { ...routine, responses: updatedResponses };
    setRoutine(updatedRoutine); // Update local state
    setNewResponses((prev) => prev.filter((_, i) => i !== index)); // Remove from newResponses state
    await addRoutine(updatedRoutine); // Persist the updated Routine to the database
  };

  const toggleActiveState = async () => {
    if (!routine) return;

    if (routine.active && activeRoutines.length === 1) {
      const confirmDisable = window.confirm(
        'This is the only active routine. Are you sure you want to disable it?'
      );
      if (!confirmDisable) return;
    }

    if (!routine.active && activeRoutines.length > 0) {
      const confirmEnable = window.confirm(
        'There is already an active routine. Are you sure you want to enable this routine?'
      );
      if (!confirmEnable) return;
    }

    const updatedRoutine = { ...routine, active: !routine.active };
    setRoutine(updatedRoutine); // Update local state
    await addRoutine(updatedRoutine); // Persist the updated Routine to the database

    // Update the active routines state
    const updatedActiveRoutines = updatedRoutine.active
      ? [...activeRoutines, updatedRoutine]
      : activeRoutines.filter((r) => r.id !== updatedRoutine.id);
    setActiveRoutines(updatedActiveRoutines);
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatHistory((prev) => [...prev, { role: 'user', message: userMessage }]);
    setChatInput('');
    // Simulate AI response (replace with real AI call if available)
    setTimeout(() => {
      setChatHistory((prev) => [...prev, { role: 'ai', message: `AI: I received your message: "${userMessage}"` }]);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  };

  // Start editing
  const handleEdit = () => {
    if (!routine) return;
    setIsEditing(true);
  };

  // Save changes from EditableRoutine
  const handleSave = async (edited: Routine) => {
    await addRoutine(edited);
    setRoutine(edited);
    setIsEditing(false);
  };

  // Revert changes from EditableRoutine
  const handleRevert = () => {
    setIsEditing(false);
  };

  if (!routine) {
    return (
      <Box textAlign="center" p={4}>
        <Heading size="lg">Routine Not Found</Heading>
      </Box>
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
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
            {routine.name}
          </Heading>
          <Flex gap={2} align="center">
            <Text fontSize="sm" color="gray.600">
              Active
            </Text>
            <Switch
              colorScheme="cyan"
              isChecked={routine.active}
              onChange={toggleActiveState} // Use the toggleActiveState function
            />
            <IconButton
              aria-label="View Details"
              icon={<FaInfoCircle />}
              colorScheme="cyan"
              variant="ghost"
              onClick={onOpen}
            />
            <IconButton
              aria-label="Edit Routine"
              icon={<FaEdit />}
              colorScheme="cyan"
              variant="ghost"
              onClick={handleEdit}
            />
          </Flex>
        </Flex>
        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>Routine Details</DrawerHeader>
            <DrawerBody>
              {routine && workoutPrompts.map((prompt) => (
                <Box key={prompt.key} mb={4}>
                  <Text fontWeight="bold" fontSize="lg" mb={1}>
                    {prompt.question}
                  </Text>
                  <Text fontSize="md" color="gray.600">
                    {routine.prompts[prompt.key] || 'N/A'}
                  </Text>
                  <Divider mt={2} />
                </Box>
              ))}
              <VStack align="start" spacing={4}>
                {routine && routine.responses.map((aiResponse, index) => (
                  <Box key={index} width="100%" textAlign="right">
                    <Text fontSize="sm" color="gray.500" mb={2}>
                      {format(new Date(aiResponse.date), 'MMMM d, yyyy')}
                    </Text>
                    <Tag size="md" colorScheme="cyan" mb={2} borderRadius="full">
                      {aiResponse.prompt}
                    </Tag>
                    <Alert
                      status={aiResponse.dismissed ? 'info' : 'success'}
                      variant="left-accent"
                      borderRadius="md"
                      p={4}
                    >
                      <Flex direction="column" align="start" width="100%">
                        <AlertDescription fontSize="md">
                          {aiResponse.response}
                        </AlertDescription>
                        {!aiResponse.dismissed && (
                          <Badge colorScheme="cyan" variant="solid" mt={2}>New</Badge>
                        )}
                      </Flex>
                    </Alert>
                  </Box>
                ))}
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
        {/* Routine display table and editable routine */}
        {!isEditing && <RoutineDisplayTable routine={routine} exercises={exercises} />}
        {isEditing && routine && (
          <EditableRoutine
            initialRoutine={routine}
            exercises={exercises}
            onSave={handleSave}
            onRevert={handleRevert}
          />
        )}
      </Box>
    </Flex>
  );
};

export default WorkoutRoutine;
