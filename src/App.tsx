import React, { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
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
import { FaBars, FaHome, FaDumbbell, FaChartLine } from 'react-icons/fa';
import { useUrlModal } from './hooks/useUrlModal';
import { Routes, Route, Link, useLocation, Link as RouterLink, Navigate } from 'react-router-dom';
import ShareSheet from './components/ShareSheet';
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';
import Activity from './views/Activity';
import About from './views/About';
import { usePulsarStoreInit } from './store/pulsarStore';
import { useInstallPromptInit } from './store/installPromptStore';
import AppMenu from './components/AppMenu';
import InstallAppAlert from './components/InstallAppAlert';
import logoSvg from './assets/logo.svg';
import { requestPersistentStorage } from './utils/storagePersistence';
import { useCheckoutReturn } from './hooks/useCheckoutReturn';
import { useSystemColorModeSync } from './store/themeStore';

const App: React.FC = () => {
  usePulsarStoreInit(); // Load all data from DB into Zustand store on app mount
  useInstallPromptInit(); // Listen for PWA installability as early as possible
  useCheckoutReturn(); // Thank-you toast and account refresh after Stripe Checkout, on any page
  // Ask the browser not to evict our IndexedDB data. Fire-and-forget: Settings shows the result.
  useEffect(() => { requestPersistentStorage(); }, []);
  useSystemColorModeSync(); // Follow the phone's light/dark setting while set to System
  const { colorMode } = useColorMode();
  const [colorScheme, setColorScheme] = useState<string>(() => {
    return localStorage.getItem('colorScheme') || 'red';
  });
  const location = useLocation();
  const [headerBgColor] = useToken('colors', [`${colorScheme}.500`]);
  // The side menu lives in the URL (?menu=1) so Back closes it.
  const menu = useUrlModal('menu');

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme);
  };

  const navItems: { to: string; label: string; icon: IconType; isActive: (path: string) => boolean }[] = [
    { to: '/', label: 'Home', icon: FaHome, isActive: (path) => path === '/' },
    { to: '/workout', label: 'Workout', icon: FaDumbbell, isActive: (path) => path.startsWith('/workout') },
    { to: '/activity', label: 'Activity', icon: FaChartLine, isActive: (path) => path === '/activity' },
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
                aria-label="Open menu"
                icon={<FaBars />}
                onClick={() => menu.open()}
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
            <Route path="/activity" element={<Activity />} />
            <Route path="/history" element={<Navigate to={{ pathname: '/activity', search: location.search }} replace />} />
            <Route
              path="/settings"
              element={<Settings colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />}
            />
            <Route path="/about" element={<About />} />
          </Routes>
        </Container>
      </Box>

      {/* Floats over every view, just above the bottom nav, until installed or dismissed. */}
      <InstallAppAlert />

      <Box
        as="nav"
        aria-label="Main navigation"
        bg={`${colorScheme}.500`}
        color="white"
        pt={1.5}
        pb="calc(env(safe-area-inset-bottom, 0px) + 6px)"
        position="fixed"
        left={0}
        right={0}
        bottom={0}
        zIndex="docked"
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

      <Drawer isOpen={menu.isOpen} placement="right" onClose={menu.close} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" display="flex" alignItems="center" gap={2}>
            <Image src={logoSvg} alt="" boxSize="24px" />
            Menu
          </DrawerHeader>
          <DrawerBody px={0} py={4}>
            <AppMenu menu={menu} colorScheme={colorScheme} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <ShareSheet />
    </Flex>
  );
};

export default App;
