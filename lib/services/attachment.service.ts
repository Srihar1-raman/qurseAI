/**
 * Attachment Service
 * Handles file uploads to Supabase Storage
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { Attachment } from '@/lib/types';
import { ATTACHMENT_LIMITS, ALLOWED_EXTENSIONS } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'user-attachments';

export interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
  contentType?: string;
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS[ext] || 'application/octet-stream';
}

export function validateFile(file: File): AttachmentValidationResult {
  const contentType = file.type || getContentType(file.name);

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExt = Object.keys(ALLOWED_EXTENSIONS);

  if (!allowedExt.includes(ext)) {
    return {
      valid: false,
      error: `File type .${ext} is not allowed. Allowed types: ${allowedExt.join(', ')}`,
    };
  }

  if (file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${ATTACHMENT_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  return {
    valid: true,
    contentType,
  };
}

export async function uploadAttachment(
  file: File,
  userId: string
): Promise<UploadResult> {
  const supabase = createBrowserClient();

  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const fileId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${fileId}.${ext}`;
  const storagePath = `${userId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: validation.contentType,
    });

  if (error) {
    console.error('[Attachment Service] Upload error:', error);
    return { success: false, error: error.message };
  }

  const signedUrlData = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600);

  const signedUrl = (signedUrlData as any)?.data?.signedUrl;

  if (!signedUrl) {
    return { success: false, error: 'Failed to generate signed URL' };
  }

  const attachment: Attachment = {
    id: fileId,
    filename,
    originalName: file.name,
    contentType: validation.contentType || file.type,
    size: file.size,
    url: signedUrl,
    uploadedAt: new Date().toISOString(),
  };

  return { success: true, attachment };
}

export async function uploadAttachmentServer(
  file: File,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const fileId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${fileId}.${ext}`;
  const storagePath = `${userId}/${filename}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: validation.contentType,
    });

  if (error) {
    console.error('[Attachment Service] Upload error:', error);
    return { success: false, error: error.message };
  }

  const signedUrlData = await supabaseClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600);

  const signedUrl = (signedUrlData as any)?.data?.signedUrl;

  if (!signedUrl) {
    return { success: false, error: 'Failed to generate signed URL' };
  }

  const attachment: Attachment = {
    id: fileId,
    filename,
    originalName: file.name,
    contentType: validation.contentType || file.type,
    size: file.size,
    url: signedUrl,
    uploadedAt: new Date().toISOString(),
  };

  return { success: true, attachment };
}

export async function deleteAttachment(
  attachment: Attachment,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient();
  const storagePath = `${userId}/${attachment.filename}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error('[Attachment Service] Delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function getAttachmentIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'file-pdf';
  if (contentType.includes('word') || contentType.includes('document')) return 'file-doc';
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv') return 'file-spreadsheet';
  if (contentType === 'text/plain' || contentType === 'text/markdown') return 'file-text';
  return 'file';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

export function isPdf(contentType: string): boolean {
  return contentType === 'application/pdf';
}
