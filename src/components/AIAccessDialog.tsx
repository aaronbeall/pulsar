import React from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaCrown, FaExternalLinkAlt, FaKey } from 'react-icons/fa';
import { useOpenAiApiKey } from '../store/aiSettingsStore';
import { testApiKey } from '../services/ai';

export interface AIAccessAlternative {
  label: string;
  onClick: () => void;
}

interface AIAccessDialogProps {
  isOpen: boolean;
  /** What the user was about to do, e.g. "Building a routine from your answers uses Pulsar AI." */
  reason?: string;
  /** Called once AI access is in place (a verified key was saved). The caller continues the action. */
  onUnlocked: () => void;
  onClose: () => void;
  /** The non-AI way to move forward with the same task, e.g. "Create from a template". Offered
   *  instead of a bare "Not now": the close button already covers dismissing. */
  alternative?: AIAccessAlternative;
}

// The paywall-style gate shown when someone uses an AI feature without AI access. AI is never
// something you "turn on": features always look available, and this appears at the moment of
// use. Today the only way through is the user's own OpenAI key; the Pulsar Premium option is
// where a subscription (hosted AI, no key) will be offered — see PLAN-ai-features.md and
// PLAN-ai-subscription.md. Open it through hooks/useAIGate.tsx rather than directly.
const AIAccessDialog: React.FC<AIAccessDialogProps> = ({ isOpen, reason, onUnlocked, onClose, alternative }) => {
  const [existingKey, setApiKey] = useOpenAiApiKey();
  const toast = useToast();
  const [draftKey, setDraftKey] = React.useState('');
  const keyInputRef = React.useRef<HTMLInputElement>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const keyCardBg = useColorModeValue('white', 'gray.700');

  React.useEffect(() => {
    if (isOpen) {
      setDraftKey('');
      setError(null);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    const key = draftKey.trim();
    if (!key || verifying) return;
    setVerifying(true);
    setError(null);
    const ok = await testApiKey(key);
    setVerifying(false);
    if (!ok) {
      setError("OpenAI didn't accept that key, or couldn't be reached. Check the key and your connection, then try again.");
      return;
    }
    setApiKey(key);
    toast({ title: 'OpenAI key saved', status: 'success', duration: 2500, isClosable: true });
    onUnlocked();
  };

  return (
    // Focus the key field, not the close button: the dialog often opens from an Enter press, and
    // that same key would otherwise activate whatever gets focus and dismiss it.
    <Modal initialFocusRef={keyInputRef} isOpen={isOpen} onClose={onClose} size={{ base: 'full', sm: 'md' }} scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>
          {existingKey ? 'Change your OpenAI key' : 'Unlock Pulsar AI'}
          {reason && (
            <Text fontSize="sm" fontWeight="normal" color={mutedColor} mt={1}>
              {reason}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton size="lg" />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Box borderWidth="2px" borderColor={cardBorder} borderStyle="dashed" borderRadius="lg" p={4} opacity={0.7} aria-disabled>
              <Flex align="center" gap={2} mb={1} wrap="wrap">
                <Icon as={FaCrown} color="yellow.500" />
                <Text fontWeight="bold">Pulsar Premium</Text>
                <Badge colorScheme="purple">Coming soon</Badge>
              </Flex>
              <Text fontSize="sm" color={mutedColor}>
                AI included with a subscription. No key or OpenAI account needed.
              </Text>
            </Box>

            <Box borderWidth="2px" borderColor="cyan.400" borderRadius="lg" p={4} bg={keyCardBg}>
              <Flex align="center" gap={2} mb={1}>
                <Icon as={FaKey} color="cyan.500" />
                <Heading size="sm">Use your own OpenAI key</Heading>
              </Flex>
              <Text fontSize="sm" color={mutedColor} mb={3}>
                Free from Pulsar. OpenAI bills your account directly, usually under a cent per routine.{' '}
                <Link href="https://platform.openai.com/api-keys" isExternal color="cyan.500" whiteSpace="nowrap">
                  Get a key <Icon as={FaExternalLinkAlt} boxSize={2.5} />
                </Link>
              </Text>
              <Input
                ref={keyInputRef}
                type="password"
                placeholder="sk-..."
                value={draftKey}
                onChange={(e) => { setDraftKey(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
                size="lg"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                isInvalid={!!error}
              />
              {error && <Text fontSize="sm" color="red.500" mt={2}>{error}</Text>}
              <Text fontSize="xs" color={mutedColor} mt={2}>
                Your key stays in this browser and is only sent to OpenAI. Manage it in Settings.
              </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter flexDirection="column" gap={2} alignItems="stretch">
          <Button
            colorScheme="cyan"
            size="lg"
            onClick={handleVerify}
            isLoading={verifying}
            loadingText="Checking key..."
            isDisabled={!draftKey.trim()}
          >
            Continue
          </Button>
          {alternative && (
            <Button variant="ghost" size="lg" onClick={alternative.onClick}>
              {alternative.label}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AIAccessDialog;
