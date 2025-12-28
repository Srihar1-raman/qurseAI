'use client';

import { useState, useMemo } from 'react';
import type { MetricType, TokenType, TimeRange, ActivityData } from '@/components/settings/activity/types';

interface UseActivityFiltersOptions {
  data: ActivityData[];
}

interface UseActivityFiltersResult {
  metric: MetricType;
  tokenType: TokenType;
  selectedModel: string;
  timeRange: TimeRange;
  setMetric: (metric: MetricType) => void;
  setTokenType: (type: TokenType) => void;
  setSelectedModel: (model: string) => void;
  setTimeRange: (range: TimeRange) => void;
  filteredData: ActivityData[];
  dataKey: string;
  average: number;
}

export function useActivityFilters(
  options: UseActivityFiltersOptions
): UseActivityFiltersResult {
  const { data } = options;

  const [metric, setMetric] = useState<MetricType>('messages');
  const [tokenType, setTokenType] = useState<TokenType>('total');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  // Get the data key based on selections
  const getDataKey = (): string => {
    if (selectedModel !== 'all') {
      // Model-specific filtering
      if (metric === 'tokens') {
        // Return model-specific token key (e.g., "gpt-4-inputTokens")
        return `${selectedModel}-${tokenType}Tokens`;
      }
      // Return model-specific message count (e.g., "gpt-4-messages")
      return `${selectedModel}-messages`;
    }

    // All models - use aggregated keys
    if (metric === 'tokens') {
      if (tokenType === 'input') return 'inputTokens';
      if (tokenType === 'output') return 'outputTokens';
      return 'totalTokens';
    }
    return metric;
  };

  // Filter data based on model selection
  const getFilteredData = (): ActivityData[] => {
    if (selectedModel === 'all') {
      return data;
    }
    // Data already contains model-specific keys (e.g., "gpt-4-messages", "gpt-4-inputTokens")
    // No transformation needed - just return data as-is
    // Chart will use the correct key based on getDataKey()
    return data;
  };

  // Filter data by time range
  const getFilteredDataByTime = (filteredData: ActivityData[]): ActivityData[] => {
    if (timeRange === 'all') {
      return filteredData;
    }
    const daysToShow = timeRange === '7days' ? 7 : 30;
    return filteredData.slice(-daysToShow);
  };

  const filteredData = useMemo(() => {
    const modelFiltered = getFilteredData();
    return getFilteredDataByTime(modelFiltered);
  }, [data, selectedModel, timeRange]);

  const dataKey = useMemo(() => getDataKey(), [metric, tokenType, selectedModel]);

  const average = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce(
      (sum, d) => sum + (d[dataKey as keyof typeof d] as number),
      0
    );
    return sum / filteredData.length;
  }, [filteredData, dataKey]);

  return {
    metric,
    tokenType,
    selectedModel,
    timeRange,
    setMetric,
    setTokenType,
    setSelectedModel,
    setTimeRange,
    filteredData,
    dataKey,
    average,
  };
}
