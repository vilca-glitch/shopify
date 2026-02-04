export type ScrapeMode = 'manual' | 'recurring';

interface ModeSelectorProps {
  value: ScrapeMode;
  onChange: (mode: ScrapeMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => onChange('manual')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          value === 'manual'
            ? 'bg-white text-black shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Manual Scrape
      </button>
      <button
        onClick={() => onChange('recurring')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          value === 'recurring'
            ? 'bg-white text-black shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Recurring Scrape
      </button>
    </div>
  );
}
