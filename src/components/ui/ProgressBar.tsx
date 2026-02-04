interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">
            {current} / {total}
          </span>
        </div>
      )}
      <div className="w-full h-3 bg-gray-100 rounded-xl overflow-hidden">
        <div
          className="h-full bg-black rounded-xl transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1 text-right">
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
    </div>
  );
}
