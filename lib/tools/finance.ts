import { tool } from 'ai';
import { z } from 'zod';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VINTAGE_API_KEY;
const FMP_KEY = process.env.FMP_API_KEY;

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

function detectExchange(symbol: string): { exchange: string; fullSymbol: string } {
  const upperSymbol = symbol.toUpperCase();
  
  if (upperSymbol.endsWith('.NS')) {
    return { exchange: 'NSE', fullSymbol: upperSymbol };
  }
  if (upperSymbol.endsWith('.BO')) {
    return { exchange: 'BSE', fullSymbol: upperSymbol };
  }
  
  return { exchange: 'US', fullSymbol: upperSymbol };
}

export const stockQuoteTool = tool({
  description: 'Get real-time stock quote with price, change, volume. Works for US and Indian stocks.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL, RELIANCE.NS)'),
  }),
  execute: async ({ symbol }) => {
    const { exchange, fullSymbol } = detectExchange(symbol);
    const cleanSymbol = fullSymbol.replace('.NS', '').replace('.BO', '');

    // Try FMP first (250 requests/day free)
    if (FMP_KEY) {
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/stable/quote/${cleanSymbol}?apikey=${FMP_KEY}`
        );
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const quote = data[0];
          return {
            symbol: quote.symbol,
            exchange,
            price: quote.price,
            open: quote.open,
            high: quote.dayHigh,
            low: quote.dayLow,
            volume: quote.volume,
            previousClose: quote.previousClose,
            change: quote.change,
            changePercent: quote.changesPercentage,
            latestTradingDay: new Date().toISOString().split('T')[0],
            isPositive: quote.change >= 0,
          };
        }
      } catch (e) {
        // Fall through to Alpha Vantage
      }
    }

    // Fall back to Alpha Vantage
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'API keys not configured. Set FMP_API_KEY or ALPHA_VINTAGE_API_KEY' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${fullSymbol}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
        return { error: `Invalid symbol: ${symbol}` };
      }

      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change'] || '0');
      const changePercent = parseFloat((quote['10. change percent'] || '0%').replace('%', ''));

      return {
        symbol: quote['01. symbol'] || fullSymbol,
        exchange,
        price,
        open: parseFloat(quote['02. open'] || '0'),
        high: parseFloat(quote['03. high'] || '0'),
        low: parseFloat(quote['04. low'] || '0'),
        volume: parseInt(quote['06. volume'] || '0'),
        previousClose: parseFloat(quote['08. previous close'] || '0'),
        change,
        changePercent,
        latestTradingDay: quote['07. latest trading day'] || new Date().toISOString().split('T')[0],
        isPositive: change >= 0,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch stock quote' };
    }
  },
});

export const stockHistoryTool = tool({
  description: 'Get historical daily stock data for charts. Supports multiple timeframes.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL, GOOGL)'),
    timeframe: z.enum(['1M', '3M', '6M', '1Y']).default('3M').describe('Time period'),
  }),
  execute: async ({ symbol, timeframe }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const { exchange, fullSymbol } = detectExchange(symbol);

      let outputSize = 'compact';
      if (timeframe === '1Y') outputSize = 'full';

      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${fullSymbol}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();
      const timeSeries = data['Time Series (Daily)'];

      if (!timeSeries) {
        return { error: `Invalid symbol: ${symbol}` };
      }

      const dates = Object.keys(timeSeries);
      let sliceCount = 30;
      if (timeframe === '3M') sliceCount = 65;
      if (timeframe === '6M') sliceCount = 130;
      if (timeframe === '1Y') sliceCount = 252;

      const historicalData = dates.slice(0, sliceCount).reverse().map(date => {
        const day = timeSeries[date];
        return {
          date,
          open: parseFloat(day['1. open']),
          high: parseFloat(day['2. high']),
          low: parseFloat(day['3. low']),
          close: parseFloat(day['4. close']),
          volume: parseInt(day['5. volume']),
        };
      });

      const latest = historicalData[historicalData.length - 1];
      const earliest = historicalData[0];
      const priceChange = latest.close - earliest.close;
      const priceChangePercent = ((latest.close - earliest.close) / earliest.close) * 100;

      return {
        symbol: fullSymbol,
        exchange,
        timeframe,
        historicalData,
        latestPrice: latest.close,
        priceChange,
        priceChangePercent,
        period: `${dates[dates.length - 1]} to ${dates[0]}`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch stock history' };
    }
  },
});

export const stockIntradayTool = tool({
  description: 'Get intraday minute-level data for day trading.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL)'),
  }),
  execute: async ({ symbol }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const { exchange, fullSymbol } = detectExchange(symbol);

      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${fullSymbol}&interval=5min&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();
      const timeSeries = data['Time Series (5min)'];

      if (!timeSeries) {
        return { error: `Intraday data unavailable for: ${symbol}. This may be a premium feature.` };
      }

      const dates = Object.keys(timeSeries).slice(0, 78);

      const intradayData = dates.map(date => {
        const point = timeSeries[date];
        return {
          date,
          open: parseFloat(point['1. open']),
          high: parseFloat(point['2. high']),
          low: parseFloat(point['3. low']),
          close: parseFloat(point['4. close']),
          volume: parseInt(point['5. volume']),
        };
      });

      return {
        symbol: fullSymbol,
        exchange,
        intradayData,
        latestPrice: intradayData[intradayData.length - 1].close,
        dayHigh: Math.max(...intradayData.map(d => d.high)),
        dayLow: Math.min(...intradayData.map(d => d.low)),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch intraday data' };
    }
  },
});

export const marketIndicesTool = tool({
  description: 'Get major market indices quotes. US indices: SPY, QQQ, DIA, IWM. India: ^NSEI (NIFTY), ^BSESN (SENSEX).',
  inputSchema: z.object({
    indices: z.array(z.string()).optional().describe('List of indices'),
  }),
  execute: async ({ indices }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    const defaultIndices = ['SPY', 'QQQ', 'DIA'];
    const indicesToFetch = indices || defaultIndices;
    const results: any[] = [];

    for (const idx of indicesToFetch.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${idx}&apikey=${ALPHA_VANTAGE_KEY}`
        );

        const data = await response.json();
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          const quote = data['Global Quote'];
          results.push({
            symbol: idx,
            name: idx,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change'] || '0'),
            changePercent: parseFloat((quote['10. change percent'] || '0%').replace('%', '')),
          });
        }
      } catch (e) {
        // Skip failed
      }
    }

    return { indices: results };
  },
});

export const stockNewsTool = tool({
  description: 'Get latest news for a stock.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL, TSLA)'),
  }),
  execute: async ({ symbol }) => {
    return { 
      news: [], 
      error: 'Stock news is available on FMP Pro plan only. Try using Alpha Vantage or search for news separately.',
      symbol 
    };
  },
});

export const stockEarningsTool = tool({
  description: 'Get earnings history for a stock.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL)'),
  }),
  execute: async ({ symbol }) => {
    if (!FMP_KEY) {
      return { error: 'FMP_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/stable/earnings-calendar?symbol=${symbol}&apikey=${FMP_KEY}`
      );

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return { error: `No earnings data for: ${symbol}` };
      }

      return { 
        symbol, 
        earnings: data.slice(0, 8).map((item: any) => ({
          date: item.date,
          eps: item.eps,
          epsEstimate: item.epsEstimate,
          revenue: item.revenue,
          fiscalDate: item.fiscalDate,
        }))
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch earnings' };
    }
  },
});

export const stockComparisonTool = tool({
  description: 'Compare multiple stocks side by side.',
  inputSchema: z.object({
    symbols: z.array(z.string()).min(2).max(4).describe('Stock symbols to compare'),
  }),
  execute: async ({ symbols }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const results: any[] = [];

      for (const symbol of symbols) {
        const { exchange, fullSymbol } = detectExchange(symbol);

        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${fullSymbol}&apikey=${ALPHA_VANTAGE_KEY}`
        );

        const data = await response.json();

        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          const quote = data['Global Quote'];
          results.push({
            symbol: quote['01. symbol'],
            exchange,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change'] || '0'),
            changePercent: parseFloat((quote['10. change percent'] || '0%').replace('%', '')),
            volume: parseInt(quote['06. volume'] || '0'),
          });
        }
      }

      return { comparisons: results };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch comparison' };
    }
  },
});

export const stockSearchTool = tool({
  description: 'Search for stock symbols by company name.',
  inputSchema: z.object({
    query: z.string().describe('Company name (e.g., Apple, Tesla)'),
  }),
  execute: async ({ query }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();

      if (!data.bestMatches || data.bestMatches.length === 0) {
        return { results: [], error: `No results for: ${query}` };
      }

      const results = data.bestMatches.slice(0, 10).map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        currency: match['8. currency'],
      }));

      return { results };
    } catch (error) {
      return { results: [], error: error instanceof Error ? error.message : 'Search failed' };
    }
  },
});

export const companyInfoTool = tool({
  description: 'Get company information including market cap, sector, industry.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker (e.g., AAPL)'),
  }),
  execute: async ({ symbol }) => {
    if (!FMP_KEY) {
      return { error: 'FMP_API_KEY not configured' };
    }

    try {
      const { exchange, fullSymbol } = detectExchange(symbol);
      const cleanSymbol = fullSymbol.replace('.NS', '').replace('.BO', '');

      const response = await fetch(
        `https://financialmodelingprep.com/stable/profile/${cleanSymbol}?apikey=${FMP_KEY}`
      );

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return { error: `No company data for: ${symbol}` };
      }

      const company = data[0];

      return {
        symbol: company.symbol,
        name: company.companyName,
        exchange: company.exchange,
        sector: company.sector,
        industry: company.industry,
        mktCap: company.marketCap,
        price: company.price,
        beta: company.beta,
        volAvg: company.volAvg,
        description: company.description?.slice(0, 300),
        ceo: company.ceo,
        employees: company.fullTimeEmployees,
        website: company.website,
        exchangeHint: exchange,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch company info' };
    }
  },
});

export const cryptoPriceTool = tool({
  description: 'Get cryptocurrency prices (BTC, ETH, SOL, etc.)',
  inputSchema: z.object({
    fromCurrency: z.string().describe('Crypto (e.g., BTC, ETH)'),
    toCurrency: z.string().default('USD').describe('Fiat (e.g., USD, EUR)'),
  }),
  execute: async ({ fromCurrency, toCurrency }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();

      if (!data['Realtime Currency Exchange Rate']) {
        return { error: `Invalid crypto pair: ${fromCurrency}/${toCurrency}` };
      }

      const rate = data['Realtime Currency Exchange Rate'];

      return {
        fromCurrency: rate['1. From_Currency Code'],
        toCurrency: rate['3. To_Currency Code'],
        exchangeRate: parseFloat(rate['5. Exchange Rate']),
        lastRefreshed: rate['6. Last Refreshed'],
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch crypto price' };
    }
  },
});

export const forexRateTool = tool({
  description: 'Get forex exchange rates (USD, EUR, GBP, JPY, INR).',
  inputSchema: z.object({
    fromCurrency: z.string().describe('From currency (e.g., USD, EUR)'),
    toCurrency: z.string().describe('To currency (e.g., USD, EUR)'),
  }),
  execute: async ({ fromCurrency, toCurrency }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();

      if (!data['Realtime Currency Exchange Rate']) {
        return { error: `Invalid pair: ${fromCurrency}/${toCurrency}` };
      }

      const rate = data['Realtime Currency Exchange Rate'];

      return {
        fromCurrency: rate['1. From_Currency Code'],
        toCurrency: rate['3. To_Currency Code'],
        exchangeRate: parseFloat(rate['5. Exchange Rate']),
        lastRefreshed: rate['6. Last Refreshed'],
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch forex rate' };
    }
  },
});

export const nseQuoteTool = tool({
  description: 'Get NSE India stock quote. Use symbol without .NS (e.g., RELIANCE, TCS).',
  inputSchema: z.object({
    symbol: z.string().describe('NSE symbol (e.g., RELIANCE, TCS, INFY)'),
  }),
  execute: async ({ symbol }) => {
    const upperSymbol = symbol.toUpperCase().trim();
    
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperSymbol}.NS&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
        return { 
          symbol: upperSymbol,
          exchange: 'NSE',
          fallbackSuggestion: `Try using stock_quote tool with symbol: ${upperSymbol}.NS`,
          error: `Could not find NSE stock: ${symbol}`
        };
      }

      const quote = data['Global Quote'];
      return {
        symbol: quote['01. symbol'],
        exchange: 'NSE',
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change'] || '0'),
        changePercent: parseFloat((quote['10. change percent'] || '0%').replace('%', '')),
        volume: parseInt(quote['06. volume'] || '0'),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch NSE quote' };
    }
  },
});

export const bseQuoteTool = tool({
  description: 'Get BSE India stock quote.',
  inputSchema: z.object({
    scripCode: z.string().describe('BSE scrip code (e.g., 500325)'),
  }),
  execute: async ({ scripCode }) => {
    return {
      scripCode,
      exchange: 'BSE',
      note: 'Use stock_quote with .BO suffix instead. Example: RELIANCE.BO',
      fallbackSuggestion: `Try using stock_quote with symbol: ${scripCode}.BO`,
    };
  },
});
