import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { extractAppSlug, normalizeShopifyUrl } from '../lib/validators';
import type { CreateJobRequest, ScrapingJob } from '../lib/types';

interface ScrapeResponse {
  success: boolean;
  status: 'continuing' | 'completed';
  next_page?: number;
  total_pages?: number;
  total_reviews?: number;
  reviews_so_far?: number;
}

export function useScrapingJob() {
  const queryClient = useQueryClient();

  const createJob = useMutation({
    mutationFn: async (request: CreateJobRequest): Promise<ScrapingJob> => {
      const normalizedUrl = normalizeShopifyUrl(request.app_url);
      const appSlug = extractAppSlug(normalizedUrl);

      if (!appSlug) {
        throw new Error('Invalid Shopify app URL');
      }

      // Insert the job into the database
      const { data: job, error: insertError } = await supabase
        .from('scraping_jobs')
        .insert({
          app_url: normalizedUrl,
          app_slug: appSlug,
          filter_type: request.filter_type,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create job: ${insertError.message}`);
      }

      // Process scraping in batches with client-side polling
      let nextPage: number | undefined;

      do {
        const { data, error: fnError } = await supabase.functions.invoke<ScrapeResponse>(
          'scrape-reviews',
          {
            body: { job_id: job.id, start_page: nextPage },
          }
        );

        if (fnError) {
          // Update job status to failed if Edge Function call fails
          await supabase
            .from('scraping_jobs')
            .update({ status: 'failed', error_message: fnError.message })
            .eq('id', job.id);
          throw new Error(`Failed to start scraping: ${fnError.message}`);
        }

        // Check if more batches are needed
        if (data?.status === 'continuing' && data.next_page) {
          nextPage = data.next_page;
          console.log(`Batch complete, continuing from page ${nextPage}`);
          // Invalidate queries to update UI with progress
          queryClient.invalidateQueries({ queryKey: ['job-history'] });
        } else {
          nextPage = undefined;
        }
      } while (nextPage);

      // Invalidate one final time to get completed status
      queryClient.invalidateQueries({ queryKey: ['job-history'] });

      return job;
    },
    onSuccess: () => {
      // Invalidate job history so the new job appears immediately
      queryClient.invalidateQueries({ queryKey: ['job-history'] });
    },
  });

  return {
    createJob: createJob.mutate,
    isCreating: createJob.isPending,
    error: createJob.error,
  };
}
