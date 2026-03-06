'use client';

import React from 'react';
import { Plane, Clock, MapPin, ArrowRight, AlertTriangle, Package, Activity, Timer, Navigation, Luggage, Info } from 'lucide-react';
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
      <div className="flight-status-header">
        <div className="flight-status-header-left">
          <AirlineLogo url={data.airline.logoUrl} name={data.airline.name} className="w-12 h-12" />
          <div className="flight-status-header-info">
            <div className="flight-status-header-main">
              <span className="flight-status-number">{data.flightNumber}</span>
              <div className="flight-status-badge" style={{ background: statusGradient }}>
                <StatusIcon className="flight-status-badge-icon" />
                <span>{data.status.display}</span>
              </div>
            </div>
            <span className="flight-status-airline">{data.airline.name}</span>
          </div>
        </div>
        
        {data.live?.isLive && (
          <div className="flight-status-live-pill">
            <span className="flight-status-live-dot" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      <div className="flight-status-route-display">
        <div className="flight-status-route-point">
          <span className="flight-status-route-code">{data.route.origin.code}</span>
          <span className="flight-status-route-city">{data.route.origin.city}</span>
          <span className="flight-status-route-time">{formatTime(data.times.local?.departure || '--:--')}</span>
        </div>
        
        <div className="flight-status-route-line">
          <div className="flight-status-route-progress" style={{ width: `${progress}%` }} />
          <div className="flight-status-route-plane-icon" style={{ left: `${progress}%` }}>
            <Plane />
          </div>
        </div>
        
        <div className="flight-status-route-point">
          <span className="flight-status-route-code">{data.route.destination.code}</span>
          <span className="flight-status-route-city">{data.route.destination.city}</span>
          <span className="flight-status-route-time">{formatTime(data.times.local?.arrival || '--:--')}</span>
        </div>
      </div>

      <div className="flight-status-stats">
        <div className="flight-status-stat">
          <Timer className="flight-status-stat-icon" />
          <div className="flight-status-stat-content">
            <span className="flight-status-stat-label">Duration</span>
            <span className="flight-status-stat-value">{data.duration || '--'}</span>
          </div>
        </div>
        
        <div className="flight-status-stat">
          <Navigation className="flight-status-stat-icon" />
          <div className="flight-status-stat-content">
            <span className="flight-status-stat-label">Progress</span>
            <span className="flight-status-stat-value">{progress}%</span>
          </div>
        </div>
        
        {data.live?.isLive && data.live.position?.speed && (
          <div className="flight-status-stat">
            <Activity className="flight-status-stat-icon" />
            <div className="flight-status-stat-content">
              <span className="flight-status-stat-label">Speed</span>
              <span className="flight-status-stat-value">{data.live.position.speed} km/h</span>
            </div>
          </div>
        )}
        
        {data.delay.minutes > 0 && (
          <div className="flight-status-stat delay">
            <AlertTriangle className="flight-status-stat-icon" />
            <div className="flight-status-stat-content">
              <span className="flight-status-stat-label">Delay</span>
              <span className="flight-status-stat-value">+{data.delay.minutes}m</span>
            </div>
          </div>
        )}
      </div>

      <div className="flight-status-details">
        <div className="flight-status-detail">
          <MapPin className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Gate</span>
            <span className="flight-status-detail-value">{data.gate.departure || '--'} → {data.gate.arrival || '--'}</span>
          </div>
        </div>
        
        <div className="flight-status-detail">
          <Package className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Terminal</span>
            <span className="flight-status-detail-value">{data.terminal.departure || '--'} → {data.terminal.arrival || '--'}</span>
          </div>
        </div>
        
        <div className="flight-status-detail">
          <Luggage className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Baggage</span>
            <span className="flight-status-detail-value">{data.baggage.arrival}</span>
          </div>
        </div>
      </div>

      {data.aircraft.type && (
        <div className="flight-status-aircraft">
          <Plane className="flight-status-aircraft-icon" />
          <span className="flight-status-aircraft-type">{data.aircraft.type}</span>
          {data.aircraft.manufacturer && (
            <span className="flight-status-aircraft-info">{data.aircraft.manufacturer}</span>
          )}
          {data.aircraft.code && (
            <span className="flight-status-aircraft-reg">{data.aircraft.code}</span>
          )}
        </div>
      )}

      {data.codeshare && (
        <div className="flight-status-codeshare">
          <Info className="flight-status-codeshare-icon" />
          <span className="flight-status-codeshare-text">Codeshare: {data.codeshare.airline} {data.codeshare.flightIata}</span>
        </div>
      )}

      <div className="flight-status-footer">
        Updated {new Date(data.lastUpdate).toLocaleString()}
      </div>
    </div>
  );
}
