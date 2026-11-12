import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaCheck, FaCode, FaExclamationTriangle, FaKey, FaMobileAlt, FaMoon, FaPalette, FaSun } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useAIGate } from '../hooks/useAIGate';
import { useAccount } from '../hooks/useAccount';
import { deleteDB } from 'idb'; // Import deleteDB to delete IndexedDB
import { DEFAULT_OPENAI_MODEL, useOpenAiApiKey, useOpenAiModel } from '../store/aiSettingsStore';
import { testApiKey } from '../services/ai';
import BackupRestoreCard from '../components/BackupRestoreCard';
import AccountCard from '../components/AccountCard';
import TestPresetLoader from '../components/TestPresetLoader';
import { DB_NAME } from '../db/indexedDb';
import { isDevMode, setDevMode } from '../utils/devMode';
import { type ColorModePreference, useColorModePreference } from '../store/themeStore';

interface SettingsProps {
  colorScheme: string;
  onColorSchemeChange: (scheme: string) => void;
}

// Shows only the last 4 characters of a key, like a card number on a bank statement. The dot
// count is fixed so the mask doesn't reveal the key's length.
const maskApiKey = (key: string) => `${'•'.repeat(12)}${key.slice(-4)}`;

const THEME_OPTIONS: { value: ColorModePreference; label: string; icon: IconType }[] = [
  { value: 'light', label: 'Light', icon: FaSun },
  { value: 'dark', label: 'Dark', icon: FaMoon },
  { value: 'system', label: 'System', icon: FaMobileAlt },
];

const ACCENT_COLORS = ['red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'gray'];

const Settings: React.FC<SettingsProps> = ({ colorScheme, onColorSchemeChange }) => {
  const { preference, setPreference } = useColorModePreference();
  const segmentTrack = useColorModeValue('gray.100', 'gray.900');
  const segmentActive = useColorModeValue('white', 'gray.700');
  const toast = useToast();
  const [apiKey, setApiKey] = useOpenAiApiKey();
  const [testingKey, setTestingKey] = useState(false);
  const [model, setModel] = useOpenAiModel();
  const aiGate = useAIGate();
  const account = useAccount();
  // Where Pulsar AI is on offer (sign-in, free allowance, subscription), the key is the
  // alternative to it. Elsewhere it's the only way to AI.
  const offersPulsarAI = account.hostedAI;
  const hasHostedAllowance = account.hostedAI && !!account.user && !!account.ai;
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
        ? 'Pulsar AI will use your key for routine plans and edits.'
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

      <AccountCard />

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm" data-testid="own-key-card">
        <Flex align="center" gap={2} mb={1}>
          <Icon as={FaKey} color="cyan.500" />
          <Heading size="sm">Your own OpenAI key</Heading>
          {offersPulsarAI && <Badge ml="auto" colorScheme="gray" fontSize="0.65rem">Optional</Badge>}
        </Flex>
        <Text fontSize="sm" color={mutedColor} mb={3}>
          {offersPulsarAI
            ? 'An alternative to a Pulsar AI subscription: Pulsar AI runs on your own OpenAI API key, and OpenAI bills you for what you use, usually a few cents a month. No account needed.'
            : 'Pulsar AI builds routines from your answers and suggests changes in each routine\'s chat, using your own OpenAI API key. OpenAI bills you for what you use, usually a few cents a month.'}
        </Text>
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
            {hasHostedAllowance && (
              <Text fontSize="xs" color={mutedColor} data-testid="key-wins-note">
                While a key is set, Pulsar AI uses it instead of your {account.ai?.tier === 'pulsar_ai' ? 'subscription' : 'free allowance'}.
                Remove it to go back.
              </Text>
            )}
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
          <VStack align="stretch" spacing={2}>
            <Button variant="outline" leftIcon={<FaKey />} onClick={() => aiGate.openKeySetup()} alignSelf="flex-start">
              Add OpenAI key
            </Button>
            <Text fontSize="xs" color={mutedColor}>
              Your key stays on this device and is sent only to OpenAI.
            </Text>
          </VStack>
        )}
        {aiGate.gate}
      </Box>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm">
        <Flex align="center" gap={2} mb={4}>
          <Icon as={FaPalette} color="cyan.500" />
          <Heading size="sm">Appearance</Heading>
        </Flex>
        <VStack spacing={5} align="stretch">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} id="theme-label">Theme</Text>
            <Flex role="radiogroup" aria-labelledby="theme-label" bg={segmentTrack} borderRadius="xl" p={1} gap={1}>
              {THEME_OPTIONS.map(({ value, label, icon }) => {
                const active = preference === value;
                return (
                  <Flex
                    key={value} as="button" role="radio" aria-checked={active}
                    flex={1} direction="column" align="center" justify="center" gap={1} minH="56px"
                    borderRadius="lg" bg={active ? segmentActive : 'transparent'} boxShadow={active ? 'sm' : 'none'}
                    color={active ? undefined : mutedColor} transition="background-color 0.2s, color 0.2s"
                    onClick={() => setPreference(value)}
                  >
                    <Icon as={icon} boxSize={4} color={active ? `${colorScheme}.500` : undefined} />
                    <Text fontSize="xs" fontWeight={active ? 'bold' : 'medium'}>{label}</Text>
                  </Flex>
                );
              })}
            </Flex>
            {preference === 'system' && (
              <Text fontSize="xs" color={mutedColor} mt={2}>
                Matches your phone's light or dark setting.
              </Text>
            )}
          </Box>
          <Box>
            <Flex align="baseline" justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium" id="accent-label">Accent color</Text>
              <Text fontSize="xs" color={mutedColor} textTransform="capitalize">{colorScheme}</Text>
            </Flex>
            <SimpleGrid role="radiogroup" aria-labelledby="accent-label" columns={5} spacingY={3} justifyItems="center">
              {ACCENT_COLORS.map((scheme) => {
                const active = colorScheme === scheme;
                return (
                  <Flex
                    key={scheme} as="button" role="radio" aria-checked={active} aria-label={scheme}
                    align="center" justify="center" boxSize="44px" borderRadius="full"
                    borderWidth="2px" borderColor={active ? `${scheme}.500` : 'transparent'}
                    transition="border-color 0.2s"
                    onClick={() => onColorSchemeChange(scheme)}
                  >
                    <Flex align="center" justify="center" boxSize="34px" borderRadius="full" bg={`${scheme}.500`} color="white">
                      {active && <Icon as={FaCheck} boxSize={3.5} />}
                    </Flex>
                  </Flex>
                );
              })}
            </SimpleGrid>
          </Box>
        </VStack>
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

    </Flex>
  );
};

export default Settings;
