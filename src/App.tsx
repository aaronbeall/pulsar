import React from 'react';
import {
  Button,
  Box,
  Flex,
  IconButton,
  Heading,
  useColorMode,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  SimpleGrid,
  Image,
  Text,
  Container,
  useToken,
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaPalette, FaHome, FaDumbbell, FaCog } from 'react-icons/fa';
import { Routes, Route, Link, useLocation, Link as RouterLink } from 'react-router-dom';
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';
import { usePulsarStoreInit } from './store/pulsarStore';
import LogoSvg from '../assets/logo.svg';

const App: React.FC = () => {
  usePulsarStoreInit(); // Load all data from DB into Zustand store on app mount
  const { colorMode, toggleColorMode } = useColorMode();
  const [colorScheme, setColorScheme] = React.useState<string>(() => {
    return localStorage.getItem('colorScheme') || 'cyan';
  });
  const location = useLocation();
  const [headerBgColor] = useToken('colors', [`${colorScheme}.500`]);

  const colorSchemes = [
    'blue', 'cyan', 'teal', 'green', 'yellow', 
    'orange', 'red', 'pink', 'purple', 'gray'
  ];

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme);
  };

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
          <Flex py={4} justify="space-between" align="center">
            <Flex align="center" gap={2}>
              <RouterLink to="/">
                <Flex 
                  align="center" 
                  gap={3} 
                  _hover={{ transform: 'translateY(-1px)' }}
                  transition="transform 0.2s"
                >
                  <Image 
                    src={LogoSvg} 
                    alt="App Icon" 
                    boxSize="32px"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                  />
                  <Box>
                    <Heading size="md" fontWeight="black" textShadow="0 2px 4px rgba(0,0,0,0.1)">
                      PULSAR
                    </Heading>
                    <Text 
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
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FaPalette />}
                  variant="ghost"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  size="md"
                  aria-label="Select Color Scheme"
                />
                <MenuList p={4}>
                  <SimpleGrid columns={5} spacing={2}>
                    {colorSchemes.map((scheme) => (
                      <MenuItem
                        key={scheme}
                        onClick={() => handleColorSchemeChange(scheme)}
                        p={0}
                        m={0}
                        bg="transparent"
                      >
                        <Box
                          bg={`${scheme}.500`}
                          w={6}
                          h={6}
                          borderRadius="full"
                          border={scheme === colorScheme ? '2px solid white' : '2px solid transparent'}
                          cursor="pointer"
                          transition="transform 0.2s"
                          _hover={{ transform: 'scale(1.1)' }}
                        />
                      </MenuItem>
                    ))}
                  </SimpleGrid>
                </MenuList>
              </Menu>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box 
        flex="1 1 auto" 
        bg={colorMode === 'light' ? 'gray.50' : 'gray.900'} 
        position="relative"
        zIndex="1"
        pb={24}
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
        bg={`${colorScheme}.500`} 
        color="white" 
        pt={4}
        pb={4}
        position="fixed" 
        left={0}
        right={0}
        bottom={0}
        zIndex={100}
        boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)"
        flexShrink={0}
        width="100vw"
      >
        <Container maxW="container.lg">
          <Flex justify="space-around" align="center">
            <Button
              as={Link}
              to="/"
              variant={location.pathname === '/' ? 'solid' : 'ghost'}
              leftIcon={<FaHome />}
              size="lg"
              _hover={{ bg: 'whiteAlpha.300' }}
              transition="all 0.2s"
              fontWeight={location.pathname === '/' ? 'bold' : 'normal'}
            >
              Home
            </Button>
            <Button
              as={Link}
              to="/workout"
              variant={location.pathname.startsWith('/workout') ? 'solid' : 'ghost'}
              leftIcon={<FaDumbbell />}
              size="lg"
              _hover={{ bg: 'whiteAlpha.300' }}
              transition="all 0.2s"
              fontWeight={location.pathname.startsWith('/workout') ? 'bold' : 'normal'}
            >
              Workout
            </Button>
            <Button
              as={Link}
              to="/settings"
              variant={location.pathname === '/settings' ? 'solid' : 'ghost'}
              leftIcon={<FaCog />}
              size="lg"
              _hover={{ bg: 'whiteAlpha.300' }}
              transition="all 0.2s"
              fontWeight={location.pathname === '/settings' ? 'bold' : 'normal'}
            >
              Settings
            </Button>
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
};

export default App;
