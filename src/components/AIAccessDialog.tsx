import React, { useEffect, useRef, useState } from 'react';
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
import { FaCrown, FaExternalLinkAlt, FaGoogle, FaKey } from 'react-icons/fa';
import { useOpenAiApiKey } from '../store/aiSettingsStore';
import { AIKind, testApiKey } from '../services/ai';
import { useAccount } from '../hooks/useAccount';
import { signInWithGoogle } from '../services/account';
import UpgradeButtons from './UpgradeButtons';

export interface AIAccessAlternative {
  label: string;
  onClick: () => void;
}

interface AIAccessDialogProps {
  isOpen: boolean;
  /** What the user was about to do, e.g. "Building a routine from your answers uses Pulsar AI." */
  reason?: string;
  /** Which hosted allowance the action needs, to say whether it's used up. */
  kind?: AIKind;
  /** Called once AI access is in place (a verified key was saved). The caller continues the action. */
  onUnlocked: () => void;
  onClose: () => void;
  /** The non-AI way to move forward with the same task, e.g. "Create from a template". Offered
   *  instead of a bare "Not now": the close button already covers dismissing. */
  alternative?: AIAccessAlternative;
}

// The paywall-style gate shown when someone uses an AI feature without AI access. AI is never
// something you "turn on": features always look available, and this appears at the moment of
// use. Ways through, first the one that fits:
// - signed out where hosted AI is offered: sign in with Google for the free allowance;
// - signed in with the allowance used: Pulsar AI subscription (coming soon);
// - always: the user's own OpenAI key.
// Open it through hooks/useAIGate.tsx rather than directly.
/** This page without the dialog open: the action can't resume after leaving the site. */
function returnPath() {
  const params = new URLSearchParams(window.location.search);
  params.delete('ai');
  const query = params.toString();
  return window.location.pathname + (query ? `?${query}` : '');
}

const AIAccessDialog: React.FC<AIAccessDialogProps> = ({ isOpen, reason, kind, onUnlocked, onClose, alternative }) => {
  const [existingKey, setApiKey] = useOpenAiApiKey();
  const account = useAccount();
  const [signingIn, setSigningIn] = useState(false);
  const offerSignIn = account.hostedAI && !account.user;
  const allowanceUsed = account.hostedAI && !!account.user && !!kind && !!account.ai && account.ai[kind].used >= account.ai[kind].limit;
  const subscribed = account.ai?.tier === 'pulsar_ai';
  // Signed in, free allowance used, and subscriptions are on sale here.
  const offerUpgrade = allowanceUsed && !subscribed && account.billing;
  const resetsOn = account.ai?.resetsAt ? new Date(account.ai.resetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
  const toast = useToast();
  const [draftKey, setDraftKey] = useState('');
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const keyCardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    if (isOpen) {
      setDraftKey('');
      setError(null);
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      // Come back to this page without the dialog open: the action can't resume after the
      // round trip to Google, so the user taps it again (answers and drafts are kept).
      await signInWithGoogle(returnPath());
    } catch (e) {
      setSigningIn(false);
      toast({ title: "Couldn't start sign-in", description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });
    }
  };

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
          {existingKey ? 'Change your OpenAI key' : allowanceUsed ? 'Keep using Pulsar AI' : 'Unlock Pulsar AI'}
          {reason && (
            <Text fontSize="sm" fontWeight="normal" color={mutedColor} mt={1}>
              {reason}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton size="lg" />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {offerSignIn ? (
              <Box borderWidth="2px" borderColor="cyan.400" borderRadius="lg" p={4} bg={keyCardBg} data-testid="ai-signin-option">
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaCrown} color="yellow.500" />
                  <Heading size="sm">Try Pulsar AI free</Heading>
                </Flex>
                <Text fontSize="sm" color={mutedColor} mb={3}>
                  Sign in to get 1 AI routine plan and 2 AI edits, free. No OpenAI account needed.
                  Your workouts stay on this device.
                </Text>
                <Button leftIcon={<FaGoogle />} colorScheme="cyan" size="lg" w="full" onClick={handleSignIn} isLoading={signingIn}>
                  Continue with Google
                </Button>
              </Box>
            ) : offerUpgrade ? (
              <Box borderWidth="2px" borderColor="cyan.400" borderRadius="lg" p={4} bg={keyCardBg} data-testid="ai-upgrade-option">
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaCrown} color="yellow.500" />
                  <Heading size="sm">Get Pulsar AI</Heading>
                </Flex>
                <Text fontSize="sm" color={mutedColor} mb={3}>
                  You've used your free AI. Pulsar AI gives you 20 routine plans and 200 AI edits
                  every month, no OpenAI account needed. Cancel anytime.
                </Text>
                <UpgradeButtons returnTo={returnPath()} />
              </Box>
            ) : allowanceUsed && subscribed ? (
              <Box borderWidth="2px" borderColor={cardBorder} borderRadius="lg" p={4} data-testid="ai-month-used">
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaCrown} color="yellow.500" />
                  <Text fontWeight="bold">Pulsar AI</Text>
                </Flex>
                <Text fontSize="sm" color={mutedColor}>
                  You've used this month's Pulsar AI{resetsOn ? `. It resets ${resetsOn}.` : '.'} Until
                  then you can use your own OpenAI key.
                </Text>
              </Box>
            ) : (
              <Box borderWidth="2px" borderColor={cardBorder} borderStyle="dashed" borderRadius="lg" p={4} opacity={0.7} aria-disabled data-testid="ai-premium-option">
                <Flex align="center" gap={2} mb={1} wrap="wrap">
                  <Icon as={FaCrown} color="yellow.500" />
                  <Text fontWeight="bold">Pulsar AI</Text>
                  <Badge colorScheme="purple">Coming soon</Badge>
                </Flex>
                <Text fontSize="sm" color={mutedColor}>
                  {allowanceUsed
                    ? "You've used your free AI. Pulsar AI for $3.99 a month adds 20 routine plans and 200 edits every month."
                    : 'AI included with a subscription. No key or OpenAI account needed.'}
                </Text>
              </Box>
            )}

            <Box borderWidth="2px" borderColor="cyan.400" borderRadius="lg" p={4} bg={keyCardBg}>
              <Flex align="center" gap={2} mb={1}>
                <Icon as={FaKey} color="cyan.500" />
                <Heading size="sm">{offerSignIn || offerUpgrade ? 'Or use your own OpenAI key' : 'Use your own OpenAI key'}</Heading>
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
            variant={offerSignIn || offerUpgrade ? 'outline' : 'solid'}
            size="lg"
            onClick={handleVerify}
            isLoading={verifying}
            loadingText="Checking key..."
            isDisabled={!draftKey.trim()}
          >
            {offerSignIn || offerUpgrade ? 'Use this key' : 'Continue'}
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
