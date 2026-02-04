import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ScrapingJob } from '../lib/types';

export function useRealtimeProgress(jobId: string | null) {
  const [job, setJob] = useState<ScrapingJob | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    // Fetch initial job state
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        setJob(data);
      }
    };

    fetchJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scraping_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setJob(payload.new as ScrapingJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return job;
}
