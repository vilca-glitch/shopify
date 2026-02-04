import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useDeleteJob() {
  const queryClient = useQueryClient();

  const deleteJob = useMutation({
    mutationFn: async (jobId: string): Promise<void> => {
      const { error } = await supabase
        .from('scraping_jobs')
        .delete()
        .eq('id', jobId);

      if (error) {
        throw new Error(`Failed to delete job: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate both job history and storage stats
      queryClient.invalidateQueries({ queryKey: ['job-history'] });
      queryClient.invalidateQueries({ queryKey: ['storage-stats'] });
    },
  });

  return {
    deleteJob: deleteJob.mutate,
    isDeleting: deleteJob.isPending,
    error: deleteJob.error,
  };
}
