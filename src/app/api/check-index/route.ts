import { NextRequest, NextResponse } from 'next/server';
import { checkUrlIndex } from '@/lib/checker';
import { ApiCheckResponse, IndexCheckResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls)
      ? body.urls
      : typeof body.url === 'string'
      ? [body.url]
      : [];

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one URL in "urls" or "url".' },
        { status: 400 }
      );
    }

    // Filter out empty lines
    const validUrls = urls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => u.length > 0);

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided.' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse (e.g., max 100 per request)
    const MAX_URLS = 100;
    const urlsToProcess = validUrls.slice(0, MAX_URLS);

    // Extract API Keys from headers or request body
    const serperApiKey =
      body.serperApiKey ||
      req.headers.get('x-serper-key') ||
      process.env.SERPER_API_KEY ||
      '';

    const googleApiKey =
      body.googleApiKey ||
      req.headers.get('x-google-key') ||
      process.env.GOOGLE_SEARCH_API_KEY ||
      '';

    const googleCx =
      body.googleCx ||
      req.headers.get('x-google-cx') ||
      process.env.GOOGLE_SEARCH_CX ||
      '';

    const country =
      body.country ||
      req.headers.get('x-country') ||
      'us';

    // Process with concurrency limit (e.g., 5 at a time)
    const results: IndexCheckResult[] = [];
    const concurrency = 5;

    for (let i = 0; i < urlsToProcess.length; i += concurrency) {
      const batch = urlsToProcess.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((url) =>
          checkUrlIndex(url, {
            country,
            serperApiKey: serperApiKey || undefined,
            googleApiKey: googleApiKey || undefined,
            googleCx: googleCx || undefined,
          })
        )
      );
      results.push(...batchResults);
    }

    // Compute summary
    const summary = {
      total: results.length,
      indexed: results.filter((r) => r.status === 'indexed').length,
      notIndexed: results.filter((r) => r.status === 'not_indexed').length,
      errors: results.filter(
        (r) => r.status === 'error' || r.status === 'captcha_blocked'
      ).length,
    };

    const responseData: ApiCheckResponse = {
      results,
      summary,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error('API Error in check-index:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while checking index' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing "url" query parameter. Example: /api/check-index?url=https://example.com' },
      { status: 400 }
    );
  }

  const serperApiKey =
    searchParams.get('serperApiKey') ||
    req.headers.get('x-serper-key') ||
    process.env.SERPER_API_KEY ||
    undefined;

  const result = await checkUrlIndex(url, { serperApiKey });
  return NextResponse.json(result);
}
