'use client';

import React, { useState } from 'react';
import { Star, Clock, Film, Tv } from 'lucide-react';

interface MovieData {
  title: string;
  year: string;
  rated: string | null;
  released: string | null;
  runtime: string | null;
  genre: string[];
  director: string | null;
  writer: string | null;
  actors: string[];
  plot: string | null;
  language: string | null;
  country: string | null;
  awards: string | null;
  poster: string | null;
  ratings: Array<{ Source: string; Value: string }>;
  metascore: number | null;
  imdbRating: number | null;
  imdbVotes: string | null;
  imdbId: string;
  type: string;
  boxOffice: string | null;
  tmdbPosterPath?: string;
  similarMovies?: Array<{
    tmdbId: number;
    title: string;
    year: string;
    poster: string | null;
    overview: string;
    voteAverage: number;
    genres: string;
  }>;
}

interface MovieCardProps {
  movie: MovieData;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullPlot, setShowFullPlot] = useState(false);

  const posterUrl = movie.tmdbPosterPath 
    ? `https://image.tmdb.org/t/p/w500${movie.tmdbPosterPath}`
    : movie.poster;

  const displayPoster = imageError || !posterUrl 
    ? null 
    : posterUrl;

  const rtRatingVal = movie.ratings?.find(r => r.Source === 'Rotten Tomatoes');
  const metaScore = movie.metascore;

  const isSeries = movie.type === 'series';
  const typeIcon = isSeries ? Tv : Film;

  return (
    <div className="movie-card">
      <div className="movie-card-content">
        {displayPoster && (
          <div className="movie-card-poster">
            <img 
              src={displayPoster} 
              alt={movie.title}
              onError={() => setImageError(true)}
            />
          </div>
        )}

        <div className="movie-card-info">
          <div className="movie-card-header">
            <div className="movie-card-type">
              {React.createElement(typeIcon, { size: 14 })}
              <span>{isSeries ? 'TV Series' : 'Movie'}</span>
            </div>
            <h2 className="movie-card-title">{movie.title}</h2>
            <div className="movie-card-meta">
              {movie.year && <span>{movie.year}</span>}
              {movie.rated && <span className="movie-card-rated">{movie.rated}</span>}
              {movie.runtime && (
                <span className="movie-card-runtime">
                  <Clock size={12} />
                  {movie.runtime}
                </span>
              )}
            </div>
          </div>

          {movie.genre && movie.genre.length > 0 && (
            <div className="movie-card-genres">
              {movie.genre.slice(0, 4).map((g, i) => (
                <span key={i} className="movie-card-genre">{g}</span>
              ))}
            </div>
          )}

          <div className="movie-card-ratings">
            {movie.imdbRating && (
              <div className="movie-card-rating">
                <Star size={14} fill="currentColor" className="star-icon" />
                <span className="rating-value">{movie.imdbRating}</span>
                <span className="rating-max">/10</span>
              </div>
            )}
            {metaScore && (
              <div className="movie-card-rating metascore">
                <span className="rating-value">{metaScore}</span>
                <span className="rating-label">Metascore</span>
              </div>
            )}
            {rtRatingVal && (
              <div className="movie-card-rating tomatoes">
                <span className="rating-value">{rtRatingVal.Value}</span>
                <span className="rating-label">Tomatometer</span>
              </div>
            )}
          </div>

          {movie.plot && (
            <div className="movie-card-plot">
              <p className={showFullPlot ? '' : 'truncated'}>
                {movie.plot}
              </p>
              {movie.plot.length > 200 && (
                <button 
                  className="movie-card-plot-toggle"
                  onClick={() => setShowFullPlot(!showFullPlot)}
                >
                  {showFullPlot ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {movie.director && (
            <div className="movie-card-detail">
              <span className="detail-label">Director</span>
              <span className="detail-value">{movie.director}</span>
            </div>
          )}

          {movie.actors && movie.actors.length > 0 && (
            <div className="movie-card-detail">
              <span className="detail-label">Cast</span>
              <span className="detail-value">{movie.actors.slice(0, 4).join(', ')}</span>
            </div>
          )}

          {movie.boxOffice && (
            <div className="movie-card-detail">
              <span className="detail-label">Box Office</span>
              <span className="detail-value">{movie.boxOffice}</span>
            </div>
          )}
        </div>
      </div>

      {movie.similarMovies && movie.similarMovies.length > 0 && (
        <div className="movie-card-similar">
          <div className="similar-header">
            <span className="similar-title">Similar Movies</span>
          </div>
          <div className="similar-scroll">
            {movie.similarMovies.map((similar) => (
              <div key={similar.tmdbId} className="similar-item">
                {similar.poster ? (
                  <img src={similar.poster} alt={similar.title} />
                ) : (
                  <div className="similar-no-poster">
                    <Film size={24} />
                  </div>
                )}
                <div className="similar-info">
                  <span className="similar-item-title">{similar.title}</span>
                  <span className="similar-item-year">{similar.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
