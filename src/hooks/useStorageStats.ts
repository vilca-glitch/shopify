import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface StorageStats {
  used_bytes: number;
  limit_bytes: number;
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['storage-stats'],
    queryFn: async (): Promise<StorageStats> => {
      const { data, error } = await supabase.functions.invoke('storage-stats');

      if (error) {
        throw new Error(`Failed to fetch storage stats: ${error.message}`);
      }

      return data as StorageStats;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
}
