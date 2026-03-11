/**
 * POST /api/attachments/transcribe
 * Transcribes document attachments to text for AI processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { transcribeDocument, type TranscriptionResult } from '@/lib/services/transcription.service';
import type { Attachment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { lightweightUser } = await getUserData();

    if (!lightweightUser?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { attachment, attachmentId } = await request.json();

    if (!attachment) {
      return NextResponse.json(
        { error: 'No attachment provided' },
        { status: 400 }
      );
    }

    const result = await transcribeDocument(attachment as Attachment);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Transcription failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      attachmentId: attachment.id,
    });
  } catch (error) {
    console.error('[Transcription API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
