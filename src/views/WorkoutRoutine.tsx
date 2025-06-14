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
  VStack
} from '@chakra-ui/react';
import { format } from 'date-fns'; // Import date-fns for formatting dates
import React, { useEffect, useState } from 'react';
import { FaEdit, FaInfoCircle } from 'react-icons/fa'; // Import icons
import { Link as RouterLink, useParams } from 'react-router-dom';
import { RoutineEditor } from '../components/RoutineEditor';
import ExerciseDetailsDialog from '../components/ExerciseDetailsDialog'; // Import ExerciseDetailsDialog
import RoutineChat, { ChatMessage } from '../components/RoutineChat';
import { RoutineDisplayTable } from '../components/RoutineDisplayTable';
import { workoutPrompts } from '../constants/prompts'; // Import prompts
import { addRoutine, getExercises, getRoutines } from '../db/indexedDb'; // Import addRoutine to update the Routine
import { Exercise, Routine } from '../models/types';

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [newResponses, setNewResponses] = useState<Routine['responses']>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]); // State for active routines
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayExerciseId, setDisplayExerciseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutine = async () => {
      const routines = await getRoutines();
      const selectedRoutine = routines.find((r) => r.id === routineId) || null;
      setRoutine(selectedRoutine);

      const active = routines.filter((r) => r.active);
      setActiveRoutines(active);

      if (selectedRoutine) {
        setNewResponses(selectedRoutine.responses.filter((response) => !response.dismissed));
        // Build chat history as a conversation: AI prompt, then user response, for each prompt
        const introChat: ChatMessage[] = [];
        workoutPrompts.forEach((prompt) => {
          const userVal = selectedRoutine.prompts[prompt.key];
          if (userVal) {
            introChat.push({ role: 'ai', message: prompt.question });
            introChat.push({ role: 'user', message: userVal });
          }
        });
        setChatHistory([
          ...introChat,
          ...selectedRoutine.responses.map(r => ({ role: 'ai' as const, message: r.response }))
        ]);
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
              onClick={() => setIsEditing(isEditing ? false : true)}
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
                exercises={exercises}
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
    </Flex>
  );
};

export default WorkoutRoutine;
