/**
 * Client-Side Preference Queries
 * User preference-related database operations for client-side use
 */

import { createClient } from '@/lib/supabase/client';
import type { UserPreferences } from '@/lib/types';
import { createScopedLogger } from '@/lib/utils/logger';
import { handleDbError } from '@/lib/utils/error-handler';

const logger = createScopedLogger('db/preferences');

/**
 * Get user preferences (client-side)
 * Returns default preferences if user has none
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const userMessage = handleDbError(error, 'db/preferences/getUserPreferences');
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
 * Update user preferences (client-side)
 * Creates preferences if they don't exist
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  const supabase = createClient();

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
      const userMessage = handleDbError(error, 'db/preferences/updateUserPreferences');
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
      const userMessage = handleDbError(error, 'db/preferences/updateUserPreferences');
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

