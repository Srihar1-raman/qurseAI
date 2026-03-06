import { tool } from 'ai';
import { z } from 'zod';

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
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

export const weatherTool = tool({
  description: 'Get current weather and 7-day forecast for a city with charts',
  inputSchema: z.object({
    city: z.string().describe('The city to get weather for'),
    unit: z.enum(['C', 'F']).default('F').describe('Temperature unit: C for Celsius, F for Fahrenheit'),
  }),
  execute: async ({ city, unit }) => {
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
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&temperature_unit=${tempUnit}&wind_speed_unit=kmh&forecast_days=7`
      );

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }

      const weatherData: WeatherData = await weatherResponse.json();
      const current = weatherData.current;
      const daily = weatherData.daily;

      const forecast = daily.time.slice(0, 7).map((date, i) => ({
        date,
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        maxTemp: daily.temperature_2m_max[i],
        minTemp: daily.temperature_2m_min[i],
        description: weatherCodeToDescription(daily.weather_code[i]),
        icon: getWeatherIcon(daily.weather_code[i]),
        precipitation: daily.precipitation_probability_max[i] || 0,
      }));

      return {
        city: location.name,
        country: location.country,
        region: location.admin1 || null,
        temperature: current.temperature_2m,
        unit,
        description: weatherCodeToDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        forecast,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      };
    }
  },
});
