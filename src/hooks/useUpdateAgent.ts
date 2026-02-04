import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AgentStatus, RecurringAgent } from '../lib/types';

interface UpdateAgentRequest {
  id: string;
  status: AgentStatus;
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  const updateAgent = useMutation({
    mutationFn: async (request: UpdateAgentRequest): Promise<RecurringAgent> => {
      const { data: agent, error } = await supabase
        .from('recurring_agents')
        .update({ status: request.status })
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update agent: ${error.message}`);
      }

      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-agents'] });
    },
  });

  return {
    updateAgent: updateAgent.mutate,
    isUpdating: updateAgent.isPending,
    error: updateAgent.error,
  };
}
