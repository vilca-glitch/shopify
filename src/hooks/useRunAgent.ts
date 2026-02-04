import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RunAgentResult {
  success: boolean;
  agent_id: string;
  app_slug: string;
  status: 'success' | 'failed';
  reviews_pushed?: number;
  error?: string;
}

export function useRunAgent() {
  const queryClient = useQueryClient();

  const runAgent = useMutation({
    mutationFn: async (agentId: string): Promise<RunAgentResult> => {
      const { data, error } = await supabase.functions.invoke('run-recurring-agent', {
        body: { agent_id: agentId },
      });

      if (error) {
        throw new Error(`Failed to run agent: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Agent run failed');
      }

      // The response contains results array with our agent
      const result = data.results?.[0];
      if (result?.status === 'failed') {
        throw new Error(result.error || 'Agent run failed');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-agents'] });
    },
  });

  return {
    runAgent: runAgent.mutate,
    runAgentAsync: runAgent.mutateAsync,
    isRunning: runAgent.isPending,
    error: runAgent.error,
  };
}
