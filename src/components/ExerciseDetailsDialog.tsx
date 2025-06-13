import React, { useEffect, useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Text, Box, VStack, Input, Textarea, Checkbox, Button, HStack, Tag, IconButton, useToast, Flex, Switch, ButtonGroup } from "@chakra-ui/react";
import { FaChartBar, FaCalendarAlt, FaDumbbell, FaTimes, FaCheck, FaListOl, FaClock, FaSync } from "react-icons/fa";
import { Exercise } from "../models/types";
import { getRoutines, getWorkouts } from '../db/indexedDb';
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import { openUrl } from '../utils/webUtils';
import TagInput from "./TagInput";

interface ExerciseDetailsDialogProps {
  exerciseId: string;
  exercises: Exercise[];
  onClose: () => void;
}

const ExerciseDetailsDialog: React.FC<ExerciseDetailsDialogProps> = ({ exerciseId, exercises, onClose }) => {
  const toast = useToast();
  const original = exercises.find(e => e.id === exerciseId)!;
  const [edit, setEdit] = React.useState({ ...original });
  const [changed, setChanged] = React.useState(false);
  const [stats, setStats] = React.useState<{ routines: number; days: number; workouts: number }>({ routines: 0, days: 0, workouts: 0 });

  // Fetch stats for this exercise
  React.useEffect(() => {
    const fetchStats = async () => {
      const routines = await getRoutines();
      const workouts = await getWorkouts();
      let routinesCount = 0;
      let daysSet = new Set<string>();
      let workoutsCount = 0;
      for (const routine of routines) {
        let foundInRoutine = false;
        for (const day of routine.dailySchedule) {
          if (day.exercises.some(ex => ex.exerciseId === exerciseId)) {
            foundInRoutine = true;
            daysSet.add(day.day);
          }
        }
        if (foundInRoutine) routinesCount++;
      }
      for (const workout of workouts) {
        if (workout.exercises.some(ex => ex.exerciseId === exerciseId)) {
          workoutsCount++;
        }
      }
      setStats({ routines: routinesCount, days: daysSet.size, workouts: workoutsCount });
    };
    fetchStats();
  }, [exerciseId]);

  const handleChange = (field: keyof typeof edit, value: any) => {
    setEdit(prev => ({ ...prev, [field]: value }));
    setChanged(true);
  };

  // Save handler (emit event or call a callback as needed)
  const handleSave = () => {
    // TODO: Implement save logic (e.g., call a prop or context to update the exercise)
    toast({ title: "Exercise saved!", status: "success", duration: 1500, isClosable: true });
    setChanged(false);
    onClose();
  };

  // Cancel handler
  const handleCancel = () => {
    setEdit({ ...original });
    setChanged(false);
    onClose();
  };

  // Helper for target muscles input (comma separated)
  const handleTargetMusclesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange('targetMuscles', value.split(',').map(s => s.trim()).filter(Boolean));
  };

  return (
    <Modal isOpen onClose={handleCancel} size="md" isCentered autoFocus={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Input
            value={edit.name}
            onChange={e => handleChange('name', e.target.value)}
            fontWeight="bold"
            fontSize="lg"
            placeholder="Exercise Name"
            variant="flushed"
            borderBottomWidth="2px"
            borderColor="cyan.400"
            _dark={{ borderColor: 'cyan.600' }}
            px={0}
            mb={-2}
          />
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={5}>
            {/* Stats across the top */}
            <HStack spacing={4} w="100%" justify="center" mb={2}>
              <Flex align="center" gap={1} color="cyan.600" _dark={{ color: 'cyan.300' }}>
                <FaChartBar />
                <Text fontSize="sm">{stats.routines} routines</Text>
              </Flex>
              <Flex align="center" gap={1} color="blue.500" _dark={{ color: 'blue.200' }}>
                <FaCalendarAlt />
                <Text fontSize="sm">{stats.days} days</Text>
              </Flex>
              <Flex align="center" gap={1} color="purple.500" _dark={{ color: 'purple.200' }}>
                <FaDumbbell />
                <Text fontSize="sm">{stats.workouts} workouts</Text>
              </Flex>
            </HStack>
            {/* Description and image/how-to side by side */}
            <HStack align="start" spacing={4} w="100%">
              <Textarea
                value={edit.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Description"
                rows={4}
                flex={1}
              />
              <VStack spacing={2} align="center" minW="90px">
                {edit.coverImageUrl ? (
                  <Box w="90px" h="90px" borderRadius="md" overflow="hidden" borderWidth="1px" borderColor="gray.200" bg="white">
                    <img src={edit.coverImageUrl} alt={edit.name} style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'white' }} />
                  </Box>
                ) : null}
                <Button
                  size="sm"
                  colorScheme="cyan"
                  variant="outline"
                  onClick={() => edit.howToUrl && openUrl(edit.howToUrl)}
                  isDisabled={!edit.howToUrl}
                  w="90px"
                >
                  How To
                </Button>
              </VStack>
            </HStack>
            <Box w="100%">
              <Text fontWeight="bold" mb={1}>Target Muscles</Text>
              <TagInput
                tags={edit.targetMuscles || []}
                onChange={tags => handleChange('targetMuscles', tags)}
                placeholder="e.g. Chest, Triceps"
              />
            </Box>
            <HStack spacing={3} w="100%" justify="flex-start">
              <Text fontWeight="bold">Default Type:</Text>
              <ButtonGroup isAttached variant="outline" size="sm">
                <Button
                  leftIcon={<FaSync />} // Use cycle icon for reps
                  colorScheme={!edit.timed ? 'cyan' : 'gray'}
                  variant={!edit.timed ? 'solid' : 'outline'}
                  onClick={() => handleChange('timed', false)}
                  isActive={!edit.timed}
                  aria-pressed={!edit.timed}
                >
                  Reps
                </Button>
                <Button
                  leftIcon={<FaClock />} // Keep clock for duration
                  colorScheme={edit.timed ? 'cyan' : 'gray'}
                  variant={edit.timed ? 'solid' : 'outline'}
                  onClick={() => handleChange('timed', true)}
                  isActive={!!edit.timed}
                  aria-pressed={!!edit.timed}
                >
                  Duration
                </Button>
              </ButtonGroup>
            </HStack>
            {edit.timed !== original.timed && (
              <Text fontSize="xs" color="gray.500" mt={-2} mb={2} ml={1}>
                This sets the default type when adding this exercise to a routine. To change the type for an existing exercise in a routine, use that exercise's gear menu.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <Box
          position="sticky"
          bottom={0}
          zIndex={10}
          bgGradient="linear(to-r, cyan.50, blue.50, white)"
          _dark={{ bgGradient: 'linear(to-r, gray.800, gray.900, gray.800)', borderColor: 'cyan.700' }}
          borderTopWidth="2px"
          borderColor="cyan.300"
          boxShadow="lg"
          py={3}
          px={4}
          borderBottomRadius="md"
        >
          <HStack justify="space-between" spacing={3}>
            <LikeDislikeButtons
              liked={!!edit.liked}
              disliked={!!edit.disliked}
              onLike={() => {
                if (edit.liked) {
                  handleChange('liked', false);
                } else {
                  handleChange('liked', true);
                  handleChange('disliked', false);
                }
              }}
              onDislike={() => {
                if (edit.disliked) {
                  handleChange('disliked', false);
                } else {
                  handleChange('disliked', true);
                  handleChange('liked', false);
                }
              }}
              iconColor="gray.400"
              size="md"
            />
            <HStack spacing={3}>
              <Button leftIcon={<FaTimes />} colorScheme="gray" onClick={handleCancel}>Cancel</Button>
              <Button leftIcon={<FaCheck />} colorScheme="green" onClick={handleSave} isDisabled={!changed}>Save</Button>
            </HStack>
          </HStack>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default ExerciseDetailsDialog;
