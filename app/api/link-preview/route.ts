import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    // Basic implementation - in production you'd want to:
    // 1. Use a proper metadata fetcher library
    // 2. Cache results
    // 3. Handle CORS properly
    // 4. Use a proxy service for better reliability

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QurseBot/1.0)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract Open Graph metadata
    const getTitle = (html: string) => {
      const match = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (match) return match[1];
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      return titleMatch ? titleMatch[1] : '';
    };

    const getDescription = (html: string) => {
      const match = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (match) return match[1];
      const nameMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      return nameMatch ? nameMatch[1] : '';
    };

    const getImage = (html: string) => {
      const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (match) {
        // Convert relative URLs to absolute
        const imgUrl = match[1];
        if (imgUrl.startsWith('http')) return imgUrl;
        try {
          const baseUrl = new URL(url);
          return new URL(imgUrl, baseUrl.origin).toString();
        } catch {
          return '';
        }
      }
      return '';
    };

    const title = getTitle(html);
    const description = getDescription(html);
    const image = getImage(html);

    return NextResponse.json({
      title,
      description,
      image,
    });
  } catch (error) {
    console.error('Link preview error:', error);
    // Return basic info on error
    try {
      const hostname = new URL(url).hostname;
      return NextResponse.json({
        title: hostname,
        description: '',
        image: '',
      });
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }
  }
}
