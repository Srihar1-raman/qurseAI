/**
 * Attachment Service
 * Handles file uploads to Supabase Storage
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Attachment, ALLOWED_EXTENSIONS } from '@/lib/types';
import { ATTACHMENT_LIMITS, ALLOWED_EXTENSIONS as ALLOWED_EXT } from '@/lib/types';

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
  return ALLOWED_EXT[ext] || 'application/octet-stream';
}

export function validateFile(file: File): AttachmentValidationResult {
  const contentType = file.type || getContentType(file.name);

  const allowedTypes = [
    ...Object.values(ATTACHMENT_LIMITS).reduce<string[]>((acc, val) => acc, []),
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/json',
    'text/html',
    'application/xml',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExt = Object.keys(ALLOWED_EXT);

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

  const { data, error } = await supabase.storage
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

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const attachment: Attachment = {
    id: fileId,
    filename,
    originalName: file.name,
    contentType: validation.contentType || file.type,
    size: file.size,
    url: urlData.publicUrl,
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
