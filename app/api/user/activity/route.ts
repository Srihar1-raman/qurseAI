import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { transformMessageData, type Message } from '@/lib/activity/data-transformer';

export const runtime = 'edge';

const logger = createScopedLogger('api/user/activity');

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's messages (all assistant messages with token data)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, model, created_at, input_tokens, output_tokens, total_tokens, completion_time, conversation_id')
      .eq('role', 'assistant') // Only fetch assistant messages (they have token data)
      .order('created_at', { ascending: false });

    if (messagesError) {
      logger.error('Error fetching messages', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch activity data' },
        { status: 500 }
      );
    }

    // Transform raw messages into activity chart data
    const activityData = transformMessageData(messages as Message[] || []);

    return NextResponse.json({
      data: activityData,
      totalMessages: messages?.length || 0,
    });

  } catch (error) {
    logger.error('Unexpected error in activity API', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
