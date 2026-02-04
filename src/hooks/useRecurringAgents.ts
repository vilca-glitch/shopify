import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RecurringAgent } from '../lib/types';

export function useRecurringAgents() {
  return useQuery({
    queryKey: ['recurring-agents'],
    queryFn: async (): Promise<RecurringAgent[]> => {
      const { data, error } = await supabase
        .from('recurring_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch recurring agents: ${error.message}`);
      }

      return data || [];
    },
  });
}
