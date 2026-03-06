'use client';

import React from 'react';
import { Cloud, Droplets, Wind, MapPin, Thermometer } from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  region?: string | null;
  temperature: number;
  unit: 'C' | 'F';
  description: string;
  humidity: number;
  windSpeed: number;
}

interface WeatherCardProps {
  weather: WeatherData;
}

function getWeatherIcon(description: string): React.ReactNode {
  const desc = description.toLowerCase();
  if (desc.includes('clear') || desc.includes('sunny')) {
    return <Thermometer className="weather-icon sunny" />;
  }
  if (desc.includes('cloud') || desc.includes('overcast')) {
    return <Cloud className="weather-icon cloudy" />;
  }
  if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) {
    return <Droplets className="weather-icon rainy" />;
  }
  if (desc.includes('snow') || desc.includes('snow')) {
    return <Cloud className="weather-icon snowy" />;
  }
  if (desc.includes('thunder') || desc.includes('storm')) {
    return <Cloud className="weather-icon stormy" />;
  }
  if (desc.includes('fog') || desc.includes('mist')) {
    return <Cloud className="weather-icon foggy" />;
  }
  return <Cloud className="weather-icon" />;
}

export function WeatherCard({ weather }: WeatherCardProps) {
  return (
    <div className="weather-card">
      <div className="weather-card-header">
        <div className="weather-card-location">
          <MapPin className="weather-card-location-icon" />
          <span className="weather-card-city">{weather.city}</span>
          {weather.region && <span className="weather-card-region">, {weather.region}</span>}
          <span className="weather-card-country">{weather.country}</span>
        </div>
      </div>

      <div className="weather-card-body">
        <div className="weather-card-main">
          <div className="weather-card-icon-wrapper">
            {getWeatherIcon(weather.description)}
          </div>
          <div className="weather-card-temp">
            <span className="weather-card-temp-value">{Math.round(weather.temperature)}</span>
            <span className="weather-card-temp-unit">°{weather.unit}</span>
          </div>
        </div>

        <div className="weather-card-description">{weather.description}</div>

        <div className="weather-card-details">
          <div className="weather-card-detail">
            <Droplets className="weather-card-detail-icon" />
            <span className="weather-card-detail-value">{weather.humidity}%</span>
            <span className="weather-card-detail-label">Humidity</span>
          </div>
          <div className="weather-card-detail">
            <Wind className="weather-card-detail-icon" />
            <span className="weather-card-detail-value">{weather.windSpeed}</span>
            <span className="weather-card-detail-label">km/h Wind</span>
          </div>
        </div>
      </div>
    </div>
  );
}
