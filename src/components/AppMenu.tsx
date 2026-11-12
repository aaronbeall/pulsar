import { useState } from 'react';
import { Avatar, Box, Button, Divider, Flex, Icon, Switch, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { IconType } from 'react-icons';
import {
  FaChevronRight, FaCog, FaCrown, FaDownload, FaExclamationCircle, FaGlobe, FaGoogle, FaInfoCircle, FaKey, FaMoon, FaShareSquare, FaSun,
} from 'react-icons/fa';
import type { UrlModal } from '../hooks/useUrlModal';
import { useAccount } from '../hooks/useAccount';
import { useInstallPromptStore } from '../store/installPromptStore';
import { useOpenAiApiKey } from '../store/aiSettingsStore';
import { signInWithGoogle } from '../services/account';
import { ENERGY_GRADIENT } from './UpgradeButtons';
import { HOMEPAGE_URL } from './LegalLinks';
import { useColorModePreference } from '../store/themeStore';

/** A menu row: a button, or with `href` a link that opens in a new tab (outside the app). */
const MenuRow = ({ icon, label, onClick, href }: { icon: IconType; label: string; onClick?: () => void; href?: string }) => {
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const linkProps = href ? { as: 'a' as const, href, target: '_blank', rel: 'noopener' } : { as: 'button' as const, onClick };
  return (
    <Flex {...linkProps} w="100%" align="center" gap={3} px={4} py={3} minH="48px" transition="background-color 0.2s" _hover={{ bg: hoverBg }}>
      <Icon as={icon} boxSize={4} color="gray.500" />
      <Text fontSize="sm" fontWeight="medium">{label}</Text>
    </Flex>
  );
};

/**
 * A quick light/dark switch styled like the other rows; the whole row toggles it. Flipping it
 * picks that mode outright (Settings > Appearance also offers following the system).
 */
const DarkModeRow = ({ colorScheme }: { colorScheme: string }) => {
  const { colorMode, setPreference } = useColorModePreference();
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const isDark = colorMode === 'dark';
  return (
    <Flex
      as="label" w="100%" align="center" gap={3} px={4} py={3} minH="48px" cursor="pointer"
      transition="background-color 0.2s" _hover={{ bg: hoverBg }} data-testid="menu-dark-mode"
    >
      <Icon as={isDark ? FaMoon : FaSun} boxSize={4} color="gray.500" />
      <Text flex={1} fontSize="sm" fontWeight="medium">Dark mode</Text>
      <Switch
        colorScheme={colorScheme} isChecked={isDark}
        onChange={(e) => setPreference(e.target.checked ? 'dark' : 'light')}
      />
    </Flex>
  );
};

/** Install Pulsar, first thing in the menu until the app is installed. */
const InstallButton = ({ onDone }: { onDone: () => void }) => {
  const { deferredPrompt, isInstalled, isIOS, promptInstall } = useInstallPromptStore();
  const toast = useToast();
  const canPrompt = !!deferredPrompt;
  if (isInstalled || !(canPrompt || isIOS)) return null;

  const handleClick = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') toast({ title: 'Installing Pulsar...', status: 'success', duration: 2000, isClosable: true });
    } else {
      toast({ title: 'Install Pulsar', description: 'Tap the Share icon, then "Add to Home Screen".', status: 'info', duration: 6000, isClosable: true });
    }
    onDone();
  };

  return (
    <Box px={4} mb={4}>
      <Flex
        as="button" w="100%" align="center" gap={3} px={4} py={3} minH="64px" borderRadius="xl" textAlign="left"
        bgGradient="linear(to-br, cyan.400, blue.500)" color="white"
        boxShadow="0 8px 20px -8px rgba(49, 130, 206, 0.7)"
        _hover={{ filter: 'brightness(1.06)' }} _active={{ filter: 'brightness(0.95)' }}
        onClick={handleClick} data-testid="menu-install"
      >
        <Flex flexShrink={0} align="center" justify="center" boxSize="40px" borderRadius="full" bg="whiteAlpha.300">
          <Icon as={canPrompt ? FaDownload : FaShareSquare} boxSize={4} />
        </Flex>
        <Box minW={0}>
          <Text fontWeight="bold" lineHeight="short">Install Pulsar</Text>
          <Text fontSize="xs" opacity={0.9}>
            {canPrompt ? 'Full screen on your home screen, works offline' : 'Tap Share, then "Add to Home Screen"'}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

/**
 * Who's signed in and what AI they have: the subscription, the free allowance, or their own
 * key. Hidden where the site has no sign-in, like Settings' Account card.
 */
const AccountSummary = ({ menu }: { menu: UrlModal }) => {
  const account = useAccount();
  const [apiKey] = useOpenAiApiKey();
  const toast = useToast();
  const [signingIn, setSigningIn] = useState(false);
  const muted = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const surface = useColorModeValue('gray.50', 'whiteAlpha.50');
  if (!account.signInAvailable) return null;

  const user = account.user;
  if (!user) {
    const handleSignIn = async () => {
      setSigningIn(true);
      try {
        await menu.close(); // Come back to the page, not to the open menu
        await signInWithGoogle();
      } catch (e) {
        setSigningIn(false);
        toast({ title: "Couldn't start sign-in", description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });
      }
    };
    return (
      <Box px={4} mb={4} data-testid="menu-account">
        <Button w="full" size="lg" variant="outline" leftIcon={<FaGoogle />} onClick={handleSignIn} isLoading={signingIn}>
          Sign in with Google
        </Button>
        {account.hostedAI && !apiKey && (
          <Text fontSize="xs" color={muted} textAlign="center" mt={2}>
            Try Pulsar AI free, no OpenAI key needed.
          </Text>
        )}
      </Box>
    );
  }

  const ai = account.hostedAI ? account.ai : null;
  const subscribed = ai?.tier === 'pulsar_ai';
  const sub = account.subscription;
  const paymentFailed = subscribed && sub?.status === 'past_due';
  const left = (kind: 'plan' | 'edit') => (ai ? Math.max(0, ai[kind].limit - ai[kind].used) : 0);
  const plansLeft = left('plan');
  const editsLeft = left('edit');
  const toSettings = () => menu.leaveTo('/settings');

  return (
    <Box px={4} mb={4} data-testid="menu-account">
      <Box borderWidth="1px" borderRadius="xl" bg={surface} overflow="hidden">
        <Flex
          as="button" w="100%" align="center" gap={3} p={3} textAlign="left"
          transition="background-color 0.2s" _hover={{ bg: hoverBg }} onClick={toSettings}
          aria-label="Account settings"
        >
          <Avatar size="sm" name={user.name || user.email} src={user.image ?? undefined} referrerPolicy="no-referrer" />
          <Box minW={0} flex={1}>
            <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{user.name || 'Signed in'}</Text>
            <Text fontSize="xs" color={muted} noOfLines={1}>{user.email}</Text>
          </Box>
          <Icon as={FaChevronRight} boxSize={3} color="gray.400" />
        </Flex>
        {(ai || apiKey) && (
          <Box borderTopWidth="1px" px={3} py={2.5} data-testid="menu-plan">
            <Flex align="center" justify="space-between" gap={2}>
              <Flex align="center" gap={2} minW={0}>
                <Icon as={apiKey ? FaKey : FaCrown} boxSize={3.5} color={subscribed && !apiKey ? 'yellow.500' : apiKey ? 'cyan.500' : muted} />
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                  {ai && !subscribed && !apiKey ? 'Free Pulsar AI' : 'Pulsar AI'}
                </Text>
              </Flex>
              {subscribed && sub?.interval && (
                <Text fontSize="xs" color={muted} flexShrink={0}>{sub.interval === 'year' ? 'Yearly' : 'Monthly'}</Text>
              )}
            </Flex>
            <Text fontSize="xs" color={paymentFailed ? 'red.400' : muted} mt={0.5}>
              {paymentFailed ? (
                <><Icon as={FaExclamationCircle} boxSize={3} mr={1} verticalAlign="-2px" />Payment failed. Update your card in Settings.</>
              ) : apiKey ? (
                'Using your own OpenAI key'
              ) : (
                `${plansLeft} ${plansLeft === 1 ? 'plan' : 'plans'} and ${editsLeft} ${editsLeft === 1 ? 'edit' : 'edits'} left`
              )}
            </Text>
            {ai && !subscribed && account.billing && !apiKey && (
              <Button
                mt={2.5} w="full" size="sm" borderRadius="lg" color="white" bgImage={ENERGY_GRADIENT}
                _hover={{ filter: 'brightness(1.08)' }} _active={{ filter: 'brightness(0.95)' }}
                leftIcon={<FaCrown />} onClick={toSettings}
              >
                Get Pulsar AI
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface AppMenuProps {
  menu: UrlModal;
  colorScheme: string;
}

/** The side menu's contents: install, account and plan, then a dark mode switch and the other pages. */
const AppMenu = ({ menu, colorScheme }: AppMenuProps) => {
  return (
    <>
      <InstallButton onDone={() => menu.close()} />
      <AccountSummary menu={menu} />

      {/* Hidden when nothing is above it (installed, and no sign-in on this site) */}
      <Divider mb={2} sx={{ '&:first-child': { display: 'none' } }} />
      <DarkModeRow colorScheme={colorScheme} />
      <MenuRow icon={FaCog} label="Settings" onClick={() => menu.leaveTo('/settings')} />
      <MenuRow icon={FaInfoCircle} label="About" onClick={() => menu.leaveTo('/about')} />
      <MenuRow icon={FaGlobe} label="Pulsar website" href={HOMEPAGE_URL} />
    </>
  );
};

export default AppMenu;
