'use client';

import { useState, useEffect } from 'react';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('hooks/useUserLocation');

export interface UseUserLocationReturn {
  location: string;
  isLoading: boolean;
  error: string | null;
  getLocation: () => Promise<string>;
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<string>('Unknown location');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.error) {
          throw new Error(data.reason || 'Failed to get location');
        }

        const { city, region, country_name } = data;

        const locationStr = [city, region, country_name].filter(Boolean).join(', ') || 'Unknown location';

        setLocation(locationStr);
        setIsLoading(false);

        logger.info('Location retrieved via IP geolocation', {
          location: locationStr,
          city,
          region,
          country: country_name,
        });
      } catch (err) {
        setIsLoading(false);
        const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
        setError(errorMsg);

        logger.warn('IP geolocation error', {
          error: errorMsg,
        });
      }
    };

    fetchLocation();
  }, []);

  const getLocation = async (): Promise<string> => {
    const fetchLocation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.error) {
          throw new Error(data.reason || 'Failed to get location');
        }

        const { city, region, country_name } = data;

        const locationStr = [city, region, country_name].filter(Boolean).join(', ') || 'Unknown location';

        setLocation(locationStr);
        setIsLoading(false);

        return locationStr;
      } catch (err) {
        setIsLoading(false);
        const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
        setError(errorMsg);
        return 'Unknown location';
      }
    };

    return await fetchLocation();
  };

  return {
    location,
    isLoading,
    error,
    getLocation,
  };
}
