import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link,
  Select,
  Text,
  VStack,
  useColorMode,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaCode, FaExclamationTriangle, FaImages, FaKey, FaPalette, FaRobot } from 'react-icons/fa';
import { useAIGate } from '../hooks/useAIGate';
import { deleteDB } from 'idb'; // Import deleteDB to delete IndexedDB
import { ALL_HOME_BACKGROUNDS } from '../assets/homeBackgrounds';
import { DEFAULT_OPENAI_MODEL, useOpenAiApiKey, useOpenAiModel } from '../store/aiSettingsStore';
import { testApiKey } from '../services/ai';
import BackupRestoreCard from '../components/BackupRestoreCard';
import AccountCard from '../components/AccountCard';
import TestPresetLoader from '../components/TestPresetLoader';
import { DB_NAME } from '../db/indexedDb';
import { isDevMode, setDevMode } from '../utils/devMode';

interface SettingsProps {
  colorScheme: string;
  onColorSchemeChange: (scheme: string) => void;
}

// Shows only the last 4 characters of a key, like a card number on a bank statement. The dot
// count is fixed so the mask doesn't reveal the key's length.
const maskApiKey = (key: string) => `${'•'.repeat(12)}${key.slice(-4)}`;

const Settings: React.FC<SettingsProps> = ({ colorScheme, onColorSchemeChange }) => {
  const { colorMode, setColorMode } = useColorMode();
  const toast = useToast();
  const [apiKey, setApiKey] = useOpenAiApiKey();
  const [testingKey, setTestingKey] = useState(false);
  const [model, setModel] = useOpenAiModel();
  const aiGate = useAIGate();
  const devMode = isDevMode();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const dangerBg = useColorModeValue('red.50', 'rgba(254, 178, 178, 0.06)');
  const dangerBorder = useColorModeValue('red.200', 'red.700');

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTestingKey(true);
    const ok = await testApiKey(apiKey);
    setTestingKey(false);
    toast({
      title: ok ? 'API key looks good' : 'Key test failed',
      description: ok
        ? 'AI-generated routines and chat-suggested edits are enabled.'
        : 'OpenAI rejected that key, or could not be reached. Check the key and your connection.',
      status: ok ? 'success' : 'error',
      duration: 3000,
      isClosable: true,
    });
  };

  // Dev mode only: wipes every localStorage value (OpenAI key, model, colors, prompts, caches).
  const handleClearSettings = () => {
    if (!window.confirm('Clear all settings, including your OpenAI key? Workout data is kept.')) return;
    localStorage.clear();
    window.location.reload(); // Reload the app to reset settings
  };

  const handleDeleteAllData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all data? This cannot be undone unless you have saved a backup.'
    );
    if (confirmed) {
      await deleteDB(DB_NAME); // This build's database (PR previews use their own)
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

      <AccountCard />

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Flex align="center" gap={2} mb={3}>
          <Icon as={FaRobot} color="cyan.500" />
          <Heading size="sm">AI</Heading>
        </Flex>
        {apiKey ? (
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>OpenAI API key</FormLabel>
              {/* Bank-style mask: only the last 4 characters are ever shown. */}
              <Input
                value={maskApiKey(apiKey)}
                isReadOnly
                fontFamily="mono"
                letterSpacing="wider"
                aria-label="OpenAI API key, masked"
                data-testid="masked-api-key"
              />
            </FormControl>
            <Flex gap={2} wrap="wrap">
              <Button size="sm" onClick={handleTestKey} isLoading={testingKey}>
                Test key
              </Button>
              <Button size="sm" variant="outline" onClick={() => aiGate.openKeySetup()}>
                Change key
              </Button>
              <Button size="sm" variant="ghost" colorScheme="red" onClick={() => setApiKey(null)}>
                Remove key
              </Button>
            </Flex>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color={mutedColor}>
              Pulsar AI builds routines from your answers and suggests changes in each routine's
              chat. When you first use it, you'll be asked for your own OpenAI key. You can also
              add it now.
            </Text>
            <Button variant="outline" colorScheme="cyan" leftIcon={<FaKey />} onClick={() => aiGate.openKeySetup()} alignSelf="flex-start">
              Add OpenAI key
            </Button>
          </VStack>
        )}
        {aiGate.gate}
      </Box>

      <BackupRestoreCard />

      <Box bg={dangerBg} borderWidth="1px" borderColor={dangerBorder} borderRadius="xl" p={{ base: 4, sm: 5 }}>
        <Flex align="center" gap={2} mb={1}>
          <Icon as={FaExclamationTriangle} color="red.400" />
          <Heading size="sm" color={useColorModeValue('red.700', 'red.300')}>Danger Zone</Heading>
        </Flex>
        <Text fontSize="xs" color={mutedColor} mb={4}>
          These actions are permanent and cannot be undone.
        </Text>
        <VStack spacing={3} align="stretch">
          <Button variant="outline" colorScheme="red" size="sm" onClick={handleDeleteAllData}>
            Delete All Data
          </Button>
        </VStack>
      </Box>

      {devMode && (
        <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderStyle="dashed" borderRadius="xl" p={{ base: 4, sm: 5 }} data-testid="developer-settings">
          <Flex align="center" gap={2} mb={1}>
            <Icon as={FaCode} color="purple.400" />
            <Heading size="sm">Developer</Heading>
          </Flex>
          <Text fontSize="xs" color={mutedColor} mb={4}>
            Testing tools, shown only in dev mode. In dev mode you can also tap a past day on the
            Home calendar to log it as done.
          </Text>
          <VStack spacing={3} align="stretch">
            <TestPresetLoader />
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>OpenAI model</FormLabel>
              <Input
                placeholder={DEFAULT_OPENAI_MODEL}
                value={model || ''}
                onChange={(e) => setModel(e.target.value || null)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </FormControl>
            <Button variant="outline" colorScheme="red" size="sm" onClick={handleClearSettings}>
              Clear All Settings
            </Button>
            {!import.meta.env.DEV && (
              <Button variant="ghost" size="sm" onClick={() => { setDevMode(false); window.location.reload(); }}>
                Turn off dev mode
              </Button>
            )}
          </VStack>
        </Box>
      )}

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
