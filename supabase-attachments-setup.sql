-- ============================================
-- QURSE ATTACHMENTS SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add attachments column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Add attachments column to guest_messages table  
ALTER TABLE public.guest_messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 3. Create index for faster queries on attachments
CREATE INDEX IF NOT EXISTS idx_messages_attachments 
ON public.messages (conversation_id) 
WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb;

-- ============================================
-- STORAGE SETUP (Do in Storage UI)
-- ============================================
-- 
-- Go to Storage > Buckets > New Bucket
-- 
-- Settings:
--   - Name: user-attachments
--   - Public: OFF (private bucket)
--   - File size limit: 10MB (10485760 bytes)
--   - Allowed file types: 
--     jpg, jpeg, png, gif, webp, svg,
--     pdf, doc, docx, txt, md, 
--     xlsx, xls, csv, json, xml, html
--
-- After creating bucket, add these RLS policies:
-- ============================================

-- Policy 1: Users can access their own folder
-- CREATE POLICY "Users can access own folder" ON storage.objects
-- FOR ALL
-- USING (
--   bucket_id = 'user-attachments' 
--   AND (storage.foldername(name))[1] = COALESCE(auth.jwt() ->> 'sub', '')
-- );

-- Policy 2: Users can upload to their own folder
-- CREATE POLICY "Users can upload to own folder" ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'user-attachments' 
--   AND (storage.foldername(name))[1] = COALESCE(auth.jwt() ->> 'sub', '')
-- );

-- Policy 3: Users can delete their own files
-- CREATE POLICY "Users can delete own files" ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'user-attachments' 
--   AND (storage.foldername(name))[1] = COALESCE(auth.jwt() ->> 'sub', '')
-- );
