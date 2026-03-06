'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-provider';
import { Icon } from '@/components/icons';
import MarkdownRenderer from '@/components/markdown';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { WebSearchResults } from './WebSearchResults';
import { WeatherCard } from './WeatherCard';
import { StockCard } from './StockCard';
import { StockChart } from './StockChart';
import { CompanyInfoCard } from './CompanyInfoCard';
import { isToolUIPart } from 'ai';
import type { ChatMessageProps } from '@/lib/types';

interface ToolExecution {
  toolName: string;
  toolCallId: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: 'loading' | 'complete' | 'error';
  state?: string;
}

function ChatMessageComponent({ message, isUser, onRedo, onShare, user, isStreaming = false, reasoningTime }: ChatMessageProps) {
  const { resolvedTheme, mounted } = useTheme();

  // DEBUG: Log all parts to see what we're getting
  if (!isUser && message.parts.length > 0) {
    console.log('[ChatMessage] Assistant message parts:', {
      messageId: message.id,
      partsCount: message.parts.length,
      parts: message.parts.map(p => ({ type: p.type, hasData: Object.keys(p).length > 1 })),
    });
  }

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

  // Extract tool executions using AI SDK's isToolUIPart
  const toolExecutions = React.useMemo(() => {
    const executions: ToolExecution[] = [];
    const toolParts = message.parts.filter(isToolUIPart);

    for (const part of toolParts) {
      const toolName = (part as { type: string }).type.replace('tool-', '');
      const toolCallId = 'toolCallId' in part ? (part.toolCallId as string) : (part as { type: string }).type;
      const state = 'state' in part ? (part.state as string) : undefined;
      const input = 'input' in part ? (part.input as Record<string, unknown>) : {};
      const output = 'output' in part ? part.output : undefined;

      let status: 'loading' | 'complete' | 'error' = 'loading';

      if (state === 'output-available') {
        if (output && typeof output === 'object' && 'error' in output) {
          status = 'error';
        } else {
          status = 'complete';
        }
      } else if (state === 'input-streaming') {
        status = 'loading';
      }

      executions.push({
        toolName,
        toolCallId,
        args: input,
        result: output,
        status: isStreaming && status === 'complete' ? 'loading' : status,
        state,
      });
    }

    return executions;
  }, [message.parts, isStreaming]);

  // Separate web_search executions from other tools
  const webSearchExecutions = React.useMemo(() => {
    type ToolCallResultWithResults = { results: { title: string; url: string; text: string; publishedDate?: string | null; images: { url: string; alt?: string }[] }[] };

    return toolExecutions
      .filter(e => e.toolName === 'web_search')
      .map(e => ({
        toolCallId: e.toolCallId,
        query: e.args && typeof e.args.query === 'string' ? e.args.query : '',
        status: e.status,
        result: e.result as ToolCallResultWithResults | undefined,
      }));
  }, [toolExecutions]);

  // Weather executions
  const weatherExecutions = React.useMemo(() => {
    type WeatherResult = {
      city: string;
      country: string;
      region?: string | null;
      temperature: number;
      unit: 'C' | 'F';
      description: string;
      humidity: number;
      windSpeed: number;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'weather')
      .map(e => ({
        toolCallId: e.toolCallId,
        city: e.args && typeof e.args.city === 'string' ? e.args.city : '',
        status: e.status,
        result: e.result as WeatherResult | undefined,
      }));
  }, [toolExecutions]);

  // Stock executions
  const stockQuoteExecutions = React.useMemo(() => {
    type StockQuoteResult = {
      symbol: string;
      price: number;
      open: number;
      high: number;
      low: number;
      volume: number;
      previousClose: number;
      change: number;
      changePercent: number;
      latestTradingDay: string;
      isPositive: boolean;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'stock_quote')
      .map(e => ({
        toolCallId: e.toolCallId,
        symbol: e.args && typeof e.args.symbol === 'string' ? e.args.symbol : '',
        status: e.status,
        result: e.result as StockQuoteResult | undefined,
      }));
  }, [toolExecutions]);

  // Stock history executions (for charts)
  const stockHistoryExecutions = React.useMemo(() => {
    type StockHistoryResult = {
      symbol: string;
      historicalData: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;
      latestPrice: number;
      priceChange: number;
      priceChangePercent: number;
      period: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'stock_history')
      .map(e => ({
        toolCallId: e.toolCallId,
        symbol: e.args && typeof e.args.symbol === 'string' ? e.args.symbol : '',
        status: e.status,
        result: e.result as StockHistoryResult | undefined,
      }));
  }, [toolExecutions]);

  // Company info executions
  const companyInfoExecutions = React.useMemo(() => {
    type CompanyInfoResult = {
      symbol: string;
      name: string;
      currency: string;
      exchange: string;
      exchangeShortName: string;
      industry: string;
      website: string;
      description: string;
      ceo: string;
      sector: string;
      country: string;
      fullTimeEmployees: number;
      address: string;
      city: string;
      state: string;
      zip: string;
      mktCap: number;
      beta: number;
      volAvg: number;
      lastDiv: number;
      price: number;
      image: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'company_info')
      .map(e => ({
        toolCallId: e.toolCallId,
        symbol: e.args && typeof e.args.symbol === 'string' ? e.args.symbol : '',
        status: e.status,
        result: e.result as CompanyInfoResult | undefined,
      }));
  }, [toolExecutions]);

  // Crypto executions
  const cryptoExecutions = React.useMemo(() => {
    type CryptoResult = {
      fromCurrency: string;
      toCurrency: string;
      exchangeRate: number;
      lastRefreshed: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'crypto_price')
      .map(e => ({
        toolCallId: e.toolCallId,
        fromCurrency: e.args && typeof e.args.fromCurrency === 'string' ? e.args.fromCurrency : '',
        status: e.status,
        result: e.result as CryptoResult | undefined,
      }));
  }, [toolExecutions]);

  // Forex executions
  const forexExecutions = React.useMemo(() => {
    type ForexResult = {
      fromCurrency: string;
      toCurrency: string;
      exchangeRate: number;
      lastRefreshed: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'forex_rate')
      .map(e => ({
        toolCallId: e.toolCallId,
        fromCurrency: e.args && typeof e.args.fromCurrency === 'string' ? e.args.fromCurrency : '',
        toCurrency: e.args && typeof e.args.toCurrency === 'string' ? e.args.toCurrency : '',
        status: e.status,
        result: e.result as ForexResult | undefined,
      }));
  }, [toolExecutions]);

  const otherToolExecutions = React.useMemo(() => {
    return toolExecutions.filter(e => 
      e.toolName !== 'web_search' && 
      e.toolName !== 'weather' &&
      e.toolName !== 'stock_quote' &&
      e.toolName !== 'stock_history' &&
      e.toolName !== 'company_info' &&
      e.toolName !== 'crypto_price' &&
      e.toolName !== 'forex_rate'
    );
  }, [toolExecutions]);

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
            reasoningTime={reasoningTime}
          />
        )}

        {/* Web search results (unified box for all queries) */}
        {!isUser && webSearchExecutions.length > 0 && (
          <WebSearchResults
            executions={webSearchExecutions}
            isStreaming={isStreaming}
          />
        )}

        {/* Tool result cards - centered */}
        {!isUser && (
          <div className="tool-cards-container">
            {/* Weather card */}
            {weatherExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              return (
                <WeatherCard
                  key={execution.toolCallId}
                  weather={execution.result}
                />
              );
            })}

            {/* Stock quote cards */}
            {stockQuoteExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              const companyInfo = companyInfoExecutions.find(c => c.symbol === execution.symbol);
              const companyData = companyInfo?.result && !('error' in companyInfo.result) ? companyInfo.result : undefined;
              
              return (
                <StockCard
                  key={execution.toolCallId}
                  quote={execution.result}
                  company={companyData as any}
                />
              );
            })}

            {/* Stock charts */}
            {stockHistoryExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              return (
                <StockChart
                  key={execution.toolCallId}
                  symbol={execution.result.symbol}
                  data={execution.result.historicalData}
                  priceChange={execution.result.priceChange}
                />
              );
            })}

            {/* Company info cards */}
            {companyInfoExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              return (
                <CompanyInfoCard
                  key={execution.toolCallId}
                  company={execution.result}
                />
              );
            })}

            {/* Crypto price cards */}
            {cryptoExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              return (
                <div key={execution.toolCallId} className="crypto-card">
                  <div className="crypto-card-header">
                    <span className="crypto-card-symbol">{execution.result.fromCurrency}/{execution.result.toCurrency}</span>
                  </div>
                  <div className="crypto-card-price">
                    ${execution.result.exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="crypto-card-updated">
                    Last updated: {execution.result.lastRefreshed}
                  </div>
                </div>
              );
            })}

            {/* Forex rate cards */}
            {forexExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;
              
              return (
                <div key={execution.toolCallId} className="forex-card">
                  <div className="forex-card-header">
                    <span className="forex-card-symbol">{execution.result.fromCurrency}/{execution.result.toCurrency}</span>
                  </div>
                  <div className="forex-card-rate">
                    {execution.result.exchangeRate.toFixed(4)}
                  </div>
                  <div className="forex-card-updated">
                    Last updated: {execution.result.lastRefreshed}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Other tool execution blocks (collapsible, shows results when clicked) */}
        {!isUser && otherToolExecutions.length > 0 && (
          <div className="tool-executions">
            {otherToolExecutions.map((execution) => (
              <ToolCallBlock
                key={execution.toolCallId}
                toolName={execution.toolName}
                status={execution.status}
                result={execution.result}
                query={execution.args && typeof execution.args.query === 'string' ? execution.args.query : undefined}
              />
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
              <Icon name="copy" size={16} aria-label="Copy" />
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
                <Icon name="share" size={16} aria-label="Share" />
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
                <Icon name="redo" size={16} aria-label="Redo" />
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
  const prevToolParts = prevProps.message.parts.filter(isToolUIPart);
  const nextToolParts = nextProps.message.parts.filter(isToolUIPart);

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
