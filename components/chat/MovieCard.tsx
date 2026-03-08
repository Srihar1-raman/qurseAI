'use client';

import React, { useState } from 'react';
import { Star, Clock, Film, Tv, Loader2 } from 'lucide-react';

interface SimilarMovie {
  tmdbId: number;
  title: string;
  year: string;
  poster: string | null;
  overview: string;
  voteAverage: number;
  genres: string;
}

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
  similarMovies?: SimilarMovie[];
}

interface MovieCardProps {
  movie: MovieData;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showFullPlot, setShowFullPlot] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<MovieData>(movie);
  const [loadingMovie, setLoadingMovie] = useState<string | null>(null);

  const posterUrl = currentMovie.tmdbPosterPath 
    ? `https://image.tmdb.org/t/p/w500${currentMovie.tmdbPosterPath}`
    : currentMovie.poster;

  const displayPoster = imageError || !posterUrl 
    ? null 
    : posterUrl;

  const rtRatingVal = currentMovie.ratings?.find(r => r.Source === 'Rotten Tomatoes');
  const metaScore = currentMovie.metascore;

  const isSeries = currentMovie.type === 'series';
  const typeIcon = isSeries ? Tv : Film;

  const handleSimilarClick = async (similar: SimilarMovie) => {
    setLoadingMovie(similar.tmdbId.toString());
    try {
      const res = await fetch(`/api/movie?title=${encodeURIComponent(similar.title)}&year=${similar.year}`);
      const data = await res.json();
      if (data.error) {
        console.error('Error fetching movie:', data.error);
        setLoadingMovie(null);
        return;
      }
      setCurrentMovie(data);
    } catch (error) {
      console.error('Error fetching movie:', error);
      setLoadingMovie(null);
    }
  };

  return (
    <div className="movie-card">
      <div className="movie-card-content">
        <div className="movie-card-info">
          <div className="movie-card-header">
            <div className="movie-card-type">
              {React.createElement(typeIcon, { size: 14 })}
              <span>{isSeries ? 'TV Series' : 'Movie'}</span>
            </div>
            <h2 className="movie-card-title">{currentMovie.title}</h2>
            <div className="movie-card-meta">
              {currentMovie.year && <span>{currentMovie.year}</span>}
              {currentMovie.rated && <span className="movie-card-rated">{currentMovie.rated}</span>}
              {currentMovie.runtime && (
                <span className="movie-card-runtime">
                  <Clock size={12} />
                  {currentMovie.runtime}
                </span>
              )}
            </div>
          </div>

          {currentMovie.genre && currentMovie.genre.length > 0 && (
            <div className="movie-card-genres">
              {currentMovie.genre.slice(0, 4).map((g, i) => (
                <span key={i} className="movie-card-genre">{g}</span>
              ))}
            </div>
          )}

          <div className="movie-card-ratings">
            {currentMovie.imdbRating && (
              <div className="movie-card-rating">
                <Star size={14} fill="currentColor" className="star-icon" />
                <span className="rating-value">{currentMovie.imdbRating}</span>
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

          {currentMovie.plot && (
            <div className="movie-card-plot">
              <p className={showFullPlot ? '' : 'truncated'}>
                {currentMovie.plot}
              </p>
              {currentMovie.plot.length > 200 && (
                <button 
                  className="movie-card-plot-toggle"
                  onClick={() => setShowFullPlot(!showFullPlot)}
                >
                  {showFullPlot ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {currentMovie.director && (
            <div className="movie-card-detail">
              <span className="detail-label">Director</span>
              <span className="detail-value">{currentMovie.director}</span>
            </div>
          )}

          {currentMovie.actors && currentMovie.actors.length > 0 && (
            <div className="movie-card-detail">
              <span className="detail-label">Cast</span>
              <span className="detail-value">{currentMovie.actors.slice(0, 4).join(', ')}</span>
            </div>
          )}

          {currentMovie.boxOffice && (
            <div className="movie-card-detail">
              <span className="detail-label">Box Office</span>
              <span className="detail-value">{currentMovie.boxOffice}</span>
            </div>
          )}
        </div>

        {displayPoster && (
          <div className="movie-card-poster">
            <img 
              src={displayPoster} 
              alt={currentMovie.title}
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>

      {currentMovie.similarMovies && currentMovie.similarMovies.length > 0 && (
        <div className="movie-card-similar">
          <div className="similar-header">
            <span className="similar-title">Similar Movies</span>
          </div>
          <div className="similar-scroll">
            {currentMovie.similarMovies.map((similar) => (
              <div 
                key={similar.tmdbId} 
                className="similar-item"
                onClick={() => handleSimilarClick(similar)}
              >
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
                {loadingMovie === similar.tmdbId.toString() && (
                  <div className="similar-loader">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
