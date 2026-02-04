-- Create recurring_agents table
CREATE TABLE recurring_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_url TEXT NOT NULL,
    app_slug TEXT NOT NULL,
    frequency_days INTEGER NOT NULL CHECK (frequency_days IN (7, 14)),
    webhook_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status TEXT CHECK (last_run_status IN ('success', 'failed')),
    last_run_message TEXT,
    last_reviews_pushed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on next_run_at for efficient scheduling queries
CREATE INDEX idx_recurring_agents_next_run ON recurring_agents(next_run_at) WHERE status = 'active';
CREATE INDEX idx_recurring_agents_status ON recurring_agents(status);

-- Enable Row Level Security (RLS)
ALTER TABLE recurring_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (MVP)
CREATE POLICY "Allow anonymous read access on recurring_agents"
    ON recurring_agents FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert access on recurring_agents"
    ON recurring_agents FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on recurring_agents"
    ON recurring_agents FOR UPDATE
    USING (true);

CREATE POLICY "Allow anonymous delete access on recurring_agents"
    ON recurring_agents FOR DELETE
    USING (true);
