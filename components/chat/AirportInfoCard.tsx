'use client';

import React from 'react';
import { MapPin, ArrowRight, Calendar, AlertTriangle } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { getFlightStatusGradient, formatTime } from '@/lib/utils';

interface FlightData {
  flightNumber: string;
  airline: { iataCode: string; icaoCode: string; logoUrl: string | null };
  destination: { code: string; icao: string };
  status: { code: string; display: string; color: string };
  times: {
    scheduled: { departure: string | null };
    estimated: { departure: string | null };
    actual: { departure: string | null };
  };
  duration: string | null;
  gate: string | null;
  terminal: string | null;
  delay: number;
}

interface AirportInfoCardProps {
  data: {
    airport: { code: string; name: string };
    flights: FlightData[];
    total: number;
  };
}

export function AirportInfoCard({ data }: AirportInfoCardProps) {
  const { airport, flights, total } = data;

  if (!flights || flights.length === 0) {
    return (
      <div className="airport-info-card">
        <div className="airport-info-empty">No flights found for this airport</div>
      </div>
    );
  }

  return (
    <div className="airport-info-card">
      <div className="airport-info-header">
        <div className="airport-info-header-left">
          <MapPin className="airport-info-header-icon" />
          <div>
            <span className="airport-info-name">{airport.name} Airport</span>
            <span className="airport-info-code">({airport.code})</span>
          </div>
        </div>
        <div className="airport-info-stats">
          <span className="airport-info-stat-label">Departures</span>
          <span className="airport-info-stat-value">{total}</span>
        </div>
      </div>

      <div className="airport-info-flights">
        {flights.map((flight, idx) => {
          const statusGradient = getFlightStatusGradient(flight.status.code);
          return (
            <div key={idx} className="airport-info-flight">
              <div className="airport-info-flight-main">
                <div className="airport-info-flight-header">
                  <div className="airport-info-flight-title">
                    <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-8 h-8" />
                    <span className="airport-info-flight-number">{flight.flightNumber}</span>
                  </div>
                  <div className="airport-info-flight-status" style={{ background: statusGradient }}>
                    <span>{flight.status.display}</span>
                  </div>
                  {flight.delay > 0 && (
                    <div className="airport-info-flight-delay">
                      <AlertTriangle className="airport-info-delay-icon" />
                      <span className="airport-info-delay-badge">+{flight.delay}m</span>
                    </div>
                  )}
                </div>

                <div className="airport-info-flight-route">
                  <ArrowRight className="airport-info-route-arrow" />
                  <span className="airport-info-destination-code">{flight.destination.code}</span>
                  {flight.duration && (
                    <span className="airport-info-duration">{flight.duration}</span>
                  )}
                </div>

                <div className="airport-info-flight-details">
                  <div className="airport-info-detail-item">
                    <span className="airport-info-detail-label">Time</span>
                    <span className="airport-info-detail-value">
                      {formatTime(flight.times.actual.departure || flight.times.estimated.departure || flight.times.scheduled.departure || '--:--')}
                    </span>
                  </div>
                  <div className="airport-info-detail-item">
                    <span className="airport-info-detail-label">Gate</span>
                    <span className="airport-info-detail-value">{flight.gate || '--'}</span>
                  </div>
                  <div className="airport-info-detail-item">
                    <span className="airport-info-detail-label">Terminal</span>
                    <span className="airport-info-detail-value">{flight.terminal || '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="airport-info-footer">
        <div className="airport-info-footer-left">
          <Calendar className="airport-info-footer-icon" />
          <span>Showing next {total} departures</span>
        </div>
      </div>
    </div>
  );
}
