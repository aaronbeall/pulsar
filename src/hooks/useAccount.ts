import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountState, NO_ACCOUNT, fetchAccount } from '../services/account';

export const ACCOUNT_QUERY_KEY = ['account'] as const;

/** The visitor's account (see services/account.ts). Starts as "no sign-in" until loaded. */
export function useAccount() {
  const query = useQuery<AccountState>({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: fetchAccount,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const queryClient = useQueryClient();
  return {
    ...(query.data ?? NO_ACCOUNT),
    isLoading: query.isLoading,
    /** Refetch after signing out or deleting the account. */
    refresh: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
  };
}
