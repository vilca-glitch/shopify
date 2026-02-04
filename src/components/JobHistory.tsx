import { Card, CardHeader, CardContent } from './ui/Card';
import { StorageIndicator } from './StorageIndicator';
import { JobHistoryItem } from './JobHistoryItem';
import { useJobHistory } from '../hooks/useJobHistory';

interface JobHistoryProps {
  currentJobId: string | null;
}

export function JobHistory({ currentJobId }: JobHistoryProps) {
  const { data: jobs = [], isLoading, error } = useJobHistory();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Job History</h2>
          <StorageIndicator />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading history...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">Failed to load history</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No scraping history yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <JobHistoryItem
                key={job.id}
                job={job}
                isCurrentJob={job.id === currentJobId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
