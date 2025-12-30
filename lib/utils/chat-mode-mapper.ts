/**
 * Chat Mode Mapper Utility
 * Maps UI display names to internal chat mode IDs
 */

export interface ChatModeMapping {
  displayName: string;
  modeId: string;
}

/**
 * Map UI display names to internal chat mode IDs
 * @param displayName - Display name from UI (e.g., 'Web Search (Exa)')
 * @returns Internal mode ID (e.g., 'web')
 */
export function mapDisplayNameToModeId(displayName: string): string {
  const mappings: Record<string, string> = {
    'Chat': 'chat',
    'Web Search (Exa)': 'web',
    'Academic': 'academic',
  };

  return mappings[displayName] || 'chat'; // Default to 'chat'
}

/**
 * Get all available chat mode IDs
 * @returns Array of mode IDs
 */
export function getAvailableChatModes(): string[] {
  return ['chat', 'web', 'academic'];
}

/**
 * Check if a chat mode exists
 * @param modeId - Chat mode ID to check
 * @returns True if mode exists
 */
export function isValidChatMode(modeId: string): boolean {
  return getAvailableChatModes().includes(modeId);
}

/**
 * Map internal mode ID to display name
 * @param modeId - Internal mode ID (e.g., 'web')
 * @returns Display name for UI (e.g., 'Web Search (Exa)')
 */
export function mapModeIdToDisplayName(modeId: string): string {
  const mappings: Record<string, string> = {
    'chat': 'Chat',
    'web': 'Web Search (Exa)',
    'academic': 'Academic',
  };

  return mappings[modeId] || 'Chat';
}
