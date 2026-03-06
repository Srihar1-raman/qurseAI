'use client';

import React from 'react';
import { Plane, Clock, MapPin, ArrowRight, AlertTriangle, Package, Activity, Timer, Navigation, Luggage } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { getFlightStatusGradient, getAltitude, formatTime } from '@/lib/utils';

interface FlightStatusData {
  flightNumber: string;
  airline: {
    name: string;
    iataCode: string;
    icaoCode: string;
    logoUrl: string | null;
  };
  route: {
    origin: { code: string; icao: string; city: string; airport: string; country: string };
    destination: { code: string; icao: string; city: string; airport: string; country: string };
  };
  status: { code: string; display: string; color: string; isLanded: boolean; isDelayed: boolean; isCancelled: boolean };
  times: {
    scheduled: { departure: string | null; arrival: string | null };
    estimated: { departure: string | null; arrival: string | null } | null;
    actual: { departure: string | null; arrival: string | null } | null;
    local: { departure: string | null; arrival: string | null };
    utc: { departure: string | null; arrival: string | null };
  } | null;
  duration: string | null;
  aircraft: {
    type: string;
    code: string;
    icaoCode: string;
    manufacturer: string;
    built: number | null;
    age: number | null;
    engine: string;
    engineCount: string;
  };
  gate: { departure: string; arrival: string };
  terminal: { departure: string; arrival: string };
  baggage: { arrival: string };
  live: {
    isLive: boolean;
    position: { lat: number | null; lng: number | null; alt: number | null; speed: number | null; direction: number | null } | null;
    eta: number | null;
    progress: number | null;
  };
  delay: { minutes: number; departureMinutes: number; arrivalMinutes: number };
  codeshare: { airline: string; flightNumber: string; flightIata: string } | null;
  lastUpdate: string;
}

interface FlightStatusCardProps {
  data: FlightStatusData;
}

export function FlightStatusCard({ data }: FlightStatusCardProps) {
  if (!data.times) {
    return (
      <div className="flight-status-card">
        <div className="flight-status-loading">Loading flight data...</div>
      </div>
    );
  }

  const statusGradient = getFlightStatusGradient(data.status.code);
  
  const getStatusIcon = () => {
    if (data.status.isCancelled) return AlertTriangle;
    if (data.status.isDelayed) return Clock;
    if (data.status.isLanded) return Plane;
    return Activity;
  };

  const StatusIcon = getStatusIcon();

  const getProgressPercent = () => {
    if (data.live?.progress !== null && data.live.progress !== undefined) {
      return Math.round(data.live.progress);
    }
    if (!data.times?.actual?.departure || !data.times?.actual?.arrival) return 0;
    const depTime = new Date(data.times.actual.departure!);
    const arrTime = new Date(data.times.actual.arrival!);
    const total = arrTime.getTime() - depTime.getTime();
    const elapsed = Date.now() - depTime.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const progress = getProgressPercent();

  return (
    <div className="flight-status-card">
      <div className="flight-status-hero">
        <div className="flight-status-hero-left">
          <div className="flight-status-hero-airline">
            <AirlineLogo url={data.airline.logoUrl} name={data.airline.name} className="w-14 h-14" />
            <div className="flight-status-hero-info">
              <span className="flight-status-hero-flight">{data.flightNumber}</span>
              <span className="flight-status-hero-airline-name">{data.airline.name}</span>
            </div>
          </div>
          <div className="flight-status-hero-badge" style={{ background: statusGradient }}>
            <StatusIcon className="flight-status-hero-badge-icon" />
            <span>{data.status.display}</span>
          </div>
        </div>
        
        {data.live?.isLive && (
          <div className="flight-status-hero-live">
            <div className="flight-status-live-dot" />
            <span>LIVE</span>
            {data.live.position?.speed && (
              <span className="flight-status-hero-live-speed">{data.live.position.speed} km/h</span>
            )}
            {data.live.position?.alt && (
              <span className="flight-status-hero-live-alt">{getAltitude(data.live.position.alt)}</span>
            )}
          </div>
        )}
      </div>

      <div className="flight-status-path">
        <div className="flight-status-path-origin">
          <span className="flight-status-path-code">{data.route.origin.code}</span>
          <span className="flight-status-path-city">{data.route.origin.city}</span>
          <span className="flight-status-path-time">
            {formatTime(data.times.local?.departure || '--:--')}
          </span>
          <span className="flight-status-path-label">Departure</span>
        </div>
        
        <div className="flight-status-path-line">
          <div className="flight-status-path-progress" style={{ width: `${progress}%` }} />
          <div 
            className="flight-status-path-plane" 
            style={{ left: `${progress}%` }}
          >
            <Plane className="flight-status-path-plane-icon" />
          </div>
        </div>
        
        <div className="flight-status-path-destination">
          <span className="flight-status-path-code">{data.route.destination.code}</span>
          <span className="flight-status-path-city">{data.route.destination.city}</span>
          <span className="flight-status-path-time">
            {formatTime(data.times.local?.arrival || '--:--')}
          </span>
          <span className="flight-status-path-label">Arrival</span>
        </div>
      </div>

      <div className="flight-status-quick-stats">
        <div className="flight-status-quick-stat">
          <Timer className="flight-status-quick-stat-icon" />
          <div className="flight-status-quick-stat-content">
            <span className="flight-status-quick-stat-label">Duration</span>
            <span className="flight-status-quick-stat-value">{data.duration || '--'}</span>
          </div>
        </div>
        
        {data.delay.minutes > 0 && (
          <div className="flight-status-quick-stat delay">
            <AlertTriangle className="flight-status-quick-stat-icon" />
            <div className="flight-status-quick-stat-content">
              <span className="flight-status-quick-stat-label">Delay</span>
              <span className="flight-status-quick-stat-value">+{data.delay.minutes} min</span>
            </div>
          </div>
        )}
        
        {data.live?.isLive && data.live.progress !== null && (
          <div className="flight-status-quick-stat">
            <Navigation className="flight-status-quick-stat-icon" />
            <div className="flight-status-quick-stat-content">
              <span className="flight-status-quick-stat-label">Progress</span>
              <span className="flight-status-quick-stat-value">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="flight-status-details-row">
        <div className="flight-status-detail-pill">
          <MapPin className="flight-status-detail-pill-icon" />
          <div className="flight-status-detail-pill-content">
            <span className="flight-status-detail-pill-label">Gate</span>
            <span className="flight-status-detail-pill-value">
              {data.gate.departure || '--'} → {data.gate.arrival || '--'}
            </span>
          </div>
        </div>
        
        <div className="flight-status-detail-pill">
          <Package className="flight-status-detail-pill-icon" />
          <div className="flight-status-detail-pill-content">
            <span className="flight-status-detail-pill-label">Terminal</span>
            <span className="flight-status-detail-pill-value">
              {data.terminal.departure || '--'} → {data.terminal.arrival || '--'}
            </span>
          </div>
        </div>
        
        <div className="flight-status-detail-pill">
          <Luggage className="flight-status-detail-pill-icon" />
          <div className="flight-status-detail-pill-content">
            <span className="flight-status-detail-pill-label">Baggage</span>
            <span className="flight-status-detail-pill-value">{data.baggage.arrival}</span>
          </div>
        </div>
      </div>

      {data.aircraft.type && (
        <div className="flight-status-aircraft-row">
          <Plane className="flight-status-aircraft-icon" />
          <span className="flight-status-aircraft-type">{data.aircraft.type}</span>
          {data.aircraft.manufacturer && (
            <span className="flight-status-aircraft-manufacturer">{data.aircraft.manufacturer}</span>
          )}
          {data.aircraft.code && (
            <span className="flight-status-aircraft-reg">{data.aircraft.code}</span>
          )}
        </div>
      )}

      {data.codeshare && (
        <div className="flight-status-codeshare-row">
          <span className="flight-status-codeshare-label">Codeshare:</span>
          <span className="flight-status-codeshare-value">{data.codeshare.airline} {data.codeshare.flightIata}</span>
        </div>
      )}

      <div className="flight-status-footer">
        <span>Updated {new Date(data.lastUpdate).toLocaleString()}</span>
      </div>
    </div>
  );
}
