import { NextRequest, NextResponse } from 'next/server';
import { transferGuestToUser } from '@/lib/db/guest-transfer.server';
import { hmacSessionId } from '@/lib/utils/session-hash';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('test/phase6-verification');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase service credentials');
}

const serviceSupabase = createServiceClient(supabaseUrl, serviceKey);

/**
 * Phase 6 Verification Tests
 * Tests guest to user transfer functionality
 */
export async function GET(request: NextRequest) {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];

  try {
    // Setup: Create test data
    const sessionId = crypto.randomUUID();
    const sessionHash = hmacSessionId(sessionId);
    const testUserId = crypto.randomUUID();

    // Create test guest conversations and messages
    const conversationId1 = crypto.randomUUID();
    const conversationId2 = crypto.randomUUID();

    await serviceSupabase.from('guest_conversations').insert([
      {
        id: conversationId1,
        session_hash: sessionHash,
        title: 'Test Conversation 1',
      },
      {
        id: conversationId2,
        session_hash: sessionHash,
        title: 'Test Conversation 2',
      },
    ]);

    const messageId1 = crypto.randomUUID();
    const messageId2 = crypto.randomUUID();
    const messageId3 = crypto.randomUUID();

    await serviceSupabase.from('guest_messages').insert([
      {
        id: messageId1,
        guest_conversation_id: conversationId1,
        role: 'user',
        content: 'Test message 1',
        parts: [{ type: 'text', text: 'Test message 1' }],
      },
      {
        id: messageId2,
        guest_conversation_id: conversationId1,
        role: 'assistant',
        content: 'Test response 1',
        parts: [{ type: 'text', text: 'Test response 1' }],
      },
      {
        id: messageId3,
        guest_conversation_id: conversationId2,
        role: 'user',
        content: 'Test message 2',
        parts: [{ type: 'text', text: 'Test message 2' }],
      },
    ]);

    // Create test user in auth.users and users table
    // Note: In production, this is handled by the auth callback
    // For testing, we need to create the user in auth.users first (via Admin API)
    // Then create the profile in users table
    try {
      // Create user in auth.users using Admin API
      const { data: authUser, error: authError } = await serviceSupabase.auth.admin.createUser({
        id: testUserId,
        email: 'test@example.com',
        email_confirm: true,
        user_metadata: { name: 'Test User' },
      });
      
      if (authError && !authError.message.includes('already exists')) {
        logger.error('Error creating auth user', authError);
      }
      
      // Create user profile in users table
      const { error: userInsertError } = await serviceSupabase.from('users').insert({
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
      });
      
      if (userInsertError && userInsertError.code !== '23505') {
        // If not a duplicate key error, log it
        logger.error('Error creating user profile', userInsertError);
      }
    } catch (error) {
      logger.error('Error setting up test user', error);
      // Continue with test - might fail but we'll see the actual error
    }

    // Create test rate limit entry for guest
    await serviceSupabase.from('rate_limits').insert({
      user_id: null,
      session_hash: sessionHash,
      resource_type: 'message',
      count: 5,
      bucket_start: new Date().toISOString(),
      bucket_end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Test 1: Transfer function exists and is callable
    try {
      if (typeof transferGuestToUser === 'function') {
        results.push({ test: 'transferGuestToUser function exists', passed: true });
      } else {
        results.push({
          test: 'transferGuestToUser function exists',
          passed: false,
          error: 'transferGuestToUser is not a function',
        });
      }
    } catch (error) {
      results.push({
        test: 'transferGuestToUser function exists',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 2: Transfer guest data to user
    try {
      const transferResult = await transferGuestToUser(sessionHash, testUserId);

      if (
        transferResult.conversationsTransferred === 2 &&
        transferResult.messagesTransferred === 3 &&
        transferResult.rateLimitsTransferred === 1
      ) {
        results.push({ test: 'Transfer guest data to user', passed: true });
      } else {
        results.push({
          test: 'Transfer guest data to user',
          passed: false,
          error: `Expected 2 conversations, 3 messages, 1 rate limit. Got ${transferResult.conversationsTransferred} conversations, ${transferResult.messagesTransferred} messages, ${transferResult.rateLimitsTransferred} rate limits`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Transfer test failed', { error: errorMessage, stack: errorStack });
      results.push({
        test: 'Transfer guest data to user',
        passed: false,
        error: errorMessage,
      });
    }

    // Test 3: Verify conversations transferred to main table
    try {
      const { data: conversations, error: convError } = await serviceSupabase
        .from('conversations')
        .select('id, user_id')
        .in('id', [conversationId1, conversationId2])
        .eq('user_id', testUserId);

      if (convError) {
        results.push({
          test: 'Conversations transferred to main table',
          passed: false,
          error: `Database error: ${convError.message}`,
        });
      } else if (conversations && conversations.length === 2) {
        results.push({ test: 'Conversations transferred to main table', passed: true });
      } else {
        results.push({
          test: 'Conversations transferred to main table',
          passed: false,
          error: `Expected 2 conversations, got ${conversations?.length || 0}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Conversations transferred to main table',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 4: Verify messages transferred to main table
    try {
      const { data: messages, error: msgError } = await serviceSupabase
        .from('messages')
        .select('id, conversation_id')
        .in('id', [messageId1, messageId2, messageId3]);

      if (msgError) {
        results.push({
          test: 'Messages transferred to main table',
          passed: false,
          error: `Database error: ${msgError.message}`,
        });
      } else if (messages && messages.length === 3) {
        // Verify messages point to correct conversations
        const conv1Messages = messages.filter((m) => m.conversation_id === conversationId1);
        const conv2Messages = messages.filter((m) => m.conversation_id === conversationId2);
        if (conv1Messages.length === 2 && conv2Messages.length === 1) {
          results.push({ test: 'Messages transferred to main table', passed: true });
        } else {
          results.push({
            test: 'Messages transferred to main table',
            passed: false,
            error: `Message conversation mapping incorrect. Conv1: ${conv1Messages.length}, Conv2: ${conv2Messages.length}`,
          });
        }
      } else {
        results.push({
          test: 'Messages transferred to main table',
          passed: false,
          error: `Expected 3 messages, got ${messages?.length || 0}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Messages transferred to main table',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 5: Verify rate limits transferred to user
    try {
      const { data: rateLimits, error: rlError } = await serviceSupabase
        .from('rate_limits')
        .select('user_id, session_hash')
        .eq('user_id', testUserId)
        .is('session_hash', null);

      if (rlError) {
        results.push({
          test: 'Rate limits transferred to user',
          passed: false,
          error: `Database error: ${rlError.message}`,
        });
      } else if (rateLimits && rateLimits.length >= 1) {
        results.push({ test: 'Rate limits transferred to user', passed: true });
      } else {
        results.push({
          test: 'Rate limits transferred to user',
          passed: false,
          error: `Expected at least 1 rate limit, got ${rateLimits?.length || 0}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Rate limits transferred to user',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 6: Verify guest data cleaned up
    try {
      const { data: guestConversations, error: gcError } = await serviceSupabase
        .from('guest_conversations')
        .select('id')
        .eq('session_hash', sessionHash);

      if (gcError) {
        results.push({
          test: 'Guest data cleaned up after transfer',
          passed: false,
          error: `Database error: ${gcError.message}`,
        });
      } else if (guestConversations && guestConversations.length === 0) {
        results.push({ test: 'Guest data cleaned up after transfer', passed: true });
      } else {
        results.push({
          test: 'Guest data cleaned up after transfer',
          passed: false,
          error: `Expected 0 guest conversations, got ${guestConversations?.length || 0}`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Guest data cleaned up after transfer',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 7: Transfer with no guest data (should not error)
    try {
      const emptySessionHash = hmacSessionId(crypto.randomUUID());
      const transferResult = await transferGuestToUser(emptySessionHash, testUserId);

      if (
        transferResult.conversationsTransferred === 0 &&
        transferResult.messagesTransferred === 0 &&
        transferResult.rateLimitsTransferred === 0
      ) {
        results.push({ test: 'Transfer with no guest data (no error)', passed: true });
      } else {
        results.push({
          test: 'Transfer with no guest data (no error)',
          passed: false,
          error: `Expected all zeros, got ${transferResult.conversationsTransferred} conversations, ${transferResult.messagesTransferred} messages, ${transferResult.rateLimitsTransferred} rate limits`,
        });
      }
    } catch (error) {
      results.push({
        test: 'Transfer with no guest data (no error)',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 8: Transfer handles ID conflicts (skip on conflict)
    try {
      // Create a conversation that already exists for the user (ID conflict)
      const conflictConversationId = crypto.randomUUID();
      
      // First, create it in main conversations table
      await serviceSupabase.from('conversations').insert({
        id: conflictConversationId,
        user_id: testUserId,
        title: 'Existing Conversation',
      });

      // Then create it in guest_conversations
      await serviceSupabase.from('guest_conversations').insert({
        id: conflictConversationId,
        session_hash: sessionHash,
        title: 'Guest Conversation',
      });

      // Transfer should skip the conflict and continue
      const conflictSessionHash = hmacSessionId(crypto.randomUUID());
      await serviceSupabase.from('guest_conversations').insert({
        id: conflictConversationId,
        session_hash: conflictSessionHash,
        title: 'Guest Conversation',
      });

      const transferResult = await transferGuestToUser(conflictSessionHash, testUserId);

      // Should complete without error (conflict skipped)
      if (transferResult.conversationsTransferred === 0) {
        // Conflict was skipped (ON CONFLICT DO NOTHING)
        results.push({ test: 'Transfer handles ID conflicts (skip on conflict)', passed: true });
      } else {
        results.push({
          test: 'Transfer handles ID conflicts (skip on conflict)',
          passed: false,
          error: `Expected 0 conversations (conflict skipped), got ${transferResult.conversationsTransferred}`,
        });
      }

      // Cleanup
      await serviceSupabase.from('conversations').delete().eq('id', conflictConversationId);
      await serviceSupabase.from('guest_conversations').delete().eq('session_hash', conflictSessionHash);
    } catch (error) {
      results.push({
        test: 'Transfer handles ID conflicts (skip on conflict)',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Cleanup test data
    await serviceSupabase.from('messages').delete().in('id', [messageId1, messageId2, messageId3]);
    await serviceSupabase.from('conversations').delete().in('id', [conversationId1, conversationId2]);
    await serviceSupabase.from('rate_limits').delete().eq('user_id', testUserId);
    await serviceSupabase.from('users').delete().eq('id', testUserId);

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;

    return NextResponse.json({
      phase: 'Phase 6: Message Persistence',
      summary: `${passedCount}/${totalCount} tests passed`,
      allPassed: passedCount === totalCount,
      results,
    });
  } catch (error) {
    logger.error('Error running Phase 6 verification tests', error);
    return NextResponse.json(
      {
        phase: 'Phase 6: Message Persistence',
        summary: 'Test execution failed',
        allPassed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}
