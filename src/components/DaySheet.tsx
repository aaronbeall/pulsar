import React, { useMemo } from 'react';
import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { format, isValid, parse } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Routine, Workout } from '../models/types';
import { useUrlModal } from '../hooks/useUrlModal';
import { DayLabel, getDayDetail } from '../utils/dayDetail';
import { findExercisesForDay, findRoutineForDay, findWorkoutForDay, getDayOfWeek } from '../utils/workoutUtils';
import { usePulsarStore } from '../store/pulsarStore';
import { isDevMode } from '../utils/devMode';
import DayKindBadge from './DayKindBadge';
import WorkoutHistoryRow from './WorkoutHistoryRow';

const PARAM_FORMAT = 'yyyy-MM-dd';

export const dayParam = (date: Date) => format(date, PARAM_FORMAT);
const parseDayParam = (value: string) => parse(value, PARAM_FORMAT, new Date());

/** Opens the day sheet for a date. Render <DaySheet /> on the same page. */
export function useDaySheet() {
  const modal = useUrlModal('day', { isStale: v => !isValid(parseDayParam(v)) });
  return { ...modal, openDay: (date: Date) => modal.open(dayParam(date)) };
}

const LABELS: Record<DayLabel, { text: string; scheme: string; summary: string }> = {
  done: { text: 'Done', scheme: 'green', summary: 'You worked out.' },
  missed: { text: 'Missed', scheme: 'red', summary: 'This workout was skipped.' },
  rest: { text: 'Rest day', scheme: 'gray', summary: 'Nothing was planned.' },
  today: { text: 'Today', scheme: 'orange', summary: 'Still to do today.' },
  planned: { text: 'Planned', scheme: 'cyan', summary: 'Coming up.' },
};

interface DaySheetProps {
  workouts: Workout[];
  routines: Routine[];
}

/** One day's story: what was planned, what you did, and a way into it. */
const DaySheet: React.FC<DaySheetProps> = ({ workouts, routines }) => {
  const sheet = useDaySheet();
  const date = sheet.value ? parseDayParam(sheet.value) : null;
  const detail = useMemo(
    () => (date && isValid(date) ? getDayDetail(date, workouts, routines) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet.value, workouts, routines],
  );
  const addWorkout = usePulsarStore(s => s.addWorkout);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  if (!date || !detail) return null;
  const label = LABELS[detail.label];
  const weekday = getDayOfWeek(date);
  const showPlanned = detail.planned.length > 0 && !detail.status.completed;

  const startToday = async (routine: Routine) => {
    const existing = findWorkoutForDay(workouts, [routine], weekday, date);
    await sheet.leaveTo(existing ? `/workout/session/${existing.id}` : `/workout/session?routineId=${routine.id}&day=${weekday}`);
  };

  // Dev mode only (see DEV-FEATURES.md): log a finished "Manual Entry" workout for a past day.
  const devRoutine = isDevMode() && !detail.status.completed && !detail.status.future ? findRoutineForDay(routines, weekday) : undefined;
  const devExercises = devRoutine ? findExercisesForDay(devRoutine, weekday) : [];
  const logDay = async () => {
    if (!devRoutine) return;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    await addWorkout({
      id: uuidv4(),
      nickname: 'Manual Entry',
      routineId: devRoutine.id,
      day: weekday,
      startedAt: start.getTime(),
      completedAt: end.getTime(),
      exercises: devExercises.map(ex => ({ ...ex })),
    });
  };

  return (
    <Drawer isOpen placement="bottom" onClose={sheet.close}>
      <DrawerOverlay />
      <DrawerContent borderTopRadius="2xl" maxH="85vh" pb="env(safe-area-inset-bottom)">
        <DrawerCloseButton top={4} />
        <DrawerHeader pb={1} pr={12}>
          <Flex align="center" gap={2} wrap="wrap">
            <Text>{format(date, 'EEEE, MMMM d')}</Text>
            <Badge colorScheme={label.scheme}>{label.text}</Badge>
          </Flex>
          <Text fontSize="sm" fontWeight="normal" color={mutedColor}>
            {label.summary}
          </Text>
        </DrawerHeader>
        <DrawerBody pb={6}>
          <VStack align="stretch" spacing={2}>
            {detail.workouts.map(w => (
              <WorkoutHistoryRow key={w.id} workout={w} routines={routines} showRoutineName onOpen={to => sheet.leaveTo(to)} />
            ))}
            {showPlanned &&
              detail.planned.map(({ routine, kind, exerciseCount }) => (
                <Box key={routine.id} bg={cardBg} borderRadius="lg" p={3}>
                  <Flex align="center" justify="space-between" gap={2}>
                    <Box minW={0}>
                      <Flex align="center" wrap="wrap">
                        <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{routine.name}</Text>
                        {kind && <DayKindBadge kind={kind} />}
                      </Flex>
                      <Text fontSize="xs" color={mutedColor}>
                        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                      </Text>
                    </Box>
                    {detail.label === 'today' ? (
                      <Button size="md" colorScheme="orange" flexShrink={0} onClick={() => startToday(routine)}>
                        Start
                      </Button>
                    ) : (
                      <Button size="md" variant="ghost" flexShrink={0} onClick={() => sheet.leaveTo(`/workout/routine/${routine.id}`)}>
                        View
                      </Button>
                    )}
                  </Flex>
                </Box>
              ))}
            {devRoutine && devExercises.length > 0 && (
              <Button size="sm" variant="outline" colorScheme="purple" onClick={logDay}>
                Log as done (dev)
              </Button>
            )}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default DaySheet;
