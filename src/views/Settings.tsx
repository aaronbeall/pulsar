import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Select,
  Table,
  Tbody,
  Text,
  Tr,
  Td,
  Th,
  Thead,
  VStack,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { deleteDB } from 'idb'; // Import deleteDB to delete IndexedDB
import { ALL_HOME_BACKGROUNDS } from '../assets/homeBackgrounds';

interface SettingsProps {
  colorScheme: string;
  onColorSchemeChange: (scheme: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ colorScheme, onColorSchemeChange }) => {
  const { colorMode, setColorMode } = useColorMode();
  const toast = useToast();

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
    <Flex direction="column" p={4}>
      <Heading size="lg" mb={4}>
        Settings
      </Heading>
      <Box borderWidth="1px" borderRadius="md" overflow="hidden">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Setting</Th>
              <Th>Value</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>Color Scheme</Td>
              <Td>
                <Select
                  value={colorScheme}
                  onChange={(e) => onColorSchemeChange(e.target.value)}
                >
                  {['blue', 'cyan', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'gray'].map(
                    (scheme) => (
                      <option key={scheme} value={scheme}>
                        {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                      </option>
                    )
                  )}
                </Select>
              </Td>
            </Tr>
            <Tr>
              <Td>Color Mode</Td>
              <Td>
                <Select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value)}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
      <Button colorScheme="red" mt={4} onClick={handleClearSettings}>
        Clear All Settings
      </Button>
      <Button colorScheme="red" mt={4} onClick={handleDeleteAllData}>
        Delete All Data
      </Button>

      <Heading size="sm" mt={8} mb={2} color="gray.500">
        Photo Credits
      </Heading>
      <Text fontSize="xs" color="gray.500" mb={2}>
        Home screen background photos, from Wikimedia Commons:
      </Text>
      <VStack align="start" spacing={1} mb={4}>
        {ALL_HOME_BACKGROUNDS.map(bg => (
          <Text key={bg.sourceUrl} fontSize="xs" color="gray.500">
            <Link href={bg.sourceUrl} isExternal color="cyan.500">{bg.title}</Link>
            {' '}by {bg.author}, {bg.license}
          </Text>
        ))}
      </VStack>

      <Text fontSize="xs" color="gray.500">
        Exercise photos come from{' '}
        <Link href="https://github.com/yuhonas/free-exercise-db" isExternal color="cyan.500">free-exercise-db</Link>
        {', with additional photos found via '}
        <Link href="https://commons.wikimedia.org" isExternal color="cyan.500">Wikimedia Commons</Link>
        {' search.'}
      </Text>
    </Flex>
  );
};

export default Settings;
