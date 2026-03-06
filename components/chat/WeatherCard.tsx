'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, MapPin, Sun, CloudRain, Snowflake, CloudLightning, CloudFog, LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface WeatherData {
  city: string;
  country: string;
  region?: string | null;
  temperature: number;
  unit: 'C' | 'F';
  description: string;
  humidity: number;
  windSpeed: number;
  forecast?: Array<{
    date: string;
    day: string;
    maxTemp: number;
    minTemp: number;
    description: string;
    icon: string;
    precipitation: number;
  }>;
}

interface WeatherCardProps {
  weather: WeatherData;
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9/5) + 32;
}

function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5/9;
}

function getWeatherConfig(icon: string): { icon: LucideIcon; gradient: string; bgGradient: string; color: string } {
  const configs: Record<string, { icon: LucideIcon; gradient: string; bgGradient: string; color: string }> = {
    sunny: { 
      icon: Sun, 
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%)',
      color: '#f59e0b'
    },
    'partly-cloudy': { 
      icon: Cloud, 
      gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(148, 163, 184, 0.1) 100%)',
      color: '#64748b'
    },
    cloudy: { 
      icon: Cloud, 
      gradient: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(71, 85, 105, 0.15) 0%, rgba(100, 116, 139, 0.1) 100%)',
      color: '#475569'
    },
    rainy: { 
      icon: CloudRain, 
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(96, 165, 250, 0.12) 100%)',
      color: '#3b82f6'
    },
    snowy: { 
      icon: Snowflake, 
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 50%, #a5f3fc 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(103, 232, 249, 0.1) 100%)',
      color: '#06b6d4'
    },
    stormy: { 
      icon: CloudLightning, 
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(167, 139, 250, 0.12) 100%)',
      color: '#7c3aed'
    },
    foggy: { 
      icon: CloudFog, 
      gradient: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 50%, #e5e7eb 100%)',
      bgGradient: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(209, 213, 219, 0.1) 100%)',
      color: '#9ca3af'
    },
  };
  return configs[icon] || configs.cloudy;
}

function getDayIcon(icon: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    sunny: Sun,
    'partly-cloudy': Cloud,
    cloudy: Cloud,
    rainy: CloudRain,
    snowy: Snowflake,
    stormy: CloudLightning,
    foggy: CloudFog,
  };
  return icons[icon] || Cloud;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WeatherCard({ weather }: WeatherCardProps) {
  const [unit, setUnit] = useState<'C' | 'F' | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setUnit(weather.unit as 'C' | 'F');
    setMounted(true);
  }, [weather.unit]);
  
  const { icon: WeatherIcon, gradient, bgGradient, color } = getWeatherConfig(weather.forecast?.[0]?.icon || 'cloudy');
  
  const convertTemp = (temp: number, fromUnit: 'C' | 'F', toUnit: 'C' | 'F') => {
    if (fromUnit === toUnit) return temp;
    if (fromUnit === 'F' && toUnit === 'C') return fahrenheitToCelsius(temp);
    return celsiusToFahrenheit(temp);
  };
  
  const displayTemp = unit ? convertTemp(weather.temperature, weather.unit, unit) : weather.temperature;
  
  const chartData = weather.forecast?.map((day) => ({
    day: day.day,
    max: unit ? convertTemp(day.maxTemp, weather.unit, unit) : day.maxTemp,
    min: unit ? convertTemp(day.minTemp, weather.unit, unit) : day.minTemp,
    avg: unit ? (convertTemp(day.maxTemp, weather.unit, unit) + convertTemp(day.minTemp, weather.unit, unit)) / 2 : day.maxTemp,
    precipitation: day.precipitation,
  })) || [];

  return (
    <div className="weather-card" style={{ background: bgGradient }}>
      <div className="weather-card-top">
        <div className="weather-card-location">
          <MapPin className="weather-card-location-icon" style={{ color }} />
          <span className="weather-card-city">{weather.city}</span>
          {weather.region && <span className="weather-card-region">, {weather.region}</span>}
          <span className="weather-card-country"> · {weather.country}</span>
        </div>
        
        {mounted && unit && (
          <button 
            className="weather-unit-toggle"
            onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
          >
            <span className={unit === 'C' ? 'active' : ''}>°C</span>
            <span className={unit === 'F' ? 'active' : ''}>°F</span>
          </button>
        )}
      </div>

      <div className="weather-card-main-row">
        <div className="weather-card-icon-box" style={{ background: gradient }}>
          <WeatherIcon className="weather-card-main-icon" />
        </div>
        
        <div className="weather-card-temp-section">
          <div className="weather-card-temp">
            <span className="weather-card-temp-value">{Math.round(displayTemp)}</span>
            <span className="weather-card-temp-unit">°{unit || weather.unit}</span>
          </div>
          <div className="weather-card-description">{weather.description}</div>
        </div>
      </div>

      <div className="weather-card-details">
        <div className="weather-card-detail">
          <Droplets className="weather-card-detail-icon" style={{ color }} />
          <span className="weather-card-detail-value">{weather.humidity}%</span>
          <span className="weather-card-detail-label">Humidity</span>
        </div>
        <div className="weather-card-detail-divider" />
        <div className="weather-card-detail">
          <Wind className="weather-card-detail-icon" style={{ color }} />
          <span className="weather-card-detail-value">{weather.windSpeed}</span>
          <span className="weather-card-detail-label">km/h Wind</span>
        </div>
      </div>

      {weather.forecast && weather.forecast.length > 0 && (
        <div className="weather-forecast-section">
          <div className="weather-forecast-header">
            <span className="weather-forecast-title">7-Day Forecast</span>
          </div>

          <div className="weather-forecast-chart">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weatherGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  stroke="var(--color-text-muted)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--color-text-muted)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Math.round(v)}°`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${Math.round(Number(value))}°`]}
                />
                <Area
                  type="monotone"
                  dataKey="max"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#weatherGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="min"
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="weather-forecast-days">
            {weather.forecast.map((day, index) => {
              const DayIcon = getDayIcon(day.icon);
              return (
                <div key={index} className="weather-forecast-day">
                  <span className="weather-forecast-day-name">{day.day}</span>
                  <DayIcon className="weather-forecast-day-icon" style={{ color }} />
                  <div className="weather-forecast-day-temps">
                    <span className="weather-forecast-day-high">{Math.round(unit ? convertTemp(day.maxTemp, weather.unit, unit) : day.maxTemp)}°</span>
                    <span className="weather-forecast-day-low">{Math.round(unit ? convertTemp(day.minTemp, weather.unit, unit) : day.minTemp)}°</span>
                  </div>
                  {day.precipitation > 0 && (
                    <div className="weather-forecast-day-precip">
                      <Droplets className="precip-icon" />
                      <span>{day.precipitation}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
