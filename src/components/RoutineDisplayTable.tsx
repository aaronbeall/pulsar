// RoutineDisplayTable.tsx
// Displays a read-only table view of a routine's weekly schedule and exercises, with clickable exercise names for details.

import { getHowToUrl } from '../utils/webUtils';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  IconButton, // Import Button
  Table,
  Tbody,
  Td,
  Text,
  Th, // Import table components
  Thead,
  Tr,
  VStack
} from '@chakra-ui/react';
import React from 'react';
import { FaDumbbell, FaPlayCircle, FaRegCalendarAlt } from 'react-icons/fa'; // Import icons
import { DAYS_OF_WEEK } from '../constants/days'; // Import DAYS_OF_WEEK
import { Exercise, Routine, RoutineChangeItemKey } from '../models/types';
import type { PendingProposals } from '../utils/routineChangeUtils';
import DayKindBadge from './DayKindBadge';
import { DayProposalPanel } from './RoutineChangeDiff';

// Routine display table (read-only)
export const RoutineDisplayTable: React.FC<{
  routine: Routine;
  exercises: Exercise[];
  onShowExerciseDetails: (exerciseId: string) => void;
  /** AI suggestions still waiting for review, rendered in place of the day they'd change. */
  proposals?: PendingProposals;
  onDecide?: (changeId: string, keys: RoutineChangeItemKey[], status: 'accepted' | 'rejected') => void;
}> = ({ routine, exercises, onShowExerciseDetails, proposals, onDecide }) => {
  return (
    <VStack align="start" spacing={4}>
      {DAYS_OF_WEEK.map((day) => {
        const scheduleForDay = routine.dailySchedule.find((schedule) => schedule.day === day);
        const proposal = proposals?.days[day];
        if (proposal && onDecide) {
          return (
            <Card key={day} id={`routine-day-${day}`} width="100%" variant="elevated" borderRadius="md" scrollMarginTop="80px">
              <CardBody p={{ base: 3, sm: 5 }}>
                <Flex align="center" gap={2} mb={3}>
                  <Box as={scheduleForDay ? FaDumbbell : FaRegCalendarAlt} color="cyan.400" fontSize="lg" />
                  <Heading size="sm" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
                    {day}
                  </Heading>
                </Flex>
                <DayProposalPanel
                  current={scheduleForDay ?? null}
                  op={proposal.op}
                  onAccept={() => onDecide(proposal.change.id, [day], 'accepted')}
                  onReject={() => onDecide(proposal.change.id, [day], 'rejected')}
                />
              </CardBody>
            </Card>
          );
        }
        if (!scheduleForDay) {
          return (
            <Card key={day} id={`routine-day-${day}`} width="100%" variant="outline" borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }} borderColor="gray.200">
              <CardBody>
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={2}>
                    <Box as={FaRegCalendarAlt} color="gray.300" fontSize="lg" />
                    <Heading size="sm" fontWeight="normal" bgGradient="linear(to-r, gray.400, gray.500)" bgClip="text" color="gray.400" _dark={{ color: 'gray.600' }}>
                      {day}
                    </Heading>
                    <DayKindBadge variant="rest" />
                  </Flex>
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
          <Card key={day} id={`routine-day-${day}`} width="100%" variant="elevated" borderRadius="md">
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Box as={FaDumbbell} color="cyan.400" fontSize="lg" />
                  <Heading size="sm" bgGradient="linear(to-r, cyan.400, blue.500)" bgClip="text">
                    {day}
                  </Heading>
                  {scheduleForDay.kind && (
                    <DayKindBadge kind={scheduleForDay.kind} />
                  )}
                </Flex>
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
                              <Text
                                as="button"
                                onClick={() => onShowExerciseDetails && onShowExerciseDetails(exerciseDetails.id)}
                                fontWeight="semibold"
                                color="cyan.700"
                                _dark={{ color: 'cyan.300' }}
                                textDecoration="none"
                                textAlign="left"
                                cursor="pointer"
                                background="none"
                                border="none"
                                p={0}
                                m={0}
                                borderRadius="md"
                                transition="background 0.15s"
                                _hover={{ background: 'cyan.50', _dark: { background: 'cyan.900' } }}
                              >
                                {exerciseDetails.name}
                              </Text>
                              {getHowToUrl(exerciseDetails) && (
                                <IconButton
                                  as="a"
                                  href={getHowToUrl(exerciseDetails)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="xs"
                                  colorScheme="cyan"
                                  variant="ghost"
                                  aria-label="Watch how-to video"
                                  icon={<FaPlayCircle />}
                                />
                              )}
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
