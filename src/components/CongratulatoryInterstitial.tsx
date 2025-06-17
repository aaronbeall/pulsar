import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { FaFlagCheckered } from 'react-icons/fa';
import { Counter } from '../components/Counter';

export const CongratulatoryInterstitial: React.FC<{
  streak: number;
  streakType: 'none' | 'start' | 'continue';
  isPerfect: boolean;
  totalWorkouts: number;
  onDismiss: () => void;
}> = ({ streak, streakType, isPerfect, totalWorkouts, onDismiss }) => {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setStep(1), 900));
    if (streak > 0 && streakType !== 'none') {
      timers.push(setTimeout(() => setStep(2), 1800));
    }
    if (isPerfect) {
      timers.push(setTimeout(() => setStep(3), 2700));
      timers.push(setTimeout(() => setStep(4), 3700));
    } else {
      timers.push(setTimeout(() => setStep(3), 2700));
      timers.push(setTimeout(() => setStep(4), 3700));
    }
    return () => timers.forEach(clearTimeout);
  }, [streak, streakType, isPerfect]);

  // Neon/glassy border and animated emoji
  return (
    <Flex direction="column" align="center" minH="60vh" w="100%" p={6}>
      <Box
        borderRadius="1.5em"
        bgGradient="linear(90deg, #00eaff 0%, #7f5fff 50%, #ff46a1 100%)"
        p={{ base: '3.5px', md: '4.5px' }}
        width={{ base: '100%', md: '80%' }}
        maxW="480px"
        boxShadow="0 0 0 2px #00eaff55, 0 0 16px 0 #7f5fff33, 0 4px 32px 0 #0008"
        mb={8}
        display="flex"
        alignItems="stretch"
        justifyContent="center"
      >
        <Flex
          direction="column"
          align="center"
          borderRadius="1.3em"
          p={{ base: 6, md: 10 }}
          width="100%"
          minHeight="320px"
          bg="rgba(18,22,40,0.88)"
          style={{
            backdropFilter: 'blur(16px)',
            width: '100%',
          }}
          justify="center"
          position="relative"
        >
          <AnimatePresence mode="wait">
            {step >= 0 && (
              <motion.div
                key="congrats"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
                style={{ width: '100%' }}
              >
                <Box
                  fontSize={{ base: '3.5em', md: '4.2em' }}
                  mb={2}
                  aria-label="celebrate"
                  style={{
                    userSelect: 'none',
                    filter: 'drop-shadow(0 0 32px #00eaff) drop-shadow(0 0 64px #7f5fff) drop-shadow(0 0 96px #ff46a1)',
                    textShadow: '0 0 32px #00eaff, 0 0 64px #7f5fff, 0 0 96px #ff46a1',
                    transition: 'filter 0.2s',
                    textAlign: 'center',
                  }}
                  as={motion.div}
                  initial={{ scale: 0.7, rotate: -10 }}
                  animate={{ scale: 1.18, rotate: 0 }}
                >
                  🎉
                </Box>
                <Heading
                  size="2xl"
                  mb={1}
                  bgGradient="linear(90deg, #00eaff 0%, #7f5fff 50%, #ff46a1 100%)"
                  bgClip="text"
                  textAlign="center"
                  fontWeight="extrabold"
                  letterSpacing="tight"
                  style={{ lineHeight: 1.1 }}
                >
                  Congratulations!
                </Heading>
                <Text fontSize="xl" color="gray.400" mb={4} textAlign="center">
                  You finished your workout!
                </Text>
              </motion.div>
            )}
            {step >= 1 && streak > 0 && streakType !== 'none' && (
              <motion.div
                key="streak"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.7, delay: 0.1, type: 'spring', bounce: 0.4 }}
                style={{ width: '100%' }}
              >
                <Flex align="center" justify="center" mb={2} gap={2} minH="2.7em">
                  <motion.span
                    key="flame"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.18, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    style={{
                      fontSize: '2.3em',
                      display: 'inline-block',
                      marginRight: 10,
                      filter: 'drop-shadow(0 0 32px #00eaff) drop-shadow(0 0 64px #7f5fff) drop-shadow(0 0 96px #ff46a1)',
                      textShadow: '0 0 24px #00eaff, 0 0 48px #7f5fff, 0 0 64px #ff46a1',
                      transition: 'filter 0.2s',
                    }}
                    aria-label="streak"
                  >
                    🔥
                  </motion.span>
                  <Box position="relative">
                    <Counter from={0} to={streak} delay={300} duration={900} fontSize="2.3em" color="#ffb300" fontWeight={900} style={{marginRight: 8, textShadow: '0 2px 8px #ffb30088'}} />
                  </Box>
                  <Text
                    fontSize="md"
                    fontWeight="bold"
                    color="#00eaff"
                    letterSpacing="tight"
                    ml={2}
                    style={{
                      textShadow: '0 1px 12px #00eaff99, 0 1px 0 #222',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {streakType === 'start' ? 'Streak started!' : streakType === 'continue' ? 'Streak continued!' : ''}
                  </Text>
                </Flex>
              </motion.div>
            )}
            {step >= 2 && isPerfect && (
              <motion.div
                key="perfect"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.7, delay: 0.1, type: 'spring', bounce: 0.4 }}
                style={{ width: '100%' }}
              >
                <Flex align="center" justify="center" mb={2} gap={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="yellow.400" mr={1} textShadow="0 2px 8px #ffe06688">🏆</Text>
                  <Text fontSize="lg" color="yellow.500" fontWeight="semibold" letterSpacing="wide" textShadow="0 1px 6px #ffe06644">Perfect Workout!</Text>
                </Flex>
              </motion.div>
            )}
            {step >= 3 && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.7, delay: 0.1, type: 'spring', bounce: 0.4 }}
                style={{ width: '100%' }}
              >
                <Flex align="center" justify="center" mb={2} gap={2}>
                  <Box as={FaFlagCheckered} color="cyan.400" fontSize="2xl" mr={1} filter="drop-shadow(0 0 8px #00eaff88)" />
                  <Counter from={0} to={totalWorkouts} delay={300} duration={900} fontSize="2.2em" color="#00eaff" fontWeight={900} style={{marginRight: 6, textShadow: '0 1px 6px #00eaff44'}} />
                  <Text fontSize="lg" color="cyan.500" fontWeight="bold" letterSpacing="wide" textShadow="0 1px 6px #00eaff44">workouts completed</Text>
                </Flex>
              </motion.div>
            )}
          </AnimatePresence>
          {step >= 4 && (
            <motion.div
              key="dismiss"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.7, delay: 0.1, type: 'spring', bounce: 0.4 }}
              style={{ width: '100%' }}
            >
              <Flex justify="center">
                <Button colorScheme="cyan" size="lg" mt={6} onClick={onDismiss} leftIcon={<Box as={FaFlagCheckered} fontSize="1.3em" />}>
                  Continue
                </Button>
              </Flex>
            </motion.div>
          )}
        </Flex>
      </Box>
    </Flex>
  );
};