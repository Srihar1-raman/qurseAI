'use client';

import { useState, useEffect } from 'react';
import type { ActivityData } from '@/components/settings/activity/types';

interface UseActivityDataResult {
  data: ActivityData[];
  models: string[];
  isLoading: boolean;
  error: string | null;
}

export function useActivityData(options?: { userId?: string; isGlobal?: boolean }): UseActivityDataResult {
  const { isGlobal = false } = options || {};

  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>(['all']);

  useEffect(() => {
    async function fetchActivityData() {
      try {
        setIsLoading(true);
        setError(null);

        // Choose endpoint based on isGlobal flag
        const endpoint = isGlobal ? '/api/activity/global' : '/api/user/activity';
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Failed to fetch activity data');
        }

        const result = await response.json();
        setData(result.data || []);

        // Extract unique models from data
        const suffixes = ['-messages', '-conversations', '-inputTokens', '-outputTokens', '-totalTokens'];
        const uniqueModels = Array.from(
          new Set(
            (result.data || []).flatMap((d: ActivityData) =>
              Object.keys(d)
                .filter((k) => k.includes('-'))
                .map((k) => {
                  for (const suffix of suffixes) {
                    if (k.endsWith(suffix)) {
                      return k.slice(0, -suffix.length);
                    }
                  }
                  return k;
                })
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
  }, [isGlobal]);

  return { data, models, isLoading, error };
}
