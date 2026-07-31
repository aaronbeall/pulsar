import React from 'react';
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Heading,
  useColorMode,
  Image,
  Text,
  Container,
  useToken,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { FaSun, FaMoon, FaHome, FaDumbbell, FaCog } from 'react-icons/fa';
import { Routes, Route, Link, useLocation, Link as RouterLink } from 'react-router-dom';
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';
import { usePulsarStoreInit } from './store/pulsarStore';
import { useInstallPromptInit } from './store/installPromptStore';
import logoSvg from './assets/logo.svg';

const App: React.FC = () => {
  usePulsarStoreInit(); // Load all data from DB into Zustand store on app mount
  useInstallPromptInit(); // Listen for PWA installability as early as possible
  const { colorMode, toggleColorMode } = useColorMode();
  const [colorScheme, setColorScheme] = React.useState<string>(() => {
    return localStorage.getItem('colorScheme') || 'red';
  });
  const location = useLocation();
  const [headerBgColor] = useToken('colors', [`${colorScheme}.500`]);

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme);
  };

  const navItems: { to: string; label: string; icon: IconType; isActive: (path: string) => boolean }[] = [
    { to: '/', label: 'Home', icon: FaHome, isActive: (path) => path === '/' },
    { to: '/workout', label: 'Workout', icon: FaDumbbell, isActive: (path) => path.startsWith('/workout') },
    { to: '/settings', label: 'Settings', icon: FaCog, isActive: (path) => path === '/settings' },
  ];

  return (
    <Flex direction="column" minHeight="100dvh">
      <Box
        bg={`${colorScheme}.500`}
        color="white"
        transition="all 0.2s ease-in-out"
        position="relative"
        zIndex="2"
        boxShadow="lg"
      >
        <Container maxW="container.lg">
          <Flex py={{ base: 3, sm: 4 }} justify="space-between" align="center">
            <Flex align="center" gap={2}>
              <RouterLink to="/">
                <Flex
                  align="center"
                  gap={3}
                  _hover={{ transform: 'translateY(-1px)' }}
                  transition="transform 0.2s"
                >
                  <Image
                    src={logoSvg}
                    alt="App Icon"
                    boxSize="32px"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                  />
                  <Box>
                    <Heading size="md" fontWeight="black" textShadow="0 2px 4px rgba(0,0,0,0.1)">
                      PULSAR
                    </Heading>
                    <Text
                      display={{ base: 'none', sm: 'block' }}
                      fontSize="xs"
                      color="whiteAlpha.800"
                      letterSpacing="wide"
                      mt={-1}
                    >
                      PERSONALIZED WORKOUTS SIMPLIFIED
                    </Text>
                  </Box>
                </Flex>
              </RouterLink>
            </Flex>

            <Flex gap={3}>
              <IconButton
                aria-label="Toggle Theme"
                icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
                onClick={toggleColorMode}
                variant="ghost"
                _hover={{ bg: 'whiteAlpha.300' }}
                size="md"
              />
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box
        flex="1 1 auto"
        bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}
        position="relative"
        zIndex="1"
        pb={20}
      >
        <Container maxW="container.lg" py={6}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workout/*" element={<Workout />} />
            <Route
              path="/settings"
              element={<Settings colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />}
            />
          </Routes>
        </Container>
      </Box>

      <Box
        as="nav"
        bg={`${colorScheme}.500`}
        color="white"
        pt={1.5}
        pb="calc(env(safe-area-inset-bottom, 0px) + 6px)"
        position="fixed"
        left={0}
        right={0}
        bottom={0}
        zIndex={100}
        boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)"
      >
        <Container maxW="container.lg">
          <Flex justify="space-around" align="stretch">
            {navItems.map((item) => {
              const active = item.isActive(location.pathname);
              return (
                <Flex
                  key={item.to}
                  as={Link}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  direction="column"
                  align="center"
                  justify="center"
                  flex={1}
                  gap={0.5}
                  py={1}
                  borderRadius="lg"
                  transition="background-color 0.2s"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  _active={{ bg: 'whiteAlpha.300' }}
                >
                  <Flex
                    align="center"
                    justify="center"
                    boxSize="36px"
                    borderRadius="full"
                    bg={active ? 'whiteAlpha.300' : 'transparent'}
                    transition="background-color 0.2s"
                  >
                    <Icon as={item.icon} boxSize={5} opacity={active ? 1 : 0.8} />
                  </Flex>
                  <Text
                    fontSize="xs"
                    fontWeight={active ? 'bold' : 'medium'}
                    opacity={active ? 1 : 0.75}
                    transition="opacity 0.2s"
                  >
                    {item.label}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
};

export default App;
