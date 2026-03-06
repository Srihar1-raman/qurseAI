import { tool } from 'ai';
import { z } from 'zod';

function getFlightStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'en-route' || statusLower === 'active') {
    return '#10b981';
  }
  if (statusLower === 'landed') {
    return '#3b82f6';
  }
  if (statusLower === 'scheduled') {
    return '#6b7280';
  }
  return '#6b7280';
}

export const flightRadarTool = tool({
  description: 'Get live flights in a specific area or from an airport. Use for queries like "flights over DEL", "planes flying near me", "live radar for BOM"',
  inputSchema: z.object({
    airport: z.string().optional().describe('Airport IATA code to show departures/arrivals (e.g., DEL, BOM)'),
    bbox: z.string().optional().describe('Bounding box: "lat1,lon1,lat2,lon2" for specific region'),
    limit: z.number().optional().default(50).describe('Number of flights to return (max 50 for free tier)'),
  }),
  execute: async ({ airport, bbox, limit = 50 }) => {
    try {
      const apiKey = process.env.AIRLABS_API_KEY;
      if (!apiKey) {
        throw new Error('AIRLABS_API_KEY is not configured');
      }

      if (!airport && !bbox) {
        return {
          error: 'Either airport code or bounding box is required',
        };
      }

      const params = new URLSearchParams({ api_key: apiKey, limit: limit.toString() });
      if (airport) params.set('dep_iata', airport.toUpperCase());
      if (bbox) params.set('bbox', bbox);

      const response = await fetch(
        `https://airlabs.co/api/v9/flights?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`AirLabs API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response || data.response.length === 0) {
        return {
          error: 'No live flights found in the specified area',
        };
      }

      const flights = data.response.map((flight: any) => {
        return {
          flightNumber: flight.flight_iata || flight.flight_icao,
          airline: {
            iataCode: flight.airline_iata || '',
            icaoCode: flight.airline_icao || '',
            logoUrl: flight.airline_iata ? `https://content.airlines.aero/airlines/${flight.airline_iata.toLowerCase()}/logo_small.png` : null,
          },
          route: {
            origin: {
              code: flight.dep_iata,
              icao: flight.dep_icao,
            },
            destination: {
              code: flight.arr_iata,
              icao: flight.arr_icao,
            },
          },
          status: {
            code: flight.status,
            display: flight.status ? flight.status.charAt(0).toUpperCase() + flight.status.slice(1) : 'Unknown',
            color: getFlightStatusColor(flight.status),
          },
          position: {
            lat: flight.lat,
            lng: flight.lng,
            altitude: flight.alt,
            speed: flight.speed,
            direction: flight.dir,
            verticalSpeed: flight.v_speed,
          },
          aircraft: {
            hex: flight.hex,
            regNumber: flight.reg_number,
            icaoCode: flight.aircraft_icao,
            flag: flight.flag,
          },
          updated: new Date(flight.updated * 1000).toISOString(),
        };
      });

      return {
        flights,
        total: data.response.length,
        query: { airport, bbox },
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch flight radar data',
      };
    }
  },
});
