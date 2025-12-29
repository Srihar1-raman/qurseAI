/**
 * Backfill Script: Populate daily_activity_stats with historical data
 *
 * Usage:
 *   1. Set environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 *   2. Run: npx tsx scripts/backfill-activity-stats.ts
 *
 * This script:
 * - Fetches all messages from the database
 * - Groups by date
 * - Aggregates metrics (messages, conversations, tokens)
 * - Aggregates per-model metrics
 * - Inserts into daily_activity_stats table
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Message {
  id: string;
  created_at: string;
  role: string;
  model: string | null;
  conversation_id: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
}

interface DailyStats {
  activity_date: Date;
  messages_count: number;
  conversations_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  metrics: any;
}

async function backfillActivityStats() {
  console.log('🚀 Starting activity stats backfill...\n');

  try {
    // 1. Fetch all assistant messages
    console.log('📥 Fetching messages from database...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, created_at, role, model, conversation_id, input_tokens, output_tokens, total_tokens')
      .eq('role', 'assistant')
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    if (!messages || messages.length === 0) {
      console.log('⚠️  No assistant messages found. Exiting.');
      return;
    }

    console.log(`✅ Found ${messages.length} assistant messages\n`);

    // 2. Group by date
    console.log('📊 Grouping messages by date...');
    const dailyMap = new Map<string, Message[]>();

    for (const msg of messages) {
      const date = new Date(msg.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, []);
      }

      dailyMap.get(dateKey)!.push(msg);
    }

    console.log(`✅ Grouped into ${dailyMap.size} unique days\n`);

    // 3. Aggregate metrics per day
    console.log('🔢 Aggregating metrics...');
    const dailyStats: DailyStats[] = [];

    for (const [dateKey, dayMessages] of dailyMap.entries()) {
      // Core metrics
      const messages_count = dayMessages.length;
      const conversations_count = new Set(dayMessages.map(m => m.conversation_id)).size;
      const input_tokens = dayMessages.reduce((sum, m) => sum + (m.input_tokens || 0), 0);
      const output_tokens = dayMessages.reduce((sum, m) => sum + (m.output_tokens || 0), 0);
      const total_tokens = dayMessages.reduce((sum, m) => sum + (m.total_tokens || 0), 0);

      // Model-specific metrics
      const modelMap = new Map<string, {
        messages: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        conversations: Set<string>;
      }>();

      for (const msg of dayMessages) {
        if (!msg.model) continue;

        // Clean model name to match data transformer logic
        const modelName = msg.model.replace('openai/', '').replace('anthropic/', '');

        if (!modelMap.has(modelName)) {
          modelMap.set(modelName, {
            messages: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            conversations: new Set(),
          });
        }

        const modelStats = modelMap.get(modelName)!;
        modelStats.messages++;
        modelStats.inputTokens += msg.input_tokens || 0;
        modelStats.outputTokens += msg.output_tokens || 0;
        modelStats.totalTokens += msg.total_tokens || 0;
        modelStats.conversations.add(msg.conversation_id);
      }

      // Convert model Map to JSON
      const models: Record<string, any> = {};
      for (const [modelName, stats] of modelMap.entries()) {
        models[modelName] = {
          messages: stats.messages,
          inputTokens: stats.inputTokens,
          outputTokens: stats.outputTokens,
          totalTokens: stats.totalTokens,
          conversations: stats.conversations.size,
        };
      }

      dailyStats.push({
        activity_date: new Date(dateKey),
        messages_count,
        conversations_count,
        input_tokens,
        output_tokens,
        total_tokens,
        metrics: { models },
      });
    }

    console.log(`✅ Aggregated ${dailyStats.length} days of data\n`);

    // 4. Insert into database
    console.log('💾 Inserting into daily_activity_stats...');

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const stats of dailyStats) {
      try {
        const { error: insertError } = await supabase
          .from('daily_activity_stats')
          .upsert({
            activity_date: stats.activity_date,
            messages_count: stats.messages_count,
            conversations_count: stats.conversations_count,
            input_tokens: stats.input_tokens,
            output_tokens: stats.output_tokens,
            total_tokens: stats.total_tokens,
            metrics: stats.metrics,
          }, {
            onConflict: 'activity_date',
          });

        if (insertError) {
          console.error(`❌ Error inserting ${stats.activity_date}:`, insertError.message);
          errors++;
        } else {
          inserted++;
        }
      } catch (err) {
        console.error(`❌ Unexpected error for ${stats.activity_date}:`, err);
        errors++;
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`   Inserted: ${inserted} days`);
    console.log(`   Skipped:  ${skipped} days`);
    console.log(`   Errors:    ${errors} days`);

  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
backfillActivityStats();
