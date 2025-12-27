'use client';

import { useState, useEffect } from 'react';
import type { ActivityData } from '@/components/settings/activity/types';

interface UseActivityDataResult {
  data: ActivityData[];
  models: string[];
  isLoading: boolean;
  error: string | null;
}

export function useActivityData(userId?: string): UseActivityDataResult {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>(['all']);

  useEffect(() => {
    if (!userId) return;

    async function fetchActivityData() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/user/activity');

        if (!response.ok) {
          throw new Error('Failed to fetch activity data');
        }

        const result = await response.json();
        setData(result.data || []);

        // Extract unique models from data
        const uniqueModels = Array.from(
          new Set(
            (result.data || []).flatMap((d: ActivityData) =>
              Object.keys(d).filter(
                (k) =>
                  ![
                    'date',
                    'messages',
                    'conversations',
                    'inputTokens',
                    'outputTokens',
                    'totalTokens',
                  ].includes(k)
              )
            )
          )
        ) as string[];
        setModels(['all', ...uniqueModels]);
      } catch (err) {
        console.error('Error fetching activity data:', err);
        setError('Failed to load activity data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivityData();
  }, [userId]);

  return { data, models, isLoading, error };
}
