// The no-AI routine builder: shows what the planner understood from the setup answers as
// chips the user can correct, and the week it built from them. Every change rebuilds the
// week right away; Shuffle picks other exercises. See services/routinePlanner.

import { Box, Button, Flex, Heading, Input, Text, VStack, Wrap, WrapItem, Tag, TagLabel, TagCloseButton, Badge, Divider } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FaArrowLeft, FaBook, FaPlus, FaRandom, FaRedo, FaTimes, FaCheck } from 'react-icons/fa';
import NumericStepper from './NumericStepper';
import type { DayOfWeek } from '../models/types';
import { parseAnswers } from '../services/routinePlanner/parseAnswers';
import { PlannedExercise, RoutinePlan, defaultDaysPerWeek, defaultMinutes, planRoutine } from '../services/routinePlanner/planRoutine';
import {
  ALL_EQUIPMENT, Activity, Condition, Equipment, Focus, GOALS, GYM_EQUIPMENT, Goal, Level, Limit, Profile, primaryGoal,
} from '../services/routinePlanner/profile';

const GOAL_LABEL: Record<Goal, string> = {
  strength: 'Get stronger', muscle: 'Build muscle', fatLoss: 'Lose fat', endurance: 'Endurance',
  mobility: 'Mobility', athletic: 'Athletic', general: 'General fitness',
};
const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'Dumbbells', barbell: 'Barbell', kettlebell: 'Kettlebells', band: 'Bands', pullupBar: 'Pull-up bar',
  bench: 'Bench', machine: 'Machines', cable: 'Cables', treadmill: 'Treadmill', bike: 'Bike', rower: 'Rower',
  elliptical: 'Elliptical', jumpRope: 'Jump rope', pool: 'Pool',
};
const FOCUS_LABEL: Record<Focus, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', core: 'Core', glutes: 'Glutes', legs: 'Legs',
  upper: 'Upper body', lower: 'Lower body',
};
const LIMIT_LABEL: Record<Limit, string> = {
  knee: 'Knees', back: 'Lower back', shoulder: 'Shoulders', wrist: 'Wrists', ankle: 'Ankles', hip: 'Hips', neck: 'Neck', elbow: 'Elbows',
};
const AVOID_LABEL: Partial<Record<Activity, string>> = {
  running: 'No running', jumping: 'No jumping', burpees: 'No burpees', cardio: 'No cardio days', hiit: 'No circuits',
  floor: 'Nothing on the floor', lunges: 'No lunges', squats: 'No squats', pushups: 'No push-ups', pullups: 'No pull-ups',
  deadlifts: 'No deadlifts', crunches: 'No crunches', planks: 'No planks',
};
const CONDITION_LABEL: Record<Condition, string> = {
  asthma: 'Asthma', pregnant: 'Pregnant', overweight: 'Low impact', senior: 'Older adult', heart: 'Heart condition', arthritis: 'Arthritis',
};
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const MINUTES = [20, 30, 45, 60, 90];
const WEEK: Array<[DayOfWeek, string]> = [
  ['Monday', 'M'], ['Tuesday', 'T'], ['Wednesday', 'W'], ['Thursday', 'T'], ['Friday', 'F'], ['Saturday', 'S'], ['Sunday', 'S'],
];

type WatchOut = { kind: 'limit'; value: Limit } | { kind: 'avoid'; value: Activity } | { kind: 'condition'; value: Condition };

function watchOutLabel(w: WatchOut): string {
  if (w.kind === 'limit') return `Bad ${LIMIT_LABEL[w.value].toLowerCase()}`;
  if (w.kind === 'avoid') return AVOID_LABEL[w.value] ?? `No ${w.value}`;
  return CONDITION_LABEL[w.value];
}

const ALL_WATCH_OUTS: WatchOut[] = [
  ...(Object.keys(LIMIT_LABEL) as Limit[]).map(value => ({ kind: 'limit', value }) as WatchOut),
  ...(Object.keys(AVOID_LABEL) as Activity[]).map(value => ({ kind: 'avoid', value }) as WatchOut),
  ...(Object.keys(CONDITION_LABEL) as Condition[]).map(value => ({ kind: 'condition', value }) as WatchOut),
];

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

export function formatDose(ex: PlannedExercise): string {
  if (ex.duration && ex.duration >= 120) return `${Math.round(ex.duration / 60)} min`;
  if (ex.duration) return `${ex.sets} × ${ex.duration}s`;
  return `${ex.sets} × ${ex.reps}`;
}

/** A tappable chip: solid when on. Sized for fingers. */
const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; strong?: boolean }> = ({ on, onClick, children, strong }) => (
  <Button
    size="sm"
    h="34px"
    borderRadius="full"
    variant={on ? 'solid' : 'outline'}
    colorScheme={on ? 'cyan' : 'gray'}
    fontWeight={strong ? 700 : 500}
    onClick={onClick}
    aria-pressed={on}
  >
    {children}
  </Button>
);

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <Box>
    <Flex align="baseline" justify="space-between" mb={2} gap={2}>
      <Text fontSize="sm" fontWeight={700} color="gray.600" _dark={{ color: 'gray.300' }}>{title}</Text>
      {hint && <Text fontSize="xs" color="gray.500">{hint}</Text>}
    </Flex>
    {children}
  </Box>
);

interface RoutinePlanBuilderProps {
  /** The setup wizard's answers, in question order. */
  responses: string[];
  onCreate: (plan: RoutinePlan, name: string) => void;
  onBrowseTemplates: () => void;
  onBack: () => void;
  onStartOver: () => void;
}

export const RoutinePlanBuilder: React.FC<RoutinePlanBuilderProps> = ({ responses, onCreate, onBrowseTemplates, onBack, onStartOver }) => {
  const [profile, setProfile] = useState<Profile>(() => {
    const parsed = parseAnswers(responses);
    // Pin the defaults, so the chips show what the plan uses.
    return { ...parsed, daysPerWeek: defaultDaysPerWeek(parsed), minutes: defaultMinutes(parsed) };
  });
  const [seed, setSeed] = useState(0);
  const [customName, setCustomName] = useState<string | null>(null);
  const [addingWatchOut, setAddingWatchOut] = useState(false);
  const plan = useMemo(() => planRoutine(profile, seed), [profile, seed]);
  const update = (change: Partial<Profile>) => setProfile(p => ({ ...p, ...change }));

  const mainGoal = primaryGoal(profile);
  const hasGoal = (g: Goal) => (profile.goals[g] ?? 0) > 0;
  const tapGoal = (g: Goal) => {
    // Tap a goal to make it the main one (others stay as side goals); tap the main one to drop it.
    if (hasGoal(g) && g === mainGoal) {
      const { [g]: _removed, ...rest } = profile.goals;
      update({ goals: rest });
    } else {
      const rest = Object.fromEntries(Object.entries(profile.goals).filter(([k]) => k !== g).map(([k, w]) => [k, Math.min(w ?? 0, 0.5)]));
      update({ goals: { ...rest, [g]: 1 } });
    }
  };

  const dayState = (d: DayOfWeek) => (profile.preferredDays.includes(d) ? 'train' : profile.blockedDays.includes(d) ? 'free' : 'any');
  const tapDay = (d: DayOfWeek) => {
    // Cycles: any day → train this day → keep it free → any day.
    const state = dayState(d);
    const preferredDays = state === 'any' ? [...profile.preferredDays, d] : profile.preferredDays.filter(x => x !== d);
    const blockedDays = state === 'train' ? [...profile.blockedDays, d] : profile.blockedDays.filter(x => x !== d);
    const open = 7 - blockedDays.length;
    update({ preferredDays, blockedDays, daysPerWeek: Math.max(Math.min(profile.daysPerWeek ?? 3, open), Math.min(preferredDays.length, open), 1) });
  };

  const isGym = GYM_EQUIPMENT.every(e => profile.equipment.includes(e));
  const watchOuts: WatchOut[] = [
    ...profile.limits.map(value => ({ kind: 'limit', value }) as WatchOut),
    ...profile.avoid.map(value => ({ kind: 'avoid', value }) as WatchOut),
    ...profile.conditions.map(value => ({ kind: 'condition', value }) as WatchOut),
  ];
  const hasWatchOut = (w: WatchOut) => watchOuts.some(x => x.kind === w.kind && x.value === w.value);
  const toggleWatchOut = (w: WatchOut) => {
    if (w.kind === 'limit') update({ limits: toggle(profile.limits, w.value) });
    else if (w.kind === 'avoid') update({ avoid: toggle(profile.avoid, w.value), likes: profile.likes.filter(l => l !== w.value) });
    else update({ conditions: toggle(profile.conditions, w.value) });
  };

  const name = customName ?? plan.name;

  return (
    <Box maxW="600px" mx="auto" px={{ base: 0, sm: 4 }} pb={6}>
      <Flex align="center" mb={1} gap={2}>
        <Button variant="ghost" size="sm" leftIcon={<FaArrowLeft />} onClick={onBack} ml={-2}>
          Back
        </Button>
      </Flex>
      <Heading size="lg" mb={1}>Your plan</Heading>
      <Text fontSize="sm" color="gray.500" mb={4}>
        Built from your answers. Tap anything that's wrong and the week updates.
      </Text>

      <VStack spacing={5} align="stretch" p={4} borderWidth={1} borderRadius="xl" bg="white" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}>
        <Section title="Goal" hint={hasGoal(mainGoal) ? undefined : 'Pick one'}>
          <Wrap spacing={2}>
            {GOALS.map(g => (
              <WrapItem key={g}>
                <Chip on={hasGoal(g)} strong={hasGoal(g) && g === mainGoal} onClick={() => tapGoal(g)}>{GOAL_LABEL[g]}</Chip>
              </WrapItem>
            ))}
          </Wrap>
        </Section>

        <Section title="Days a week" hint="Tap a day: train, keep free">
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <NumericStepper
              value={profile.daysPerWeek ?? 3}
              min={1}
              max={7 - profile.blockedDays.length}
              onChange={v => update({ daysPerWeek: v })}
            />
            <Flex gap={1} role="group" aria-label="Days of the week">
              {WEEK.map(([d, letter]) => {
                const state = dayState(d);
                return (
                  <Button
                    key={d}
                    size="sm"
                    w="36px"
                    h="36px"
                    minW="36px"
                    p={0}
                    borderRadius="full"
                    aria-label={`${d}: ${state === 'train' ? 'train' : state === 'free' ? 'keep free' : 'any'}`}
                    variant={state === 'train' ? 'solid' : 'outline'}
                    colorScheme={state === 'train' ? 'cyan' : state === 'free' ? 'red' : 'gray'}
                    textDecoration={state === 'free' ? 'line-through' : undefined}
                    onClick={() => tapDay(d)}
                  >
                    {letter}
                  </Button>
                );
              })}
            </Flex>
          </Flex>
        </Section>

        <Section title="Minutes a session">
          <Wrap spacing={2}>
            {MINUTES.map(m => (
              <WrapItem key={m}>
                <Chip on={profile.minutes === m} onClick={() => update({ minutes: m })}>{m}</Chip>
              </WrapItem>
            ))}
            {profile.minutes !== undefined && !MINUTES.includes(profile.minutes) && (
              <WrapItem><Chip on onClick={() => {}}>{profile.minutes}</Chip></WrapItem>
            )}
          </Wrap>
        </Section>

        <Section title="Equipment" hint={profile.equipmentAssumed ? 'Not mentioned, so none' : undefined}>
          <Wrap spacing={2}>
            <WrapItem>
              <Chip on={profile.equipment.length === 0} onClick={() => update({ equipment: [], equipmentAssumed: false })}>None</Chip>
            </WrapItem>
            <WrapItem>
              <Chip on={isGym} onClick={() => update({ equipment: isGym ? [] : [...GYM_EQUIPMENT, ...profile.equipment.filter(e => e === 'pool')], equipmentAssumed: false })}>Full gym</Chip>
            </WrapItem>
            {ALL_EQUIPMENT.map(e => (
              <WrapItem key={e}>
                <Chip on={profile.equipment.includes(e)} onClick={() => update({ equipment: toggle(profile.equipment, e), equipmentAssumed: false })}>
                  {EQUIPMENT_LABEL[e]}
                </Chip>
              </WrapItem>
            ))}
          </Wrap>
        </Section>

        <Section title="Experience">
          <Wrap spacing={2}>
            {LEVELS.map(l => (
              <WrapItem key={l}>
                <Chip on={(profile.level ?? 'intermediate') === l} onClick={() => update({ level: l })}>
                  {l[0].toUpperCase() + l.slice(1)}
                </Chip>
              </WrapItem>
            ))}
          </Wrap>
        </Section>

        <Section title="Extra focus">
          <Wrap spacing={2}>
            {(Object.keys(FOCUS_LABEL) as Focus[]).map(f => (
              <WrapItem key={f}>
                <Chip on={profile.focus.includes(f)} onClick={() => update({ focus: toggle(profile.focus, f), skipFocus: profile.skipFocus.filter(s => s !== f) })}>
                  {FOCUS_LABEL[f]}
                </Chip>
              </WrapItem>
            ))}
          </Wrap>
        </Section>

        <Section title="Watch out for">
          <Wrap spacing={2}>
            {watchOuts.map(w => (
              <WrapItem key={`${w.kind}:${w.value}`}>
                <Tag size="lg" borderRadius="full" colorScheme="orange" variant="subtle" h="34px">
                  <TagLabel fontSize="sm">{watchOutLabel(w)}</TagLabel>
                  <TagCloseButton aria-label={`Remove ${watchOutLabel(w)}`} onClick={() => toggleWatchOut(w)} />
                </Tag>
              </WrapItem>
            ))}
            {profile.skipFocus.map(f => (
              <WrapItem key={`skip:${f}`}>
                <Tag size="lg" borderRadius="full" colorScheme="orange" variant="subtle" h="34px">
                  <TagLabel fontSize="sm">Skip {FOCUS_LABEL[f].toLowerCase()}</TagLabel>
                  <TagCloseButton aria-label={`Remove skip ${FOCUS_LABEL[f].toLowerCase()}`} onClick={() => update({ skipFocus: profile.skipFocus.filter(s => s !== f) })} />
                </Tag>
              </WrapItem>
            ))}
            <WrapItem>
              <Button
                size="sm"
                h="34px"
                borderRadius="full"
                variant="ghost"
                leftIcon={addingWatchOut ? <FaTimes /> : <FaPlus />}
                onClick={() => setAddingWatchOut(a => !a)}
              >
                {addingWatchOut ? 'Done' : watchOuts.length || profile.skipFocus.length ? 'Add' : 'Add an injury or dislike'}
              </Button>
            </WrapItem>
          </Wrap>
          {addingWatchOut && (
            <Wrap spacing={2} mt={3} p={3} borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.800' }}>
              {ALL_WATCH_OUTS.filter(w => !hasWatchOut(w)).map(w => (
                <WrapItem key={`${w.kind}:${w.value}`}>
                  <Chip on={false} onClick={() => toggleWatchOut(w)}>{watchOutLabel(w)}</Chip>
                </WrapItem>
              ))}
            </Wrap>
          )}
        </Section>
      </VStack>

      <Flex align="center" justify="space-between" mt={6} mb={2} gap={2}>
        <Heading size="md">{plan.name}</Heading>
        <Button size="sm" variant="outline" colorScheme="cyan" leftIcon={<FaRandom />} onClick={() => setSeed(s => s + 1)} flexShrink={0}>
          Shuffle
        </Button>
      </Flex>
      <VStack align="stretch" spacing={1} mb={4}>
        {plan.notes.map(note => (
          <Flex key={note} gap={2} align="baseline">
            <Box as={FaCheck} color="cyan.500" fontSize="xs" flexShrink={0} mt="3px" />
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }}>{note}</Text>
          </Flex>
        ))}
      </VStack>

      <VStack spacing={3} align="stretch" aria-label="Your week">
        {plan.days.map(day => (
          <Box key={day.day} p={3} borderWidth={1} borderRadius="lg" bg="white" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}>
            <Flex align="center" justify="space-between" mb={2}>
              <Text fontWeight={700}>{day.day}</Text>
              <Badge colorScheme="cyan" fontSize="0.75em">{day.kind}</Badge>
            </Flex>
            <VStack align="stretch" spacing={1} divider={<Divider />}>
              {day.exercises.map(ex => (
                <Flex key={ex.name} justify="space-between" gap={3} fontSize="sm">
                  <Text>{ex.name}</Text>
                  <Text color="gray.500" flexShrink={0} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDose(ex)}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        ))}
      </VStack>

      <Box mt={6}>
        <Text fontSize="sm" fontWeight={700} mb={2}>Name your routine</Text>
        <Input value={name} onChange={e => setCustomName(e.target.value)} size="lg" mb={3} aria-label="Routine name" />
        <Button colorScheme="cyan" size="lg" w="100%" leftIcon={<FaPlus />} onClick={() => onCreate(plan, name)} isDisabled={plan.days.length === 0}>
          Create routine
        </Button>
        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          You can change any day or exercise afterwards.
        </Text>
      </Box>

      <Flex mt={6} gap={2} direction={{ base: 'column', sm: 'row' }}>
        <Button variant="ghost" size="sm" leftIcon={<FaBook />} onClick={onBrowseTemplates} w="100%">
          Browse templates instead
        </Button>
        <Button variant="ghost" size="sm" colorScheme="gray" leftIcon={<FaRedo />} onClick={onStartOver} w="100%">
          Start over
        </Button>
      </Flex>
    </Box>
  );
};

export default RoutinePlanBuilder;
