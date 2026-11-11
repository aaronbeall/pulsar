import React, { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  Heading,
  Icon,
  Input,
  Link,
  List,
  ListIcon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { FaArrowRight, FaCheckCircle, FaChevronDown, FaChevronRight, FaChevronUp, FaCrown, FaExternalLinkAlt, FaGoogle, FaKey } from 'react-icons/fa';
import { useOpenAiApiKey } from '../store/aiSettingsStore';
import { AIKind, testApiKey } from '../services/ai';
import { useAccount } from '../hooks/useAccount';
import { signInWithGoogle } from '../services/account';
import UpgradeButtons from './UpgradeButtons';
import LegalLinks from './LegalLinks';

export interface AIAccessAlternative {
  label: string;
  /** One line on what this path does, shown under the label. */
  description?: string;
  icon?: IconType;
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
  /** Called just before leaving the site to unlock AI (Google sign-in or Stripe Checkout), so
   *  the action can continue when the user comes back. */
  onLeave?: (via: 'signin' | 'checkout') => void;
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
/** This page without the dialog open, to come back to after sign-in or checkout. */
function returnPath() {
  const params = new URLSearchParams(window.location.search);
  params.delete('ai');
  const query = params.toString();
  return window.location.pathname + (query ? `?${query}` : '');
}

const AIAccessDialog: React.FC<AIAccessDialogProps> = ({ isOpen, reason, kind, onUnlocked, onClose, onLeave, alternative }) => {
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
  const focusRef = useRef<HTMLDivElement>(null);
  // The key is a power-user path: folded away when Pulsar AI is on offer, open when it's the
  // only way in (no hosted AI here, or changing an existing key).
  const keySection = useDisclosure();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const featureBg = useColorModeValue('cyan.50', 'gray.700');
  const altBg = useColorModeValue('white', 'gray.800');
  const headingColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const altIconBg = useColorModeValue('cyan.50', 'whiteAlpha.100');

  useEffect(() => {
    if (isOpen) {
      setDraftKey('');
      setError(null);
      if (!(offerSignIn || offerUpgrade) || existingKey) keySection.onOpen();
      else keySection.onClose();
    }
    // Only when the dialog opens: the account can refresh while it's open without folding the
    // section the user just expanded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      // Come back to this page without the dialog open; the gate continues the action from
      // there once the account has allowance (hooks/useAIGate.tsx).
      onLeave?.('signin');
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

  const keyIsPrimary = !(offerSignIn || offerUpgrade);

  return (
    // Focus the dialog body rather than the close button: the dialog often opens from an Enter
    // press, and that same key would otherwise activate whatever gets focus and dismiss it.
    <Modal initialFocusRef={focusRef} isOpen={isOpen} onClose={onClose} size={{ base: 'full', sm: 'md' }} scrollBehavior="inside" isCentered>
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
        <ModalBody pb={6} ref={focusRef} tabIndex={-1} _focus={{ outline: 'none' }}>
          <VStack align="stretch" spacing={4}>
            {offerSignIn ? (
              <Box borderWidth="2px" borderColor="cyan.400" borderRadius="xl" p={4} bg={featureBg} data-testid="ai-signin-option">
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaCrown} color="yellow.500" />
                  <Heading size="md">Try Pulsar AI free</Heading>
                </Flex>
                <Text fontSize="sm" color={mutedColor} mb={3}>
                  Your first routine plan and 2 AI messages are on us. Just sign in.
                </Text>
                <Benefits items={[
                  'A routine built around your goals, schedule and equipment',
                  'Change it by asking, like "swap squats, my knees hurt"',
                ]} />
                <Button leftIcon={<FaGoogle />} colorScheme="cyan" size="lg" w="full" mt={4} onClick={handleSignIn} isLoading={signingIn}>
                  Continue with Google
                </Button>
                <Text fontSize="xs" color={mutedColor} mt={2} textAlign="center">
                  Your workouts stay on this device. <LegalLinks />
                </Text>
              </Box>
            ) : offerUpgrade ? (
              <Box borderWidth="2px" borderColor="cyan.400" borderRadius="xl" p={4} bg={featureBg} data-testid="ai-upgrade-option">
                <Flex align="center" gap={2} mb={1}>
                  <Icon as={FaCrown} color="yellow.500" />
                  <Heading size="md">Get Pulsar AI</Heading>
                </Flex>
                <Text fontSize="sm" color={mutedColor} mb={3}>
                  You've used your free AI. Keep your routines evolving with:
                </Text>
                <Benefits items={[
                  '20 new routine plans every month',
                  '200 AI messages every month: ask for changes or anything else',
                ]} />
                <Box mt={4}>
                  <UpgradeButtons returnTo={returnPath()} onBeforeCheckout={() => onLeave?.('checkout')} />
                </Box>
              </Box>
            ) : allowanceUsed && subscribed ? (
              <Box borderWidth="2px" borderColor={cardBorder} borderRadius="xl" p={4} data-testid="ai-month-used">
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
              <Box borderWidth="2px" borderColor={cardBorder} borderStyle="dashed" borderRadius="xl" p={4} opacity={0.7} aria-disabled data-testid="ai-premium-option">
                <Flex align="center" gap={2} mb={1} wrap="wrap">
                  <Icon as={FaCrown} color="yellow.500" />
                  <Text fontWeight="bold">Pulsar AI</Text>
                  <Badge colorScheme="purple">Coming soon</Badge>
                </Flex>
                <Text fontSize="sm" color={mutedColor}>
                  {allowanceUsed
                    ? "You've used your free AI. Pulsar AI for $3.99 a month adds 20 routine plans and 200 AI messages every month."
                    : 'AI included with a subscription.'}
                </Text>
              </Box>
            )}

            {alternative && (
              <Box
                as="button"
                type="button"
                onClick={alternative.onClick}
                textAlign="left"
                borderWidth="1px"
                borderColor={cardBorder}
                borderRadius="xl"
                p={4}
                bg={altBg}
                _hover={{ borderColor: 'cyan.400' }}
                _active={{ transform: 'scale(0.99)' }}
                transition="all 0.15s"
                data-testid="ai-alternative"
              >
                <Flex align="center" gap={3}>
                  <Flex flexShrink={0} align="center" justify="center" boxSize={10} borderRadius="full" bg={altIconBg}>
                    <Icon as={alternative.icon ?? FaArrowRight} color="cyan.500" boxSize={4} />
                  </Flex>
                  <Box flex={1} minW={0}>
                    <Text fontWeight="bold">{alternative.label}</Text>
                    {alternative.description && (
                      <Text fontSize="sm" color={mutedColor} mt={0.5}>{alternative.description}</Text>
                    )}
                  </Box>
                  <Icon as={FaChevronRight} color={mutedColor} boxSize={3} flexShrink={0} />
                </Flex>
              </Box>
            )}

            <Box borderWidth="1px" borderColor={cardBorder} borderRadius="xl" overflow="hidden">
              <Button
                variant="ghost"
                w="full"
                h="auto"
                py={3}
                px={4}
                borderRadius={0}
                justifyContent="space-between"
                fontWeight="semibold"
                color={headingColor}
                onClick={keySection.onToggle}
                aria-expanded={keySection.isOpen}
                rightIcon={<Icon as={keySection.isOpen ? FaChevronUp : FaChevronDown} boxSize={3} />}
              >
                <Flex align="center" gap={2}>
                  <Icon as={FaKey} color="cyan.500" />
                  {keyIsPrimary ? 'Use your own OpenAI key' : 'Or use your own OpenAI key'}
                </Flex>
              </Button>
              <Collapse in={keySection.isOpen} animateOpacity>
                <Box px={4} pb={4}>
                  <Text fontSize="sm" color={mutedColor} mb={3}>
                    Free from Pulsar. OpenAI bills your account directly, usually under a cent per routine.{' '}
                    <Link href="https://platform.openai.com/api-keys" isExternal color="cyan.500" whiteSpace="nowrap">
                      Get a key <Icon as={FaExternalLinkAlt} boxSize={2.5} />
                    </Link>
                  </Text>
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
                  />
                  {error && <Text fontSize="sm" color="red.500" mt={2}>{error}</Text>}
                  <Button
                    colorScheme="cyan"
                    variant={keyIsPrimary ? 'solid' : 'outline'}
                    size="lg"
                    w="full"
                    mt={3}
                    onClick={handleVerify}
                    isLoading={verifying}
                    loadingText="Checking key..."
                    isDisabled={!draftKey.trim()}
                  >
                    Use this key
                  </Button>
                  <Text fontSize="xs" color={mutedColor} mt={2}>
                    Your key stays in this browser and is only sent to OpenAI. Manage it in Settings.
                  </Text>
                </Box>
              </Collapse>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

/** A short checklist of what Pulsar AI gives you. */
const Benefits = ({ items }: { items: string[] }) => (
  <List spacing={2}>
    {items.map((item) => (
      <ListItem key={item} display="flex" alignItems="flex-start" fontSize="sm">
        <ListIcon as={FaCheckCircle} color="cyan.400" mt={0.5} />
        <span>{item}</span>
      </ListItem>
    ))}
  </List>
);

export default AIAccessDialog;
