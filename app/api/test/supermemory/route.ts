/**
 * Test Supermemory API
 * Verify API key and basic functionality
 */

import { NextResponse } from 'next/server';
import { isSupermemoryConfigured } from '@/lib/services/supermemory.service';
import Supermemory from 'supermemory';

export async function GET() {
  try {
    // Check if API key is configured
    const configured = isSupermemoryConfigured();

    if (!configured) {
      return NextResponse.json({
        success: false,
        error: 'SUPERMEMORY_API_KEY not found in environment',
      });
    }

    // Try to create client and make a simple API call
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY,
    });

    // Test: Try to fetch profile (will return empty for test user)
    const testUserId = 'test_verification';
    try {
      const profile = await client.profile({
        containerTag: testUserId,
      });

      // Test: Try to add a test memory
      await client.add({
        content: 'Test: Supermemory integration is working',
        containerTag: testUserId,
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Supermemory API is working',
        profile: {
          static: profile.profile.static,
          dynamic: profile.profile.dynamic,
        },
      });
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        error: 'API call failed',
        details: (apiError as Error).message,
        stack: (apiError as Error).stack,
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize Supermemory client',
      details: (error as Error).message,
    });
  }
}
