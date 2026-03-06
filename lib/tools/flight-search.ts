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

export const flightSearchTool = tool({
  description: 'Search for flights between airports within the next 10 hours. Use for queries like "flights from DEL to BLR", "Delhi to Bangalore flights", "departures from DEL"',
  inputSchema: z.object({
    origin: z.string().optional().describe('Origin airport IATA code (e.g., DEL, BLR)'),
    destination: z.string().optional().describe('Destination airport IATA code (e.g., DEL, BLR)'),
    airline: z.string().optional().describe('Airline IATA code to filter (e.g., 6E, AI, SG)'),
    limit: z.number().optional().default(20).describe('Number of flights to return (max 50 for free tier)'),
  }),
  execute: async ({ origin, destination, airline, limit = 20 }) => {
    try {
      const apiKey = process.env.AIRLABS_API_KEY;
      if (!apiKey) {
        throw new Error('AIRLABS_API_KEY is not configured');
      }

      if (!origin && !destination) {
        return {
          error: 'At least origin or destination airport code is required',
        };
      }

      const params = new URLSearchParams({ api_key: apiKey, limit: limit.toString() });
      if (origin) params.set('dep_iata', origin.toUpperCase());
      if (destination) params.set('arr_iata', destination.toUpperCase());
      if (airline) params.set('airline_iata', airline.toUpperCase());

      const response = await fetch(
        `https://airlabs.co/api/v9/schedules?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`AirLabs API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response || data.response.length === 0) {
        return {
          error: 'No flights found for the specified route',
        };
      }

      const flights = data.response.map((flight: any) => {
        const depTime = flight.dep_actual || flight.dep_estimated || flight.dep_time;
        const arrTime = flight.arr_actual || flight.arr_estimated || flight.arr_time;
        const duration = flight.duration;

        const formatTime = (time: string | null | undefined) => {
          if (!time) return null;
          const date = new Date(time);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });
        };

        const getLocalTime = (utcTime: string | null | undefined) => {
          if (!utcTime) return null;
          const date = new Date(utcTime);
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
          route: {
            origin: {
              code: flight.dep_iata,
              icao: flight.dep_icao,
              city: '',
              country: '',
            },
            destination: {
              code: flight.arr_iata,
              icao: flight.arr_icao,
              city: '',
              country: '',
            },
          },
          status: {
            code: flight.status,
            display: flight.status ? flight.status.charAt(0).toUpperCase() + flight.status.slice(1) : 'Unknown',
            color: getFlightStatusColor(flight.status),
          },
          times: {
            scheduled: {
              departure: getLocalTime(flight.dep_time_utc),
              arrival: getLocalTime(flight.arr_time_utc),
            },
            estimated: {
              departure: getLocalTime(flight.dep_estimated_utc),
              arrival: getLocalTime(flight.arr_estimated_utc),
            },
            actual: {
              departure: getLocalTime(flight.dep_actual_utc),
              arrival: getLocalTime(flight.arr_actual_utc),
            },
          },
          duration: duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : null,
          gate: {
            departure: flight.dep_gate || null,
            arrival: flight.arr_gate || null,
          },
          terminal: {
            departure: flight.dep_terminal || null,
            arrival: flight.arr_terminal || null,
          },
          baggage: flight.arr_baggage || null,
          aircraft: {
            icaoCode: flight.aircraft_icao || null,
          },
          delay: {
            minutes: flight.delayed || 0,
            departureMinutes: flight.dep_delayed || 0,
            arrivalMinutes: flight.arr_delayed || 0,
          },
          codeshare: flight.cs_airline_iata ? {
            airline: flight.cs_airline_iata,
            flightNumber: flight.cs_flight_number,
            flightIata: flight.cs_flight_iata,
          } : null,
        };
      });

      return {
        flights,
        total: data.response.length,
        hasMore: data.has_more || false,
        query: { origin, destination, airline },
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to search flights',
      };
    }
  },
});
