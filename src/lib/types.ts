export type IndexStatus = 'indexed' | 'not_indexed' | 'captcha_blocked' | 'error' | 'pending';

export type CheckMethod = 'serper' | 'google_cse' | 'direct_scrape' | 'manual';

export interface IndexCheckResult {
  id: string;
  url: string;
  cleanUrl: string;
  status: IndexStatus;
  isIndexed: boolean | null;
  method: CheckMethod;
  country?: string;
  title?: string;
  snippet?: string;
  matchedUrl?: string;
  checkedAt: string;
  error?: string;
  siteQuery: string;
  googleSearchUrl: string;
}

export interface ApiCheckRequest {
  urls: string[];
  country?: string;
  serperApiKey?: string;
  googleApiKey?: string;
  googleCx?: string;
}

export interface ApiCheckResponse {
  results: IndexCheckResult[];
  summary: {
    total: number;
    indexed: number;
    notIndexed: number;
    errors: number;
  };
}
