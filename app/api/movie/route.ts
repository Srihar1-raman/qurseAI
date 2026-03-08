import { NextResponse } from 'next/server';

const OMDB_API_KEY = process.env.OMDB_API_KEY;

interface OMDbDetailResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const year = searchParams.get('year');
  const imdbId = searchParams.get('imdbId');

  if (!OMDB_API_KEY) {
    return NextResponse.json({ error: 'OMDB_API_KEY not configured' }, { status: 500 });
  }

  if (!title && !imdbId) {
    return NextResponse.json({ error: 'Title or imdbId is required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      apikey: OMDB_API_KEY,
      plot: 'full',
    });

    if (imdbId) {
      params.set('i', imdbId);
    } else if (title) {
      params.set('t', title);
      if (year) params.set('y', year);
    }

    const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
    const data: OMDbDetailResponse = await response.json();

    if (data.Response === 'False') {
      return NextResponse.json({ error: data.Error || 'Movie not found' }, { status: 404 });
    }

    const result = {
      title: data.Title,
      year: data.Year,
      rated: data.Rated !== 'N/A' ? data.Rated : null,
      released: data.Released !== 'N/A' ? data.Released : null,
      runtime: data.Runtime !== 'N/A' ? data.Runtime : null,
      genre: data.Genre !== 'N/A' ? data.Genre.split(', ').map((g: string) => g.trim()) : [],
      director: data.Director !== 'N/A' ? data.Director : null,
      writer: data.Writer !== 'N/A' ? data.Writer : null,
      actors: data.Actors !== 'N/A' ? data.Actors.split(', ').map((a: string) => a.trim()) : [],
      plot: data.Plot !== 'N/A' ? data.Plot : null,
      language: data.Language !== 'N/A' ? data.Language : null,
      country: data.Country !== 'N/A' ? data.Country : null,
      awards: data.Awards !== 'N/A' ? data.Awards : null,
      poster: data.Poster !== 'N/A' ? data.Poster : null,
      ratings: data.Ratings || [],
      metascore: data.Metascore !== 'N/A' ? parseInt(data.Metascore, 10) : null,
      imdbRating: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null,
      imdbVotes: data.imdbVotes !== 'N/A' ? data.imdbVotes : null,
      imdbId: data.imdbID,
      type: data.Type,
      boxOffice: data.BoxOffice !== 'N/A' ? data.BoxOffice : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch movie info' },
      { status: 500 }
    );
  }
}
