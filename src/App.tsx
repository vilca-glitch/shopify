import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { UrlInput } from './components/UrlInput';
import { ScrapingProgress } from './components/ScrapingProgress';
import { ExportButton } from './components/ExportButton';
import { JobHistory } from './components/JobHistory';
import { ModeSelector, ScrapeMode } from './components/ModeSelector';
import { RecurringScrape } from './components/RecurringScrape';
import { useScrapingJob } from './hooks/useScrapingJob';
import { useRealtimeProgress } from './hooks/useRealtimeProgress';
import { useReviews } from './hooks/useReviews';
import { isValidShopifyUrl } from './lib/validators';

function App() {
  const [mode, setMode] = useState<ScrapeMode>('manual');
  const [url, setUrl] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { createJob, isCreating, error: createError } = useScrapingJob();
  const job = useRealtimeProgress(currentJobId);
  const { data: reviews = [], refetch: refetchReviews } = useReviews(currentJobId);

  const isRunning = job?.status === 'running' || job?.status === 'pending';
  const isCompleted = job?.status === 'completed';
  const canSubmit = isValidShopifyUrl(url) && !isRunning && !isCreating;

  // Refetch reviews when job completes
  useEffect(() => {
    if (isCompleted) {
      refetchReviews();
    }
  }, [isCompleted, refetchReviews]);

  // Periodically refetch reviews while running
  useEffect(() => {
    if (isRunning && currentJobId) {
      const interval = setInterval(() => {
        refetchReviews();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isRunning, currentJobId, refetchReviews]);

  const handleSubmit = () => {
    if (!canSubmit) return;

    createJob(
      { app_url: url, filter_type: 'all' },
      {
        onSuccess: (newJob) => {
          setCurrentJobId(newJob.id);
        },
      }
    );
  };

  const handleReset = () => {
    setCurrentJobId(null);
    setUrl('');
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black">Shopify Review Scraper</h1>
          <p className="text-gray-600 mt-2">
            Extract reviews from any Shopify App Store page
          </p>
        </div>

        <ModeSelector value={mode} onChange={setMode} />

        {mode === 'recurring' ? (
          <RecurringScrape />
        ) : (
          <>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Configure Scraping</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <UrlInput value={url} onChange={setUrl} disabled={isRunning} />

                {createError && (
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-sm text-red-700">{createError.message}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    isLoading={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? 'Starting...' : 'Start Scraping'}
                  </Button>

                  {currentJobId && (
                    <Button variant="secondary" onClick={handleReset} disabled={isRunning}>
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {job && (
              <ScrapingProgress job={job} />
            )}

            {isCompleted && job && (
              <Card>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Export Reviews</h3>
                    <p className="text-sm text-gray-500">Download all scraped reviews as CSV</p>
                  </div>
                  <ExportButton reviews={reviews} appSlug={job.app_slug} />
                </CardContent>
              </Card>
            )}

            <JobHistory currentJobId={currentJobId} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
