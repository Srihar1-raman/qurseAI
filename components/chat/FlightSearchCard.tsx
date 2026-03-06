'use client';

import React from 'react';
import { Plane, ArrowRight, AlertTriangle, Package } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { getFlightStatusGradient, formatTime } from '@/lib/utils';

interface FlightData {
  flightNumber: string;
  airline: { iataCode: string; icaoCode: string; logoUrl: string | null };
  route: {
    origin: { code: string; icao: string };
    destination: { code: string; icao: string };
  };
  status: { code: string; display: string; color: string };
  times: {
    scheduled: { departure: string | null; arrival: string | null };
    estimated: { departure: string | null; arrival: string | null };
    actual: { departure: string | null; arrival: string | null };
  };
  duration: string | null;
  gate: { departure: string | null; arrival: string | null };
  terminal: { departure: string | null; arrival: string | null };
  baggage: string | null;
  aircraft: { icaoCode: string | null };
  delay: { minutes: number; departureMinutes: number; arrivalMinutes: number };
  codeshare: { airline: string; flightNumber: string; flightIata: string } | null;
}

interface FlightSearchCardProps {
  data: {
    flights: FlightData[];
    total: number;
    hasMore: boolean;
    query: { origin?: string; destination?: string; airline?: string };
  };
}

export function FlightSearchCard({ data }: FlightSearchCardProps) {
  const { flights, total, hasMore, query } = data;

  if (!flights || flights.length === 0) {
    return (
      <div className="flight-search-card">
        <div className="flight-search-empty">No flights found</div>
      </div>
    );
  }

  return (
    <div className="flight-search-card">
      <div className="flight-search-header">
        <div className="flight-search-header-left">
          <Plane className="flight-search-header-icon" />
          <div>
            <span className="flight-search-title">Flight Search</span>
            {query.origin && query.destination && (
              <span className="flight-search-route">
                {query.origin} → {query.destination}
              </span>
            )}
          </div>
        </div>
        <div className="flight-search-count">{total} flights</div>
      </div>

      <div className="flight-search-flights">
        {flights.map((flight, idx) => {
          const statusGradient = getFlightStatusGradient(flight.status.code);
          return (
            <div key={idx} className="flight-search-flight">
              <div className="flight-search-flight-main">
                <div className="flight-search-flight-header">
                  <div className="flight-search-flight-title">
                    <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-9 h-9" />
                    <span className="flight-search-flight-number">{flight.flightNumber}</span>
                  </div>
                  <div className="flight-search-flight-status" style={{ background: statusGradient }}>
                    <span>{flight.status.display}</span>
                  </div>
                  {flight.delay.minutes > 0 && (
                    <div className="flight-search-flight-delay">
                      <AlertTriangle className="flight-search-delay-icon" />
                      <span>+{flight.delay.minutes}m</span>
                    </div>
                  )}
                </div>

                <div className="flight-search-flight-route">
                  <div className="flight-search-flight-point">
                    <span className="flight-search-flight-code">{flight.route.origin.code}</span>
                  </div>
                  <ArrowRight className="flight-search-flight-arrow" />
                  <div className="flight-search-flight-point">
                    <span className="flight-search-flight-code">{flight.route.destination.code}</span>
                  </div>
                  {flight.duration && (
                    <span className="flight-search-flight-duration">{flight.duration}</span>
                  )}
                </div>

                <div className="flight-search-flight-details">
                  <div className="flight-search-flight-time">
                    <span className="flight-search-time-label">Dep</span>
                    <span className="flight-search-time-value">
                      {formatTime(flight.times.actual.departure || flight.times.estimated.departure || flight.times.scheduled.departure || '--:--')}
                    </span>
                  </div>
                  <div className="flight-search-flight-time">
                    <span className="flight-search-time-label">Arr</span>
                    <span className="flight-search-time-value">
                      {formatTime(flight.times.actual.arrival || flight.times.estimated.arrival || flight.times.scheduled.arrival || '--:--')}
                    </span>
                  </div>
                  <div className="flight-search-flight-info">
                    <span className="flight-search-info-label">Gate</span>
                    <span className="flight-search-info-value">{flight.gate.departure || flight.gate.arrival || '--'}</span>
                  </div>
                  <div className="flight-search-flight-info">
                    <span className="flight-search-info-label">Terminal</span>
                    <span className="flight-search-info-value">{flight.terminal.departure || flight.terminal.arrival || '--'}</span>
                  </div>
                </div>

                {flight.baggage && (
                  <div className="flight-search-flight-baggage">
                    <Package className="flight-search-baggage-icon" />
                    <span>Baggage: {flight.baggage}</span>
                  </div>
                )}

                {flight.codeshare && (
                  <div className="flight-search-flight-codeshare">
                    <span className="flight-search-codeshare-label">Codeshare:</span>
                    <span className="flight-search-codeshare-value">
                      {flight.codeshare.airline} {flight.codeshare.flightIata}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="flight-search-more">
          More flights available - narrow your search criteria
        </div>
      )}
    </div>
  );
}
