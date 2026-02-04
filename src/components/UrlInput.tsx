import { useState } from 'react';
import { Input } from './ui/Input';
import { isValidShopifyUrl } from '../lib/validators';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function UrlInput({ value, onChange, disabled }: UrlInputProps) {
  const [touched, setTouched] = useState(false);

  const isValid = value === '' || isValidShopifyUrl(value);
  const showError = touched && value !== '' && !isValid;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Shopify App URL
      </label>
      <Input
        type="url"
        placeholder="https://apps.shopify.com/your-app"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        error={showError ? 'Please enter a valid Shopify app URL' : undefined}
      />
      <p className="mt-2 text-sm text-gray-500">
        Enter the full URL of the Shopify app you want to scrape reviews from
      </p>
    </div>
  );
}
