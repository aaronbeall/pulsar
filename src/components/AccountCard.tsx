import { useState } from 'react';
import { Avatar, Box, Button, Flex, Heading, Icon, Text, VStack, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaGoogle, FaUserCircle } from 'react-icons/fa';
import { useAccount } from '../hooks/useAccount';
import { deleteAccount, signInWithGoogle, signOut } from '../services/account';

/**
 * Settings > Account: optional Google sign-in. Hidden where the site has no sign-in (GitHub
 * Pages, plain `npm run dev`), so the app looks exactly as before there.
 */
const allowanceLine = ({ used, limit }: { used: number; limit: number }, one: string, many: string) =>
  `${Math.max(0, limit - used)} of ${limit} ${limit === 1 ? one : many} left`;

const AccountCard = () => {
  const account = useAccount();
  const toast = useToast();
  const [busy, setBusy] = useState<'signin' | 'signout' | 'delete' | null>(null);
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
                <Text fontSize="xs" color={mutedColor}>Resets {new Date(account.ai.resetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
              )}
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
            Your account holds only your name and email. Your routines and workouts stay on this
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
        </VStack>
      )}
    </Box>
  );
};

export default AccountCard;
