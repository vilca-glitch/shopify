import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  const deleteAgent = useMutation({
    mutationFn: async (agentId: string): Promise<void> => {
      const { error } = await supabase
        .from('recurring_agents')
        .delete()
        .eq('id', agentId);

      if (error) {
        throw new Error(`Failed to delete agent: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-agents'] });
    },
  });

  return {
    deleteAgent: deleteAgent.mutate,
    isDeleting: deleteAgent.isPending,
    error: deleteAgent.error,
  };
}
