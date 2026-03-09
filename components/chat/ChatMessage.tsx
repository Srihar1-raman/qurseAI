'use client';

import React from 'react';
import dynamic from 'next/dynamic';
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
import { FlightStatusCard } from './FlightStatusCard';
import { FlightSearchCard } from './FlightSearchCard';
import { AirportInfoCard } from './AirportInfoCard';
import { AirlineInfoCard } from './AirlineInfoCard';
import { QRCodeCard } from './QRCodeCard';
import { MovieCard } from './MovieCard';
import { DesmosCard } from './DesmosCard';
import { WolframCard } from './WolframCard';
import { ArxivSearchCard, ArxivPaperCard } from './ArxivCard';
import { ScopusSearchCard, ScopusPaperCard } from './ScopusCard';
import { isToolUIPart } from 'ai';
import type { ChatMessageProps } from '@/lib/types';

const FlightRadarCard = dynamic(() => import('./FlightRadarCard').then(mod => ({ default: mod.FlightRadarCard })), {
  ssr: false,
  loading: () => <div className="flight-radar-card"><div className="flight-radar-empty">Loading radar...</div></div>
});

interface ToolExecution {
  toolName: string;
  toolCallId: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: 'loading' | 'complete' | 'error';
  state?: string;
}

function ChatMessageComponent({ message, isUser, onRedo, onShare, user, isStreaming = false, reasoningTime, onSetInput }: ChatMessageProps) {
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
        status, // Show tool result immediately when available, even while AI streams text
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

  // Weather history executions
  const weatherHistoryExecutions = React.useMemo(() => {
    type WeatherHistoryResult = {
      city: string;
      country: string;
      region?: string | null;
      date: string;
      displayDate: string;
      temperature: number;
      unit: 'C' | 'F';
      description: string;
      icon: string;
      humidity: number;
      windSpeed: number;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'weather_history')
      .map(e => ({
        toolCallId: e.toolCallId,
        city: e.args && typeof e.args.city === 'string' ? e.args.city : '',
        status: e.status,
        result: e.result as WeatherHistoryResult | undefined,
      }));
  }, [toolExecutions]);

  // Flight status executions
  const flightStatusExecutions = React.useMemo(() => {
    type FlightStatusResult = {
      flightNumber: string;
      airline: { name: string; iataCode: string; logoUrl: string | null };
      route: { origin: { code: string; city: string; country: string };
        destination: { code: string; city: string; country: string };
      };
      status: { code: string; display: string; color: string; isLanded: boolean; isDelayed: boolean; isCancelled: boolean };
      times: { scheduled: { departure: string | undefined; arrival: string | undefined };
        estimated: { departure: string | undefined; arrival: string | undefined } | null;
        actual: { departure: string | undefined; arrival: string | undefined } | null;
        local: { departure: string | undefined; arrival: string | undefined };
        utc: { departure: string | null; arrival: string | null };
      } | null;
      duration: string | null;
      aircraft: { type: string; code: string };
      gate: { departure: string; arrival: string };
      terminal: { departure: string; arrival: string };
      isLive: boolean;
      lastUpdate: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'flight_status')
      .map(e => ({
        toolCallId: e.toolCallId,
        flightNumber: e.args && typeof e.args.flight === 'string' ? e.args.flight : '',
        status: e.status,
        result: e.result as FlightStatusResult | undefined,
      }));
  }, [toolExecutions]);

  // Flight search executions
  const flightSearchExecutions = React.useMemo(() => {
    type FlightSearchResult = {
      flights: any[];
      total: number;
      hasMore: boolean;
      query: { origin?: string; destination?: string; airline?: string };
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'flight_search')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as FlightSearchResult | undefined,
      }));
  }, [toolExecutions]);

  // Flight radar executions
  const flightRadarExecutions = React.useMemo(() => {
    type FlightRadarResult = {
      flights: any[];
      total: number;
      query: { airport?: string; bbox?: string };
      lastUpdate: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'flight_radar')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as FlightRadarResult | undefined,
      }));
  }, [toolExecutions]);

  // Airport info executions
  const airportInfoExecutions = React.useMemo(() => {
    type AirportInfoResult = {
      airport: { code: string; name: string };
      flights: any[];
      total: number;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'airport_info')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as AirportInfoResult | undefined,
      }));
  }, [toolExecutions]);

  // Airline info executions
  const airlineInfoExecutions = React.useMemo(() => {
    type AirlineInfoResult = {
      airline: { iataCode: string; icaoCode: string; name: string };
      fleet: any[];
      fleetStats: {
        totalAircraft: number;
        averageAge: number | null;
        aircraftTypes: [string, number][];
        manufacturers: [string, number][];
      };
      total: number;
      hasMore: boolean;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'airline_info')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as AirlineInfoResult | undefined,
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

  const qrCodeExecutions = React.useMemo(() => {
    return toolExecutions
      .filter(e => e.toolName === 'qr_code')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result,
      }));
  }, [toolExecutions]);

  // Movie info executions
  const movieInfoExecutions = React.useMemo(() => {
    type MovieInfoResult = {
      title: string;
      year: string;
      rated: string | null;
      released: string | null;
      runtime: string | null;
      genre: string[];
      director: string | null;
      writer: string | null;
      actors: string[];
      plot: string | null;
      language: string | null;
      country: string | null;
      awards: string | null;
      poster: string | null;
      ratings: Array<{ Source: string; Value: string }>;
      metascore: number | null;
      imdbRating: number | null;
      imdbVotes: string | null;
      imdbId: string;
      type: string;
      boxOffice: string | null;
      tmdbPosterPath?: string;
      similarMovies?: Array<{
        tmdbId: number;
        title: string;
        year: string;
        poster: string | null;
        overview: string;
        voteAverage: number;
        genres: string;
      }>;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'movie_info')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as MovieInfoResult | undefined,
      }));
  }, [toolExecutions]);

  // Desmos calculator executions
  const desmosExecutions = React.useMemo(() => {
    type DesmosResult = {
      calculatorType: 'graphing' | 'scientific' | 'fourFunction' | 'geometry' | '3d';
      initialExpressions: Array<{ id: string; latex: string; color?: string }>;
      viewport?: { xmin: number; xmax: number; ymin: number; ymax: number };
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'desmos')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as DesmosResult | undefined,
      }));
  }, [toolExecutions]);

  // Wolfram Alpha executions
  const wolframExecutions = React.useMemo(() => {
    type WolframResult = {
      query: string;
      pods: Array<{ title: string; plaintext?: string; image?: string }>;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'wolfram')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as WolframResult | undefined,
      }));
  }, [toolExecutions]);

  // arXiv search executions
  const arxivSearchExecutions = React.useMemo(() => {
    type ArxivSearchResult = {
      query: string;
      totalResults: number;
      startIndex: number;
      itemsPerPage: number;
      entries: Array<{
        id: string;
        title: string;
        summary: string;
        authors: string[];
        published: string;
        updated: string;
        primaryCategory: string;
        categories: string[];
        pdfLink?: string;
        absLink: string;
        htmlLink?: string;
      }>;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'arxiv_search')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as ArxivSearchResult | undefined,
      }));
  }, [toolExecutions]);

  // arXiv paper executions
  const arxivPaperExecutions = React.useMemo(() => {
    type ArxivPaperResult = {
      id: string;
      title: string;
      summary: string;
      authors: { name: string; affiliation?: string }[];
      published: string;
      updated: string;
      primaryCategory: string;
      categories: string[];
      comment?: string;
      journalRef?: string;
      doi?: string;
      pdfLink?: string;
      absLink: string;
      htmlLink?: string;
      version: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'arxiv_paper')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as ArxivPaperResult | undefined,
      }));
  }, [toolExecutions]);

  // Scopus search executions
  const scopusSearchExecutions = React.useMemo(() => {
    type ScopusSearchResult = {
      query: string;
      totalResults: number;
      startIndex: number;
      itemsPerPage: number;
      entries: Array<{
        eid: string;
        title: string;
        author: string;
        publicationName: string;
        coverDate: string;
        year: string;
        volume: string;
        issue: string;
        pages: string;
        citedByCount: number;
        doi: string;
        doiUrl: string;
        scopusUrl: string;
        issn: string;
        openAccess: boolean;
        type: string;
      }>;
      message?: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'scopus_search')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as ScopusSearchResult | undefined,
      }));
  }, [toolExecutions]);

  // Scopus paper executions
  const scopusPaperExecutions = React.useMemo(() => {
    type ScopusPaperResult = {
      eid: string;
      scopusId: string;
      title: string;
      author: string;
      publicationName: string;
      publicationDate: string;
      volume: string;
      issue: string;
      pages: string;
      doi: string;
      doiUrl: string;
      scopusUrl: string;
      issn: string;
      eIssn: string;
      citedByCount: number;
      openAccess: boolean;
      type: string;
      affiliation?: string;
      subtype?: string;
      aggregationType?: string;
    } | { error: string };

    return toolExecutions
      .filter(e => e.toolName === 'scopus_paper')
      .map(e => ({
        toolCallId: e.toolCallId,
        status: e.status,
        result: e.result as ScopusPaperResult | undefined,
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
      e.toolName !== 'forex_rate' &&
      e.toolName !== 'qr_code' &&
      e.toolName !== 'movie_info' &&
      e.toolName !== 'desmos' &&
      e.toolName !== 'wolfram' &&
      e.toolName !== 'arxiv_search' &&
      e.toolName !== 'arxiv_paper' &&
      e.toolName !== 'scopus_search' &&
      e.toolName !== 'scopus_paper'
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
            {/* Weather card - render generated UI or data-based UI */}
            {weatherExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              
              // Check if result is a React element (from generate) or data object (from execute)
              if (React.isValidElement(execution.result)) {
                // Render the pre-built component from generate
                return <React.Fragment key={execution.toolCallId}>{execution.result}</React.Fragment>;
              }
              
              // Fallback: render from data (execute approach)
              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;
              
              const weatherData = execution.result as {
                city: string;
                country: string;
                region?: string | null;
                temperature: number;
                unit: 'C' | 'F';
                description: string;
                humidity: number;
                windSpeed: number;
                forecast?: any[];
              };
              
              return (
                <WeatherCard
                  key={execution.toolCallId}
                  weather={weatherData}
                />
              );
            })}

            {/* Weather history cards - without forecast */}
            {weatherHistoryExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              const historyData = execution.result as {
                city: string;
                country: string;
                region?: string | null;
                date: string;
                displayDate: string;
                temperature: number;
                unit: 'C' | 'F';
                description: string;
                icon: string;
                humidity: number;
                windSpeed: number;
              };

              return (
                <WeatherCard
                  key={execution.toolCallId}
                  weather={{
                    city: historyData.city,
                    country: historyData.country,
                    region: historyData.region,
                    temperature: historyData.temperature,
                    unit: historyData.unit,
                    description: historyData.description,
                    humidity: historyData.humidity,
                    windSpeed: historyData.windSpeed,
                  }}
                  showForecast={false}
                />
              );
            })}

            {/* Flight status cards */}
            {flightStatusExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              const flightData = execution.result as any;

              return (
                <FlightStatusCard
                  key={execution.toolCallId}
                  data={flightData}
                  resolvedTheme={resolvedTheme}
                />
              );
            })}

            {/* Flight search cards */}
            {flightSearchExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              return (
                <FlightSearchCard
                  key={execution.toolCallId}
                  data={execution.result as any}
                />
              );
            })}

            {/* Flight radar cards */}
            {flightRadarExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              return (
                <FlightRadarCard
                  key={execution.toolCallId}
                  data={execution.result as any}
                  resolvedTheme={resolvedTheme}
                />
              );
            })}

            {/* Airport info cards */}
            {airportInfoExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              return (
                <AirportInfoCard
                  key={execution.toolCallId}
                  data={execution.result as any}
                />
              );
            })}

            {/* Airline info cards */}
            {airlineInfoExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if ('error' in execution.result) return null;

              const result = execution.result as { error?: string } | undefined;
              if (!result || 'error' in result) return null;

              return (
                <AirlineInfoCard
                  key={execution.toolCallId}
                  data={execution.result as any}
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

            {/* QR Code cards */}
            {qrCodeExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const qrData = execution.result as {
                data: string;
                typeNumber: number;
                errorCorrectionLevel: string;
                moduleCount: number;
                svg: string;
                size: number;
                options: {
                  cellSize: number;
                  margin: number;
                  darkColor: string;
                  lightColor: string;
                };
              };

              return (
                <QRCodeCard
                  key={execution.toolCallId}
                  qrData={qrData}
                />
              );
            })}

            {/* Movie info cards */}
            {movieInfoExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const movieData = execution.result as {
                title: string;
                year: string;
                rated: string | null;
                released: string | null;
                runtime: string | null;
                genre: string[];
                director: string | null;
                writer: string | null;
                actors: string[];
                plot: string | null;
                language: string | null;
                country: string | null;
                awards: string | null;
                poster: string | null;
                ratings: Array<{ Source: string; Value: string }>;
                metascore: number | null;
                imdbRating: number | null;
                imdbVotes: string | null;
                imdbId: string;
                type: string;
                boxOffice: string | null;
                tmdbPosterPath?: string;
                similarMovies?: Array<{
                  tmdbId: number;
                  title: string;
                  year: string;
                  poster: string | null;
                  overview: string;
                  voteAverage: number;
                  genres: string;
                }>;
              };

              return (
                <MovieCard
                  key={execution.toolCallId}
                  movie={movieData}
                />
              );
            })}

            {/* Desmos calculator cards */}
            {desmosExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const desmosData = execution.result as {
                calculatorType: 'graphing' | 'scientific' | 'fourFunction' | 'geometry' | '3d';
                initialExpressions: Array<{ id: string; latex: string; color?: string }>;
                viewport?: { xmin: number; xmax: number; ymin: number; ymax: number };
              };

              return (
                <DesmosCard
                  key={execution.toolCallId}
                  calculatorType={desmosData.calculatorType}
                  initialExpressions={desmosData.initialExpressions || []}
                  viewport={desmosData.viewport}
                />
              );
            })}

            {/* Wolfram Alpha cards */}
            {wolframExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const wolframData = execution.result as {
                query: string;
                pods: Array<{ title: string; plaintext?: string; image?: string }>;
              };

              return (
                <WolframCard
                  key={execution.toolCallId}
                  query={wolframData.query}
                  pods={wolframData.pods}
                />
              );
            })}

            {/* arXiv search cards */}
            {arxivSearchExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const searchData = execution.result as {
                query: string;
                totalResults: number;
                startIndex: number;
                itemsPerPage: number;
                entries: Array<{
                  id: string;
                  title: string;
                  summary: string;
                  authors: string[];
                  published: string;
                  updated: string;
                  primaryCategory: string;
                  categories: string[];
                  pdfLink?: string;
                  absLink: string;
                  htmlLink?: string;
                }>;
              };

              return (
                <ArxivSearchCard
                  key={execution.toolCallId}
                  result={searchData}
                  onSetInput={onSetInput}
                />
              );
            })}

            {/* arXiv paper cards */}
            {arxivPaperExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const paperData = execution.result as {
                id: string;
                title: string;
                summary: string;
                authors: { name: string; affiliation?: string }[];
                published: string;
                updated: string;
                primaryCategory: string;
                categories: string[];
                comment?: string;
                journalRef?: string;
                doi?: string;
                pdfLink?: string;
                absLink: string;
                htmlLink?: string;
                version: string;
              };

              return (
                <ArxivPaperCard
                  key={execution.toolCallId}
                  paper={paperData}
                />
              );
            })}

            {/* Scopus search cards */}
            {scopusSearchExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const searchData = execution.result as {
                query: string;
                totalResults: number;
                startIndex: number;
                itemsPerPage: number;
                entries: Array<{
                  eid: string;
                  title: string;
                  author: string;
                  publicationName: string;
                  coverDate: string;
                  year: string;
                  volume: string;
                  issue: string;
                  pages: string;
                  citedByCount: number;
                  doi: string;
                  doiUrl: string;
                  scopusUrl: string;
                  issn: string;
                  openAccess: boolean;
                  type: string;
                }>;
                message?: string;
              };

              return (
                <ScopusSearchCard
                  key={execution.toolCallId}
                  result={searchData}
                  onSetInput={onSetInput}
                />
              );
            })}

            {/* Scopus paper cards */}
            {scopusPaperExecutions.map((execution) => {
              if (execution.status !== 'complete' || !execution.result) return null;
              if (typeof execution.result === 'object' && 'error' in execution.result) return null;

              const paperData = execution.result as {
                eid: string;
                scopusId: string;
                title: string;
                author: string;
                publicationName: string;
                publicationDate: string;
                volume: string;
                issue: string;
                pages: string;
                doi: string;
                doiUrl: string;
                scopusUrl: string;
                issn: string;
                eIssn: string;
                citedByCount: number;
                openAccess: boolean;
                type: string;
                affiliation?: string;
                subtype?: string;
                aggregationType?: string;
              };

              return (
                <ScopusPaperCard
                  key={execution.toolCallId}
                  paper={paperData}
                />
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
