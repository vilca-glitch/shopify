import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchPageContent } from '../_shared/browserless.ts';
import { parseReviews, parsePagination, buildReviewsUrl } from '../_shared/parser.ts';

const DELAY_BETWEEN_PAGES_MS = 1000; // 1 second delay between requests
const PAGES_PER_BATCH = 30; // Process 30 pages per invocation (~45s, safe margin under compute limit)

interface RequestBody {
  job_id: string;
  start_page?: number; // Page to start from (for batch continuation)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate environment variables early
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY');

  if (!SUPABASE_URL) {
    console.error('SUPABASE_URL not configured in Edge Function environment');
    return new Response(
      JSON.stringify({
        error: 'Server misconfigured: SUPABASE_URL not set. Configure in Supabase Dashboard > Edge Functions > Secrets.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured in Edge Function environment');
    return new Response(
      JSON.stringify({
        error:
          'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set. Configure in Supabase Dashboard > Edge Functions > Secrets.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  if (!browserlessKey) {
    console.error('BROWSERLESS_API_KEY not configured in Edge Function environment');
    return new Response(
      JSON.stringify({
        error:
          'Server misconfigured: BROWSERLESS_API_KEY not set. Configure in Supabase Dashboard > Edge Functions > Secrets.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { job_id, start_page }: RequestBody = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: 'job_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      const errorMessage = `Job not found: ${jobError?.message || 'Unknown error'}`;
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const baseUrl = job.app_url;
    let totalReviewsFound = job.total_reviews_found || 0;
    let totalPages = job.total_pages || 0;
    let startPage = start_page || 1;

    // First batch: fetch page 1 to get pagination info and set job to running
    if (!start_page || start_page === 1) {
      // Delete existing reviews for this app (from any previous jobs) to start fresh
      // This ensures each manual scrape is independent and not affected by duplicates
      const { data: previousJobs } = await supabase
        .from('scraping_jobs')
        .select('id')
        .eq('app_url', baseUrl)
        .neq('id', job_id);

      if (previousJobs && previousJobs.length > 0) {
        const previousJobIds = previousJobs.map(j => j.id);
        const { error: deleteError } = await supabase
          .from('reviews')
          .delete()
          .in('job_id', previousJobIds);

        if (deleteError) {
          console.error('Error deleting previous reviews:', deleteError);
        } else {
          console.log(`Deleted reviews from ${previousJobIds.length} previous jobs for ${baseUrl}`);
        }

        // Also delete the old jobs themselves to keep history clean
        await supabase
          .from('scraping_jobs')
          .delete()
          .in('id', previousJobIds);
      }
      // Update job status to running
      await supabase
        .from('scraping_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', job_id);

      // Wrap first page fetch in try-catch to provide specific error handling
      try {
        const firstPageUrl = buildReviewsUrl(baseUrl, 1);
        console.log(`Fetching first page: ${firstPageUrl}`);

        const firstPageHtml = await fetchPageContent(firstPageUrl);
        const paginationInfo = parsePagination(firstPageHtml);
        totalPages = paginationInfo.totalPages;

        console.log(`Total pages to scrape: ${totalPages}`);

        // Update total pages
        await supabase
          .from('scraping_jobs')
          .update({ total_pages: totalPages, current_page: 0 })
          .eq('id', job_id);

        // Process first page reviews
        const firstPageReviews = await parseReviews(firstPageHtml);
        if (firstPageReviews.length > 0) {
          const reviewsToInsert = firstPageReviews.map((review) => ({
            ...review,
            job_id,
          }));

          const { error: insertError } = await supabase
            .from('reviews')
            .upsert(reviewsToInsert, { onConflict: 'review_hash', ignoreDuplicates: true });

          if (insertError) {
            console.error('Error inserting reviews:', insertError);
          } else {
            totalReviewsFound += firstPageReviews.length;
          }
        }

        // Update progress after first page
        await supabase
          .from('scraping_jobs')
          .update({ current_page: 1, total_reviews_found: totalReviewsFound })
          .eq('id', job_id);

        startPage = 2; // Continue from page 2
      } catch (firstPageError) {
        const errorMessage =
          firstPageError instanceof Error ? firstPageError.message : String(firstPageError);
        console.error('Failed to fetch first page:', errorMessage);

        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: `Failed to fetch first page: ${errorMessage}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job_id);

        return new Response(
          JSON.stringify({ error: `Failed to fetch first page: ${errorMessage}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Calculate the end page for this batch
    const endPage = Math.min(startPage + PAGES_PER_BATCH - 1, totalPages);

    console.log(`Processing batch: pages ${startPage} to ${endPage} of ${totalPages}`);

    // Process pages in this batch
    for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_PAGES_MS));

      const pageUrl = buildReviewsUrl(baseUrl, currentPage);
      console.log(`Fetching page ${currentPage}/${totalPages}: ${pageUrl}`);

      try {
        const pageHtml = await fetchPageContent(pageUrl);
        const pageReviews = await parseReviews(pageHtml);

        if (pageReviews.length > 0) {
          const reviewsToInsert = pageReviews.map((review) => ({
            ...review,
            job_id,
          }));

          const { error: insertError } = await supabase
            .from('reviews')
            .upsert(reviewsToInsert, { onConflict: 'review_hash', ignoreDuplicates: true });

          if (insertError) {
            console.error(`Error inserting reviews from page ${currentPage}:`, insertError);
          } else {
            totalReviewsFound += pageReviews.length;
          }
        }

        // Update progress every page
        await supabase
          .from('scraping_jobs')
          .update({ current_page: currentPage, total_reviews_found: totalReviewsFound })
          .eq('id', job_id);
      } catch (pageError) {
        const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
        console.error(`Error processing page ${currentPage}:`, errorMessage);
        // Continue to next page even if one fails
      }
    }

    // Check if there are more pages to process
    const nextPage = endPage + 1;
    if (nextPage <= totalPages) {
      // Get actual review count from database (deduplicated) for accurate progress
      const { count: batchReviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', job_id);

      // Update job with actual count before returning
      await supabase
        .from('scraping_jobs')
        .update({ total_reviews_found: batchReviewCount ?? totalReviewsFound })
        .eq('id', job_id);

      // More pages remain - return continuing status for client to re-invoke
      console.log(`Batch complete. Next batch starts at page ${nextPage}`);
      return new Response(
        JSON.stringify({
          success: true,
          status: 'continuing',
          next_page: nextPage,
          total_pages: totalPages,
          reviews_so_far: batchReviewCount ?? totalReviewsFound,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get actual review count from database (deduplicated)
    const { count: actualReviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', job_id);

    // All pages processed - mark job as completed
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_page: totalPages,
        total_reviews_found: actualReviewCount ?? totalReviewsFound,
      })
      .eq('id', job_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        total_pages: totalPages,
        total_reviews: actualReviewCount ?? totalReviewsFound,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Scraping error:', errorMessage);

    // Try to update job status to failed
    try {
      const body = await req.clone().json();
      if (body?.job_id) {
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', body.job_id);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
