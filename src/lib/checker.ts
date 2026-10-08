import * as cheerio from 'cheerio';
import { IndexCheckResult, IndexStatus, CheckMethod } from './types';

// Helper to normalize and clean URLs
export function normalizeUrl(input: string): string {
  let url = input.trim();
  // Remove wrapping quotes or brackets
  url = url.replace(/^["'\[<]+|["'\]>]+$/g, '').trim();

  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    return url;
  }
}

// User Agents rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 1. Check Index using Serper.dev API
 * Targeted to Google USA (gl: 'us', hl: 'en')
 */
async function checkWithSerper(
  url: string,
  apiKey: string,
  country: string = 'us'
): Promise<Partial<IndexCheckResult>> {
  const query = `site:${url}`;
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: 5,
      gl: country, // e.g. 'us' for United States
      hl: 'en',    // English
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 403 || response.status === 401) {
      throw new Error('Invalid or expired Serper.dev API Key.');
    }
    throw new Error(`Serper API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const organic = data.organic || [];

  if (organic.length > 0) {
    const first = organic[0];
    return {
      status: 'indexed',
      isIndexed: true,
      method: 'serper',
      country,
      title: first.title || undefined,
      snippet: first.snippet || undefined,
      matchedUrl: first.link || undefined,
    };
  }

  if (data.answerBox || data.knowledgeGraph) {
    return {
      status: 'indexed',
      isIndexed: true,
      method: 'serper',
      country,
      title: data.knowledgeGraph?.title || 'Google Knowledge Result',
      snippet: data.knowledgeGraph?.description || undefined,
    };
  }

  return {
    status: 'not_indexed',
    isIndexed: false,
    country,
    method: 'serper',
  };
}

/**
 * 2. Check Index using Google Custom Search JSON API
 * Targeted to Google USA (gl: 'us', hl: 'en')
 */
async function checkWithGoogleCse(
  url: string,
  apiKey: string,
  cx: string,
  country: string = 'us'
): Promise<Partial<IndexCheckResult>> {
  const query = `site:${url}`;
  const endpoint = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
    apiKey
  )}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&gl=${encodeURIComponent(
    country
  )}&hl=en`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `Google API error ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const items = data.items || [];
  const totalResults = Number(data.searchInformation?.totalResults || '0');

  if (items.length > 0 || totalResults > 0) {
    const first = items[0] || {};
    return {
      status: 'indexed',
      isIndexed: true,
      method: 'google_cse',
      country,
      title: first.title || undefined,
      snippet: first.snippet || undefined,
      matchedUrl: first.link || undefined,
    };
  }

  return {
    status: 'not_indexed',
    isIndexed: false,
    country,
    method: 'google_cse',
  };
}

/**
 * 3. Fallback: Direct Google Scraping
 */
async function checkWithDirectScrape(
  url: string,
  country: string = 'us'
): Promise<Partial<IndexCheckResult>> {
  const query = `site:${url}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}&hl=en&gl=${encodeURIComponent(country)}&pws=0&num=5`;

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    const html = await response.text();

    // Check for Google CAPTCHA / Bot detection / JS challenges
    if (
      response.status === 429 ||
      html.includes('/sorry/index') ||
      html.includes('enablejs') ||
      html.includes('/httpservice/retry') ||
      html.includes('recaptcha') ||
      html.includes('detected unusual traffic') ||
      html.includes('unusual traffic from your computer network')
    ) {
      return {
        status: 'captcha_blocked',
        isIndexed: null,
        method: 'direct_scrape',
        country,
        error:
          'Google anti-bot protection (CAPTCHA/JS Challenge) blocked direct automated scraping. Add a free Serper.dev API Key in Settings (2,500 free searches) or click "Verify on Google ↗".',
      };
    }

    const $ = cheerio.load(html);

    const notFoundPhrases = [
      'did not match any documents',
      "It looks like there aren't any results for",
      'No results found for',
      'Make sure that all words are spelled correctly',
      'Try different keywords',
    ];

    const bodyText = $('body').text();
    const hasNotFound = notFoundPhrases.some((phrase) => bodyText.includes(phrase));

    if (hasNotFound) {
      return {
        status: 'not_indexed',
        isIndexed: false,
        country,
        method: 'direct_scrape',
      };
    }

    const headings = $('h3');
    if (headings.length > 0) {
      const firstHeading = headings.first().text().trim();
      const firstSnippet = $('div[style*="-webkit-line-clamp"], .VwiC3b, .yXK7lf').first().text().trim();

      return {
        status: 'indexed',
        isIndexed: true,
        method: 'direct_scrape',
        country,
        title: firstHeading || undefined,
        snippet: firstSnippet || undefined,
      };
    }

    const searchResults = $('#search, #rso');
    if (searchResults.length > 0 && searchResults.find('a').length > 0) {
      return {
        status: 'indexed',
        isIndexed: true,
        country,
        method: 'direct_scrape',
      };
    }

    return {
      status: 'not_indexed',
      isIndexed: false,
      country,
      method: 'direct_scrape',
    };
  } catch (err: any) {
    return {
      status: 'error',
      isIndexed: null,
      country,
      method: 'direct_scrape',
      error: err.message || 'Failed to fetch Google directly.',
    };
  }
}

/**
 * Main URL Index Verification Engine
 * Explicitly queries Google USA (country: 'us')
 */
export async function checkUrlIndex(
  rawUrl: string,
  options?: {
    country?: string;
    serperApiKey?: string;
    googleApiKey?: string;
    googleCx?: string;
  }
): Promise<IndexCheckResult> {
  const cleanUrl = normalizeUrl(rawUrl);
  const now = new Date().toISOString();
  const id = Math.random().toString(36).substring(2, 9);
  const country = options?.country || 'us'; // Default: USA (gl=us)
  const siteQuery = `site:${cleanUrl}`;
  // USA Google search URL with gl=us and hl=en
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    siteQuery
  )}&gl=${encodeURIComponent(country)}&hl=en&pws=0`;

  if (!cleanUrl) {
    return {
      id,
      url: rawUrl,
      cleanUrl,
      status: 'error',
      isIndexed: null,
      method: 'manual',
      country,
      siteQuery,
      googleSearchUrl,
      checkedAt: now,
      error: 'Invalid or empty URL provided',
    };
  }

  const serperKey = options?.serperApiKey || process.env.SERPER_API_KEY;
  const googleKey = options?.googleApiKey || process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx = options?.googleCx || process.env.GOOGLE_SEARCH_CX;

  try {
    // 1. Serper.dev (USA targeted)
    if (serperKey && serperKey.trim().length > 0) {
      const result = await checkWithSerper(cleanUrl, serperKey.trim(), country);
      return {
        id,
        url: rawUrl,
        cleanUrl,
        siteQuery,
        googleSearchUrl,
        checkedAt: now,
        country,
        status: result.status || 'not_indexed',
        isIndexed: result.isIndexed ?? false,
        method: 'serper',
        title: result.title,
        snippet: result.snippet,
        matchedUrl: result.matchedUrl,
      };
    }

    // 2. Google Custom Search Engine (USA targeted)
    if (googleKey && googleCx && googleKey.trim() && googleCx.trim()) {
      const result = await checkWithGoogleCse(cleanUrl, googleKey.trim(), googleCx.trim(), country);
      return {
        id,
        url: rawUrl,
        cleanUrl,
        siteQuery,
        googleSearchUrl,
        checkedAt: now,
        country,
        status: result.status || 'not_indexed',
        isIndexed: result.isIndexed ?? false,
        method: 'google_cse',
        title: result.title,
        snippet: result.snippet,
        matchedUrl: result.matchedUrl,
      };
    }

    // 3. Fallback: Direct Scraping
    const directResult = await checkWithDirectScrape(cleanUrl, country);
    return {
      id,
      url: rawUrl,
      cleanUrl,
      siteQuery,
      googleSearchUrl,
      checkedAt: now,
      country,
      status: directResult.status || 'not_indexed',
      isIndexed: directResult.isIndexed ?? null,
      method: 'direct_scrape',
      title: directResult.title,
      snippet: directResult.snippet,
      matchedUrl: directResult.matchedUrl,
      error: directResult.error,
    };
  } catch (err: any) {
    return {
      id,
      url: rawUrl,
      cleanUrl,
      siteQuery,
      googleSearchUrl,
      checkedAt: now,
      country,
      status: 'error',
      isIndexed: null,
      method: 'manual',
      error: err.message || 'An unexpected error occurred during check',
    };
  }
}
