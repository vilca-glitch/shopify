import { Button } from './ui/Button';
import Papa from 'papaparse';
import type { Review, ReviewExport } from '../lib/types';

type DownloadFilter = 'all' | 'good' | 'bad';

interface ExportButtonProps {
  reviews: Review[];
  appSlug: string;
  disabled?: boolean;
}

function filterReviews(reviews: Review[], filter: DownloadFilter): Review[] {
  if (filter === 'good') return reviews.filter(r => r.star_rating >= 4);
  if (filter === 'bad') return reviews.filter(r => r.star_rating <= 3);
  return reviews;
}

function getFilteredCount(reviews: Review[], filter: DownloadFilter): number {
  return filterReviews(reviews, filter).length;
}

export function ExportButton({ reviews, appSlug, disabled }: ExportButtonProps) {
  const handleExport = (filter: DownloadFilter) => {
    const filteredReviews = filterReviews(reviews, filter);
    if (filteredReviews.length === 0) return;

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
    link.download = `${appSlug}${filterSuffix}-reviews-${new Date().toISOString().split('T')[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allCount = reviews.length;
  const goodCount = getFilteredCount(reviews, 'good');
  const badCount = getFilteredCount(reviews, 'bad');

  return (
    <div className="flex gap-3">
      <Button
        variant="primary"
        onClick={() => handleExport('all')}
        disabled={disabled || allCount === 0}
        className="flex-1"
      >
        All ({allCount})
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('good')}
        disabled={disabled || goodCount === 0}
        className="flex-1 !bg-green-50 !text-green-700 hover:!bg-green-100 !border-green-200"
      >
        Good ({goodCount})
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('bad')}
        disabled={disabled || badCount === 0}
        className="flex-1 !bg-amber-50 !text-amber-700 hover:!bg-amber-100 !border-amber-200"
      >
        Bad ({badCount})
      </Button>
    </div>
  );
}
