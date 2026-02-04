import { Card, CardContent } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import type { ScrapingJob } from '../lib/types';

interface ScrapingProgressProps {
  job: ScrapingJob;
}

export function ScrapingProgress({ job }: ScrapingProgressProps) {
  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
        return 'text-black';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Starting...';
      case 'running':
        return 'Scraping in progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return job.status;
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Scraping Progress</h3>
            <p className="text-sm text-gray-500">{job.app_slug}</p>
          </div>
          <div className="flex items-center gap-2">
            {job.status === 'running' && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
              </span>
            )}
            <span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
          </div>
        </div>

        {job.total_pages > 0 && (
          <ProgressBar
            current={job.current_page}
            total={job.total_pages}
            label="Pages scraped"
          />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Reviews found</span>
          <span className="text-2xl font-bold text-black">{job.total_reviews_found}</span>
        </div>

        {job.error_message && (
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-sm text-red-700">{job.error_message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
