import { tool } from 'ai';
import { z } from 'zod';

const OMDB_API_KEY = process.env.OMDB_API_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

interface OMDbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

interface OMDbSearchResponse {
  Search?: OMDbSearchResult[];
  totalResults?: string;
  Response: string;
  Error?: string;
}

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

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  popularity: number;
}

interface TMDBShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  popularity: number;
}

interface TMDBSimilarResponse {
  page: number;
  results: (TMDBMovie | TMDBShow)[];
  total_pages: number;
  total_results: number;
}

const genreMap: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

function getGenres(genreIds: number[]): string {
  return genreIds.map(id => genreMap[id] || 'Unknown').filter(g => g !== 'Unknown').join(', ');
}

function getPosterUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export const movieSearchTool = tool({
  description: 'Search for movies and TV shows by title',
  inputSchema: z.object({
    query: z.string().describe('Movie or TV show title to search for'),
    type: z.enum(['movie', 'series', 'episode', '']).default('').describe('Type: movie, series, episode, or leave empty for all'),
    year: z.string().describe('Year of release (optional)'),
  }),
  execute: async ({ query, type, year }) => {
    try {
      if (!OMDB_API_KEY) {
        return { error: 'OMDB_API_KEY not configured' };
      }

      const params = new URLSearchParams({
        apikey: OMDB_API_KEY,
        s: query,
      });

      if (type) params.set('type', type);
      if (year) params.set('y', year);

      const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
      const data: OMDbSearchResponse = await response.json();

      if (data.Response === 'False') {
        return { error: data.Error || 'No results found' };
      }

      const results = (data.Search || []).map(item => ({
        title: item.Title,
        year: item.Year,
        imdbId: item.imdbID,
        type: item.Type,
        poster: item.Poster !== 'N/A' ? item.Poster : null,
      }));

      return {
        query,
        total: parseInt(data.totalResults || '0', 10),
        results,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search movies',
      };
    }
  },
});

export const movieInfoTool = tool({
  description: 'Get detailed information about a movie or TV show, including similar recommendations',
  inputSchema: z.object({
    title: z.string().describe('Movie or TV show title'),
    imdbId: z.string().optional().describe('IMDb ID (e.g., tt0111161)'),
    type: z.enum(['movie', 'series', 'episode', '']).default('movie').describe('Type: movie or series'),
    year: z.string().optional().describe('Year of release'),
  }),
  execute: async ({ title, imdbId, type, year }) => {
    try {
      if (!OMDB_API_KEY) {
        return { error: 'OMDB_API_KEY not configured' };
      }

      const params = new URLSearchParams({
        apikey: OMDB_API_KEY,
        plot: 'full',
      });

      if (imdbId) {
        params.set('i', imdbId);
      } else if (title) {
        params.set('t', title);
        if (year) params.set('y', year);
        if (type) params.set('type', type);
      } else {
        return { error: 'Either title or imdbId is required' };
      }

      const omdbResponse = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
      const omdbData: OMDbDetailResponse = await omdbResponse.json();

      if (omdbData.Response === 'False') {
        return { error: omdbData.Error || 'Movie not found' };
      }

      const result: Record<string, unknown> = {
        title: omdbData.Title,
        year: omdbData.Year,
        rated: omdbData.Rated !== 'N/A' ? omdbData.Rated : null,
        released: omdbData.Released !== 'N/A' ? omdbData.Released : null,
        runtime: omdbData.Runtime !== 'N/A' ? omdbData.Runtime : null,
        genre: omdbData.Genre !== 'N/A' ? omdbData.Genre.split(', ').map(g => g.trim()) : [],
        director: omdbData.Director !== 'N/A' ? omdbData.Director : null,
        writer: omdbData.Writer !== 'N/A' ? omdbData.Writer : null,
        actors: omdbData.Actors !== 'N/A' ? omdbData.Actors.split(', ').map(a => a.trim()) : [],
        plot: omdbData.Plot !== 'N/A' ? omdbData.Plot : null,
        language: omdbData.Language !== 'N/A' ? omdbData.Language : null,
        country: omdbData.Country !== 'N/A' ? omdbData.Country : null,
        awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
        poster: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
        ratings: omdbData.Ratings || [],
        metascore: omdbData.Metascore !== 'N/A' ? parseInt(omdbData.Metascore, 10) : null,
        imdbRating: omdbData.imdbRating !== 'N/A' ? parseFloat(omdbData.imdbRating) : null,
        imdbVotes: omdbData.imdbVotes !== 'N/A' ? omdbData.imdbVotes : null,
        imdbId: omdbData.imdbID,
        type: omdbData.Type,
        boxOffice: omdbData.BoxOffice !== 'N/A' ? omdbData.BoxOffice : null,
      };

      if (TMDB_API_KEY && imdbId) {
        try {
          const tmdbSearchResponse = await fetch(
            `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id&api_key=${TMDB_API_KEY}`
          );
          const tmdbSearchData = await tmdbSearchResponse.json();
          
          if (tmdbSearchData.movie_results && tmdbSearchData.movie_results.length > 0) {
            const tmdbMovie = tmdbSearchData.movie_results[0];
            result.tmdbId = tmdbMovie.id;
            result.tmdbPosterPath = tmdbMovie.poster_path;
            result.tmdbBackdropPath = tmdbMovie.backdrop_path;
            
            if (type === 'movie') {
              const similarResponse = await fetch(
                `https://api.themoviedb.org/3/movie/${tmdbMovie.id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`
              );
              const similarData: TMDBSimilarResponse = await similarResponse.json();
              
              if (similarData.results && similarData.results.length > 0) {
                result.similarMovies = similarData.results.slice(0, 10).map((item: TMDBMovie | TMDBShow) => ({
                  tmdbId: item.id,
                  title: 'title' in item ? item.title : (item as TMDBShow).name,
                  year: 'release_date' in item ? (item.release_date ? item.release_date.split('-')[0] : '') : ((item as TMDBShow).first_air_date ? (item as TMDBShow).first_air_date.split('-')[0] : ''),
                  poster: item.poster_path ? getPosterUrl(item.poster_path, 'w342') : null,
                  overview: item.overview,
                  voteAverage: item.vote_average,
                  genreIds: item.genre_ids,
                  genres: getGenres(item.genre_ids),
                }));
              }
            }
          } else if (tmdbSearchData.tv_results && tmdbSearchData.tv_results.length > 0) {
            const tmdbShow = tmdbSearchData.tv_results[0];
            result.tmdbId = tmdbShow.id;
            result.tmdbPosterPath = tmdbShow.poster_path;
            result.tmdbBackdropPath = tmdbShow.backdrop_path;
            
            const similarResponse = await fetch(
              `https://api.themoviedb.org/3/tv/${tmdbShow.id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`
            );
            const similarData: TMDBSimilarResponse = await similarResponse.json();
            
            if (similarData.results && similarData.results.length > 0) {
              result.similarMovies = similarData.results.slice(0, 10).map((item: TMDBMovie | TMDBShow) => ({
                tmdbId: item.id,
                title: 'title' in item ? item.title : (item as TMDBShow).name,
                year: 'release_date' in item ? (item.release_date ? item.release_date.split('-')[0] : '') : ((item as TMDBShow).first_air_date ? (item as TMDBShow).first_air_date.split('-')[0] : ''),
                poster: item.poster_path ? getPosterUrl(item.poster_path, 'w342') : null,
                overview: item.overview,
                voteAverage: item.vote_average,
                genreIds: item.genre_ids,
                genres: getGenres(item.genre_ids),
              }));
            }
          }
        } catch (tmdbError) {
          console.error('TMDB API error:', tmdbError);
        }
      }

      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch movie info',
      };
    }
  },
});
