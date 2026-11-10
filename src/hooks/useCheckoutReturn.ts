import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAccount } from './useAccount';

/**
 * Back from Stripe Checkout (?subscribed=1), on whatever page the purchase started: thank the
 * user and re-check the account a few times, because Stripe's webhook can land a moment after
 * the redirect. Mounted once, in App.
 */
export function useCheckoutReturn() {
  const toast = useToast();
  const { refresh } = useAccount();
  const justSubscribed = new URLSearchParams(window.location.search).get('subscribed') === '1';
  useEffect(() => {
    if (!justSubscribed) return;
    toast({ title: 'Welcome to Pulsar AI', description: 'Thanks for subscribing!', status: 'success', duration: 5000, isClosable: true });
    const url = new URL(window.location.href);
    url.searchParams.delete('subscribed');
    window.history.replaceState(window.history.state, '', url.toString());
    let tries = 0;
    const timer = window.setInterval(() => {
      refresh();
      if (++tries >= 8) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSubscribed]);
}
