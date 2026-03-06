import { tool } from 'ai';
import { z } from 'zod';

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface HistoricalWeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    relative_humidity_2m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

function weatherCodeToDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return weatherCodes[code] || 'Unknown';
}

function getWeatherIcon(code: number): string {
  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'foggy';
  if (code >= 51 && code <= 67) return 'rainy';
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 80 && code <= 82) return 'rainy';
  if (code >= 85 && code <= 86) return 'snowy';
  if (code >= 95) return 'stormy';
  return 'cloudy';
}

export const weatherHistoryTool = tool({
  description: 'Get historical weather for a specific date (past or future) without forecast',
  inputSchema: z.object({
    city: z.string().describe('The city to get historical weather for'),
    date: z.string().describe('The date in YYYY-MM-DD format (e.g., 2024-01-15)'),
    unit: z.enum(['C', 'F']).default('F').describe('Temperature unit: C for Celsius, F for Fahrenheit'),
  }),
  execute: async ({ city, date, unit }) => {
    try {
      const geocodingResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );

      if (!geocodingResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodingResponse.status}`);
      }

      const geocodingData = await geocodingResponse.json();

      if (!geocodingData.results || geocodingData.results.length === 0) {
        throw new Error(`City not found: ${city}`);
      }

      const location: GeocodingResult = geocodingData.results[0];
      const tempUnit = unit === 'F' ? 'fahrenheit' : 'celsius';

      const weatherResponse = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&date=${date}&hourly=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=kmh`
      );

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }

      const weatherData: HistoricalWeatherData = await weatherResponse.json();
      const hourly = weatherData.hourly;
      const daily = weatherData.daily;

      if (!hourly.time || hourly.time.length === 0) {
        throw new Error(`Weather data not available for date: ${date}`);
      }

      const middayIndex = Math.floor(hourly.time.length / 2);
      const middayTime = hourly.time[middayIndex];
      const temperature = hourly.temperature_2m[middayIndex];
      const weatherCode = hourly.weather_code[middayIndex];
      const windSpeed = hourly.wind_speed_10m[middayIndex];
      const humidity = hourly.relative_humidity_2m[middayIndex];

      return {
        city: location.name,
        country: location.country,
        region: location.admin1 || null,
        date,
        displayDate: new Date(middayTime).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        temperature,
        unit,
        description: weatherCodeToDescription(weatherCode),
        icon: getWeatherIcon(weatherCode),
        humidity,
        windSpeed,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      };
    }
  },
});
