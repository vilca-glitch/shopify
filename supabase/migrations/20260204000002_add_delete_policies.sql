-- Add DELETE policy for scraping_jobs table
-- Reviews auto-delete via CASCADE (already configured in initial schema)

CREATE POLICY "Allow anonymous delete access on scraping_jobs"
    ON scraping_jobs FOR DELETE
    USING (true);
