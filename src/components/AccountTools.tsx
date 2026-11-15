import { useState } from 'react';
import { Box, Button, Flex, Icon, SimpleGrid, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { FaUserCog } from 'react-icons/fa';
import { useAccount } from '../hooks/useAccount';
import { PretendSubscription, SubscriptionInfo, changeTesterUsage, setPretendSubscription } from '../services/account';

/**
 * Dev mode only (Settings › Developer), and only for tester accounts (TESTER_EMAILS on the
 * server, which also checks every call): reset or use up the AI allowance, and pretend to be
 * subscribed, cancelling, past due or cancelled, to test those states without paying.
 */
const SUBSCRIPTION_STATES: Array<{ state: PretendSubscription; label: string }> = [
  { state: 'none', label: 'Not subscribed' },
  { state: 'active', label: 'Subscribed' },
  { state: 'cancelling', label: 'Cancelling' },
  { state: 'past_due', label: 'Past due' },
  { state: 'canceled', label: 'Cancelled' },
];

function currentState(sub: SubscriptionInfo | null): PretendSubscription {
  if (!sub) return 'none';
  if (sub.status === 'canceled') return 'canceled';
  if (sub.status === 'past_due') return 'past_due';
  return sub.cancelAtPeriodEnd ? 'cancelling' : 'active';
}

const AccountTools = () => {
  const account = useAccount();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  if (!account.tester || !account.user) return null;

  const run = async (key: string, title: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
      await account.refresh();
      toast({ title, status: 'success', duration: 2000, isClosable: true });
    } catch (e) {
      toast({ title: 'Account tools failed', description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setBusy(null);
    }
  };

  const state = currentState(account.subscription);
  const ai = account.ai;

  return (
    <Box data-testid="account-tools" borderWidth="1px" borderRadius="lg" p={3}>
      <Flex align="center" gap={2} mb={1}>
        <Icon as={FaUserCog} color="purple.400" />
        <Text fontWeight="semibold" fontSize="sm">Account tools</Text>
      </Flex>
      <Text fontSize="xs" color={mutedColor} mb={3}>
        Tester account: Pulsar AI answers with recorded replies, so nothing here costs anything.
        {ai && ` ${ai.tier === 'pulsar_ai' ? 'Pulsar AI' : 'Free'} tier, ${ai.plan.used}/${ai.plan.limit} plans and ${ai.edit.used}/${ai.edit.limit} edits used.`}
      </Text>

      <SimpleGrid columns={2} spacing={2} mb={4}>
        <Button size="md" variant="outline" isLoading={busy === 'reset'} onClick={() => run('reset', 'AI usage reset', () => changeTesterUsage('reset'))}>
          Reset AI usage
        </Button>
        <Button size="md" variant="outline" isLoading={busy === 'use-up'} onClick={() => run('use-up', 'AI allowance used up', () => changeTesterUsage('use-up'))}>
          Use up allowance
        </Button>
      </SimpleGrid>

      <Text fontSize="sm" fontWeight="medium" mb={2}>Pretend subscription</Text>
      <SimpleGrid columns={2} spacing={2} role="radiogroup" aria-label="Pretend subscription">
        {SUBSCRIPTION_STATES.map(({ state: s, label }) => (
          <Button
            key={s}
            size="md"
            role="radio"
            aria-checked={state === s}
            variant={state === s ? 'solid' : 'outline'}
            colorScheme={state === s ? 'purple' : undefined}
            isLoading={busy === s}
            onClick={() => state !== s && run(s, `Subscription: ${label.toLowerCase()}`, () => setPretendSubscription(s))}
          >
            {label}
          </Button>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default AccountTools;
