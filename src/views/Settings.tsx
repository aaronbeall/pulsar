import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Link,
  Select,
  Text,
  VStack,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaImages, FaPalette } from 'react-icons/fa';
import { deleteDB } from 'idb'; // Import deleteDB to delete IndexedDB
import { ALL_HOME_BACKGROUNDS } from '../assets/homeBackgrounds';

interface SettingsProps {
  colorScheme: string;
  onColorSchemeChange: (scheme: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ colorScheme, onColorSchemeChange }) => {
  const { colorMode, setColorMode } = useColorMode();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const dangerBg = useColorModeValue('red.50', 'rgba(254, 178, 178, 0.06)');
  const dangerBorder = useColorModeValue('red.200', 'red.700');

  const handleClearSettings = () => {
    localStorage.clear();
    window.location.reload(); // Reload the app to reset settings
  };

  const handleDeleteAllData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all data? This action cannot be undone.'
    );
    if (confirmed) {
      await deleteDB('PulsarDB'); // Delete the IndexedDB
      toast({
        title: 'All data deleted.',
        description: 'All data has been successfully deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      window.location.reload(); // Reload the app to reset the state
    }
  };

  return (
    <Flex direction="column" gap={{ base: 4, sm: 5 }} maxW="560px" mx="auto">
      <Heading
        fontSize={{ base: 'xl', sm: '2xl' }}
        bgGradient="linear(to-r, cyan.400, blue.500)"
        bgClip="text"
        mb={1}
      >
        Settings
      </Heading>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Flex align="center" gap={2} mb={4}>
          <Icon as={FaPalette} color="cyan.500" />
          <Heading size="sm">Appearance</Heading>
        </Flex>
        <VStack spacing={4} align="stretch">
          <Flex align="center" justify="space-between" gap={3}>
            <Text fontSize="sm" fontWeight="medium">Color Scheme</Text>
            <Select
              value={colorScheme}
              onChange={(e) => onColorSchemeChange(e.target.value)}
              w={{ base: '55%', sm: '60%' }}
              size="sm"
              borderRadius="md"
            >
              {['blue', 'cyan', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'gray'].map(
                (scheme) => (
                  <option key={scheme} value={scheme}>
                    {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                  </option>
                )
              )}
            </Select>
          </Flex>
          <Flex align="center" justify="space-between" gap={3}>
            <Text fontSize="sm" fontWeight="medium">Color Mode</Text>
            <Select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value)}
              w={{ base: '55%', sm: '60%' }}
              size="sm"
              borderRadius="md"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Flex>
        </VStack>
      </Box>

      <Box bg={dangerBg} borderWidth="1px" borderColor={dangerBorder} borderRadius="xl" p={{ base: 4, sm: 5 }}>
        <Flex align="center" gap={2} mb={1}>
          <Icon as={FaExclamationTriangle} color="red.400" />
          <Heading size="sm" color={useColorModeValue('red.700', 'red.300')}>Danger Zone</Heading>
        </Flex>
        <Text fontSize="xs" color={mutedColor} mb={4}>
          These actions are permanent and cannot be undone.
        </Text>
        <VStack spacing={3} align="stretch">
          <Button variant="outline" colorScheme="red" size="sm" onClick={handleClearSettings}>
            Clear All Settings
          </Button>
          <Button variant="outline" colorScheme="red" size="sm" onClick={handleDeleteAllData}>
            Delete All Data
          </Button>
        </VStack>
      </Box>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Flex align="center" gap={2} mb={3}>
          <Icon as={FaImages} color="cyan.500" />
          <Heading size="sm">Photo Credits</Heading>
        </Flex>
        <Text fontSize="xs" color={mutedColor} mb={2}>
          Home screen background photos, from Wikimedia Commons:
        </Text>
        <VStack align="start" spacing={1} mb={4}>
          {ALL_HOME_BACKGROUNDS.map(bg => (
            <Text key={bg.sourceUrl} fontSize="xs" color={mutedColor}>
              <Link href={bg.sourceUrl} isExternal color="cyan.500">{bg.title}</Link>
              {' '}by {bg.author}, {bg.license}
            </Text>
          ))}
        </VStack>

        <Text fontSize="xs" color={mutedColor}>
          Exercise photos come from{' '}
          <Link href="https://github.com/yuhonas/free-exercise-db" isExternal color="cyan.500">free-exercise-db</Link>
          {', with additional photos found via '}
          <Link href="https://commons.wikimedia.org" isExternal color="cyan.500">Wikimedia Commons</Link>
          {' search.'}
        </Text>
      </Box>
    </Flex>
  );
};

export default Settings;
