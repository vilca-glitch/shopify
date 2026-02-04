import { useStorageStats } from '../hooks/useStorageStats';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageIndicator() {
  const { data: stats, isLoading, error } = useStorageStats();

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">
        Storage | <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const usagePercent = (stats.used_bytes / stats.limit_bytes) * 100;
  const isNearLimit = usagePercent > 80;

  return (
    <div className={`text-sm ${isNearLimit ? 'text-amber-600' : 'text-gray-500'}`}>
      Storage | {formatBytes(stats.used_bytes)} / {formatBytes(stats.limit_bytes)}
    </div>
  );
}
