/**
 * Tool Registry System
 * Centralized management of AI tools (functions the AI can call)
 */

/**
 * Generic tool type for AI SDK tools
 * Tools are created using the `tool()` function from the AI SDK
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AITool = any;

/**
 * Tool Registry
 * Internal storage for all registered tools
 */
const toolRegistry = new Map<string, AITool>();

/**
 * Register a new tool
 * @param id - Unique tool identifier (e.g., 'web_search')
 * @param tool - AI SDK tool definition
 */
export function registerTool(id: string, tool: AITool): void {
  toolRegistry.set(id, tool);
}

/**
 * Get a tool by ID
 * @param id - Tool identifier
 * @returns Tool definition or undefined if not found
 */
export function getTool(id: string): AITool | undefined {
  return toolRegistry.get(id);
}

/**
 * Get multiple tools by their IDs
 * Used by chat modes to get their enabled tools
 * @param ids - Array of tool identifiers
 * @returns Record of tool ID to tool definition
 */
export function getToolsByIds(ids: string[]): Record<string, AITool> {
  const tools: Record<string, AITool> = {};
  
  ids.forEach((id) => {
    const tool = getTool(id);
    if (tool) {
      tools[id] = tool;
    }
  });
  
  return tools;
}

/**
 * Get all registered tools
 * @returns Record of all tools
 */
export function getAllTools(): Record<string, AITool> {
  const tools: Record<string, AITool> = {};
  
  toolRegistry.forEach((tool, id) => {
    tools[id] = tool;
  });
  
  return tools;
}

/**
 * Check if a tool exists
 * @param id - Tool identifier
 * @returns True if tool is registered
 */
export function toolExists(id: string): boolean {
  return toolRegistry.has(id);
}

/**
 * Get count of registered tools
 * @returns Number of registered tools
 */
export function getToolCount(): number {
  return toolRegistry.size;
}

// ============================================
// FUTURE: Register tools here or in separate files
// ============================================

/*
Example tool registration:

import { tool } from 'ai';
import { z } from 'zod';

registerTool('web_search', tool({
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    // Search implementation
    return { results: [] };
  },
}));
*/

