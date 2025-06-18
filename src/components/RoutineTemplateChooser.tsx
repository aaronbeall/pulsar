import { Box, Button, Flex, Heading, Input, Text, VStack, Tag, SimpleGrid, useColorModeValue, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FaArrowLeft, FaBook, FaMedal, FaPlayCircle, FaThumbsDown, FaRedo, FaPlus, FaSearch, FaTimes, FaDice } from 'react-icons/fa';
import { dailyWorkoutTemplates } from '../services/dailyWorkoutTemplates';
import { RoutineTemplate, routineTemplates } from '../services/routineTemplates';
import { AnimatePresence, motion } from 'framer-motion';
import { generateRandomRoutineName } from '../services/routineBuilderService';

const templateTextCache = new WeakMap<RoutineTemplate, string>();

// Utility to duplicate a value n times in an array
function dup<T>(val: T, n: number): T[] {
  return Array(n).fill(val).flat();
}

// Update getAllTemplateText to include description and keywords
function getAllTemplateText(template: RoutineTemplate) {
  if (templateTextCache.has(template)) {
    return templateTextCache.get(template)!;
  }
  // Collect all relevant text from the template to use for matching and scoring with relevance
  const base = [
    ...dup(template.name, 4),
    template.description || '',
    ...(template.keywords ? dup(template.keywords, 4) : []),
    ...Object.values(template.days).filter(Boolean),
    `${Object.keys(template.days).length}-day`,
    ...(template.nicknames || [])
  ];
  // Add all text from each referenced daily workout template
  const dayTemplatesText = Object.values(template.days)
    .filter(Boolean)
    .map(dayName => {
      const dayTmpl = dailyWorkoutTemplates.find(dt => dt.day.toLowerCase() === String(dayName).toLowerCase());
      if (!dayTmpl) return '';
      // Include day name, all exercise names, and nicknames
      return [
        dayTmpl.day,
        ...dayTmpl.exercises.map(e => e.name),
        ...(dayTmpl.nicknames || [])
      ].join(' ');
    });
  const text = [...base, ...dayTemplatesText].join(' ').toLowerCase();
  templateTextCache.set(template, text);
  return text;
}

function getRandomNickname(template: RoutineTemplate) {
  if (!template.nicknames || template.nicknames.length === 0) return '';
  return template.nicknames[Math.floor(Math.random() * template.nicknames.length)];
}

function getAllExercises(template: RoutineTemplate) {
  // Return a unique list of all exercise names used in the referenced daily workout templates
  const exerciseNames = Object.values(template.days)
    .filter(Boolean)
    .flatMap(dayName => {
      const dayTmpl = dailyWorkoutTemplates.find(dt => dt.day.toLowerCase() === String(dayName).toLowerCase());
      if (!dayTmpl) return [];
      return dayTmpl.exercises.map(e => e.name);
    });
  return Array.from(new Set(exerciseNames));
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreTemplate(template: RoutineTemplate, words: string[]) {
  const text = getAllTemplateText(template).toLowerCase();
  let score = 0;
  words.forEach(word => {
    if (!word) return;
    const safeWord = escapeRegExp(word.toLowerCase());
    const matches = text.match(new RegExp(safeWord, 'gi'));
    if (matches) score += matches.length;
  });
  return score;
}

function rankTemplates(templates: RoutineTemplate[], userWords: string[]) {
  return templates.map(t => ({
    template: t,
    score: scoreTemplate(t, userWords)
  }))
  .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
}

// Add prop type for RoutineTemplateChooser
interface RoutineTemplateChooserProps {
  userInput: string;
  onSelect: (template: RoutineTemplate) => void;
  onBack: () => void;
  onStartOver: () => void;
}

export const RoutineTemplateChooser: React.FC<RoutineTemplateChooserProps> = ({ userInput, onSelect, onBack, onStartOver }) => {
  const [search, setSearch] = useState('');
  const [rejected, setRejected] = useState<string[]>([]); // Only local state, no localStorage

  const userWords = useMemo(() =>
    userInput
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.endsWith('s') && w.length > 1 ? w.slice(0, -1) : w)
  , [userInput]);

  const ranked = useMemo(() => rankTemplates(routineTemplates, userWords), [userWords]);
  const filtered = useMemo(() => {
    const base = ranked.filter(({ template }) => !rejected.includes(template.name));
    if (!search.trim()) return base;
    const searchWords = search.trim().toLowerCase().split(/\s+/);
    return base
      .map(({ template, score }) => {
        const searchScore = scoreTemplate(template, searchWords);
        return {
          template,
          score: score + searchScore,
          searchScore
        };
      })
      .filter(({ searchScore }) => searchScore > 0)
      .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
  }, [ranked, search, rejected]);

  const top3 = filtered.slice(0, 3);

  function handleReject(template: RoutineTemplate) {
    setRejected(prev => [...prev, template.name]);
  }

  return (
    <Box maxW="600px" mx="auto" p={4}>
      <Flex align="center" mb={4}>
        <Button variant="ghost" size="sm" leftIcon={<FaArrowLeft />} onClick={onBack} mr={2}>
          Back
        </Button>
        <Heading size="md">Choose a Routine Template</Heading>
      </Flex>
      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none">
          <FaSearch color="gray.400" />
        </InputLeftElement>
        <Input
          placeholder="Search templates..."
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
          {top3.length === 0 ? (
            <Box textAlign="center" color="gray.400" py={8}>
              <Text fontSize="md">No routine templates found. Try a different search or reset your filters.</Text>
            </Box>
          ) : (
            top3.map(({ template, score }) => (
              <TemplateCard
                key={template.name}
                template={template}
                score={score}
                getRandomNickname={getRandomNickname}
                onSelect={onSelect}
                onReject={handleReject}
                setSearch={setSearch}
              />
            ))
          )}
        </AnimatePresence>
      </VStack>
      <Button
        mt={8}
        size="sm"
        variant="ghost"
        colorScheme="gray"
        leftIcon={<FaRedo />}
        w="100%"
        onClick={onStartOver}
      >
        Start over
      </Button>
    </Box>
  );
};


  // TemplateCard component for animated template display
  interface TemplateCardProps {
    template: RoutineTemplate;
    score: number;
    getRandomNickname: (template: RoutineTemplate) => string;
    onSelect: (template: RoutineTemplate) => void;
    onReject: (template: RoutineTemplate) => void;
    setSearch: (s: string) => void;
  }

  const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    score,
    getRandomNickname,
    onSelect,
    onReject,
    setSearch,
  }) => {
    // Only keep useColorModeValue for values that can't be replaced by _dark
    const highlightShadow = useColorModeValue('0 0 0 3px #0BC5EA, 0 2px 8px rgba(0,0,0,0.08)', 'md');
    const templateIconColor = useColorModeValue('#3182ce', '#63b3ed');
    const exerciseIconColor = useColorModeValue('cyan.700', 'cyan.200');
    const [showNaming, setShowNaming] = useState(false);
    const [routineName, setRoutineName] = useState(template.name);
    const nicknameSuggestions = template.nicknames || [];

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
          boxShadow={showNaming ? highlightShadow : 'md'}
          bg={showNaming ? 'cyan.50' : 'white'}
          _dark={{ bg: showNaming ? 'cyan.900' : 'gray.900', borderColor: showNaming ? 'cyan.300' : 'gray.700' }}
          borderColor={showNaming ? 'cyan.300' : 'gray.200'}
          position="relative"
          overflow="hidden"
        >
          {!showNaming ? (
            <>
              <Flex align="center" mb={1} gap={2}>
                <FaBook color={templateIconColor} />
                <Heading size="sm">{template.name}</Heading>
                <Tag colorScheme="cyan" ml={2}>{getRandomNickname(template)}</Tag>
              </Flex>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.300' }} mt={0} mb={template.keywords?.length ? 1 : 3}>
                {template.description}
              </Text>
              <Box position="absolute" top={2} right={3}>
                <Tag size="sm" colorScheme="gray" fontWeight={700} fontSize="xs" px={2} py={0.5} borderRadius="md" display="flex" alignItems="center" gap={1}>
                  <FaMedal style={{ marginRight: 2, fontSize: '1em', color: '#ECC94B' }} />
                  {score}
                </Tag>
              </Box>
              <Box as="section" mt={2} mb={2}>
                <SimpleGrid columns={Object.keys(template.days).length <= 4 ? Object.keys(template.days).length : 4} spacing={2} minChildWidth="110px">
                  {Object.entries(template.days)
                    .filter(([_, val]) => val)
                    .map(([day, val], idx) => (
                      <Box
                        key={day}
                        bg={'gray.50'}
                        _dark={{ bg: 'gray.800' }}
                        borderRadius="lg"
                        boxShadow="md"
                        borderWidth={0}
                        p={3}
                        minH="70px"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                      >
                        <Tag
                          size="sm"
                          colorScheme="cyan"
                          variant="subtle"
                          mb={1}
                          fontWeight={600}
                          letterSpacing="wide"
                          opacity={0.85}
                          borderRadius="md"
                          px={2}
                          py={0.5}
                        >
                          Day {idx + 1}
                        </Tag>
                        <Text fontSize="sm" color={'gray.700'} _dark={{ color: 'gray.200' }} fontWeight={500} textAlign="center" whiteSpace="pre-line">
                          {val}
                        </Text>
                      </Box>
                    ))}
                </SimpleGrid>
              </Box>
              <Flex align="center" mb={2} gap={2} wrap="wrap">
                <Text as="span" fontSize="sm" color={exerciseIconColor} fontWeight={600} mr={1}>
                  Exercises:
                </Text>
                <Text as="span" fontSize="xs" color="gray.400" _dark={{ color: 'gray.500' }}>
                  {getAllExercises(template).join(', ')}
                </Text>
              </Flex>
              {template.keywords && template.keywords.length > 0 && (
                <Flex wrap="wrap" gap={2} mb={2}>
                  {template.keywords.map(kw => (
                    <Tag
                      key={kw}
                      size="sm"
                      colorScheme="cyan"
                      variant="subtle"
                      cursor="pointer"
                      onClick={() => setSearch(kw)}
                    >
                      {kw}
                    </Tag>
                  ))}
                </Flex>
              )}
              <Flex gap={2} mt={2}>
                <Button
                  colorScheme="gray"
                  size="sm"
                  leftIcon={<FaThumbsDown />}
                  fontWeight={500}
                  variant="outline"
                  w="100%"
                  onClick={() => onReject(template)}
                >
                  No thanks
                </Button>
                <Button
                  colorScheme="cyan"
                  size="sm"
                  leftIcon={<FaPlayCircle />}
                  fontWeight={500}
                  w="100%"
                  onClick={() => setShowNaming(true)}
                >
                  Start with this template
                </Button>
              </Flex>
            </>
          ) : (
            <>
              <Flex align="center" mb={2} gap={2}>
                <FaBook color={templateIconColor} />
                <Heading size="sm">Name your routine</Heading>
              </Flex>
              <Input
                placeholder="Routine name"
                value={routineName}
                onChange={e => setRoutineName(e.target.value)}
                mb={3}
                size="md"
                autoFocus
              />
              {nicknameSuggestions.length > 0 && (
                <Flex wrap="wrap" gap={2} mb={3} align="center">
                  {nicknameSuggestions.map(nick => (
                    <Tag
                      key={nick}
                      colorScheme="cyan"
                      variant="subtle"
                      cursor="pointer"
                      boxShadow="sm"
                      _hover={{
                        bg: 'cyan.100',
                        color: 'cyan.800',
                        boxShadow: 'md',
                        _dark: { bg: 'cyan.700', color: 'white' },
                      }}
                      onClick={() => setRoutineName(nick)}
                    >
                      {nick}
                    </Tag>
                  ))}
                  <Tag
                    colorScheme="purple"
                    variant="subtle"
                    cursor="pointer"
                    boxShadow="sm"
                    _hover={{
                      bg: 'purple.100',
                      color: 'purple.800',
                      boxShadow: 'md',
                      _dark: { bg: 'purple.700', color: 'white' },
                    }}
                    onClick={() => {
                      setRoutineName(generateRandomRoutineName());
                    }}
                    aria-label="Generate a funny random name"
                  >
                    <FaDice style={{ marginRight: 4 }} />
                    Random
                  </Tag>
                </Flex>
              )}
              <Text fontSize="sm" color="gray.500" _dark={{ color: 'gray.400' }} mb={4}>
                After creating your routine, you can fully customize it: swap out template days, add or remove exercises, and even use AI to suggest changes or generate new workouts. Make it your own and adjust as you go!
              </Text>
              <Flex gap={2} mt={2}>
                <Button
                  colorScheme="gray"
                  variant="ghost"
                  leftIcon={<FaArrowLeft />}
                  onClick={() => setShowNaming(false)}
                  w="50%"
                >
                  Back
                </Button>
                <Button
                  colorScheme="cyan"
                  leftIcon={<FaPlus />}
                  onClick={() => onSelect({ ...template, name: routineName.trim() || template.name })}
                  w="50%"
                >
                  Create Routine
                </Button>
              </Flex>
            </>
          )}
        </Box>
      </motion.div>
    );
  };