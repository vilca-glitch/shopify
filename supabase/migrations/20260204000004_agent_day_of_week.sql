-- Change frequency_days to run_day (0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE recurring_agents DROP COLUMN frequency_days;
ALTER TABLE recurring_agents DROP COLUMN next_run_at;
ALTER TABLE recurring_agents ADD COLUMN run_day INTEGER NOT NULL DEFAULT 1 CHECK (run_day >= 0 AND run_day <= 6);

-- Drop old index and add new index for efficient day-based queries
DROP INDEX IF EXISTS idx_recurring_agents_next_run;
CREATE INDEX idx_recurring_agents_run_day ON recurring_agents(run_day) WHERE status = 'active';
