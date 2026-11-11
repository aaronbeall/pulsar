import { useState } from 'react';
import { Badge, Box, Button, Flex, Stack, Text, useColorModeValue, useToast } from '@chakra-ui/react';
import { PULSAR_AI_PRICES, startCheckout } from '../services/account';
import LegalLinks from './LegalLinks';

// The brand's "energy" gradient (the homepage's call-to-action colors), so buying stands
// apart from the app's everyday cyan buttons.
const ENERGY = 'linear-gradient(100deg, #7c3aed 0%, #c026d3 55%, #e11d48 100%)';

/**
 * The two ways to buy Pulsar AI. Each leaves for Stripe Checkout and comes back to
 * `returnTo` (this page by default). Yearly is the better deal and pays the card fee once.
 */
const UpgradeButtons = ({ returnTo }: { returnTo?: string }) => {
  const toast = useToast();
  const [busy, setBusy] = useState<'month' | 'year' | null>(null);
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  // The button's own background, inside its gradient border (matches the card it sits on).
  const surface = useColorModeValue('#ffffff', '#1A202C');
  const ink = useColorModeValue('gray.800', 'white');

  const choose = async (interval: 'month' | 'year') => {
    setBusy(interval);
    try {
      await startCheckout(interval, returnTo);
      // The page navigates to Stripe; keep the button spinning until it does.
    } catch (e) {
      setBusy(null);
      toast({ title: "Couldn't start checkout", description: e instanceof Error ? e.message : undefined, status: 'error', duration: 4000, isClosable: true });
    }
  };

  return (
    <Stack spacing={2}>
      <Button
        h="auto" minH="64px" w="full" px={4} py={3} borderRadius="xl"
        bgImage={ENERGY} color="white"
        boxShadow="0 8px 24px -6px rgba(217, 70, 239, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.15)"
        _hover={{ filter: 'brightness(1.08)' }} _active={{ filter: 'brightness(0.95)' }}
        onClick={() => choose('year')} isLoading={busy === 'year'} isDisabled={busy !== null}
      >
        <Flex w="full" align="center" justify="space-between" gap={3}>
          <Box textAlign="left">
            <Text fontSize="xl" fontWeight="extrabold" lineHeight="short">{PULSAR_AI_PRICES.year}</Text>
            <Text fontSize="xs" fontWeight="medium" opacity={0.9}>That's $2.50 a month</Text>
          </Box>
          <Badge bg="whiteAlpha.900" color="purple.700" borderRadius="full" px={2.5} py={1} fontSize="xs">Save 37%</Badge>
        </Flex>
      </Button>
      <Button
        h="auto" minH="56px" w="full" px={4} py={3} borderRadius="xl"
        border="2px solid transparent" color={ink}
        // A gradient border around a plain surface: the same colors, one step quieter.
        bg={`linear-gradient(${surface}, ${surface}) padding-box, ${ENERGY} border-box`}
        _hover={{ opacity: 0.9 }}
        onClick={() => choose('month')} isLoading={busy === 'month'} isDisabled={busy !== null}
      >
        <Flex w="full" align="center" justify="space-between">
          <Text fontSize="lg" fontWeight="bold">{PULSAR_AI_PRICES.month}</Text>
          <Text fontSize="xs" color={mutedColor} fontWeight="medium">Monthly</Text>
        </Flex>
      </Button>
      {/* Auto-renewal has to be stated before purchase, next to the buttons. */}
      <Text fontSize="xs" color={mutedColor} textAlign="center" data-testid="upgrade-terms">
        Renews automatically until you cancel. Cancel anytime in Settings.{' '}
        <LegalLinks />
      </Text>
    </Stack>
  );
};

export default UpgradeButtons;
