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

export const flightStatusTool = tool({
  description: 'Track real-time flight status by flight number. Accepts flight IATA codes (3-4 alphanumeric, e.g., AI1234, 6E2341, DLH456) or full flight numbers.',
  inputSchema: z.object({
    flight: z.string().describe('Flight IATA code (3-4 alphanumeric, e.g., AI1234, 6E2341, DLH456) or full flight number'),
  }),
  execute: async ({ flight }) => {
    try {
      const apiKey = process.env.AIRLABS_API_KEY;
      if (!apiKey) {
        throw new Error('AIRLABS_API_KEY is not configured');
      }

      const normalizedFlight = flight.trim().toUpperCase();

      const response = await fetch(
        `https://airlabs.co/api/v9/flight?flight_iata=${normalizedFlight}&api_key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`AirLabs API error: ${response.status}`);
      }

      const data = await response.json();
      const flightData = data.response;

      if (!flightData || flightData.error) {
        return {
          error: `No flight information found for: ${flight}`,
        };
      }

      const depTime = flightData.dep_actual || flightData.dep_time;
      const arrTime = flightData.arr_actual || flightData.arr_time;
      const duration = flightData.duration;

      const durationStr = duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : 'Unknown';

      const formatTime = (time: string | null | undefined) => {
        if (!time) return 'Unknown';
        const date = new Date(time);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const getLocalTime = (utcTime: string | null | undefined) => {
        if (!utcTime) return 'Unknown';
        const date = new Date(utcTime);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      return {
        flightNumber: normalizedFlight,
        airline: {
          name: flightData.airline_name || 'Unknown Airline',
          iataCode: flightData.airline_iata || '',
          icaoCode: flightData.airline_icao || '',
          logoUrl: flightData.airline_iata ? `https://content.airlines.aero/airlines/${flightData.airline_iata.toLowerCase()}/logo_small.png` : null,
        },
        route: {
          origin: {
            code: flightData.dep_iata || '',
            icao: flightData.dep_icao || '',
            city: flightData.dep_city || '',
            airport: flightData.dep_name || '',
            country: flightData.dep_country || '',
          },
          destination: {
            code: flightData.arr_iata || '',
            icao: flightData.arr_icao || '',
            city: flightData.arr_city || '',
            airport: flightData.arr_name || '',
            country: flightData.arr_country || '',
          },
        },
        status: {
          code: flightData.status,
          display: flightData.status ? flightData.status.charAt(0).toUpperCase() + (flightData.status.slice(1) || '') : 'Unknown',
          color: getFlightStatusColor(flightData.status),
          isLanded: flightData.status === 'landed',
          isDelayed: !!flightData.delayed && flightData.delayed > 0,
          isCancelled: flightData.status === 'cancelled',
        },
        times: {
          scheduled: {
            departure: getLocalTime(flightData.dep_time_utc),
            arrival: getLocalTime(flightData.arr_time_utc),
          },
          estimated: flightData.dep_estimated || flightData.arr_estimated ? {
            departure: getLocalTime(flightData.dep_estimated_utc),
            arrival: getLocalTime(flightData.arr_estimated_utc),
          } : null,
          actual: flightData.dep_actual || flightData.arr_actual ? {
            departure: getLocalTime(flightData.dep_actual_utc),
            arrival: getLocalTime(flightData.arr_actual_utc),
          } : null,
          local: {
            departure: formatTime(flightData.dep_actual || flightData.dep_estimated || flightData.dep_time),
            arrival: formatTime(flightData.arr_actual || flightData.arr_estimated || flightData.arr_time),
          },
          utc: {
            departure: flightData.dep_time_utc ? new Date(flightData.dep_time_utc).toISOString().slice(11, 16) : null,
            arrival: flightData.arr_time_utc ? new Date(flightData.arr_time_utc).toISOString().slice(11, 16) : null,
          },
        },
        duration: durationStr,
        aircraft: {
          type: flightData.model || flightData.aircraft_icao || 'Unknown',
          code: flightData.reg_number || '',
          icaoCode: flightData.aircraft_icao || '',
          manufacturer: flightData.manufacturer || '',
          built: flightData.built || null,
          age: flightData.age || null,
          engine: flightData.engine || '',
          engineCount: flightData.engine_count || '',
        },
        gate: {
          departure: flightData.dep_gate || 'Unknown',
          arrival: flightData.arr_gate || 'Unknown',
        },
        terminal: {
          departure: flightData.dep_terminal || 'Unknown',
          arrival: flightData.arr_terminal || 'Unknown',
        },
        baggage: {
          arrival: flightData.arr_baggage || 'Unknown',
        },
        live: {
          isLive: flightData.status === 'en-route' || flightData.status === 'active',
          position: flightData.status === 'en-route' || flightData.status === 'active' ? {
            lat: flightData.lat || null,
            lng: flightData.lng || null,
            alt: flightData.alt || null,
            speed: flightData.speed || null,
            direction: flightData.dir || null,
          } : null,
          eta: flightData.eta || null,
          progress: flightData.percent || null,
        },
        delay: {
          minutes: flightData.delayed || 0,
          departureMinutes: flightData.dep_delayed || 0,
          arrivalMinutes: flightData.arr_delayed || 0,
        },
        codeshare: flightData.cs_airline_iata ? {
          airline: flightData.cs_airline_iata,
          flightNumber: flightData.cs_flight_number,
          flightIata: flightData.cs_flight_iata,
        } : null,
        lastUpdate: new Date(flightData.updated * 1000).toISOString(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch flight status',
      };
    }
  },
});
