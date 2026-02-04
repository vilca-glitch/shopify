import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max wait time

interface RecurringAgent {
  id: string;
  app_url: string;
  app_slug: string;
  run_day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  webhook_url: string;
  status: string;
  last_run_at: string | null;
}

interface Review {
  reviewer_name: string | null;
  location: string | null;
  usage_time: string | null;
  star_rating: number;
  review_content: string | null;
  review_date: string | null;
  created_at: string;
}

interface WebhookPayload {
  agent_id: string;
  app_slug: string;
  app_url: string;
  scraped_at: string;
  reviews: {
    reviewer_name: string;
    location: string;
    usage_time: string;
    star_rating: number;
    review_content: string;
    review_date: string;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check for optional agent_id parameter for manual runs
    let specificAgentId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        specificAgentId = body.agent_id || null;
      } catch {
        // No body or invalid JSON, continue with scheduled run
      }
    }

    let dueAgents: RecurringAgent[];

    if (specificAgentId) {
      // Manual run: fetch specific agent regardless of day
      console.log(`Manual run requested for agent: ${specificAgentId}`);

      const { data: agent, error: agentError } = await supabase
        .from('recurring_agents')
        .select('*')
        .eq('id', specificAgentId)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent not found: ${agentError?.message || 'Unknown error'}`);
      }

      dueAgents = [agent];
    } else {
      // Scheduled run: query by day of week
      // Get current day of week in EST timezone
      const estDate = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      const currentDayOfWeek = new Date(estDate).getDay(); // 0-6 (Sunday-Saturday)

      console.log(`Current day of week in EST: ${currentDayOfWeek}`);

      // Query agents where status = 'active' AND run_day = today's day number
      const { data: agents, error: queryError } = await supabase
        .from('recurring_agents')
        .select('*')
        .eq('status', 'active')
        .eq('run_day', currentDayOfWeek);

      if (queryError) {
        throw new Error(`Failed to query agents: ${queryError.message}`);
      }

      dueAgents = agents || [];
    }

    if (!dueAgents || dueAgents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No agents due for execution' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${dueAgents.length} agents due for execution`);

    const results = [];

    for (const agent of dueAgents as RecurringAgent[]) {
      console.log(`Processing agent ${agent.id} for ${agent.app_slug}`);

      try {
        // 1. Create a scraping job (filter_type = 'all')
        const { data: job, error: jobError } = await supabase
          .from('scraping_jobs')
          .insert({
            app_url: agent.app_url,
            app_slug: agent.app_slug,
            filter_type: 'all',
            status: 'pending',
          })
          .select()
          .single();

        if (jobError || !job) {
          throw new Error(`Failed to create job: ${jobError?.message}`);
        }

        console.log(`Created job ${job.id} for agent ${agent.id}`);

        // 2. Invoke the scrape-reviews Edge Function
        const scrapeResponse = await fetch(`${SUPABASE_URL}/functions/v1/scrape-reviews`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id: job.id }),
        });

        if (!scrapeResponse.ok) {
          throw new Error(`Failed to start scraping: ${scrapeResponse.statusText}`);
        }

        // 3. Wait for completion (poll job status)
        let pollAttempts = 0;
        let jobStatus = 'pending';

        while (pollAttempts < MAX_POLL_ATTEMPTS && !['completed', 'failed'].includes(jobStatus)) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          pollAttempts++;

          const { data: updatedJob, error: pollError } = await supabase
            .from('scraping_jobs')
            .select('status')
            .eq('id', job.id)
            .single();

          if (pollError) {
            console.error(`Error polling job status: ${pollError.message}`);
            continue;
          }

          jobStatus = updatedJob?.status || 'pending';
          console.log(`Job ${job.id} status: ${jobStatus} (attempt ${pollAttempts})`);
        }

        if (jobStatus !== 'completed') {
          throw new Error(`Job did not complete. Final status: ${jobStatus}`);
        }

        // 4. Fetch only NEW reviews (where review_date > last_run_at or created_at > last_run_at)
        let reviewsQuery = supabase
          .from('reviews')
          .select('reviewer_name, location, usage_time, star_rating, review_content, review_date, created_at')
          .eq('job_id', job.id);

        // If agent has run before, only get new reviews
        if (agent.last_run_at) {
          // We check both review_date and created_at to catch new reviews
          // Since review_date is the actual date from Shopify and created_at is when we scraped it
          reviewsQuery = reviewsQuery.or(`review_date.gt.${agent.last_run_at.split('T')[0]},created_at.gt.${agent.last_run_at}`);
        }

        const { data: reviews, error: reviewsError } = await reviewsQuery;

        if (reviewsError) {
          throw new Error(`Failed to fetch reviews: ${reviewsError.message}`);
        }

        const newReviews = (reviews || []) as Review[];
        console.log(`Found ${newReviews.length} new reviews for agent ${agent.id}`);

        // 5. POST new reviews to webhook_url (even if empty, to confirm run)
        const webhookPayload: WebhookPayload = {
          agent_id: agent.id,
          app_slug: agent.app_slug,
          app_url: agent.app_url,
          scraped_at: new Date().toISOString(),
          reviews: newReviews.map((review) => ({
            reviewer_name: review.reviewer_name || '',
            location: review.location || '',
            usage_time: review.usage_time || '',
            star_rating: review.star_rating,
            review_content: review.review_content || '',
            review_date: review.review_date || '',
          })),
        };

        const webhookResponse = await fetch(agent.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
        }

        console.log(`Successfully pushed ${newReviews.length} reviews to webhook for agent ${agent.id}`);

        // 6. Update agent: last_run_at = NOW(), last_reviews_pushed = count
        await supabase
          .from('recurring_agents')
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: 'success',
            last_run_message: null,
            last_reviews_pushed: newReviews.length,
          })
          .eq('id', agent.id);

        results.push({
          agent_id: agent.id,
          app_slug: agent.app_slug,
          status: 'success',
          reviews_pushed: newReviews.length,
        });
      } catch (agentError) {
        console.error(`Error processing agent ${agent.id}:`, agentError);

        // Update agent with failure status
        await supabase
          .from('recurring_agents')
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: 'failed',
            last_run_message: agentError.message || 'Unknown error',
            last_reviews_pushed: 0,
          })
          .eq('id', agent.id);

        results.push({
          agent_id: agent.id,
          app_slug: agent.app_slug,
          status: 'failed',
          error: agentError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        agents_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error running recurring agents:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
