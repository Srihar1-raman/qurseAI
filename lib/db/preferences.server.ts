/**
 * Server-Side User Preferences Queries
 * User preferences database operations
 */

import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';
import type { UserPreferences } from '@/lib/types';

const logger = createScopedLogger('db/preferences.server');

/**
 * Get user preferences (server-side)
 * Returns default preferences if user has none
 */
export async function getUserPreferencesServerSide(
  userId: string
): Promise<UserPreferences> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const userMessage = handleDbError(error, 'db/preferences.server/getUserPreferencesServerSide');
    logger.error('Error fetching user preferences', error, { userId });
    const dbError = new Error(userMessage);
    throw dbError;
  }

  // Return defaults if no preferences exist
  if (!data) {
    return {
      user_id: userId,
      theme: 'auto',
      language: 'English',
      auto_save_conversations: true,
      custom_prompt: null,
      default_model: 'openai/gpt-oss-120b',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    user_id: data.user_id,
    theme: data.theme as 'light' | 'dark' | 'auto',
    language: data.language,
    auto_save_conversations: data.auto_save_conversations,
    custom_prompt: data.custom_prompt,
    default_model: data.default_model,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Update user preferences (server-side)
 * Creates preferences if they don't exist
 */
export async function updateUserPreferencesServerSide(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  const supabase = await createClient();

  // Check if preferences exist
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Update existing preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/preferences.server/updateUserPreferencesServerSide');
      logger.error('Error updating user preferences', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      user_id: data.user_id,
      theme: data.theme as 'light' | 'dark' | 'auto',
      language: data.language,
      auto_save_conversations: data.auto_save_conversations,
      custom_prompt: data.custom_prompt,
      default_model: data.default_model,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } else {
    // Create new preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        theme: preferences.theme ?? 'auto',
        language: preferences.language ?? 'English',
        auto_save_conversations: preferences.auto_save_conversations ?? true,
        custom_prompt: preferences.custom_prompt ?? null,
        default_model: preferences.default_model ?? 'openai/gpt-oss-120b',
      })
      .select()
      .single();

    if (error) {
      const userMessage = handleDbError(error, 'db/preferences.server/updateUserPreferencesServerSide');
      logger.error('Error creating user preferences', error, { userId });
      const dbError = new Error(userMessage);
      throw dbError;
    }

    return {
      user_id: data.user_id,
      theme: data.theme as 'light' | 'dark' | 'auto',
      language: data.language,
      auto_save_conversations: data.auto_save_conversations,
      custom_prompt: data.custom_prompt,
      default_model: data.default_model,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}

