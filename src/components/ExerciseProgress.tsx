import { getHowToUrl } from '../utils/webUtils';
import React, { useState, useEffect, useRef } from 'react';
import { useUrlModal } from '../hooks/useUrlModal';
import { 
  Box, 
  Button, 
  VStack, 
  Text, 
  CircularProgress, 
  CircularProgressLabel, 
  Flex, 
  HStack, 
  useColorModeValue,
  Heading,
  Icon,
  ScaleFade,
  useBreakpointValue,
  IconButton
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaPlay, FaCheck, FaStopwatch, FaPlayCircle, FaInfoCircle } from 'react-icons/fa';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';
import { Exercise, WorkoutExercise } from '../models/types';
import { formatSeconds, getSetTimer, setEndsAt } from '../utils/setProgress';
import {
  ScheduledCue,
  cancelCue,
  cueHasPlayed,
  playSetEndCueNow,
  scheduleSetEndCue,
  unlockAudio,
  vibrateSetEnd,
} from '../utils/setEndCue';

const breathe = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const MotionBox = motion(Box);
const MotionIcon = motion(Icon);

const SetIndicator: React.FC<{
  isCompleted: boolean;
  isActive: boolean;
  isCurrentSet: boolean;
}> = ({ isCompleted, isActive, isCurrentSet }) => {
  const activeBg = useColorModeValue('cyan.500', 'cyan.400');
  const completedBg = useColorModeValue('green.500', 'green.400');
  const inactiveBg = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <MotionBox
      width="30px"
      height="30px"
      borderRadius="full"
      bg={isCompleted ? completedBg : isCurrentSet ? activeBg : inactiveBg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      initial={false}
      animate={{
        scale: isCurrentSet && isActive ? 1.1 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {isCompleted && (
          <MotionBox
            key="check-container"
            display="flex"
            alignItems="center"
            justifyContent="center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 10,
              mass: 0.75
            }}
          >
            <Icon
              as={FaCheck}
              color="white"
              fontSize="xs"
            />
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  );
};

interface ExerciseProgressProps {
  exercise: WorkoutExercise;
  currentSet: number;
  exerciseDetail: Exercise | undefined;
  /** Start the next set at `startedAt` (recorded as `currentSetStartedAt`). */
  onStartSet: (startedAt: number) => void;
  /**
   * Record the current set as done; for timed sets, how many seconds were done. `endedAt`
   * is when the set really ended, if not now (a timed set that ran out while locked).
   */
  onCompleteSet: (durationDoneSec?: number, endedAt?: number) => void;
}

const ExerciseProgress: React.FC<ExerciseProgressProps> = ({
  exercise,
  currentSet,
  exerciseDetail,
  onStartSet,
  onCompleteSet,
}) => {
  // All timing is derived from wall-clock timestamps (see utils/setProgress.ts): the
  // interval below only triggers re-renders, so a throttled or frozen timer (screen
  // locked, app in background) can delay the display but never make it wrong.
  //
  // Starting/completing a set saves to IndexedDB before the `exercise` prop catches up,
  // so the tap is reflected locally right away (`pending`) until the prop matches. Without
  // this the old button stays up for a moment and a quick second tap counts twice.
  const [pending, setPending] = useState<{ startedAt: number | undefined } | null>(null);
  useEffect(() => {
    if (pending && exercise.currentSetStartedAt === pending.startedAt) setPending(null);
  }, [exercise.currentSetStartedAt, pending]);
  const setStartedAt = pending ? pending.startedAt : exercise.currentSetStartedAt;
  const isActive = !!setStartedAt;
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const isRestPeriod = !isActive && restStartedAt !== null;
  const [now, setNow] = useState(() => Date.now());
  const detailsDialog = useUrlModal('exercise');
  const cueRef = useRef<ScheduledCue | null>(null);
  const completedForRef = useRef<number | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const activeColor = useColorModeValue('cyan.500', 'cyan.400');
  const restBgColor = useColorModeValue('orange.50', 'orange.900');
  const restTextColor = useColorModeValue('orange.600', 'orange.200');

  useEffect(() => {
    if (!isActive && !isRestPeriod) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isActive, isRestPeriod]);

  // Pre-schedule the end-of-set beeps on the audio clock. Re-schedule on return to the
  // foreground, in case the audio clock was paused while the app was hidden.
  useEffect(() => {
    const duration = exercise.duration;
    if (!setStartedAt || !duration) return;
    const endAt = setEndsAt(setStartedAt, duration);
    const schedule = () => {
      cancelCue(cueRef.current);
      cueRef.current = Date.now() < endAt ? scheduleSetEndCue(endAt) : null;
    };
    schedule();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() < endAt) schedule();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      // Set ended early or left the screen: silence pending beeps. A cue that already
      // started playing at the natural end is left to finish.
      if (!cueHasPlayed(cueRef.current)) cancelCue(cueRef.current);
      cueRef.current = null;
    };
  }, [setStartedAt, exercise.duration]);

  const timer = setStartedAt ? getSetTimer(setStartedAt, exercise.duration, now) : null;
  const timeElapsed = timer?.elapsedSec ?? 0;

  // A timed set that has run its course completes itself, with a beep + buzz. This also
  // catches up a set that ended while the phone was locked, the moment the app is back.
  useEffect(() => {
    if (!setStartedAt || !exercise.duration || !timer?.isDone) return;
    if (completedForRef.current === setStartedAt) return;
    completedForRef.current = setStartedAt;
    if (!cueHasPlayed(cueRef.current)) {
      cancelCue(cueRef.current);
      playSetEndCueNow();
    }
    cueRef.current = null;
    vibrateSetEnd();
    const endedAt = setEndsAt(setStartedAt, exercise.duration);
    setRestStartedAt(endedAt);
    setPending({ startedAt: undefined });
    onCompleteSet(exercise.duration, endedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStartedAt, timer?.isDone]);

  const handleStart = () => {
    unlockAudio(); // must happen inside the tap for iOS to allow the end beep
    if (setStartedAt) return; // already running (double tap)
    const startedAt = Date.now();
    setRestStartedAt(null);
    setNow(startedAt);
    setPending({ startedAt });
    onStartSet(startedAt);
  };

  const handleComplete = () => {
    if (!setStartedAt) return; // already completed (double tap)
    completedForRef.current = setStartedAt;
    setRestStartedAt(Date.now());
    setPending({ startedAt: undefined });
    onCompleteSet(exercise.duration ? timeElapsed : undefined);
  };

  const handleNext = handleStart;
  const restTimeElapsed = restStartedAt ? Math.max(0, Math.floor((now - restStartedAt) / 1000)) : 0;

  const progress = timer?.progress ?? 0;

  const isCompleted = exercise.completedAt !== undefined;

  const fontSize = useBreakpointValue({ base: "4xl", md: "5xl" });
  const repsFontSize = useBreakpointValue({ base: "2xl", md: "3xl" });
  const timeFontSize = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box 
      p={6} 
      borderRadius="xl"
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="lg"
      width="100%"
      maxWidth="500px"
      mx="auto"
      position="relative"
      overflow="hidden"
    >
      {/* Exercise image background and How To button overlay */}
      {exerciseDetail?.coverImageUrl && (
        <Box
          position="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          zIndex={0}
        >
          <img
            src={exerciseDetail.coverImageUrl}
            alt={exerciseDetail.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22 }}
          />
          {/* Gradient overlay: light tint in light mode, dark in dark mode */}
          <Box
            position="absolute"
            top={0}
            left={0}
            w="100%"
            h="100%"
            pointerEvents="none"
            style={{
              background: useColorModeValue(
                'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.32) 100%)',
                'linear-gradient(135deg, rgba(30,30,40,0.45) 0%, rgba(0,0,0,0.32) 100%)'
              ),
              mixBlendMode: 'multiply',
            }}
          />
        </Box>
      )}
      {/* Info and How To buttons */}
      <Box position="absolute" top={2} right={2} zIndex={2} display="flex" gap={2}>
        {exerciseDetail && (
          <IconButton
            size="sm"
            colorScheme="blue"
            variant="ghost"
            aria-label="Exercise Info"
            icon={<FaInfoCircle />}
            onClick={() => exerciseDetail && detailsDialog.open(exerciseDetail.id)}
            bg="rgba(255,255,255,0.7)"
            _dark={{ bg: 'rgba(26,32,44,0.7)' }}
            _hover={{ bg: 'rgba(56,189,248,0.8)', opacity: 1 }}
            opacity={0.7}
            boxShadow="sm"
            transition="opacity 0.2s"
          />
        )}
        {exerciseDetail && getHowToUrl(exerciseDetail) && (
          <IconButton
            as="a"
            href={getHowToUrl(exerciseDetail)}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            colorScheme="cyan"
            variant="ghost"
            aria-label="Watch how-to video"
            icon={<FaPlayCircle />}
            bg="rgba(255,255,255,0.7)"
            _dark={{ bg: 'rgba(26,32,44,0.7)' }}
            _hover={{ bg: 'rgba(56,189,248,0.8)', opacity: 1 }}
            opacity={0.7}
            boxShadow="sm"
            transition="opacity 0.2s"
          />
        )}
      </Box>
      {exerciseDetail && detailsDialog.isOpenFor(exerciseDetail.id) && (
        <ExerciseDetailsDialog
          onClose={detailsDialog.close}
          exerciseId={exerciseDetail.id}
          mode="view"
        />
      )}
      <VStack spacing={6} align="center" position="relative">
        <VStack spacing={1} textAlign="center">
          <Heading 
            size="lg" 
            color={isRestPeriod ? restTextColor : activeColor}
            transition="color 0.2s"
          >
            {exerciseDetail?.name || 'Exercise'}
          </Heading>
          <Text fontSize="sm" color="gray.500" fontWeight="medium">
            Set {currentSet + 1} of {exercise.sets}
          </Text>
        </VStack>
        
        <HStack spacing={2} justify="center" my={4}>
          {Array.from({ length: exercise.sets }).map((_, idx) => (
            <SetIndicator
              key={idx}
              isCompleted={idx < currentSet}
              isActive={isActive}
              isCurrentSet={idx === currentSet}
            />
          ))}
        </HStack>
        
        {isRestPeriod ? (
          <MotionBox
            p={6}
            borderRadius="xl"
            bg={restBgColor}
            width="100%"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <VStack spacing={3}>
              <Icon as={FaStopwatch} fontSize="2xl" color={restTextColor} />
              <Text
                fontSize="3xl"
                fontWeight="bold"
                color={restTextColor}
                animation={`${breathe} 2s ease-in-out infinite`}
              >
                Rest Time: {formatSeconds(restTimeElapsed)}
              </Text>
              <Button 
                colorScheme="cyan"
                size="lg"
                width="100%"
                onClick={handleNext}
                leftIcon={<FaPlay />}
              >
                Start Set {currentSet + 1}
              </Button>
            </VStack>
          </MotionBox>
        ) : (
          <VStack spacing={6} width="100%">
            <Box position="relative">
              <CircularProgress
                isIndeterminate={!exercise.duration && isActive}
                value={exercise.duration ? (isActive ? progress : 0) : 0}
                color={activeColor}
                size="180px"
                thickness="4px"
                trackColor={useColorModeValue('gray.100', 'gray.700')}
                capIsRound
              >
                <CircularProgressLabel>
                  <VStack spacing={2} align="center">
                    {exercise.duration ? (
                      <Text fontSize={fontSize} fontWeight="bold">
                        {formatSeconds(timer?.remainingSec ?? exercise.duration)}
                      </Text>
                    ) : (
                      <>
                        <Text 
                          fontSize={repsFontSize} 
                          fontWeight="bold"
                          color={isActive ? activeColor : undefined}
                          animation={isActive ? `${breathe} 2s ease-in-out infinite` : undefined}
                        >
                          {exercise.reps} reps
                        </Text>
                        {isActive && (
                          <Text 
                            fontSize={timeFontSize} 
                            color="gray.500"
                            fontWeight="medium"
                          >
                            {formatSeconds(timeElapsed)}
                          </Text>
                        )}
                      </>
                    )}
                  </VStack>
                </CircularProgressLabel>
              </CircularProgress>
            </Box>

            {!isActive ? (
              <Button 
                colorScheme="cyan"
                size="lg"
                width="100%"
                onClick={handleStart}
                leftIcon={<FaPlay />}
              >
                Start Set {currentSet + 1}
              </Button>
            ) : (
              <Button 
                colorScheme="green"
                size="lg"
                width="100%"
                onClick={handleComplete}
                leftIcon={<FaCheckCircle />}
              >
                {exercise.duration ? 'End Set Early' : `Complete ${exercise.reps} Reps`}
              </Button>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default ExerciseProgress;