'use client';

import { useState, useMemo } from 'react';
import type { MetricType, TokenType, TimeRange, ActivityData } from '@/components/settings/activity/types';
import { DEFAULT_TOKEN_MULTIPLIERS } from '@/components/settings/activity/constants';

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
      return selectedModel;
    }

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
    return data.map((d) => {
      const modelCount = (d[selectedModel] as number) || 0;
      return {
        ...d,
        messages: modelCount,
        conversations: Math.ceil(modelCount / 3),
        inputTokens: Math.floor(modelCount * DEFAULT_TOKEN_MULTIPLIERS.input),
        outputTokens: Math.floor(modelCount * DEFAULT_TOKEN_MULTIPLIERS.output),
        totalTokens: Math.floor(modelCount * DEFAULT_TOKEN_MULTIPLIERS.total),
      };
    });
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
