export interface ParsedReview {
  reviewer_name: string | null;
  location: string | null;
  usage_time: string | null;
  star_rating: number;
  review_content: string | null;
  review_date: string | null;
  review_hash: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize content for consistent hashing across page loads
// This prevents duplicates when whitespace/encoding varies between scrapes
function normalizeForHash(str: string | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function parseReviews(html: string): Promise<ParsedReview[]> {
  const reviews: ParsedReview[] = [];

  // Match review blocks by their id pattern: id="review-XXXXXX"
  const reviewBlockPattern = /<div\s+id="review-(\d+)"[^>]*class="[^"]*"[^>]*>([\s\S]*?)(?=<div\s+id="review-\d+"|<nav\s+|$)/gi;

  const matches: { reviewId: string; block: string }[] = [];
  let match;
  while ((match = reviewBlockPattern.exec(html)) !== null) {
    matches.push({ reviewId: match[1], block: match[2] });
  }

  for (const { reviewId, block } of matches) {
    try {
      const review = await parseReviewBlock(block, reviewId);
      if (review && review.star_rating > 0) {
        reviews.push(review);
      }
    } catch (e) {
      console.error('Error parsing review block:', e);
    }
  }

  // Deduplicate by normalized content signature to prevent duplicates from whitespace/encoding changes
  const seen = new Set<string>();
  return reviews.filter(review => {
    const sig = [
      normalizeForHash(review.reviewer_name),
      normalizeForHash(review.review_date),
      review.star_rating.toString(),
      normalizeForHash(review.review_content)
    ].join('|');
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

async function parseReviewBlock(block: string, reviewId: string): Promise<ParsedReview | null> {
  // Extract star rating from aria-label="X out of 5 stars"
  let starRating = 0;
  const ariaRatingMatch = block.match(/aria-label="(\d+)\s+out of\s+5\s+stars"/i);
  if (ariaRatingMatch) {
    starRating = parseInt(ariaRatingMatch[1], 10);
  }

  if (starRating === 0) {
    return null;
  }

  // Extract review date - appears right after the stars div
  let reviewDate: string | null = null;
  const dateMatch = block.match(/tw-text-body-xs\s+tw-text-fg-tertiary">\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})\s*<\/div>/i);
  if (dateMatch) {
    reviewDate = dateMatch[1].trim();
  }

  // Extract review content from p.tw-break-words inside data-truncate-content-copy
  let reviewContent: string | null = null;
  const contentMatch = block.match(/data-truncate-content-copy[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    // Extract all paragraph text
    const paragraphs = contentMatch[1].match(/<p[^>]*class="tw-break-words"[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      reviewContent = paragraphs
        .map(p => {
          const textMatch = p.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          return textMatch ? decodeHtmlEntities(textMatch[1]) : '';
        })
        .filter(t => t)
        .join(' ');
    }
  }

  // Extract reviewer name from span with title attribute inside tw-text-heading-xs
  let reviewerName: string | null = null;
  const nameMatch = block.match(/tw-text-heading-xs[^>]*>[\s\S]*?<span[^>]*title="([^"]+)"/i);
  if (nameMatch) {
    reviewerName = decodeHtmlEntities(nameMatch[1]);
  }

  // Extract location and usage time from the metadata section
  // They appear as plain <div>Location</div> entries after the reviewer name section
  let location: string | null = null;
  let usageTime: string | null = null;

  // Find the metadata section (tw-order-1 with tw-space-y)
  const metadataMatch = block.match(/tw-order-1[^>]*lg:tw-row-span-2[^>]*>([\s\S]*?)(?=<div\s+class="tw-order-last|$)/i);
  if (metadataMatch) {
    const metadataSection = metadataMatch[1];

    // Look for simple div entries after the name section
    const divMatches = metadataSection.match(/<div>([^<]+)<\/div>/gi);
    if (divMatches) {
      for (const div of divMatches) {
        const textMatch = div.match(/<div>([^<]+)<\/div>/i);
        if (textMatch) {
          const text = textMatch[1].trim();
          // Check if it's a location (typically a country or region)
          if (!location && !text.toLowerCase().includes('using the app') && !text.toLowerCase().includes('using app')) {
            location = text;
          }
          // Check if it's usage time
          if (!usageTime && (text.toLowerCase().includes('using the app') || text.toLowerCase().includes('using app'))) {
            usageTime = text;
          }
        }
      }
    }
  }

  // Generate hash for deduplication - normalize content to prevent duplicates from whitespace/encoding variations
  const hashSource = [
    normalizeForHash(reviewerName),
    normalizeForHash(reviewDate),
    starRating.toString(),
    normalizeForHash(reviewContent)
  ].join('|');
  const reviewHash = await generateHash(hashSource);

  return {
    reviewer_name: reviewerName,
    location: location,
    usage_time: usageTime,
    star_rating: starRating,
    review_content: reviewContent,
    review_date: reviewDate,
    review_hash: reviewHash,
  };
}

export function parsePagination(html: string): PaginationInfo {
  let totalPages = 1;
  let currentPage = 1;
  const REVIEWS_PER_PAGE = 10;

  // Method 1: Look for JSON-LD schema which has accurate ratingCount
  const schemaMatch = html.match(/"ratingCount"\s*:\s*(\d+)/);
  if (schemaMatch) {
    const totalReviews = parseInt(schemaMatch[1], 10);
    if (totalReviews > 0) {
      totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);
      console.log(`[Schema] Found ${totalReviews} total reviews, calculated ${totalPages} pages`);
    }
  }

  // Method 2: Extract total review count from visible text patterns
  // Handle cases where HTML tags separate "Reviews" and "(count)"
  if (totalPages <= 1) {
    const reviewCountPatterns = [
      /Reviews\s*\((\d+)\)/i,
      /Reviews<[^>]*>\s*<[^>]*>\s*\((\d+)\)/i,  // Reviews</span><span>(793)
      /Reviews<\/[^>]+>\s*<[^>]+>\(?(\d+)\)?/i, // Handle various tag structures
      />\s*(\d+)\s*reviews?\s*</i,              // >765 reviews<
      /"reviewCount"\s*:\s*(\d+)/i,             // JSON data
      /(\d{3,})\s+reviews/i,                    // 3+ digit number before "reviews"
    ];

    for (const pattern of reviewCountPatterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count > 10) {  // Sanity check - must be more than one page worth
          totalPages = Math.ceil(count / REVIEWS_PER_PAGE);
          console.log(`[Pattern] Found ${count} reviews, calculated ${totalPages} pages`);
          break;
        }
      }
    }
  }

  // Method 3: Find the highest page number in ANY pagination link
  // Look for page=N anywhere in the HTML, not just in nav elements
  const allPageLinks = html.matchAll(/[?&]page=(\d+)/gi);
  for (const match of allPageLinks) {
    const pageNum = parseInt(match[1], 10);
    if (pageNum > totalPages) {
      totalPages = pageNum;
      console.log(`[PageLink] Found page=${pageNum}, updating totalPages`);
    }
  }

  // Method 4: Find pagination nav using multiple selectors (not just aria-label)
  const navPatterns = [
    /<nav[^>]*aria-label="[^"]*pag[^"]*"[^>]*>([\s\S]*?)<\/nav>/i,  // aria-label contains "pag"
    /<nav[^>]*class="[^"]*pagination[^"]*"[^>]*>([\s\S]*?)<\/nav>/i, // class contains "pagination"
    /<div[^>]*class="[^"]*pagination[^"]*"[^>]*>([\s\S]*?)<\/div>/i, // div with pagination class
    /<ul[^>]*class="[^"]*pagination[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,   // ul with pagination class
  ];

  for (const navPattern of navPatterns) {
    const navMatch = html.match(navPattern);
    if (navMatch) {
      const navHtml = navMatch[1];
      // Find all page numbers displayed in pagination (like "1 2 3 ... 77")
      const pageNumbers = navHtml.matchAll(/>(\d+)</g);
      for (const num of pageNumbers) {
        const pageNum = parseInt(num[1], 10);
        if (pageNum > totalPages && pageNum < 10000) {  // Sanity check
          totalPages = pageNum;
          console.log(`[NavNumber] Found page ${pageNum} in pagination nav`);
        }
      }

      // Also look for href links within the nav
      const navLinks = navHtml.matchAll(/href="[^"]*page=(\d+)[^"]*"/gi);
      for (const link of navLinks) {
        const pageNum = parseInt(link[1], 10);
        if (pageNum > totalPages) {
          totalPages = pageNum;
          console.log(`[NavLink] Found page=${pageNum} in nav href`);
        }
      }
      break;  // Found a nav, stop looking
    }
  }

  // Method 5: Look for "Page X of Y" or similar patterns
  const pageOfPatterns = [
    /page\s+\d+\s+of\s+(\d+)/i,
    /(\d+)\s+pages?\s+total/i,
  ];
  for (const pattern of pageOfPatterns) {
    const match = html.match(pattern);
    if (match) {
      const pages = parseInt(match[1], 10);
      if (pages > totalPages) {
        totalPages = pages;
        console.log(`[PageOf] Found ${pages} total pages`);
      }
    }
  }

  // Get current page from aria-current
  const currentPageMatch = html.match(/aria-current="page"[^>]*>(\d+)/i) ||
                           html.match(/class="[^"]*active[^"]*"[^>]*>(\d+)</i);
  if (currentPageMatch) {
    currentPage = parseInt(currentPageMatch[1], 10);
  }

  // Last resort: if we still only have 1 page, check for "Next" link
  if (totalPages === 1) {
    const hasNext = html.includes('rel="next"') ||
                    html.includes('aria-label="Next"') ||
                    html.includes('>Next<') ||
                    html.includes('page=2');
    if (hasNext) {
      totalPages = 2;
      console.log(`[Fallback] Found Next link, setting totalPages=2`);
    }
  }

  console.log(`[Final] Pagination result: currentPage=${currentPage}, totalPages=${totalPages}`);
  return { currentPage, totalPages };
}

export function buildReviewsUrl(baseUrl: string, page: number): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, '/reviews');

  // Add page parameter if not first page
  if (page > 1) {
    return `${url.origin}${url.pathname}?page=${page}`;
  }

  return `${url.origin}${url.pathname}`;
}
