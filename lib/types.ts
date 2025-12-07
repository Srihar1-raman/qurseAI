/**
 * Centralized Type Definitions
 * All shared types used across the application
 */

import type { UIMessagePart } from 'ai';

// ============================================
// User & Authentication Types
// ============================================

/**
 * Supabase user metadata structure
 * Based on OAuth provider responses (GitHub, Google, Twitter/X)
 */
export interface SupabaseUserMetadata {
  full_name?: string;
  name?: string;
  avatar_url?: string;
  [key: string]: unknown; // Allow other metadata fields from providers
}

export interface User {
  id?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  auto_save_conversations: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateLimit {
  id: string;
  user_id: string | null;
  resource_type: 'message' | 'api_call' | 'conversation';
  count: number;
  window_start: string;
  window_end: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  totalConversations: number;
  messagesThisMonth?: number;
  lastLoginAt?: string;
}

// ============================================
// Conversation & Message Types
// ============================================

export interface Message {
  id: string;
  text: string;
  content?: string; // Alternative field name used in some components
  isUser: boolean;
  role?: 'user' | 'assistant' | 'system' | 'tool';
  timestamp: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  completion_time?: number;
  created_at?: string;
}

// ============================================
// AI Streaming Types (NEW)
// ============================================

/**
 * Reasoning part of AI response
 * Contains the model's thinking process
 */
export interface ReasoningPart {
  type: 'reasoning';
  text: string;
  isComplete: boolean;
}

/**
 * Stream metadata for AI responses
 * Contains token usage and timing information
 */
export interface StreamMetadata {
  model: string;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  completionTime: number;
}

/**
 * Enhanced chat message for AI SDK streaming
 * Used with useChat hook and createUIMessageStream
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  metadata?: StreamMetadata;
  timestamp?: string;
}

/**
 * Message structure for useChat hook with parts
 * Uses AI SDK's native UIMessagePart type to support all part types
 * (text, reasoning, tool parts, step-start, dynamic-tool, etc.)
 */
export interface QurseMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: UIMessagePart[];
  metadata?: StreamMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  created_at?: string;
  message_count?: number;
  user_id?: string;
  model?: string;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}

// ============================================
// Model & AI Types
// ============================================

export interface Model {
  id: string;
  name: string;
  provider: string;
  imageSupport?: boolean;
  reasoningModel?: boolean;
  disabled?: boolean;
}

export interface ModelGroup {
  provider: string;
  enabled: boolean;
  models: Model[];
}

export interface SearchOption {
  name: string;
  enabled: boolean;
  icon: string;
}

// ============================================
// UI Component Prop Types
// ============================================

export interface ChatMessageProps {
  message: QurseMessage;
  isUser: boolean;
  model?: string;
  onRedo?: () => void | Promise<void>;
}

export interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  selectedWebSearchOption: string;
}

export interface WebSearchSelectorProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export interface ConversationItemProps {
  conversation: Conversation;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export interface ConversationListProps {
  groupedConversations: ConversationGroup[];
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isSidebarOpen: boolean;
}

export interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface HeaderProps {
  showNewChatButton?: boolean;
  onNewChatClick?: () => void;
  showHistoryButton?: boolean;
  onHistoryClick?: () => void;
  user?: User | null;
}

// ============================================
// Settings Types
// ============================================

export interface AccountSectionProps {
  user: User | null;
  userStats: UserStats;
  onSignOut: () => void;
  onClearChats: () => void;
  onDeleteAccount: () => void;
}

export interface GeneralSectionProps {
  autoSaveConversations: boolean;
  setAutoSaveConversations: (value: boolean) => void;
  language: string;
  setLanguage: (value: string) => void;
  user: User | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving: boolean;
  onSaveSettings: () => void;
}

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleteConfirmation: string;
  setDeleteConfirmation: (value: string) => void;
  isDeleting: boolean;
  userStats: UserStats;
}

export interface ClearChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isClearingChats: boolean;
  userStats: UserStats;
}

// ============================================
// Theme Types
// ============================================

export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

// ============================================
// Utility Types
// ============================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

