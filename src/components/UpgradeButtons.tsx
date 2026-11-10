import { useState } from 'react';
import { Button, Stack, Text, useToast } from '@chakra-ui/react';
import { PULSAR_AI_PRICES, startCheckout } from '../services/account';

/**
 * The two ways to buy Pulsar AI. Each leaves for Stripe Checkout and comes back to
 * `returnTo` (this page by default). Yearly is the better deal and pays the card fee once.
 */
const UpgradeButtons = ({ returnTo, onBeforeCheckout }: { returnTo?: string; onBeforeCheckout?: () => void }) => {
  const toast = useToast();
  const [busy, setBusy] = useState<'month' | 'year' | null>(null);

  const choose = async (interval: 'month' | 'year') => {
    setBusy(interval);
    try {
      onBeforeCheckout?.();
      await startCheckout(interval, returnTo);
      // The page navigates to Stripe; keep the button spinning until it does.
    } catch (e) {
      setBusy(null);
      toast({ title: "Couldn't start checkout", description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });
    }
  };

  return (
    <Stack spacing={2}>
      <Button colorScheme="cyan" size="lg" w="full" onClick={() => choose('year')} isLoading={busy === 'year'} isDisabled={busy !== null}>
        {PULSAR_AI_PRICES.year}
        <Text as="span" fontSize="sm" fontWeight="normal" ml={2} opacity={0.9}>save 37%</Text>
      </Button>
      <Button variant="outline" colorScheme="cyan" size="lg" w="full" onClick={() => choose('month')} isLoading={busy === 'month'} isDisabled={busy !== null}>
        {PULSAR_AI_PRICES.month}
      </Button>
    </Stack>
  );
};

export default UpgradeButtons;
