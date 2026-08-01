import React from 'react';
import {
  Box,
  Divider,
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
  useColorModeValue,
  useDisclosure,
  useToast,
  Image,
  Text,
  Container,
  useToken,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { FaBars, FaSun, FaMoon, FaHome, FaDumbbell, FaCog, FaHistory, FaDownload, FaInfoCircle } from 'react-icons/fa';
import { Routes, Route, Link, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';
import History from './views/History';
import About from './views/About';
import { usePulsarStoreInit } from './store/pulsarStore';
import { useInstallPromptInit, useInstallPromptStore } from './store/installPromptStore';
import logoSvg from './assets/logo.svg';

const App: React.FC = () => {
  usePulsarStoreInit(); // Load all data from DB into Zustand store on app mount
  useInstallPromptInit(); // Listen for PWA installability as early as possible
  const { colorMode, setColorMode } = useColorMode();
  const [colorScheme, setColorScheme] = React.useState<string>(() => {
    return localStorage.getItem('colorScheme') || 'red';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [headerBgColor] = useToken('colors', [`${colorScheme}.500`]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { deferredPrompt, isInstalled, isIOS, promptInstall } = useInstallPromptStore();
  const canPromptInstall = !!deferredPrompt;
  const showInstallItem = !isInstalled && (canPromptInstall || isIOS);
  const menuItemHoverBg = useColorModeValue('gray.100', 'gray.700');

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme);
  };

  const handleInstallClick = async () => {
    if (canPromptInstall) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast({ title: 'Installing Pulsar...', status: 'success', duration: 2000, isClosable: true });
      }
    } else if (isIOS) {
      toast({
        title: 'Install Pulsar',
        description: 'Tap the Share icon, then "Add to Home Screen".',
        status: 'info',
        duration: 6000,
        isClosable: true,
      });
    }
    onClose();
  };

  const navItems: { to: string; label: string; icon: IconType; isActive: (path: string) => boolean }[] = [
    { to: '/', label: 'Home', icon: FaHome, isActive: (path) => path === '/' },
    { to: '/workout', label: 'Workout', icon: FaDumbbell, isActive: (path) => path.startsWith('/workout') },
    { to: '/history', label: 'History', icon: FaHistory, isActive: (path) => path === '/history' },
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
                onClick={onOpen}
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
            <Route path="/history" element={<History />} />
            <Route
              path="/settings"
              element={<Settings colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />}
            />
            <Route path="/about" element={<About />} />
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

      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" display="flex" alignItems="center" gap={2}>
            <Image src={logoSvg} alt="" boxSize="24px" />
            Menu
          </DrawerHeader>
          <DrawerBody px={0} py={4}>
            <Text px={4} mb={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
              Appearance
            </Text>
            <Flex px={4} gap={2} mb={4}>
              {(['light', 'dark'] as const).map((mode) => {
                const active = colorMode === mode;
                return (
                  <Flex
                    key={mode}
                    as="button"
                    flex={1}
                    direction="column"
                    align="center"
                    gap={1}
                    py={3}
                    borderRadius="lg"
                    borderWidth="2px"
                    borderColor={active ? `${colorScheme}.500` : 'transparent'}
                    bg={active ? `${colorScheme}.50` : menuItemHoverBg}
                    _dark={{ bg: active ? `${colorScheme}.900` : 'gray.700' }}
                    transition="border-color 0.2s"
                    onClick={() => setColorMode(mode)}
                  >
                    <Icon as={mode === 'light' ? FaSun : FaMoon} boxSize={5} color={active ? `${colorScheme}.500` : undefined} />
                    <Text fontSize="sm" fontWeight={active ? 'bold' : 'medium'} textTransform="capitalize">
                      {mode}
                    </Text>
                  </Flex>
                );
              })}
            </Flex>

            <Divider mb={2} />

            <Flex
              as="button"
              w="100%"
              align="center"
              gap={3}
              px={4}
              py={3}
              transition="background-color 0.2s"
              _hover={{ bg: menuItemHoverBg }}
              onClick={() => { navigate('/settings'); onClose(); }}
            >
              <Icon as={FaCog} boxSize={4} color="gray.500" />
              <Text fontSize="sm" fontWeight="medium">Settings</Text>
            </Flex>

            <Flex
              as="button"
              w="100%"
              align="center"
              gap={3}
              px={4}
              py={3}
              transition="background-color 0.2s"
              _hover={{ bg: menuItemHoverBg }}
              onClick={() => { navigate('/about'); onClose(); }}
            >
              <Icon as={FaInfoCircle} boxSize={4} color="gray.500" />
              <Text fontSize="sm" fontWeight="medium">About</Text>
            </Flex>

            {showInstallItem && (
              <Flex
                as="button"
                w="100%"
                align="center"
                gap={3}
                px={4}
                py={3}
                transition="background-color 0.2s"
                _hover={{ bg: menuItemHoverBg }}
                onClick={handleInstallClick}
              >
                <Icon as={FaDownload} boxSize={4} color="gray.500" />
                <Text fontSize="sm" fontWeight="medium">Install App</Text>
              </Flex>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

export default App;
