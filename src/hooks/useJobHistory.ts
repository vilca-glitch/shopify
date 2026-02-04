import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ScrapingJob } from '../lib/types';

export function useJobHistory() {
  return useQuery({
    queryKey: ['job-history'],
    queryFn: async (): Promise<ScrapingJob[]> => {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch job history: ${error.message}`);
      }

      return data || [];
    },
  });
}
