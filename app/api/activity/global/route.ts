import { NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import type { ActivityData } from '@/components/settings/activity/types';

export const runtime = 'edge';

const logger = createScopedLogger('api/activity/global');

interface ModelMetrics {
  messages: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  conversations: number;
}

interface DailyStats {
  activity_date: string;
  messages_count: number;
  conversations_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  metrics: {
    models?: Record<string, ModelMetrics>;
  } | null;
}

export async function GET() {
  try {
    // Initialize Supabase client (no auth required for global stats)
    const supabase = await createClient();

    // Fetch pre-aggregated stats from materialized view
    const { data: stats, error: statsError } = await supabase
      .from('daily_activity_stats')
      .select('*')
      .order('activity_date', { ascending: true }); // Get all data, oldest to newest

    if (statsError) {
      logger.error('Error fetching global activity stats', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch activity data' },
        { status: 500 }
      );
    }

    if (!stats || stats.length === 0) {
      return NextResponse.json({
        data: [],
        totalMessages: 0,
      });
    }

    // Transform stats to ActivityData format
    // Convert activity_date to "Jan 15" format (matches existing transformer)
    const activityData: ActivityData[] = stats.map(stat => {
      const date = new Date(stat.activity_date + 'T00:00:00'); // Ensure UTC parsing
      const dateKey = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      // Build base ActivityData object
      const data: ActivityData = {
        date: dateKey,
        messages: stat.messages_count,
        conversations: stat.conversations_count,
        inputTokens: stat.input_tokens,
        outputTokens: stat.output_tokens,
        totalTokens: stat.total_tokens,
      };

      // Extract model-specific metrics from JSONB
      if (stat.metrics?.models) {
        for (const [modelName, modelData] of Object.entries(stat.metrics.models)) {
          const metrics = modelData as ModelMetrics;
          data[`${modelName}-messages`] = metrics.messages;
          data[`${modelName}-inputTokens`] = metrics.inputTokens;
          data[`${modelName}-outputTokens`] = metrics.outputTokens;
          data[`${modelName}-totalTokens`] = metrics.totalTokens;
          data[`${modelName}-conversations`] = metrics.conversations;
        }
      }

      return data;
    });

    // Return with Vercel edge caching headers
    return NextResponse.json({
      data: activityData,
      totalMessages: stats.reduce((sum, stat) => sum + stat.messages_count, 0),
    }, {
      headers: {
        // Cache for 10 minutes (600 seconds)
        // Serve stale for 20 minutes while revalidating
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });

  } catch (error) {
    logger.error('Unexpected error in global activity API', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
