import { tool } from 'ai';
import { z } from 'zod';

export const airlineInfoTool = tool({
  description: 'Get airline information including fleet details. Use for queries like "IndiGo airline", "Air India fleet", "6E airline info"',
  inputSchema: z.object({
    airline: z.string().describe('Airline IATA code (e.g., 6E, AI, SG) or ICAO code (e.g., IGO, AIC)'),
    limit: z.number().optional().default(20).describe('Number of aircraft to show (max 50 for free tier)'),
  }),
  execute: async ({ airline, limit = 20 }) => {
    try {
      const apiKey = process.env.AIRLABS_API_KEY;
      if (!apiKey) {
        throw new Error('AIRLABS_API_KEY is not configured');
      }

      const params = new URLSearchParams({
        api_key: apiKey,
        limit: limit.toString(),
      });

      const normalizedAirline = airline.trim().toUpperCase();

      if (normalizedAirline.length === 2) {
        params.set('airline_iata', normalizedAirline);
      } else {
        params.set('airline_icao', normalizedAirline);
      }

      const response = await fetch(
        `https://airlabs.co/api/v9/fleets?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`AirLabs API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response || data.response.length === 0) {
        return {
          error: `No information found for airline: ${airline}`,
        };
      }

      const fleet = data.response.map((aircraft: any) => {
        return {
          hex: aircraft.hex,
          registration: aircraft.reg_number,
          icao: aircraft.icao,
          iata: aircraft.iata,
          model: aircraft.model,
          manufacturer: aircraft.manufacturer,
          type: aircraft.type,
          category: aircraft.category,
          engine: aircraft.engine,
          engineCount: aircraft.engine_count,
          built: aircraft.built,
          age: aircraft.age,
          msn: aircraft.msn,
          flag: aircraft.flag,
          latestPosition: aircraft.lat && aircraft.lng ? {
            lat: aircraft.lat,
            lng: aircraft.lng,
            alt: aircraft.alt,
            speed: aircraft.speed,
            direction: aircraft.dir,
            lastSeen: aircraft.last_seen,
          } : null,
        };
      });

      const aircraftTypes: Record<string, number> = {};
      fleet.forEach((ac: any) => {
        if (ac.model) {
          aircraftTypes[ac.model] = (aircraftTypes[ac.model] || 0) + 1;
        }
      });

      const manufacturers: Record<string, number> = {};
      fleet.forEach((ac: any) => {
        if (ac.manufacturer) {
          manufacturers[ac.manufacturer] = (manufacturers[ac.manufacturer] || 0) + 1;
        }
      });

      const avgAge = fleet
        .filter((ac: any) => ac.age !== null && ac.age !== undefined)
        .reduce((sum: number, ac: any) => sum + ac.age, 0) / fleet.filter((ac: any) => ac.age !== null).length;

      const iataCode = fleet[0]?.airline_iata || '';
      const icaoCode = fleet[0]?.airline_icao || '';

      return {
        airline: {
          iataCode,
          icaoCode,
          name: getAirlineName(iataCode, icaoCode),
        },
        fleet,
        fleetStats: {
          totalAircraft: fleet.length,
          averageAge: avgAge ? Math.round(avgAge) : null,
          aircraftTypes: Object.entries(aircraftTypes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5),
          manufacturers: Object.entries(manufacturers)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5),
        },
        total: fleet.length,
        hasMore: data.has_more || false,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch airline information',
      };
    }
  },
});

function getAirlineName(iata: string, icao: string): string {
  const airlines: Record<string, string> = {
    '6E': 'IndiGo',
    'IGO': 'IndiGo',
    'AI': 'Air India',
    'AIC': 'Air India',
    'SG': 'SpiceJet',
    'SEJ': 'SpiceJet',
    'G8': 'GoAir',
    'GOW': 'GoAir',
    'UK': 'Vistara',
    'VTI': 'Vistara',
    'IX': 'Air India Express',
    'AXB': 'Air India Express',
    '9I': 'Alliance Air',
    'LLR': 'Alliance Air',
  };
  return airlines[iata] || airlines[icao] || iata || icao;
}
