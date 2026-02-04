import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { extractAppSlug, normalizeShopifyUrl } from '../lib/validators';
import type { CreateAgentRequest, RecurringAgent } from '../lib/types';

export function useCreateAgent() {
  const queryClient = useQueryClient();

  const createAgent = useMutation({
    mutationFn: async (request: CreateAgentRequest): Promise<RecurringAgent> => {
      const normalizedUrl = normalizeShopifyUrl(request.app_url);
      const appSlug = extractAppSlug(normalizedUrl);

      if (!appSlug) {
        throw new Error('Invalid Shopify app URL');
      }

      const { data: agent, error } = await supabase
        .from('recurring_agents')
        .insert({
          app_url: normalizedUrl,
          app_slug: appSlug,
          run_day: request.run_day,
          webhook_url: request.webhook_url,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create agent: ${error.message}`);
      }

      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-agents'] });
    },
  });

  return {
    createAgent: createAgent.mutate,
    isCreating: createAgent.isPending,
    error: createAgent.error,
  };
}
