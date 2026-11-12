// "How was it?" on a finished workout: how hard and how long it felt, and an optional note.
// Kept small and quiet: two rows of three choices, and the note behind a link. Each tap saves
// right away. The planners learn from it (see utils/learnedPreferences.ts): workouts that keep
// feeling too hard or too long make the next plan easier or shorter.

import { Box, Button, ButtonGroup, Flex, Input, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import type { Workout, WorkoutEffort, WorkoutLengthFeel } from '../models/types';

const EFFORT: { value: WorkoutEffort; label: string }[] = [
  { value: 'easy', label: 'Too easy' },
  { value: 'right', label: 'Just right' },
  { value: 'hard', label: 'Too hard' },
];
const LENGTH: { value: WorkoutLengthFeel; label: string }[] = [
  { value: 'short', label: 'Too short' },
  { value: 'right', label: 'Just right' },
  { value: 'long', label: 'Too long' },
];

const MAX_NOTE = 300;

function Choices<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value?: T;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <Flex align="center" gap={2}>
      <Text fontSize="xs" color="gray.500" w="48px" flexShrink={0}>{label}</Text>
      <ButtonGroup size="sm" isAttached variant="outline" flex={1} role="group" aria-label={label}>
        {options.map(o => {
          const on = value === o.value;
          return (
            <Button
              key={o.value}
              flex={1}
              h="36px"
              px={1}
              fontSize="xs"
              fontWeight={on ? 700 : 500}
              colorScheme={on ? 'cyan' : 'gray'}
              variant={on ? 'solid' : 'outline'}
              aria-pressed={on}
              onClick={() => onChange(on ? undefined : o.value)}
            >
              {o.label}
            </Button>
          );
        })}
      </ButtonGroup>
    </Flex>
  );
}

export default function WorkoutFeedbackCard({ workout, onChange }: {
  workout: Workout;
  onChange: (workout: Workout) => void;
}) {
  const [note, setNote] = useState(workout.feedback ?? '');
  const [showNote, setShowNote] = useState(!!workout.feedback);

  const saveNote = () => {
    const feedback = note.trim() || undefined;
    if (feedback !== workout.feedback) onChange({ ...workout, feedback });
  };
  // Also save a moment after typing stops, so leaving the page without blurring the box (the
  // phone's Back button) doesn't lose the note.
  useEffect(() => {
    const t = setTimeout(saveNote, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  return (
    <Box borderWidth="1px" borderRadius="xl" px={3} py={3} bg="white" _dark={{ bg: 'gray.900', borderColor: 'gray.700' }}>
      <Flex align="baseline" justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight={700}>How was it?</Text>
        {!showNote && (
          <Button variant="link" size="xs" colorScheme="cyan" fontWeight={500} onClick={() => setShowNote(true)}>
            Add a note
          </Button>
        )}
      </Flex>
      <Flex direction="column" gap={2}>
        <Choices label="Effort" options={EFFORT} value={workout.effort} onChange={effort => onChange({ ...workout, effort })} />
        <Choices label="Length" options={LENGTH} value={workout.lengthFeel} onChange={lengthFeel => onChange({ ...workout, lengthFeel })} />
        {showNote && (
          <Input
            aria-label="Notes on this workout"
            placeholder="Anything else? (optional)"
            value={note}
            maxLength={MAX_NOTE}
            onChange={e => setNote(e.target.value)}
            onBlur={saveNote}
            autoFocus={!workout.feedback}
            size="sm"
            h="36px"
            fontSize="md"
            borderRadius="md"
          />
        )}
      </Flex>
    </Box>
  );
}
