import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaHome, FaDumbbell, FaCog, FaPalette } from 'react-icons/fa';
import Home from './views/Home';
import Workout from './views/Workout';
import Settings from './views/Settings';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('Home');
  const { colorMode, toggleColorMode } = useColorMode(); // Hook to toggle between dark and light mode
  const [colorScheme, setColorScheme] = useState<string>(() => {
    // Load the color scheme from localStorage or default to 'cyan'
    return localStorage.getItem('colorScheme') || 'red';
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

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
        return <Home />;
      case 'Workout':
        return <Workout />;
      case 'Settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <Flex direction="column" height="100vh">
      <Box bg={`${colorScheme}.500`} p={4}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
            <Image src="/favicon.svg" alt="App Icon" boxSize="24px" /> {/* Display SVG favicon */}
            <Heading size="md">Pulsar PWA</Heading>
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
      <Flex flex="1" p={4} bg="gray.100" _dark={{ bg: "gray.900" }}>
        {renderPage()}
      </Flex>
      <Flex bg={`${colorScheme}.500`} p={4} justify="space-around">
        <Button
          colorScheme={colorScheme}
          variant={activePage === 'Home' ? 'solid' : 'ghost'}
          onClick={() => setActivePage('Home')}
          leftIcon={<FaHome />}
        >
          Home
        </Button>
        <Button
          colorScheme={colorScheme}
          variant={activePage === 'Workout' ? 'solid' : 'ghost'}
          onClick={() => setActivePage('Workout')}
          leftIcon={<FaDumbbell />}
        >
          Workout
        </Button>
        <Button
          colorScheme={colorScheme}
          variant={activePage === 'Settings' ? 'solid' : 'ghost'}
          onClick={() => setActivePage('Settings')}
          leftIcon={<FaCog />}
        >
          Settings
        </Button>
      </Flex>
    </Flex>
  );
};

export default App;
