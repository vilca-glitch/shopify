const SHOPIFY_APP_URL_REGEX = /^https?:\/\/apps\.shopify\.com\/([a-z0-9-]+)\/?$/i;

export function isValidShopifyUrl(url: string): boolean {
  return SHOPIFY_APP_URL_REGEX.test(url.trim());
}

export function extractAppSlug(url: string): string | null {
  const match = url.trim().match(SHOPIFY_APP_URL_REGEX);
  return match ? match[1] : null;
}

export function normalizeShopifyUrl(url: string): string {
  const trimmed = url.trim();
  // Remove trailing slash if present
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}
