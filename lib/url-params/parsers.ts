/**
 * Centralized URL parameter parsers
 * Ensures type safety and consistency across the app
 */

import { parseAsString, parseAsInteger, parseAsBoolean } from 'nuqs';

// String parsers
export const conversationIdParser = parseAsString;
export const modelParser = parseAsString;
export const messageParser = parseAsString;
export const modeParser = parseAsString;
export const callbackUrlParser = parseAsString;
export const shareTokenParser = parseAsString;
export const sectionParser = parseAsString; // For /info?section=terms

// Integer parsers (if needed in future)
export const pageParser = parseAsInteger.withDefault(1);
export const limitParser = parseAsInteger.withDefault(50);

// Boolean parsers (if needed in future)
export const debugParser = parseAsBoolean.withDefault(false);

// Custom parsers with defaults (if needed)
// Note: parseAsString returns null if param doesn't exist, so no need for .withDefault(null)
export const modelWithDefault = parseAsString.withDefault('gpt-4');

