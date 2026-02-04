interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export function RadioGroup({ name, options, value, onChange }: RadioGroupProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
            value === option.value
              ? 'border-black bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300"
          />
          <div>
            <span className="font-medium text-gray-900">{option.label}</span>
            {option.description && (
              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
