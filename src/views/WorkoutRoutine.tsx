import React, { useEffect, useState } from 'react';
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
  BreadcrumbLink
} from '@chakra-ui/react';
import { FaInfoCircle, FaEdit, FaMagic, FaDumbbell } from 'react-icons/fa'; // Import icons
import { Routine, Exercise } from '../models/types';
import { getRoutines, addRoutine, getExercises } from '../db/indexedDb'; // Import addRoutine to update the Routine
import { workoutPrompts } from '../constants/prompts'; // Import prompts
import { format } from 'date-fns'; // Import date-fns for formatting dates
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Import RouterLink and useNavigate

const WorkoutRoutine: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [newResponses, setNewResponses] = useState<Routine['responses']>([]);
  const [activeRoutines, setActiveRoutines] = useState<Routine[]>([]); // State for active routines
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const fetchRoutine = async () => {
      const routines = await getRoutines();
      const selectedRoutine = routines.find((r) => r.id === routineId) || null;
      setRoutine(selectedRoutine);

      const active = routines.filter((r) => r.active);
      setActiveRoutines(active);

      if (selectedRoutine) {
        setNewResponses(selectedRoutine.responses.filter((response) => !response.dismissed));
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
      <Flex
              gap={4}
              width="100%"
              alignItems="center"
              justifyContent="center"
              mb={4}
              direction={{ base: 'column', md: 'row' }}
            >
              <Box p={4} borderWidth="1px" borderRadius="full" bg="gray.50" _dark={{ bg: "gray.700" }}>
                <Flex align="baseline" gap={2}>
                  <Text fontSize="md">
                    Let me know if you want to
                  </Text>
                  <Button
                    variant="solid"
                    size="md"
                    colorScheme="cyan"
                    borderRadius="full"
                    leftIcon={<FaMagic />}
                    onClick={() => alert('Navigate to edit routine functionality')} // Placeholder for edit action
                  >
                    Make Changes
                  </Button>
                </Flex>
              </Box>
              <Text> or you're </Text>
              <Button
                variant="solid"
                size="lg"
                height={16}
                colorScheme="red"
                borderRadius="full"
                leftIcon={<FaDumbbell />}
                onClick={() => alert('Start workout functionality')} // Placeholder for start workout action
              >
                Ready to Workout!
              </Button>
            </Flex>
      <Box width="100%" maxWidth="1200px">
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="lg">{routine.name}</Heading>
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
              onClick={() => alert('Edit functionality not implemented yet!')}
            />
          </Flex>
        </Flex>
        {newResponses.map((response, index) => (
          <Alert
            key={index}
            status="success"
            variant="solid"
            borderRadius="md"
            mb={4}
            p={4}
          >
            <AlertIcon />
            <Flex justify="space-between" width="100%">
                <AlertDescription fontSize="md">
                    {response.response}
                </AlertDescription>
                <CloseButton onClick={() => dismissResponse(index)} />
            </Flex>
          </Alert>
        ))}
        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>Routine Details</DrawerHeader>
            <DrawerBody>
              {workoutPrompts.map((prompt) => (
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
                {routine.responses.map((aiResponse, index) => (
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
                          <Badge colorScheme="cyan" variant="solid" mt={2}>New</Badge> // Highlight non-dismissed responses
                        )}
                      </Flex>
                    </Alert>
                  </Box>
                ))}
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
        <VStack align="start" spacing={4}>
            
          {DAYS_OF_WEEK.map((day) => {
            const scheduleForDay = routine.dailySchedule.find((schedule) => schedule.day === day);

            if (!scheduleForDay) {
              return (
                <Card key={day} width="100%" variant="outline" borderRadius="md" bg="gray.50" _dark={{ bg: "gray.800" }}>
                  <CardBody>
                    <Flex justify="space-between" align="center">
                      <Heading size="sm" color="gray.600" _dark={{ color: "gray.400" }}>
                        {day}
                      </Heading>
                      <Badge colorScheme="gray" fontSize="0.8em">Rest day</Badge> {/* Rest day badge */}
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
                    <Heading size="sm">{day}</Heading>
                    <Badge colorScheme="cyan" fontSize="0.8em">{scheduleForDay.kind}</Badge> {/* Kind badge */}
                  </Flex>
                </CardHeader>
                <CardBody>
                  <Table
                    variant="simple"
                    size="sm"
                    width="100%"
                    sx={{
                      'th, td': {
                        borderColor: 'gray.200', // Light mode border color
                        _dark: { borderColor: 'gray.600' }, // Dark mode border color
                      },
                    }}
                  >
                    <Thead>
                      <Tr>
                        <Th width="50%">Name</Th>
                        <Th width="25%">Sets</Th>
                        <Th width="25%">{columnHeader}</Th> {/* Set consistent column width */}
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
                                  <Text>{exerciseDetails.name}</Text>
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
                                'Unknown Exercise'
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
      </Box>
    </Flex>
  );
};

export default WorkoutRoutine;
