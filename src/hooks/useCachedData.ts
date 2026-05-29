import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Order, Ingredient } from '../types';

/**
 * Structured Data-Fetching Hooks utilizing TanStack Query for state caching and synchronization.
 */

// Hook to fetch orders catalog
export const useCachedOrders = (token: string) => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Order[]> => {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve orders list');
      return res.json();
    },
    staleTime: 1000 * 30, // Cache active for 30s
  });
};

// Hook to fetch storage inventory ingredients
export const useCachedInventory = (token: string) => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<Ingredient[]> => {
      const res = await fetch('/api/ingredients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve inventory ingredients');
      return res.json();
    },
    staleTime: 1000 * 20, // Cache active for 20s
  });
};

// Hook to fetch employees staff list
export const useCachedUsers = (token: string) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retrieve system users directory');
      return res.json();
    },
    staleTime: 1000 * 60, // Cache active for 1 minute
  });
};

// Hook with optimistic updates for toggling employee status
export const useToggleUserStatusMutation = (token: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, userObj }: { userId: string; userObj: Partial<User> }) => {
      const res = await fetch(`/api/employees/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userObj)
      });
      if (!res.ok) {
        throw new Error('Failed to update employee status on server');
      }
      return res.json();
    },
    // Perform optimistic updates instantly!
    onMutate: async ({ userId, userObj }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['users'] });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData<User[]>(['users']);

      // Optimistically update the cache
      if (previousUsers) {
        queryClient.setQueryData<User[]>(
          ['users'],
          previousUsers.map(u => (u.id === userId ? { ...u, ...userObj } as User : u))
        );
      }

      // Return context for rolling back
      return { previousUsers };
    },
    // If the mutation fails, rollback automatically using the snapshotted cache state
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
      console.error('Optimistic Toggle Status failed, triggered automatic rollback: ', err);
    },
    // Always refetch to stay synchronized with DB state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};
