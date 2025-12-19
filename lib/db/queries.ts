/**
 * Database Query Helper Functions
 * 
 * @deprecated Import from domain-specific files instead:
 * - @/lib/db/conversations - Conversation operations
 * - @/lib/db/messages - Message operations
 * - @/lib/db/preferences - User preference operations
 * - @/lib/db/users - User profile operations
 * - @/lib/db/auth - Authentication operations
 * 
 * This file is kept for backward compatibility and re-exports all functions.
 * New code should import directly from domain-specific files.
 */

// Re-export all queries from domain-specific modules for backward compatibility

// Conversations
export {
  getConversations,
  getGuestConversations,
  getConversationCount,
  searchConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  deleteAllConversations,
} from './conversations';

// Messages
export {
  getOlderMessages,
} from './messages';

// Preferences
export {
  getUserPreferences,
  updateUserPreferences,
} from './preferences';

// Users
export {
  updateUserProfile,
} from './users';

// Auth
export {
  getUserLinkedProviders,
} from './auth';
