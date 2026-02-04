import { supabase } from '../lib/supabase';
import type { Review } from '../lib/types';

export async function fetchJobReviews(jobId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('job_id', jobId)
    .order('review_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  return data || [];
}
