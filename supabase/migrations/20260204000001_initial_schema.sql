-- Create scraping_jobs table
CREATE TABLE scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_url TEXT NOT NULL,
    app_slug TEXT NOT NULL,
    filter_type TEXT NOT NULL CHECK (filter_type IN ('good', 'bad', 'all')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    total_pages INTEGER DEFAULT 0,
    current_page INTEGER DEFAULT 0,
    total_reviews_found INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    reviewer_name TEXT,
    location TEXT,
    usage_time TEXT,
    star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
    review_content TEXT,
    review_date DATE,
    review_hash TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reviews_job_id ON reviews(job_id);
CREATE INDEX idx_reviews_star_rating ON reviews(star_rating);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);

-- Enable Row Level Security (RLS)
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (MVP)
CREATE POLICY "Allow anonymous read access on scraping_jobs"
    ON scraping_jobs FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert access on scraping_jobs"
    ON scraping_jobs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on scraping_jobs"
    ON scraping_jobs FOR UPDATE
    USING (true);

CREATE POLICY "Allow anonymous read access on reviews"
    ON reviews FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert access on reviews"
    ON reviews FOR INSERT
    WITH CHECK (true);

-- Enable Realtime for scraping_jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE scraping_jobs;
