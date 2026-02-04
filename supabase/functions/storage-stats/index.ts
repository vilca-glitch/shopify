import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FREE_TIER_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Query the database size using pg_database_size
    const { data, error } = await supabase.rpc('pg_database_size', {
      name: 'postgres',
    });

    if (error) {
      // Fallback: try direct SQL query
      const { data: sqlData, error: sqlError } = await supabase
        .from('scraping_jobs')
        .select('id', { count: 'exact', head: true });

      if (sqlError) {
        throw new Error(`Failed to get storage stats: ${sqlError.message}`);
      }

      // Estimate storage based on record counts
      const { count: jobCount } = sqlData || { count: 0 };

      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .then((r) => r.data || { count: 0 });

      // Rough estimate: ~500 bytes per job, ~200 bytes per review
      const estimatedBytes = (jobCount || 0) * 500 + (reviewCount || 0) * 200;

      return new Response(
        JSON.stringify({
          used_bytes: estimatedBytes,
          limit_bytes: FREE_TIER_LIMIT_BYTES,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        used_bytes: data || 0,
        limit_bytes: FREE_TIER_LIMIT_BYTES,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Storage stats error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
