// "How was it?" on a finished workout: how hard and how long it felt, and an optional note.
// Each tap saves right away. The planners learn from it (see utils/learnedPreferences.ts):
// workouts that keep feeling too hard or too long make the next plan easier or shorter.

import { Box, Button, Flex, SimpleGrid, Text, Textarea } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FaCommentDots } from 'react-icons/fa';
import type { Workout, WorkoutEffort, WorkoutLengthFeel } from '../models/types';
import SectionCard from './SectionCard';

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
    <Box>
      <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>{label}</Text>
      <SimpleGrid columns={3} spacing={2} role="group" aria-label={label}>
        {options.map(o => (
          <Button
            key={o.value}
            size="md"
            fontSize="sm"
            px={2}
            borderRadius="full"
            variant={value === o.value ? 'solid' : 'outline'}
            colorScheme={value === o.value ? 'cyan' : 'gray'}
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? undefined : o.value)}
          >
            {o.label}
          </Button>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default function WorkoutFeedbackCard({ workout, onChange }: {
  workout: Workout;
  onChange: (workout: Workout) => void;
}) {
  const [note, setNote] = useState(workout.feedback ?? '');
  const rated = workout.effort || workout.lengthFeel || workout.feedback;

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
    <SectionCard icon={FaCommentDots} title="How was it?">
      <Flex direction="column" gap={4}>
        <Choices label="Effort" options={EFFORT} value={workout.effort} onChange={effort => onChange({ ...workout, effort })} />
        <Choices label="Length" options={LENGTH} value={workout.lengthFeel} onChange={lengthFeel => onChange({ ...workout, lengthFeel })} />
        <Textarea
          aria-label="Notes on this workout"
          placeholder="Anything else? (optional)"
          value={note}
          maxLength={MAX_NOTE}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
          fontSize="md"
        />
        <Text fontSize="sm" color="gray.500">
          {rated ? 'Thanks! Pulsar will use this to tune your routines.' : 'Pulsar uses this to tune your routines.'}
        </Text>
      </Flex>
    </SectionCard>
  );
}
