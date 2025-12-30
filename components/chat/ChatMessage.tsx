'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-provider';
import Image from 'next/image';
import MarkdownRenderer from '@/components/markdown';
import { getIconPath } from '@/lib/icon-utils';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolCallCard } from './ToolCallCard';
import { WebSearchResult } from './WebSearchResult';
import { AcademicSearchResult } from './AcademicSearchResult';
import type { ChatMessageProps } from '@/lib/types';

interface ToolExecution {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'loading' | 'complete' | 'error';
}

// Helper function to check if result has search results
function hasSearchResults(result: unknown): result is {
  results: Array<{
    index: number;
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
    author?: string;
  }>;
  provider: 'exa' | 'tavily';
} {
  return (
    typeof result === 'object' &&
    result !== null &&
    'results' in result &&
    Array.isArray((result as Record<string, unknown>).results) &&
    'provider' in result
  );
}

function ChatMessageComponent({ message, isUser, onRedo, onShare, user, isStreaming = false }: ChatMessageProps) {
  const { resolvedTheme, mounted } = useTheme();

  // Extract text content from message parts
  const content = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');

  // Extract reasoning from message parts
  const reasoning = message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('\n\n') || null;

  // Extract tool calls and results
  const toolExecutions = React.useMemo(() => {
    const executions: ToolExecution[] = [];

    // Find all tool-call parts using type guard
    const toolCalls = message.parts.filter((p) => {
      return p.type === 'tool-call' ||
             (typeof p.type === 'string' && p.type.startsWith('tool-'));
    }) as Array<{
      type: string;
      toolCallId?: string;
      toolName?: string;
      args?: Record<string, unknown>;
    }>;

    // Match each tool call with its result
    for (const call of toolCalls) {
      if (!call.toolCallId || !call.toolName) continue;

      const resultPart = message.parts.find((p) => {
        return (p.type === 'tool-result' ||
                typeof p.type === 'string' && p.type.startsWith('tool-')) &&
               'toolCallId' in p &&
               p.toolCallId === call.toolCallId;
      }) as {
        toolCallId: string;
        result?: unknown;
      } | undefined;

      let result: unknown;
      let status: 'loading' | 'complete' | 'error' = 'loading';

      if (resultPart?.result) {
        result = resultPart.result;

        // Check if result is an error
        if (result && typeof result === 'object' && 'error' in result) {
          status = 'error';
        } else {
          status = 'complete';
        }
      }

      executions.push({
        toolName: call.toolName,
        toolCallId: call.toolCallId,
        args: call.args || {},
        result,
        status: isStreaming ? 'loading' : status,
      });
    }

    return executions;
  }, [message.parts, isStreaming]);

  // Check if message contains stop text and split it
  const stopTextPattern = '*User stopped this message here*';
  const hasStopText = content.includes(stopTextPattern);
  let mainContent = content;
  if (hasStopText) {
    // Split on the pattern and take everything before it as main content
    const parts = content.split(stopTextPattern);
    mainContent = parts[0].trimEnd(); // Remove trailing whitespace/newlines
  }

  const copyToClipboard = React.useCallback(() => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  }, [content]);

  // Only show buttons for assistant messages after streaming ends and message has content
  const shouldShowActions = !isUser && !isStreaming && content.trim().length > 0;

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div style={{ maxWidth: '95%', marginLeft: isUser ? 'auto' : 0, marginRight: isUser ? 0 : 'auto' }}>
        {/* Reasoning section (for assistant messages only) */}
        {!isUser && reasoning && (
          <ReasoningBlock
            reasoning={reasoning}
            isStreaming={isStreaming}
          />
        )}

        {/* Tool execution UI (for assistant messages only) */}
        {!isUser && toolExecutions.length > 0 && (
          <div className="tool-executions">
            {toolExecutions.map((execution) => (
              <React.Fragment key={execution.toolCallId}>
                <ToolCallCard
                  toolName={execution.toolName}
                  status={execution.status}
                  resultCount={
                    hasSearchResults(execution.result)
                      ? execution.result.results.length
                      : undefined
                  }
                  error={
                    execution.result && typeof execution.result === 'object' && 'error' in execution.result
                      ? String((execution.result as { error?: string }).error)
                      : undefined
                  }
                />
                {execution.status === 'complete' && hasSearchResults(execution.result) && (
                  <>
                    {execution.toolName === 'web_search' && (
                      <WebSearchResult
                        query={execution.args.query as string}
                        results={execution.result.results}
                        provider={execution.result.provider}
                      />
                    )}
                    {execution.toolName === 'academic_search' && (
                      <AcademicSearchResult
                        query={execution.args.query as string}
                        results={execution.result.results}
                        provider={execution.result.provider}
                      />
                    )}
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Main message content */}
        <div className="message-content">
          {isUser ? (
            <MarkdownRenderer content={content} isUserMessage={true} isStreaming={false} />
          ) : (
            <>
              <MarkdownRenderer content={mainContent} isUserMessage={false} isStreaming={isStreaming} />
              {hasStopText && (
                <div style={{ marginTop: '12px' }}>
                  <span className="stop-message-indicator">
                    User stopped this message here
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        
        {shouldShowActions && (
          <div className="message-actions">
            <button onClick={copyToClipboard} className="action-btn" title="Copy message">
              <Image src={getIconPath('copy', resolvedTheme, false, mounted)} alt="Copy" width={16} height={16} className="icon" />
            </button>
            {onShare && (
              <button 
                onClick={async () => {
                  try {
                    await onShare();
                  } catch {
                    // Silently handle error
                  }
                }} 
                className="action-btn" 
                title="Share conversation"
              >
                <Image src={getIconPath('share', resolvedTheme, false, mounted)} alt="Share" width={16} height={16} className="icon" />
              </button>
            )}
            {onRedo && (
              <button 
                onClick={async () => {
                  try {
                    await onRedo();
                  } catch {
                    // Silently handle error
                  }
                }} 
                className="action-btn" 
                title="Regenerate response"
              >
                <Image src={getIconPath('redo', resolvedTheme, false, mounted)} alt="Redo" width={16} height={16} className="icon" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize component to prevent re-renders of unchanged messages during streaming
// CRITICAL: When streaming updates last message, other messages shouldn't re-render
export default React.memo(ChatMessageComponent, (prevProps, nextProps) => {
  // Quick check: if IDs don't match, definitely re-render
  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }
  
  // Quick check: if isUser changed, re-render
  if (prevProps.isUser !== nextProps.isUser) {
    return false;
  }
  
  // Quick check: if parts array length changed, content definitely changed
  if (prevProps.message.parts.length !== nextProps.message.parts.length) {
    return false;
  }
  
  // Only re-render if message content actually changed
  const prevContent = prevProps.message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
  const nextContent = nextProps.message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');

  const prevReasoning = prevProps.message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('');
  const nextReasoning = nextProps.message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('');

  // Compare tool parts
  const prevToolParts = prevProps.message.parts.filter(p =>
    p.type === 'tool-call' || p.type === 'tool-result'
  );
  const nextToolParts = nextProps.message.parts.filter(p =>
    p.type === 'tool-call' || p.type === 'tool-result'
  );

  // Check if streaming status changed
  if (prevProps.isStreaming !== nextProps.isStreaming) {
    return false; // Re-render if streaming status changes
  }

  // Return true if props are EQUAL (skip re-render), false if different (re-render)
  return (
    prevContent === nextContent &&
    prevReasoning === nextReasoning &&
    prevToolParts.length === nextToolParts.length
  );
});

