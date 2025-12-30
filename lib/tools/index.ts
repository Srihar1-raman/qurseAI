/**
 * Tool System Exports
 * Central export point for all tool-related functionality
 */

// ============================================
// TOOL IMPORTS - Side effect registration
// ============================================
// Import tool files to trigger their self-registration
import './web-search';
import './academic-search';

export {
  registerTool,
  getTool,
  getToolsByIds,
  getAllTools,
  toolExists,
  getToolCount,
} from './registry';

// ============================================
// Export search infrastructure
// ============================================

export {
  ExaSearchStrategy,
  TavilySearchStrategy,
  createSearchStrategy,
  getDefaultProvider,
} from './search/factory';
export type {
  SearchStrategy,
  SearchResults,
  SearchParams,
  AcademicSearchParams,
} from './search/types';

