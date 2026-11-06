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
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaArrowLeft, FaCheck, FaComments, FaCrown, FaExternalLinkAlt, FaKey, FaMagic } from 'react-icons/fa';
import { useOpenAiApiKey } from '../store/aiSettingsStore';
import { testApiKey } from '../services/ai';

interface AIOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after AI has been turned on, before the dialog closes. */
  onComplete?: () => void;
}

type Step = 'choose' | 'key';

// The one place a user turns AI on. Today the only way is their own OpenAI key; this is also
// where a Pulsar Premium subscription (hosted AI, no key needed) will be offered once it
// exists — see PLAN-ai-features.md / PLAN-ai-subscription.md. Every AI entry point (setup
// wizard, routine chat, Settings) opens this dialog instead of linking to a raw key field.
const AIOnboardingDialog: React.FC<AIOnboardingDialogProps> = ({ isOpen, onClose, onComplete }) => {
  const [, setApiKey] = useOpenAiApiKey();
  const toast = useToast();
  const [step, setStep] = React.useState<Step>('choose');
  const [draftKey, setDraftKey] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const optionBorder = useColorModeValue('gray.200', 'gray.600');
  const optionHoverBorder = useColorModeValue('cyan.400', 'cyan.300');
  const featureBg = useColorModeValue('cyan.50', 'whiteAlpha.100');

  React.useEffect(() => {
    if (isOpen) {
      setStep('choose');
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
    toast({ title: 'Pulsar AI is on', status: 'success', duration: 3000, isClosable: true });
    onComplete?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', sm: 'md' }} scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>
          {step === 'choose' ? 'Turn on Pulsar AI' : 'Use your own OpenAI key'}
        </ModalHeader>
        <ModalCloseButton size="lg" />
        <ModalBody>
          {step === 'choose' ? (
            <VStack align="stretch" spacing={5}>
              <VStack align="stretch" spacing={3} bg={featureBg} borderRadius="lg" p={4}>
                <Flex gap={3} align="flex-start">
                  <Icon as={FaMagic} color="cyan.500" mt={1} />
                  <Text fontSize="sm">Build a weekly routine from your goals, equipment, schedule and limits.</Text>
                </Flex>
                <Flex gap={3} align="flex-start">
                  <Icon as={FaComments} color="cyan.500" mt={1} />
                  <Text fontSize="sm">Chat with each routine to ask questions or get changes you approve before they apply.</Text>
                </Flex>
              </VStack>

              <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color={mutedColor}>
                Choose how to use AI
              </Heading>

              <Box
                as="button"
                type="button"
                textAlign="left"
                borderWidth="2px"
                borderColor={optionBorder}
                borderRadius="lg"
                p={4}
                minH="44px"
                _hover={{ borderColor: optionHoverBorder }}
                _focusVisible={{ borderColor: optionHoverBorder, outline: 'none' }}
                onClick={() => setStep('key')}
              >
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaKey} color="cyan.500" />
                  <Text fontWeight="bold">Use your own OpenAI key</Text>
                </Flex>
                <Text fontSize="sm" color={mutedColor}>
                  Free from Pulsar. OpenAI bills your account directly, usually under a cent per routine.
                </Text>
              </Box>

              <Box borderWidth="2px" borderColor={optionBorder} borderStyle="dashed" borderRadius="lg" p={4} opacity={0.7} aria-disabled>
                <Flex align="center" gap={2} mb={1} wrap="wrap">
                  <Icon as={FaCrown} color="yellow.500" />
                  <Text fontWeight="bold">Pulsar Premium</Text>
                  <Badge colorScheme="purple">Coming soon</Badge>
                </Flex>
                <Text fontSize="sm" color={mutedColor}>
                  AI included with a subscription. No key or OpenAI account needed.
                </Text>
              </Box>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={4}>
              <OrderedList spacing={1} fontSize="sm" pl={1}>
                <ListItem>
                  Sign in at{' '}
                  <Link href="https://platform.openai.com/api-keys" isExternal color="cyan.500">
                    platform.openai.com <Icon as={FaExternalLinkAlt} boxSize={2.5} />
                  </Link>
                </ListItem>
                <ListItem>Create a new secret key and copy it.</ListItem>
                <ListItem>Make sure your account has a little credit under Billing.</ListItem>
                <ListItem>Paste the key below.</ListItem>
              </OrderedList>
              <Input
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
                autoFocus
              />
              {error && <Text fontSize="sm" color="red.500">{error}</Text>}
              <Text fontSize="xs" color={mutedColor}>
                Your key stays in this browser and is only ever sent to OpenAI. You can remove it any time in Settings.
              </Text>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          {step === 'choose' ? (
            <Button variant="ghost" onClick={onClose} w={{ base: '100%', sm: 'auto' }} size="lg">
              Not now
            </Button>
          ) : (
            <>
              <Button variant="ghost" leftIcon={<FaArrowLeft />} onClick={() => setStep('choose')} size="lg">
                Back
              </Button>
              <Button
                colorScheme="cyan"
                leftIcon={<FaCheck />}
                onClick={handleVerify}
                isLoading={verifying}
                loadingText="Checking..."
                isDisabled={!draftKey.trim()}
                flex={{ base: 1, sm: 'none' }}
                size="lg"
              >
                Verify and turn on
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AIOnboardingDialog;
