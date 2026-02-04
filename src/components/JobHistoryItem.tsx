import { useState } from 'react';
import Papa from 'papaparse';
import { useDeleteJob } from '../hooks/useDeleteJob';
import { fetchJobReviews } from '../hooks/useJobReviews';
import type { ScrapingJob, ReviewExport, Review } from '../lib/types';

type DownloadFilter = 'all' | 'good' | 'bad';

interface JobHistoryItemProps {
  job: ScrapingJob;
  isCurrentJob: boolean;
}

function filterReviews(reviews: Review[], filter: DownloadFilter): Review[] {
  if (filter === 'good') return reviews.filter(r => r.star_rating >= 4);
  if (filter === 'bad') return reviews.filter(r => r.star_rating <= 3);
  return reviews;
}

export function JobHistoryItem({ job, isCurrentJob }: JobHistoryItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDownloading, setIsDownloading] = useState<DownloadFilter | null>(null);
  const { deleteJob, isDeleting } = useDeleteJob();

  const isRunning = job.status === 'running' || job.status === 'pending';
  const canDelete = !isRunning && !isCurrentJob;

  const handleDownload = async (filter: DownloadFilter) => {
    setIsDownloading(filter);
    try {
      const reviews = await fetchJobReviews(job.id);
      const filteredReviews = filterReviews(reviews, filter);

      if (filteredReviews.length === 0) {
        return;
      }

      const exportData: ReviewExport[] = filteredReviews.map((review) => ({
        reviewer_name: review.reviewer_name || '',
        location: review.location || '',
        usage_time: review.usage_time || '',
        star_rating: review.star_rating,
        review_content: review.review_content || '',
        review_date: review.review_date || '',
      }));

      const csv = Papa.unparse(exportData, {
        header: true,
        columns: ['reviewer_name', 'location', 'usage_time', 'star_rating', 'review_content', 'review_date'],
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filterSuffix = filter === 'all' ? '' : `-${filter}`;
      link.download = `${job.app_slug}${filterSuffix}-reviews-${new Date().toISOString().split('T')[0]}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDeleteClick = () => {
    if (!canDelete) return;

    if (confirmDelete) {
      deleteJob(job.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const DownloadButton = ({ filter, label }: { filter: DownloadFilter; label: string }) => (
    <button
      onClick={() => handleDownload(filter)}
      disabled={isDownloading !== null || job.total_reviews_found === 0}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        filter === 'all'
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : filter === 'good'
          ? 'bg-green-50 text-green-700 hover:bg-green-100'
          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      }`}
      title={`Download ${label} reviews`}
    >
      {isDownloading === filter ? (
        <svg className="w-3 h-3 animate-spin inline" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        label
      )}
    </button>
  );

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <span className="font-medium text-gray-900 truncate block">{job.app_slug}</span>
        </div>
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {job.total_reviews_found} reviews
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <div className="flex gap-1">
          <DownloadButton filter="all" label="All" />
          <DownloadButton filter="good" label="Good" />
          <DownloadButton filter="bad" label="Bad" />
        </div>

        <button
          onClick={handleDeleteClick}
          disabled={!canDelete || isDeleting}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            confirmDelete
              ? 'text-red-600 bg-red-50 hover:bg-red-100'
              : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
          }`}
          title={confirmDelete ? 'Click again to confirm' : 'Delete job'}
        >
          {isDeleting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : confirmDelete ? (
            <span className="text-xs font-medium px-1">Confirm?</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
