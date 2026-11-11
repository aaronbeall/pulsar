import { useEffect, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAccount } from './useAccount';

/** How often, and for how long, to re-check the account while Stripe's webhook catches up. */
export const CHECKOUT_POLL_MS = 2000;
export const CHECKOUT_POLL_TRIES = 15;

/**
 * Back from Stripe Checkout (?subscribed=1), on whatever page the purchase started: thank the
 * user and re-check the account until the subscription shows up, because Stripe's webhook can
 * land some seconds after the redirect. Mounted once, in App.
 */
export function useCheckoutReturn() {
  const toast = useToast();
  const { refresh, ai } = useAccount();
  // Read once: the param is removed from the URL right away, and the polling must not stop
  // just because the next render no longer sees it.
  const [justSubscribed] = useState(() => new URLSearchParams(window.location.search).get('subscribed') === '1');
  const subscribed = ai?.tier === 'pulsar_ai';

  useEffect(() => {
    if (!justSubscribed) return;
    toast({ id: 'checkout-return', title: 'Welcome to Pulsar AI', description: 'Thanks for subscribing!', status: 'success', duration: 6000, isClosable: true });
    const url = new URL(window.location.href);
    url.searchParams.delete('subscribed');
    window.history.replaceState(window.history.state, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSubscribed]);

  useEffect(() => {
    if (!justSubscribed || subscribed) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      refresh();
      if (++tries >= CHECKOUT_POLL_TRIES) window.clearInterval(timer);
    }, CHECKOUT_POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSubscribed, subscribed]);
}
