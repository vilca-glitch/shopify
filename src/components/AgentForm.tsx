import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useCreateAgent } from '../hooks/useCreateAgent';
import { isValidShopifyUrl } from '../lib/validators';
import type { DayOfWeek } from '../lib/types';

const DAYS_OF_WEEK = [
  { value: 0 as DayOfWeek, label: 'Sunday' },
  { value: 1 as DayOfWeek, label: 'Monday' },
  { value: 2 as DayOfWeek, label: 'Tuesday' },
  { value: 3 as DayOfWeek, label: 'Wednesday' },
  { value: 4 as DayOfWeek, label: 'Thursday' },
  { value: 5 as DayOfWeek, label: 'Friday' },
  { value: 6 as DayOfWeek, label: 'Saturday' },
];

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function AgentForm() {
  const [appUrl, setAppUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [runDay, setRunDay] = useState<DayOfWeek>(1); // Default to Monday
  const [touched, setTouched] = useState({ appUrl: false, webhookUrl: false });

  const { createAgent, isCreating, error } = useCreateAgent();

  const isAppUrlValid = appUrl === '' || isValidShopifyUrl(appUrl);
  const isWebhookUrlValid = webhookUrl === '' || isValidUrl(webhookUrl);
  const canSubmit = isValidShopifyUrl(appUrl) && isValidUrl(webhookUrl) && !isCreating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    createAgent(
      { app_url: appUrl, run_day: runDay, webhook_url: webhookUrl },
      {
        onSuccess: () => {
          setAppUrl('');
          setWebhookUrl('');
          setRunDay(1);
          setTouched({ appUrl: false, webhookUrl: false });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shopify App URL
        </label>
        <Input
          type="url"
          placeholder="https://apps.shopify.com/your-app"
          value={appUrl}
          onChange={(e) => setAppUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, appUrl: true }))}
          disabled={isCreating}
          error={touched.appUrl && !isAppUrlValid ? 'Please enter a valid Shopify app URL' : undefined}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Run on
        </label>
        <select
          value={runDay}
          onChange={(e) => setRunDay(Number(e.target.value) as DayOfWeek)}
          disabled={isCreating}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-black focus:ring-0 outline-none transition-colors duration-200 bg-white text-gray-900 font-medium"
        >
          {DAYS_OF_WEEK.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook URL
        </label>
        <Input
          type="url"
          placeholder="https://api.clay.com/v1/webhook/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, webhookUrl: true }))}
          disabled={isCreating}
          error={touched.webhookUrl && !isWebhookUrlValid ? 'Please enter a valid URL' : undefined}
        />
        <p className="mt-2 text-sm text-gray-500">
          New reviews will be pushed to this webhook URL
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} isLoading={isCreating} className="w-full">
        Create Agent
      </Button>
    </form>
  );
}
