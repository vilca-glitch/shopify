export async function fetchPageContent(url: string, retries = 2): Promise<string> {
  const BROWSERLESS_API_KEY = Deno.env.get('BROWSERLESS_API_KEY');
  if (!BROWSERLESS_API_KEY) {
    throw new Error('BROWSERLESS_API_KEY not configured');
  }

  const browserlessUrl = `https://chrome.browserless.io/content?token=${BROWSERLESS_API_KEY}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(browserlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
        }),
      });

      if (response.ok) {
        return await response.text();
      }

      const errorText = await response.text();
      lastError = new Error(`Browserless error: ${response.status} - ${errorText}`);

      // Only retry on transient errors
      if (response.status !== 429 && response.status !== 500 && response.status !== 503) {
        throw lastError;
      }

      console.log(`Browserless returned ${response.status}, retrying (attempt ${attempt + 1}/${retries})...`);

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    } catch (fetchError) {
      // If it's our own error from above, preserve it
      if (fetchError instanceof Error && fetchError.message.startsWith('Browserless error:')) {
        lastError = fetchError;
      } else {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      }

      // Only retry if we have attempts left and it's not a non-retryable Browserless error
      if (attempt === retries) break;

      console.log(`Fetch error, retrying (attempt ${attempt + 1}/${retries}):`, lastError.message);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Failed to fetch page content');
}
