import { tool } from 'ai';
import { z } from 'zod';

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VINTAGE_API_KEY;
const FMP_KEY = process.env.FMP_API_KEY;

interface StockQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface TimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

interface CryptoResponse {
  'Realtime Currency Exchange Rate': {
    '1. From_Currency Code': string;
    '2. From_Currency Name': string;
    '3. To_Currency Code': string;
    '4. To_Currency Name': string;
    '5. Exchange Rate': string;
    '6. Last Refreshed': string;
    '7. Time Zone': string;
    '8. Bid Price': string;
    '9. Ask Price': string;
  };
}

interface ForexResponse {
  'Realtime Currency Exchange Rate': {
    '1. From_Currency Code': string;
    '2. From_Currency Name': string;
    '3. To_Currency Code': string;
    '4. To_Currency Name': string;
    '5. Exchange Rate': string;
    '6. Last Refreshed': string;
    '7. Time Zone': string;
    '8. Bid Price': string;
    '9. Ask Price': string;
  };
}

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

export const stockQuoteTool = tool({
  description: 'Get real-time stock quote including price, change, volume, and key metrics',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, GOOGL, MSFT)'),
  }),
  execute: async ({ symbol }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data: StockQuoteResponse = await response.json();

      if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
        return { error: `Invalid symbol or no data for: ${symbol}` };
      }

      const quote = data['Global Quote'];
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

      return {
        symbol: quote['01. symbol'],
        price,
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        change,
        changePercent,
        latestTradingDay: quote['07. latest trading day'],
        isPositive: change >= 0,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch stock quote' };
    }
  },
});

export const stockHistoryTool = tool({
  description: 'Get historical daily stock data for charts',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
    outputSize: z.enum(['compact', 'full']).default('compact').describe('compact=100 days, full=full history'),
  }),
  execute: async ({ symbol, outputSize }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data: TimeSeriesResponse = await response.json();

      if (!data['Time Series (Daily)']) {
        return { error: `Invalid symbol or no data for: ${symbol}` };
      }

      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries).slice(0, 90).reverse();
      
      const historicalData = dates.map(date => {
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
        symbol,
        historicalData,
        latestPrice: latest.close,
        priceChange,
        priceChangePercent,
        period: `${dates[0]} to ${dates[dates.length - 1]}`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch stock history' };
    }
  },
});

export const companyInfoTool = tool({
  description: 'Get company information including market cap, sector, industry, and description',
  inputSchema: z.object({
    symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, GOOGL)'),
  }),
  execute: async ({ symbol }) => {
    if (!FMP_KEY) {
      return { error: 'FMP_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`
      );

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return { error: `Invalid symbol or no data for: ${symbol}` };
      }

      const company = data[0];

      return {
        symbol: company.symbol,
        name: company.companyName,
        currency: company.currency,
        cik: company.cik,
        isin: company.isin,
        cusip: company.cusip,
        exchange: company.exchange,
        exchangeShortName: company.exchangeShortName,
        industry: company.industry,
        website: company.website,
        description: company.description,
        ceo: company.ceo,
        sector: company.sector,
        country: company.country,
        fullTimeEmployees: company.fullTimeEmployees,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        dcfDiff: company.dcfDiff,
        dcf: company.dcf,
        image: company.image,
        ipoDate: company.ipoDate,
        price: company.price,
        beta: company.beta,
        volAvg: company.volAvg,
        mktCap: company.marketCap,
        lastDiv: company.lastDiv,
        range: company.range,
        changes: company.changes,
        isEtf: company.isEtf,
        isActivelyTrading: company.isActivelyTrading,
        isAdr: company.isAdr,
        isFund: company.isFund,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch company info' };
    }
  },
});

export const cryptoPriceTool = tool({
  description: 'Get real-time cryptocurrency prices',
  inputSchema: z.object({
    fromCurrency: z.string().describe('Crypto symbol (e.g., BTC, ETH, SOL)'),
    toCurrency: z.string().default('USD').describe('Fiat currency (e.g., USD, EUR)'),
  }),
  execute: async ({ fromCurrency, toCurrency }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data: CryptoResponse = await response.json();

      if (!data['Realtime Currency Exchange Rate']) {
        return { error: `Invalid currency pair: ${fromCurrency}/${toCurrency}` };
      }

      const rate = data['Realtime Currency Exchange Rate'];
      const exchangeRate = parseFloat(rate['5. Exchange Rate']);

      return {
        fromCurrency: rate['1. From_Currency Code'],
        fromCurrencyName: rate['2. From_Currency Name'],
        toCurrency: rate['3. To_Currency Code'],
        toCurrencyName: rate['4. To_Currency Name'],
        exchangeRate,
        lastRefreshed: rate['6. Last Refreshed'],
        timeZone: rate['7. Time Zone'],
        bidPrice: parseFloat(rate['8. Bid Price']),
        askPrice: parseFloat(rate['9. Ask Price']),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch crypto price' };
    }
  },
});

export const forexRateTool = tool({
  description: 'Get real-time forex exchange rates',
  inputSchema: z.object({
    fromCurrency: z.string().describe('Base currency (e.g., USD, EUR, GBP)'),
    toCurrency: z.string().describe('Target currency (e.g., USD, EUR, GBP)'),
  }),
  execute: async ({ fromCurrency, toCurrency }) => {
    if (!ALPHA_VANTAGE_KEY) {
      return { error: 'ALPHA_VINTAGE_API_KEY not configured' };
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`
      );

      const data: ForexResponse = await response.json();

      if (!data['Realtime Currency Exchange Rate']) {
        return { error: `Invalid currency pair: ${fromCurrency}/${toCurrency}` };
      }

      const rate = data['Realtime Currency Exchange Rate'];
      const exchangeRate = parseFloat(rate['5. Exchange Rate']);

      return {
        fromCurrency: rate['1. From_Currency Code'],
        fromCurrencyName: rate['2. From_Currency Name'],
        toCurrency: rate['3. To_Currency Code'],
        toCurrencyName: rate['4. To_Currency Name'],
        exchangeRate,
        lastRefreshed: rate['6. Last Refreshed'],
        timeZone: rate['7. Time Zone'],
        bidPrice: parseFloat(rate['8. Bid Price']),
        askPrice: parseFloat(rate['9. Ask Price']),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch forex rate' };
    }
  },
});

export const stockSearchTool = tool({
  description: 'Search for stock symbols by company name or keywords',
  inputSchema: z.object({
    query: z.string().describe('Company name or keyword to search (e.g., Apple, Tesla)'),
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
        return { results: [], error: `No results found for: ${query}` };
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
      return { results: [], error: error instanceof Error ? error.message : 'Failed to search' };
    }
  },
});
