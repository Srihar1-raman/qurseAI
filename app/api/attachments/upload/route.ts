/**
 * POST /api/attachments/upload
 * Upload a file attachment to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/supabase/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { uploadAttachmentServer, validateFile } from '@/lib/services/attachment.service';
import { createScopedLogger } from '@/lib/utils/logger';
import { ATTACHMENT_LIMITS } from '@/lib/types';

const logger = createScopedLogger('api/attachments/upload');

export async function POST(request: NextRequest) {
  try {
    const { lightweightUser } = await getUserData();

    if (!lightweightUser?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const supabaseClient = await createClient();
    const result = await uploadAttachmentServer(file, lightweightUser.userId, supabaseClient);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
    });
  } catch (error) {
    logger.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to upload files',
    limits: {
      maxFileSize: ATTACHMENT_LIMITS.MAX_FILE_SIZE,
      maxFilesPerMessage: ATTACHMENT_LIMITS.MAX_FILES_PER_MESSAGE,
    },
  });
}
