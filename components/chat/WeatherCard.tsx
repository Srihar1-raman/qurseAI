'use client';

import React from 'react';
import { Cloud, Droplets, Wind, MapPin, Sun, CloudRain, Snowflake, CloudLightning, CloudFog, LucideIcon } from 'lucide-react';

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

function getWeatherConfig(description: string): { icon: LucideIcon; gradient: string; bgGradient: string } {
  const desc = description.toLowerCase();
  if (desc.includes('clear') || desc.includes('sunny')) {
    return { 
      icon: Sun, 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%)'
    };
  }
  if (desc.includes('cloud') || desc.includes('overcast')) {
    return { 
      icon: Cloud, 
      gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(148, 163, 184, 0.1) 100%)'
    };
  }
  if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) {
    return { 
      icon: CloudRain, 
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(96, 165, 250, 0.12) 100%)'
    };
  }
  if (desc.includes('snow')) {
    return { 
      icon: Snowflake, 
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 50%, #a5f3fc 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(103, 232, 249, 0.1) 100%)'
    };
  }
  if (desc.includes('thunder') || desc.includes('storm')) {
    return { 
      icon: CloudLightning, 
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(167, 139, 250, 0.12) 100%)'
    };
  }
  if (desc.includes('fog') || desc.includes('mist')) {
    return { 
      icon: CloudFog, 
      gradient: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 50%, #e5e7eb 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(209, 213, 219, 0.1) 100%)'
    };
  }
  return { 
    icon: Cloud, 
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(148, 163, 184, 0.1) 100%)'
  };
}

export function WeatherCard({ weather }: WeatherCardProps) {
  const { icon: WeatherIcon, gradient, bgGradient } = getWeatherConfig(weather.description);

  return (
    <div className="weather-card" style={{ background: bgGradient }}>
      <div className="weather-card-top">
        <div className="weather-card-location">
          <MapPin className="weather-card-location-icon" />
          <span className="weather-card-city">{weather.city}</span>
          {weather.region && <span className="weather-card-region">, {weather.region}</span>}
          <span className="weather-card-country"> · {weather.country}</span>
        </div>
      </div>

      <div className="weather-card-main-row">
        <div className="weather-card-icon-box" style={{ background: gradient }}>
          <WeatherIcon className="weather-card-main-icon" />
        </div>
        
        <div className="weather-card-temp-section">
          <div className="weather-card-temp">
            <span className="weather-card-temp-value">{Math.round(weather.temperature)}</span>
            <span className="weather-card-temp-unit">°{weather.unit}</span>
          </div>
          <div className="weather-card-description">{weather.description}</div>
        </div>
      </div>

      <div className="weather-card-details">
        <div className="weather-card-detail">
          <Droplets className="weather-card-detail-icon" />
          <span className="weather-card-detail-value">{weather.humidity}%</span>
          <span className="weather-card-detail-label">Humidity</span>
        </div>
        <div className="weather-card-detail-divider" />
        <div className="weather-card-detail">
          <Wind className="weather-card-detail-icon" />
          <span className="weather-card-detail-value">{weather.windSpeed}</span>
          <span className="weather-card-detail-label">km/h Wind</span>
        </div>
      </div>
    </div>
  );
}
