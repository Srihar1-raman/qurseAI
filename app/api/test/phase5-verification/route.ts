import { NextRequest, NextResponse } from 'next/server';
import { checkGuestConversationAccess } from '@/lib/db/guest-conversations.server';
import { getGuestMessagesServerSide } from '@/lib/db/guest-messages.server';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('test/phase5-verification');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Phase 5 Verification Tests
 * Tests guest conversation access control and message loading
 */
export async function GET(request: NextRequest) {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];

  try {
    // Setup: Create test data
    const sessionId1 = crypto.randomUUID();
    const sessionHash1 = hmacSessionId(sessionId1);
    const sessionId2 = crypto.randomUUID();
    const sessionHash2 = hmacSessionId(sessionId2);

    const conversationId1 = crypto.randomUUID();
    const conversationId2 = crypto.randomUUID();
    const conversationId3 = crypto.randomUUID(); // Non-existent

    // Create test conversations
    await serviceSupabase.from('guest_conversations').insert([
      {
        id: conversationId1,
        session_hash: sessionHash1,
        title: 'Test Conversation 1',
      },
      {
        id: conversationId2,
        session_hash: sessionHash2,
        title: 'Test Conversation 2',
      },
    ]);

    // Create test messages for conversationId1
    await serviceSupabase.from('guest_messages').insert([
      {
        id: crypto.randomUUID(),
        guest_conversation_id: conversationId1,
        role: 'user',
        content: 'Test message 1',
        parts: [{ type: 'text', text: 'Test message 1' }],
      },
      {
        id: crypto.randomUUID(),
        guest_conversation_id: conversationId1,
        role: 'assistant',
        content: 'Test response 1',
        parts: [{ type: 'text', text: 'Test response 1' }],
      },
    ]);

    // Test 1: Guest user accessing their own conversation (should work)
    try {
      const accessCheck = await checkGuestConversationAccess(conversationId1, sessionHash1);
      if (accessCheck.exists && accessCheck.belongsToSession && !accessCheck.error) {
        results.push({ test: 'Guest accessing own conversation', passed: true });
      } else {
        results.push({
          test: 'Guest accessing own conversation',
          passed: false,
          error: `Expected exists: true, belongsToSession: true, got exists: ${accessCheck.exists}, belongsToSession: ${accessCheck.belongsToSession}, error: ${accessCheck.error}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Guest accessing own conversation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Guest user accessing other guest's conversation (should return belongsToSession: false)
    try {
      const accessCheck = await checkGuestConversationAccess(conversationId2, sessionHash1);
      if (accessCheck.exists && !accessCheck.belongsToSession && !accessCheck.error) {
        results.push({ test: 'Guest accessing other guest conversation', passed: true });
      } else {
        results.push({
          test: 'Guest accessing other guest conversation',
          passed: false,
          error: `Expected exists: true, belongsToSession: false, got exists: ${accessCheck.exists}, belongsToSession: ${accessCheck.belongsToSession}, error: ${accessCheck.error}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Guest accessing other guest conversation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Guest user accessing non-existent conversation (should return exists: false)
    try {
      const accessCheck = await checkGuestConversationAccess(conversationId3, sessionHash1);
      if (!accessCheck.exists && !accessCheck.belongsToSession && !accessCheck.error) {
        results.push({ test: 'Guest accessing non-existent conversation', passed: true });
      } else {
        results.push({
          test: 'Guest accessing non-existent conversation',
          passed: false,
          error: `Expected exists: false, belongsToSession: false, got exists: ${accessCheck.exists}, belongsToSession: ${accessCheck.belongsToSession}, error: ${accessCheck.error}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Guest accessing non-existent conversation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 4: Messages load correctly for guest conversations
    try {
      const { messages, hasMore, dbRowCount } = await getGuestMessagesServerSide(conversationId1, { limit: 50 });
      if (messages.length === 2 && !hasMore && dbRowCount === 2) {
        results.push({ test: 'Messages load correctly for guest conversations', passed: true });
      } else {
        results.push({
          test: 'Messages load correctly for guest conversations',
          passed: false,
          error: `Expected 2 messages, got ${messages.length}, hasMore: ${hasMore}, dbRowCount: ${dbRowCount}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Messages load correctly for guest conversations',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 5: Access check fails secure on database errors
    try {
      // Test with invalid conversation ID format (should handle gracefully)
      const accessCheck = await checkGuestConversationAccess('invalid-id', sessionHash1);
      // Should return error flag or exists: false (fail-secure)
      if (accessCheck.error || (!accessCheck.exists && !accessCheck.belongsToSession)) {
        results.push({ test: 'Access check fails secure on errors', passed: true });
      } else {
        results.push({
          test: 'Access check fails secure on errors',
          passed: false,
          error: 'Expected error flag or exists: false for invalid ID',
        });
      }
    } catch (error) {
      // If it throws, that's also acceptable (fail-secure)
      results.push({ test: 'Access check fails secure on errors', passed: true });
    }

    // Test 6: Message loading handles empty conversation
    try {
      // Create empty conversation
      const emptyConversationId = crypto.randomUUID();
      await serviceSupabase.from('guest_conversations').insert({
        id: emptyConversationId,
        session_hash: sessionHash1,
        title: 'Empty Conversation',
      });

      const { messages, hasMore, dbRowCount } = await getGuestMessagesServerSide(emptyConversationId, { limit: 50 });
      if (messages.length === 0 && !hasMore && dbRowCount === 0) {
        results.push({ test: 'Message loading handles empty conversation', passed: true });
      } else {
        results.push({
          test: 'Message loading handles empty conversation',
          passed: false,
          error: `Expected 0 messages, got ${messages.length}, hasMore: ${hasMore}, dbRowCount: ${dbRowCount}`,
        });
      }

      // Cleanup
      await serviceSupabase.from('guest_conversations').delete().eq('id', emptyConversationId);
    } catch (error) {
      results.push({
        test: 'Message loading handles empty conversation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Cleanup test data
    await serviceSupabase.from('guest_messages').delete().eq('guest_conversation_id', conversationId1);
    await serviceSupabase.from('guest_conversations').delete().in('id', [conversationId1, conversationId2]);

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;

    return NextResponse.json({
      phase: 'Phase 5: Conversation Page Access Control',
      summary: `${passedCount}/${totalCount} tests passed`,
      allPassed: passedCount === totalCount,
      results,
    });
  } catch (error) {
    logger.error('Error running Phase 5 verification tests', error);
    return NextResponse.json(
      {
        phase: 'Phase 5: Conversation Page Access Control',
        summary: 'Test execution failed',
        allPassed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

