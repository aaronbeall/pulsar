import { useEffect, useState } from 'react';
import { Avatar, Box, Button, Flex, Heading, Icon, Link, Text, VStack, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaGoogle, FaUserCircle } from 'react-icons/fa';
import { useAccount } from '../hooks/useAccount';
import { deleteAccount, openBillingPortal, signInWithGoogle, signOut } from '../services/account';
import UpgradeButtons from './UpgradeButtons';
import { PRIVACY_URL, TERMS_URL } from './LegalLinks';

/**
 * Settings > Account: optional Google sign-in. Hidden where the site has no sign-in (GitHub
 * Pages, plain `npm run dev`), so the app looks exactly as before there.
 */
const formatDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const allowanceLine = ({ used, limit }: { used: number; limit: number }, one: string, many: string) =>
  `${Math.max(0, limit - used)} of ${limit} ${limit === 1 ? one : many} left`;

const AccountCard = () => {
  const account = useAccount();
  const toast = useToast();
  const [busy, setBusy] = useState<'signin' | 'signout' | 'delete' | 'portal' | null>(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.700');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Back from Stripe Checkout (?subscribed=1): Stripe's webhook can land a moment after the
  // redirect, so check the account a few times until the subscription shows up.
  const justSubscribed = new URLSearchParams(window.location.search).get('subscribed') === '1';
  const { refresh } = account;
  useEffect(() => {
    if (!justSubscribed) return;
    toast({ title: 'Welcome to Pulsar AI', description: 'Thanks for subscribing!', status: 'success', duration: 5000, isClosable: true });
    const url = new URL(window.location.href);
    url.searchParams.delete('subscribed');
    window.history.replaceState(window.history.state, '', url.toString());
    let tries = 0;
    const timer = window.setInterval(() => {
      refresh();
      if (++tries >= 5) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [justSubscribed, refresh, toast]);

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
            <Box data-testid="ai-allowance">
              <Text fontSize="sm" fontWeight="semibold" mb={1}>
                {account.ai.tier === 'free' ? 'Free Pulsar AI' : 'Pulsar AI'}
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                {allowanceLine(account.ai.plan, 'routine plan', 'routine plans')}
                {' · '}
                {allowanceLine(account.ai.edit, 'AI edit', 'AI edits')}
              </Text>
              {account.ai.resetsAt && (
                <Text fontSize="xs" color={mutedColor}>Resets {formatDate(account.ai.resetsAt)}</Text>
              )}
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
                Pulsar AI: 20 routine plans and 200 AI edits every month. Cancel anytime.
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
              ? 'Sign in to try Pulsar AI free: 1 routine plan and 2 AI edits, no OpenAI key needed.'
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
