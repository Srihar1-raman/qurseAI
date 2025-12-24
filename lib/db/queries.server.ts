/**
 * Server-Side Database Queries
 * ONLY for use in Server Components and Server Actions
 * Uses Supabase server client
 * 
 * This file re-exports all server-side queries from domain-specific modules
 * for backward compatibility. Import from here or directly from domain modules.
 */

// Re-export all queries from domain-specific modules
export {
  getMessagesServerSide,
  saveUserMessageServerSide,
} from './messages.server';

export {
  ensureConversationServerSide,
  updateConversationTitle,
  getConversationCountServerSide,
  checkConversationAccess,
  clearAllConversationsServerSide,
  getConversationTitleById,
} from './conversations.server';

export {
  ensureGuestConversation,
  checkGuestConversationAccess,
  getGuestConversationTitleById,
} from './guest-conversations.server';

export {
  getGuestMessagesServerSide,
  saveGuestMessage,
  getGuestMessageCount,
} from './guest-messages.server';

export {
  updateUserProfileServerSide,
  deleteUserAccountServerSide,
} from './users.server';

export {
  getUserPreferencesServerSide,
  updateUserPreferencesServerSide,
} from './preferences.server';

export {
  getUserSubscriptionServerSide,
  updateSubscriptionServerSide,
} from './subscriptions.server';
