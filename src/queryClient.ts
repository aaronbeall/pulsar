import { QueryClient } from '@tanstack/react-query';

/** The app's one QueryClient, importable outside React (e.g. to refresh the account after an AI call). */
export const queryClient = new QueryClient();
