import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Review } from '../lib/types';

export function useReviews(jobId: string | null) {
  return useQuery({
    queryKey: ['reviews', jobId],
    queryFn: async (): Promise<Review[]> => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('job_id', jobId)
        .order('review_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!jobId,
  });
}
