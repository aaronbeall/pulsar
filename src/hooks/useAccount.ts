import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ACCOUNT_QUERY_KEY, AccountState, fetchAccount, getAccountSnapshot } from '../services/account';

export { ACCOUNT_QUERY_KEY };

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
    ...(query.data ?? getAccountSnapshot()),
    isLoading: query.isLoading,
    /** Refetch after signing out or deleting the account. */
    refresh: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY }),
  };
}
