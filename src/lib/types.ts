export type FilterType = 'good' | 'bad' | 'all';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScrapingJob {
  id: string;
  app_url: string;
  app_slug: string;
  filter_type: FilterType;
  status: JobStatus;
  total_pages: number;
  current_page: number;
  total_reviews_found: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_name: string | null;
  location: string | null;
  usage_time: string | null;
  star_rating: number;
  review_content: string | null;
  review_date: string | null;
  created_at: string;
}

export interface CreateJobRequest {
  app_url: string;
  filter_type: FilterType;
}

export interface ReviewExport {
  reviewer_name: string;
  location: string;
  usage_time: string;
  star_rating: number;
  review_content: string;
  review_date: string;
}

// Recurring Agent types
export type AgentStatus = 'active' | 'paused' | 'stopped';
export type AgentRunStatus = 'success' | 'failed';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun-Sat

export interface RecurringAgent {
  id: string;
  app_url: string;
  app_slug: string;
  run_day: DayOfWeek;
  webhook_url: string;
  status: AgentStatus;
  last_run_at: string | null;
  last_run_status: AgentRunStatus | null;
  last_run_message: string | null;
  last_reviews_pushed: number;
  created_at: string;
}

export interface CreateAgentRequest {
  app_url: string;
  run_day: DayOfWeek;
  webhook_url: string;
}
