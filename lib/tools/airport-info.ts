import { tool } from 'ai';
import { z } from 'zod';

function getFlightStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'scheduled' || statusLower === 'active') {
    return '#3b82f6';
  }
  if (statusLower === 'landed') {
    return '#10b981';
  }
  if (statusLower === 'delayed') {
    return '#f59e0b';
  }
  if (statusLower === 'cancelled' || statusLower === 'diverted') {
    return '#ef4444';
  }
  return '#6b7280';
}

export const airportInfoTool = tool({
  description: 'Get information about an airport including sample scheduled flights. Use for queries like "DEL airport", "Indira Gandhi Airport", "Blr airport info"',
  inputSchema: z.object({
    airport: z.string().describe('Airport IATA code (e.g., DEL, BLR, JFK)'),
    limit: z.number().optional().default(10).describe('Number of sample flights to show (max 50 for free tier)'),
  }),
  execute: async ({ airport, limit = 10 }) => {
    try {
      const apiKey = process.env.AIRLABS_API_KEY;
      if (!apiKey) {
        throw new Error('AIRLABS_API_KEY is not configured');
      }

      const params = new URLSearchParams({
        api_key: apiKey,
        dep_iata: airport.toUpperCase(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `https://airlabs.co/api/v9/schedules?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`AirLabs API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response || data.response.length === 0) {
        return {
          error: `No information found for airport: ${airport}`,
        };
      }

      const flights = data.response.slice(0, limit).map((flight: any) => {
        const duration = flight.duration;

        const formatTime = (time: string | null | undefined) => {
          if (!time) return null;
          const date = new Date(time);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        };

        return {
          flightNumber: flight.flight_iata || flight.flight_icao,
          airline: {
            iataCode: flight.airline_iata || '',
            icaoCode: flight.airline_icao || '',
            logoUrl: flight.airline_iata ? `https://content.airlines.aero/airlines/${flight.airline_iata.toLowerCase()}/logo_small.png` : null,
          },
          destination: {
            code: flight.arr_iata,
            icao: flight.arr_icao,
          },
          status: {
            code: flight.status,
            display: flight.status ? flight.status.charAt(0).toUpperCase() + flight.status.slice(1) : 'Unknown',
            color: getFlightStatusColor(flight.status),
          },
          times: {
            scheduled: {
              departure: formatTime(flight.dep_time),
            },
            estimated: {
              departure: formatTime(flight.dep_estimated),
            },
            actual: {
              departure: formatTime(flight.dep_actual),
            },
          },
          duration: duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : null,
          gate: flight.dep_gate || null,
          terminal: flight.dep_terminal || null,
          delay: flight.dep_delayed || 0,
        };
      });

      return {
        airport: {
          code: airport.toUpperCase(),
          name: flights[0]?.dep_city || airport.toUpperCase(),
        },
        flights,
        total: flights.length,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch airport information',
      };
    }
  },
});
