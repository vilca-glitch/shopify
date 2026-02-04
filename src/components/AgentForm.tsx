import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useCreateAgent } from '../hooks/useCreateAgent';
import { isValidShopifyUrl } from '../lib/validators';
import type { DayOfWeek } from '../lib/types';

const DAYS_OF_WEEK = [
  { value: 0 as DayOfWeek, label: 'Sun' },
  { value: 1 as DayOfWeek, label: 'Mon' },
  { value: 2 as DayOfWeek, label: 'Tue' },
  { value: 3 as DayOfWeek, label: 'Wed' },
  { value: 4 as DayOfWeek, label: 'Thu' },
  { value: 5 as DayOfWeek, label: 'Fri' },
  { value: 6 as DayOfWeek, label: 'Sat' },
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
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { createAgent, isCreating, error } = useCreateAgent();

  const isAppUrlValid = appUrl === '' || isValidShopifyUrl(appUrl);
  const isWebhookUrlValid = webhookUrl === '' || isValidUrl(webhookUrl);
  const canSubmit = isValidShopifyUrl(appUrl) && isValidUrl(webhookUrl) && !isCreating;
  const canTestWebhook = isValidUrl(webhookUrl) && !isTestingWebhook;

  const handleTestWebhook = async () => {
    if (!canTestWebhook) return;

    setIsTestingWebhook(true);
    setWebhookTestResult(null);

    const testPayload = {
      agent_id: 'test-webhook-verification',
      app_slug: 'sample-app',
      app_url: 'https://apps.shopify.com/sample-app',
      scraped_at: new Date().toISOString(),
      is_test: true,
      reviews: [
        {
          reviewer_name: 'Test User',
          location: 'United States',
          usage_time: 'About 1 month using the app',
          star_rating: 5,
          review_content: 'This is a test webhook payload to verify your endpoint is working correctly.',
          review_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        setWebhookTestResult({ success: true, message: 'Webhook test successful!' });
      } else {
        setWebhookTestResult({ success: false, message: `Webhook returned ${response.status}: ${response.statusText}` });
      }
    } catch (err) {
      setWebhookTestResult({ success: false, message: err instanceof Error ? err.message : 'Failed to reach webhook' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

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
        <div className="flex gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => setRunDay(day.value)}
              disabled={isCreating}
              className={`flex-1 py-2 px-1 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                runDay === day.value
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Webhook URL
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="https://api.clay.com/v1/webhook/..."
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setWebhookTestResult(null);
              }}
              onBlur={() => setTouched((t) => ({ ...t, webhookUrl: true }))}
              disabled={isCreating}
              error={touched.webhookUrl && !isWebhookUrlValid ? 'Please enter a valid URL' : undefined}
            />
          </div>
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={!canTestWebhook}
            className="px-4 py-3 rounded-xl font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isTestingWebhook ? 'Testing...' : 'Test'}
          </button>
        </div>
        {webhookTestResult && (
          <div className={`mt-2 flex items-center gap-1.5 text-sm ${webhookTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
            {webhookTestResult.success ? (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span>{webhookTestResult.message}</span>
          </div>
        )}
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
