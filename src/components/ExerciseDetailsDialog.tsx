import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Text, Box, VStack, Input, Textarea, Checkbox, Button, HStack, Tag, IconButton, useToast, Flex, Switch, ButtonGroup } from "@chakra-ui/react";
import { FaChartBar, FaCalendarAlt, FaDumbbell, FaTimes, FaCheck, FaListOl, FaClock, FaSync, FaQuestionCircle } from "react-icons/fa";
import { Exercise } from "../models/types";
import LikeDislikeButtons from "../components/LikeDislikeButtons";
import { openUrl, openSearchQuery } from '../utils/webUtils';
import TagInput from "./TagInput";
import { usePulsarStore, useRoutines, useWorkouts } from '../store/pulsarStore';

interface ExerciseDetailsDialogProps {
  exerciseId: string;
  onClose: () => void;
  mode: "edit" | "view";
}

const ExerciseDetailsDialog: React.FC<ExerciseDetailsDialogProps> = ({ exerciseId, onClose, mode = "edit" }) => {
  const toast = useToast();
  const exercise = usePulsarStore(s => s.exercises.find(e => e.id === exerciseId));
  if (!exercise) return null;
  const [edit, setEdit] = React.useState({ ...exercise });
  const [changed, setChanged] = React.useState(false);
  const getExerciseStats = usePulsarStore(s => s.getExerciseStats);
  const stats = useMemo(() => getExerciseStats(exerciseId), [exerciseId, getExerciseStats]);
  const updateExercise = usePulsarStore(s => s.updateExercise);

  React.useEffect(() => {
    setEdit({ ...exercise });
    setChanged(false);
  }, [exerciseId, exercise]);

  const handleChange = (field: keyof typeof edit, value: any) => {
    setEdit(prev => ({ ...prev, [field]: value }));
    setChanged(true);
  };

  // Save handler (use Zustand store)
  const handleSave = async () => {
    await updateExercise(edit);
    toast({ title: "Exercise saved!", status: "success", duration: 1500, isClosable: true });
    setChanged(false);
    onClose();
  };

  // Cancel handler
  const handleCancel = () => {
    setEdit({ ...exercise });
    setChanged(false);
    onClose();
  };

  return (
    <Modal isOpen onClose={handleCancel} size="lg" isCentered autoFocus={false}>
      <ModalOverlay />
      <ModalContent borderRadius="2xl" boxShadow="2xl" overflow="hidden">
        <ModalHeader px={{ base: 4, md: 8 }} pt={6} pb={2}>
          <VStack align="start" spacing={1}>
            {mode === "edit" ? (
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
            ) : (
              <Text
                fontWeight="extrabold"
                fontSize={{ base: 'xl', md: '2xl' }}
                bgGradient="linear(to-r, cyan.400, blue.400, purple.400)"
                bgClip="text"
                letterSpacing="tight"
                lineHeight={1.1}
                mb={-1}
                textShadow="0 2px 8px rgba(0,0,0,0.10)"
              >
                {edit.name}
              </Text>
            )}
            {mode === "view" && (
              <HStack spacing={2}>
                {edit.liked && <Tag colorScheme="green" borderRadius="full" fontWeight="bold">Liked</Tag>}
                {edit.disliked && <Tag colorScheme="red" borderRadius="full" fontWeight="bold">Disliked</Tag>}
              </HStack>
            )}
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody px={{ base: 4, md: 8 }} pb={6}>
          <Flex direction={{ base: 'column', md: 'row' }} gap={8} align="flex-start">
            {/* Left: Image, How To, Stats */}
            <VStack
              spacing={5}
              align="stretch"
              minW={{ md: '220px' }}
              w={{ base: '100%', md: '220px' }}
              flexShrink={0}
            >
              <Box
                position="relative"
                w="100%"
                aspectRatio={16/9}
                borderRadius="md"
                overflow="hidden"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                mb={2}
              >
                {edit.coverImageUrl ? (
                  <img
                    src={edit.coverImageUrl}
                    alt={edit.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center" bg="gray.100" _dark={{ bg: 'gray.700' }}>
                    <FaDumbbell size={40} color="#A0AEC0" />
                  </Box>
                )}
                {edit.howToUrl && (
                  <IconButton
                    as="a"
                    href={edit.howToUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    colorScheme="cyan"
                    variant="ghost"
                    aria-label="How To (help)"
                    icon={<FaQuestionCircle />}
                    position="absolute"
                    top={2}
                    right={2}
                    zIndex={2}
                    bg="rgba(255,255,255,0.7)"
                    _dark={{ bg: 'rgba(26,32,44,0.7)' }}
                    _hover={{ bg: 'rgba(56,189,248,0.8)', opacity: 1 }}
                    opacity={0.7}
                    boxShadow="sm"
                    transition="opacity 0.2s"
                  />
                )}
              </Box>
              <Box
                bg="white"
                _dark={{ bg: 'gray.800' }}
                borderRadius="lg"
                boxShadow="md"
                p={3}
                w={{ base: '100%', md: 'auto' }}
              >
                <HStack spacing={4} w="100%" justify="center">
                  <VStack spacing={0} align="center" minW="60px">
                    <HStack spacing={1} align="center">
                      <Box color="cyan.600" _dark={{ color: 'cyan.300' }}>
                        <FaChartBar />
                      </Box>
                      <Text fontSize="md" fontWeight="bold" color="cyan.600" _dark={{ color: 'cyan.300' }}>{stats.routines}</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>routines</Text>
                  </VStack>
                  <VStack spacing={0} align="center" minW="60px">
                    <HStack spacing={1} align="center">
                      <Box color="blue.500" _dark={{ color: 'blue.200' }}>
                        <FaCalendarAlt />
                      </Box>
                      <Text fontSize="md" fontWeight="bold" color="blue.500" _dark={{ color: 'blue.200' }}>{stats.days}</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>days</Text>
                  </VStack>
                  <VStack spacing={0} align="center" minW="60px">
                    <HStack spacing={1} align="center">
                      <Box color="purple.500" _dark={{ color: 'purple.200' }}>
                        <FaDumbbell />
                      </Box>
                      <Text fontSize="md" fontWeight="bold" color="purple.500" _dark={{ color: 'purple.200' }}>{stats.workouts}</Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>workouts</Text>
                  </VStack>
                </HStack>
              </Box>
              <Box
                bg="white"
                _dark={{ bg: 'gray.800' }}
                borderRadius="lg"
                boxShadow="md"
                p={3}
                display="flex"
                justifyContent="center"
              >
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
              </Box>
            </VStack>
            {/* Right: Details */}
            <VStack align="stretch" spacing={6} flex={1} mt={{ base: 6, md: 0 }}>
              {/* Description */}
              <Box>
                <HStack align="center" spacing={2} mb={1}>
                  <Box w={1} h={5} bgGradient="linear(to-b, cyan.400, blue.400)" borderRadius="full" />
                  <Text fontWeight="bold" fontSize="md">Description</Text>
                </HStack>
                {mode === "edit" ? (
                  <Textarea
                    value={edit.description}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="Description"
                    rows={4}
                    bg="white"
                    _dark={{ bg: 'gray.900' }}
                  />
                ) : (
                  <Box minH="80px" bg="gray.50" _dark={{ bg: 'gray.900' }} borderRadius="md" p={3}>
                    <Text color="gray.700" _dark={{ color: 'gray.200' }} whiteSpace="pre-line">
                      {edit.description || <span style={{ color: '#A0AEC0' }}>No description</span>}
                    </Text>
                  </Box>
                )}
              </Box>
              {/* Target Muscles */}
              <Box>
                <HStack align="center" spacing={2} mb={1}>
                  <Box w={1} h={5} bgGradient="linear(to-b, cyan.400, blue.400)" borderRadius="full" />
                  <Text fontWeight="bold" fontSize="md">Target Muscles</Text>
                </HStack>
                {mode === "edit" ? (
                  <TagInput
                    tags={edit.targetMuscles || []}
                    onChange={tags => handleChange('targetMuscles', tags)}
                    placeholder="e.g. Chest, Triceps"
                  />
                ) : (
                  <HStack wrap="wrap" spacing={2}>
                    {(edit.targetMuscles && edit.targetMuscles.length > 0) ? (
                      edit.targetMuscles.map((muscle, i) => (
                        <Tag
                          key={i}
                          colorScheme="cyan"
                          borderRadius="full"
                          as="button"
                          cursor="pointer"
                          onClick={() => {
                            // Open Wikipedia search for this muscle
                            openSearchQuery(`${muscle} muscle site:wikipedia.org`);
                          }}
                          _hover={{ bg: 'cyan.100', _dark: { bg: 'cyan.700' } }}
                          _active={{ bg: 'cyan.200', _dark: { bg: 'cyan.800' } }}
                          tabIndex={0}
                        >
                          {muscle}
                        </Tag>
                      ))
                    ) : (
                      <Text color="gray.400" fontSize="sm">None</Text>
                    )}
                  </HStack>
                )}
              </Box>
              {/* Default Type */}
              <Box>
                <HStack align="center" spacing={2} mb={1}>
                  <Box w={1} h={5} bgGradient="linear(to-b, cyan.400, blue.400)" borderRadius="full" />
                  <Text fontWeight="bold" fontSize="md">Default Type</Text>
                </HStack>
                {mode === "edit" ? (
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
                ) : (
                  <Tag colorScheme="cyan" borderRadius="full" fontSize="sm" px={3} py={1} display="flex" alignItems="center" gap={1}>
                    {edit.timed ? <FaClock style={{ marginRight: 4 }} /> : <FaSync style={{ marginRight: 4 }} />}
                    {edit.timed ? 'Duration' : 'Reps'}
                  </Tag>
                )}
                {edit.timed !== exercise.timed && mode === "edit" && (
                  <Text fontSize="xs" color="gray.500" mt={1} ml={1}>
                    This sets the default type when adding this exercise to a routine. To change the type for an existing exercise in a routine, use that exercise's gear menu.
                  </Text>
                )}
              </Box>
            </VStack>
          </Flex>
        </ModalBody>
        {mode === "edit" && (
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
            <HStack justify="flex-end" spacing={3}>
              <Button leftIcon={<FaTimes />} colorScheme="gray" onClick={handleCancel}>Cancel</Button>
              <Button leftIcon={<FaCheck />} colorScheme="green" onClick={handleSave} isDisabled={!changed}>Save</Button>
            </HStack>
          </Box>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ExerciseDetailsDialog;
