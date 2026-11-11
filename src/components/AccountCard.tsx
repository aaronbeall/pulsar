import { useState } from 'react';
import { Avatar, Box, Button, Flex, Heading, Icon, Link, Text, VStack, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaCrown, FaGoogle, FaUserCircle } from 'react-icons/fa';
import { useAccount } from '../hooks/useAccount';
import { deleteAccount, openBillingPortal, signInWithGoogle, signOut } from '../services/account';
import UpgradeButtons from './UpgradeButtons';
import { PRIVACY_URL, TERMS_URL } from './LegalLinks';

/**
 * Settings > Account: optional Google sign-in. Hidden where the site has no sign-in (GitHub
 * Pages, plain `npm run dev`), so the app looks exactly as before there.
 */
const formatDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** One AI allowance as a labelled meter of what's left: "Routine plans · 18 of 20 left". */
const AllowanceMeter = ({ label, used, limit, premium }: { label: string; used: number; limit: number; premium: boolean }) => {
  const left = Math.max(0, limit - used);
  const fraction = limit > 0 ? left / limit : 0;
  const track = useColorModeValue('gray.100', 'whiteAlpha.200');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const fill = left === 0 ? 'red.400' : premium ? undefined : 'cyan.400';
  return (
    <Box role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={left} aria-valuetext={`${left} of ${limit} left`}>
      <Flex justify="space-between" align="baseline" mb={1.5}>
        <Text fontSize="sm" fontWeight="medium">{label}</Text>
        <Text fontSize="sm" color={muted}>
          <Text as="span" fontSize="lg" fontWeight="bold" color={left === 0 ? 'red.400' : undefined}>{left}</Text> of {limit} left
        </Text>
      </Flex>
      <Box h="10px" bg={track} borderRadius="full" overflow="hidden">
        <Box
          h="full" w={`${fraction * 100}%`} minW={left > 0 ? '10px' : 0} borderRadius="full" bg={fill}
          bgImage={fill ? undefined : 'linear-gradient(90deg, #7c3aed, #c026d3 55%, #e11d48)'}
          transition="width 0.4s ease"
        />
      </Box>
    </Box>
  );
};

const AccountCard = () => {
  const account = useAccount();
  const toast = useToast();
  const [busy, setBusy] = useState<'signin' | 'signout' | 'delete' | 'portal' | null>(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');


  if (!account.signInAvailable) return null;

  const fail = (title: string, e: unknown) =>
    toast({ title, description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });

  const handleSignIn = async () => {
    setBusy('signin');
    try {
      await signInWithGoogle();
      // The page navigates to Google; leave the button spinning until it does.
    } catch (e) {
      setBusy(null);
      fail("Couldn't start sign-in", e);
    }
  };

  const handleSignOut = async () => {
    setBusy('signout');
    try {
      await signOut();
      await account.refresh();
    } catch (e) {
      fail("Couldn't sign out", e);
    } finally {
      setBusy(null);
    }
  };

  const handlePortal = async () => {
    setBusy('portal');
    try {
      await openBillingPortal();
    } catch (e) {
      setBusy(null);
      fail("Couldn't open billing", e);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Delete your Pulsar account? Your sign-in and account details are removed from our server. Your routines and workouts stay on this device.'
    );
    if (!confirmed) return;
    setBusy('delete');
    try {
      await deleteAccount();
      await account.refresh();
      toast({ title: 'Account deleted', status: 'success', duration: 3000, isClosable: true });
    } catch (e) {
      fail("Couldn't delete the account", e);
    } finally {
      setBusy(null);
    }
  };

  const user = account.user;
  return (
    <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="xl" p={{ base: 4, sm: 5 }} boxShadow="sm" data-testid="account-card">
      <Flex align="center" gap={2} mb={3}>
        <Icon as={FaUserCircle} color="cyan.500" />
        <Heading size="sm">Account</Heading>
      </Flex>
      {user ? (
        <VStack align="stretch" spacing={4}>
          <Flex align="center" gap={3} minW={0}>
            <Avatar size="md" name={user.name || user.email} src={user.image ?? undefined} referrerPolicy="no-referrer" />
            <Box minW={0}>
              <Text fontWeight="semibold" noOfLines={1}>{user.name || 'Signed in'}</Text>
              <Text fontSize="sm" color={mutedColor} noOfLines={1}>{user.email}</Text>
            </Box>
          </Flex>
          {account.hostedAI && account.ai && (
            <Box data-testid="ai-allowance" borderWidth="1px" borderColor={cardBorder} borderRadius="lg" p={3}>
              <Flex align="center" justify="space-between" mb={3} gap={2}>
                <Flex align="center" gap={2}>
                  <Icon as={FaCrown} color={account.ai.tier === 'pulsar_ai' ? 'yellow.500' : mutedColor} />
                  <Text fontWeight="semibold">{account.ai.tier === 'free' ? 'Free Pulsar AI' : 'Pulsar AI'}</Text>
                </Flex>
                <Text fontSize="xs" color={mutedColor}>
                  {account.ai.resetsAt ? `Resets ${formatDate(account.ai.resetsAt)}` : 'One-time'}
                </Text>
              </Flex>
              <VStack align="stretch" spacing={3}>
                <AllowanceMeter label="Routine plans" {...account.ai.plan} premium={account.ai.tier === 'pulsar_ai'} />
                <AllowanceMeter label="AI messages" {...account.ai.edit} premium={account.ai.tier === 'pulsar_ai'} />
              </VStack>
            </Box>
          )}
          {account.subscription && account.ai?.tier === 'pulsar_ai' && (
            <Box data-testid="subscription">
              <Text fontSize="sm" color={mutedColor} mb={2}>
                {account.subscription.interval === 'year' ? 'Yearly' : 'Monthly'} plan
                {account.subscription.currentPeriodEnd &&
                  (account.subscription.cancelAtPeriodEnd
                    ? `, ends ${formatDate(account.subscription.currentPeriodEnd)}`
                    : `, renews ${formatDate(account.subscription.currentPeriodEnd)}`)}
                {account.subscription.status === 'past_due' && '. Payment failed: update your card.'}
              </Text>
              <Button size="sm" variant="outline" onClick={handlePortal} isLoading={busy === 'portal'} isDisabled={busy !== null}>
                Manage subscription
              </Button>
            </Box>
          )}
          {account.billing && account.hostedAI && account.ai?.tier !== 'pulsar_ai' && (
            <Box data-testid="upgrade">
              <Text fontSize="sm" mb={2}>
                Pulsar AI: 20 routine plans and 200 AI messages every month. Cancel anytime.
              </Text>
              <UpgradeButtons />
            </Box>
          )}
          <Flex gap={2} wrap="wrap">
            <Button variant="outline" onClick={handleSignOut} isLoading={busy === 'signout'} isDisabled={busy !== null}>
              Sign out
            </Button>
            <Button variant="ghost" colorScheme="red" onClick={handleDelete} isLoading={busy === 'delete'} isDisabled={busy !== null}>
              Delete account
            </Button>
          </Flex>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={3}>
          <Text fontSize="sm" color={mutedColor}>
            {account.hostedAI
              ? 'Sign in to try Pulsar AI free: 1 routine plan and 2 AI messages, no OpenAI key needed.'
              : 'Sign in to keep a Pulsar account.'}{' '}
            Your account holds only your name, email and AI usage. Your routines and workouts stay on this
            device.
          </Text>
          <Button
            leftIcon={<FaGoogle />}
            variant="outline"
            onClick={handleSignIn}
            isLoading={busy === 'signin'}
            alignSelf="flex-start"
            size="lg"
          >
            Sign in with Google
          </Button>
          <Text fontSize="xs" color={mutedColor}>
            By signing in you agree to the{' '}
            <Link href={TERMS_URL} textDecoration="underline">Terms of Service</Link> and{' '}
            <Link href={PRIVACY_URL} textDecoration="underline">Privacy Policy</Link>.
          </Text>
        </VStack>
      )}
    </Box>
  );
};

export default AccountCard;
