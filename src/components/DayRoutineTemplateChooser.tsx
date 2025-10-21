import React, { useMemo, useState, useEffect } from 'react';
import { Box, Button, Flex, Heading, Input, VStack, Tag, Text, useColorModeValue, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaSearch, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { DailyWorkoutTemplate, dailyWorkoutTemplates } from '../services/dailyWorkoutTemplates';
import type { RoutineDay, Exercise } from '../models/types';
import { fetchExerciseSearchImageUrl } from '../utils/webUtils';

interface DayRoutineTemplateChooserProps {
  day: DayOfWeek;
  exercises: Exercise[];
  addExercise: (ex: Exercise) => Promise<void>;
  onSelect: (template: RoutineDay) => void;
  onCancel: () => void;
}

function getAllTemplateText(tmpl: DailyWorkoutTemplate) {
  return [
    tmpl.day,
    ...(tmpl.nicknames || []),
    ...tmpl.exercises.map(e => e.name),
  ].join(' ').toLowerCase();
}

import type { DayOfWeek } from '../models/types';
import { getAddedExercise } from '../services/routineBuilderService';
// toRoutineDay now async, resolves exerciseId to real Exercise ids, sets kind to tmpl.day, and uses passed day
async function toRoutineDay(
  tmpl: DailyWorkoutTemplate,
  day: DayOfWeek,
  exercises: Exercise[],
  addExercise: (ex: Exercise) => Promise<void>
): Promise<RoutineDay> {
  // For each exercise in the template, find or create the Exercise and get its id
  const scheduledExercises = [];
  for (const e of tmpl.exercises) {
    const ex = await getAddedExercise(e.name, exercises, addExercise);
    scheduledExercises.push({
      exerciseId: ex.id,
      sets: e.sets,
      reps: e.reps,
      duration: e.duration,
    });
  }
  return {
    day,
    kind: tmpl.day, // kind is the template's day name (e.g. "Push", "Pull", etc)
    exercises: scheduledExercises,
  };
}

function scoreTemplate(tmpl: DailyWorkoutTemplate, words: string[]) {
  const text = getAllTemplateText(tmpl);
  let score = 0;
  words.forEach(word => {
    if (!word) return;
    const safeWord = word.toLowerCase();
    if (text.includes(safeWord)) score++;
  });
  return score;
}

const templateImageCache = new WeakMap<DailyWorkoutTemplate, string | null>();


// DayTemplateCard component for animated template display
import { FaMedal } from 'react-icons/fa';
interface DayTemplateCardProps {
  tmpl: DailyWorkoutTemplate;
  score: number;
  day: DayOfWeek;
  exercises: Exercise[];
  addExercise: (ex: Exercise) => Promise<void>;
  onSelect: (routineDay: RoutineDay) => void;
}

const DayTemplateCard: React.FC<DayTemplateCardProps> = ({ tmpl, score, day, exercises, addExercise, onSelect }) => {
  const medalColor = useColorModeValue('#ECC94B', '#ECC94B');
  const highlightShadow = useColorModeValue('0 0 0 3px #0BC5EA, 0 2px 8px rgba(0,0,0,0.08)', 'md');
  const cardBg = useColorModeValue('white', 'gray.900');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const [imageUrl, setImageUrl] = useState<string | null>(() => templateImageCache.get(tmpl) ?? null);

  useEffect(() => {
    let isMounted = true;
    if (imageUrl === null && !templateImageCache.has(tmpl)) {
      fetchExerciseSearchImageUrl(tmpl.day).then(url => {
        if (isMounted) {
          templateImageCache.set(tmpl, url);
          setImageUrl(url ?? null);
        }
      });
    }
    return () => { isMounted = false; };
  }, [tmpl]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, duration: 0.25 }}
      style={{ width: '100%' }}
    >
      <Box
        p={4}
        borderWidth={1}
        borderRadius="lg"
        boxShadow={highlightShadow}
        bg={cardBg}
        borderColor={cardBorder}
        position="relative"
        overflow="hidden"
        cursor="pointer"
        _hover={{ boxShadow: '0 0 0 4px #0BC5EA, 0 2px 12px rgba(0,0,0,0.12)' }}
        onClick={async () => {
          const routineDay = await toRoutineDay(tmpl, day, exercises, addExercise);
          onSelect(routineDay);
        }}
      >
        {imageUrl && (
          <Box
            position="absolute"
            inset={0}
            zIndex={0}
            backgroundImage={`linear-gradient(120deg, rgba(0,255,255,0.10), rgba(0,0,0,0.18), var(--chakra-colors-whiteAlpha-900) 80%), url(${imageUrl})`}
            backgroundSize="cover"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            opacity={0.13}
            pointerEvents="none"
            style={{ mixBlendMode: 'luminosity' }}
          />
        )}
        <Box position="relative" zIndex={1}>
          <Flex align="center" mb={1} gap={2}>
            <Heading size="sm">{tmpl.day}</Heading>
            <Box position="absolute" top={2} right={3}>
              <Tag size="sm" colorScheme="gray" fontWeight={700} fontSize="xs" px={2} py={0.5} borderRadius="md" display="flex" alignItems="center" gap={1}>
                <FaMedal style={{ marginRight: 2, fontSize: '1em', color: medalColor }} />
                {score}
              </Tag>
            </Box>
          </Flex>
          <Flex wrap="wrap" gap={2} mb={2}>
            {tmpl.exercises.map((ex, i) => (
              <Tag key={i} colorScheme="gray" fontSize="xs" px={2} py={0.5} borderRadius="md">
                {ex.name}: {ex.sets} × {ex.reps ? ex.reps : ex.duration ? `${ex.duration}s` : '?'}
              </Tag>
            ))}
          </Flex>
          {tmpl.nicknames && tmpl.nicknames.length > 0 && (
            <Box mt={3}>
              <Text fontSize="xs" color="gray.500" mb={1} fontWeight="semibold">Nicknames:</Text>
              <Flex wrap="wrap" gap={2}>
                {tmpl.nicknames.map((nickname, i) => (
                  <Tag
                    key={nickname}
                    colorScheme="cyan"
                    cursor="pointer"
                    _hover={{ bg: 'cyan.200', color: 'black' }}
                    onClick={async e => {
                      e.stopPropagation();
                      // Choose the template, but set the kind to the nickname, keep the day as selected
                      const routineDay = await toRoutineDay({ ...tmpl, day: nickname }, day, exercises, addExercise);
                      onSelect(routineDay);
                    }}
                  >
                    {nickname}
                  </Tag>
                ))}
              </Flex>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default function DayRoutineTemplateChooser({ day, exercises, addExercise, onSelect, onCancel }: DayRoutineTemplateChooserProps) {
  const [search, setSearch] = useState('');

  const searchWords = useMemo(() =>
    search.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [search]
  );

  const ranked = useMemo(() => {
    return dailyWorkoutTemplates.map(tmpl => ({
      tmpl,
      score: scoreTemplate(tmpl, searchWords)
    }))
    .sort((a, b) => b.score - a.score || a.tmpl.day.localeCompare(b.tmpl.day));
  }, [searchWords]);

  const filtered = searchWords.length > 0 ? ranked.filter(r => r.score > 0) : ranked;
  const top = filtered.slice(0, 8); // show up to 8

  return (
    <Box mx="auto" p={4}>
      {/* No header or back button, since this is inside a modal */}
      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none">
          <FaSearch color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search day templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <InputRightElement>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="gray"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              tabIndex={-1}
            >
              <FaTimes />
            </Button>
          </InputRightElement>
        )}
      </InputGroup>
      <VStack spacing={5} align="stretch">
        <AnimatePresence initial={false}>
          {top.length === 0 ? (
            <Box textAlign="center" color="gray.400" py={8}>
              <Text fontSize="md">No day templates found. Try a different search.</Text>
            </Box>
          ) : (
            top.map(({ tmpl, score }) => (
              <DayTemplateCard
                key={tmpl.day}
                tmpl={tmpl}
                score={score}
                day={day as DayOfWeek}
                exercises={exercises}
                addExercise={addExercise}
                onSelect={onSelect}
              />
            ))
          )}
        </AnimatePresence>
      </VStack>
    </Box>
  );
}
