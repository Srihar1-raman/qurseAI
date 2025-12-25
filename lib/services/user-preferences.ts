/**
 * User Preferences Service
 * Business logic for managing user preferences
 */

import {
  getUserPreferencesServerSide,
  updateUserPreferencesServerSide,
} from '@/lib/db/queries.server';
import { createScopedLogger } from '@/lib/utils/logger';
import type { UserPreferences } from '@/lib/types';

const logger = createScopedLogger('services/user-preferences');

/**
 * Default user preferences
 */
const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'auto',
  language: 'English',
  auto_save_conversations: true,
  custom_prompt: null,
  default_model: 'openai/gpt-oss-120b',
};

/**
 * Get user preferences with defaults
 * @param userId - User ID
 * @returns User preferences (with defaults if none exist)
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    return await getUserPreferencesServerSide(userId);
  } catch (error) {
    logger.error('Error getting user preferences', error, { userId });
    // Return defaults on error
    return {
      user_id: userId,
      ...DEFAULT_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Update user preferences
 * @param userId - User ID
 * @param preferences - Partial preferences to update
 * @returns Updated preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  try {
    // Validate theme
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      throw new Error('Invalid theme value');
    }

    // Validate language (basic check - not empty)
    if (preferences.language !== undefined && !preferences.language.trim()) {
      throw new Error('Language cannot be empty');
    }

    // Validate custom_prompt (check length if provided)
    if (preferences.custom_prompt !== undefined && preferences.custom_prompt !== null) {
      const trimmed = preferences.custom_prompt.trim();
      if (trimmed.length > 5000) {
        throw new Error('Custom prompt cannot exceed 5000 characters');
      }
      // Store trimmed version
      preferences.custom_prompt = trimmed;
    }

    return await updateUserPreferencesServerSide(userId, preferences);
  } catch (error) {
    logger.error('Error updating user preferences', error, { userId });
    throw error;
  }
}

/**
 * Get default preferences
 * @returns Default preferences object
 */
export function getDefaultPreferences(): Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> {
  return { ...DEFAULT_PREFERENCES };
}

