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
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaPalette, FaHome, FaDumbbell, FaCog } from 'react-icons/fa'; // Import icons
import { Routes, Route, Link, useLocation, Link as RouterLink } from 'react-router-dom'; // Import RouterLink
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';

const App: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode(); // Hook to toggle between dark and light mode
  const [colorScheme, setColorScheme] = React.useState<string>(() => {
    // Load the color scheme from localStorage or default to 'cyan'
    return localStorage.getItem('colorScheme') || 'cyan';
  });

  const colorSchemes = [
    'blue',
    'cyan',
    'teal',
    'green',
    'yellow',
    'orange',
    'red',
    'pink',
    'purple',
    'gray',
  ]; // List of Chakra default color schemes

  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme); // Save the selected color scheme to localStorage
  };

  const location = useLocation(); // Get the current route location

  return (
    <Flex direction="column" height="100vh">
      <Box bg={`${colorScheme}.500`} p={4}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
            <RouterLink to="/"> {/* Make the logo/title clickable */}
              <Flex align="center" gap={2}>
                <Image src="/favicon.svg" alt="App Icon" boxSize="24px" />
                <Heading size="md" color="white">PULSAR</Heading>
              </Flex>
            </RouterLink>
            <Text fontSize="sm" color="whiteAlpha.800" ml={2}>Your AI Assisted Workout</Text> {/* Subheading */}
          </Flex>
          <Flex gap={2}>
            <IconButton
              aria-label="Toggle Theme"
              icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
              onClick={toggleColorMode}
              colorScheme={colorScheme}
              size="sm"
            />
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FaPalette />}
                size="sm"
                colorScheme={colorScheme}
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
                        border={scheme === colorScheme ? '2px solid black' : '2px solid transparent'}
                        cursor="pointer"
                      />
                    </MenuItem>
                  ))}
                </SimpleGrid>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
      </Box>
      <Flex flex="1" p={4} bg="gray.100" _dark={{ bg: `gray.900` }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout/*" element={<Workout />} />
          <Route
            path="/settings"
            element={<Settings colorScheme={colorScheme} onColorSchemeChange={handleColorSchemeChange} />}
          />
        </Routes>
      </Flex>
      <Flex bg={`${colorScheme}.500`} p={4} justify="space-around">
        <Button
          as={Link}
          to="/"
          colorScheme={colorScheme}
          variant={location.pathname === '/' ? 'solid' : 'ghost'} // Active state for Home
          leftIcon={<FaHome />} // Add Home icon
        >
          Home
        </Button>
        <Button
          as={Link}
          to="/workout"
          colorScheme={colorScheme}
          variant={location.pathname.startsWith('/workout') ? 'solid' : 'ghost'} // Active state for Workout
          leftIcon={<FaDumbbell />} // Add Workout icon
        >
          Workout
        </Button>
        <Button
          as={Link}
          to="/settings"
          colorScheme={colorScheme}
          variant={location.pathname === '/settings' ? 'solid' : 'ghost'} // Active state for Settings
          leftIcon={<FaCog />} // Add Settings icon
        >
          Settings
        </Button>
      </Flex>
    </Flex>
  );
};

export default App;
