'use client';

import React from 'react';
import { Plane, Clock, MapPin, ArrowRight, AlertTriangle, Package, Activity } from 'lucide-react';
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

  return (
    <div className="flight-status-card">
      <div className="flight-status-header">
        <div className="flight-status-title-row">
          <AirlineLogo url={data.airline.logoUrl} name={data.airline.name} className="w-12 h-12" />
          <div className="flight-status-title-text">
            <span className="flight-status-number">{data.flightNumber}</span>
            <span className="flight-status-airline">{data.airline.name}</span>
          </div>
        </div>
        <div className="flight-status-badge" style={{ background: statusGradient }}>
          <StatusIcon className="flight-status-badge-icon" />
          <span>{data.status.display}</span>
        </div>
      </div>

      <div className="flight-status-route">
        <div className="flight-status-route-point">
          <span className="flight-status-code">{data.route.origin.code}</span>
          <span className="flight-status-city">{data.route.origin.city}</span>
        </div>
        <div className="flight-status-route-arrow">
          <ArrowRight className="flight-status-arrow-icon" />
        </div>
        <div className="flight-status-route-point">
          <span className="flight-status-code">{data.route.destination.code}</span>
          <span className="flight-status-city">{data.route.destination.city}</span>
        </div>
      </div>

      <div className="flight-status-times-grid">
        <div className="flight-status-time-box">
          <span className="flight-status-time-label">Departure</span>
          <span className="flight-status-time-value">{formatTime(data.times.local?.departure || '--:--')}</span>
          {data.times.utc?.departure && (
            <span className="flight-status-time-utc">UTC {data.times.utc.departure}</span>
          )}
        </div>
        <div className="flight-status-time-box">
          <span className="flight-status-time-label">Arrival</span>
          <span className="flight-status-time-value">{formatTime(data.times.local?.arrival || '--:--')}</span>
          {data.times.utc?.arrival && (
            <span className="flight-status-time-utc">UTC {data.times.utc.arrival}</span>
          )}
        </div>
        <div className="flight-status-time-box">
          <span className="flight-status-time-label">Duration</span>
          <span className="flight-status-time-value">{data.duration || '--'}</span>
        </div>
      </div>

      {data.delay.minutes > 0 && (
        <div className="flight-status-delay">
          <AlertTriangle className="flight-status-delay-icon" />
          <span className="flight-status-delay-text">
            Delayed {data.delay.minutes} min
            {data.delay.departureMinutes > 0 && ` · Dep: +${data.delay.departureMinutes}m`}
            {data.delay.arrivalMinutes > 0 && ` · Arr: +${data.delay.arrivalMinutes}m`}
          </span>
        </div>
      )}

      {data.codeshare && (
        <div className="flight-status-codeshare">
          <span className="flight-status-codeshare-label">Codeshare:</span>
          <span className="flight-status-codeshare-value">{data.codeshare.airline} {data.codeshare.flightIata}</span>
        </div>
      )}

      <div className="flight-status-details-grid">
        <div className="flight-status-detail">
          <MapPin className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Gate</span>
            <span className="flight-status-detail-value">{data.gate.departure} → {data.gate.arrival}</span>
          </div>
        </div>
        <div className="flight-status-detail">
          <Package className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Terminal</span>
            <span className="flight-status-detail-value">{data.terminal.departure} → {data.terminal.arrival}</span>
          </div>
        </div>
        <div className="flight-status-detail">
          <Package className="flight-status-detail-icon" />
          <div className="flight-status-detail-content">
            <span className="flight-status-detail-label">Baggage</span>
            <span className="flight-status-detail-value">{data.baggage.arrival}</span>
          </div>
        </div>
      </div>

      {data.aircraft.type && (
        <div className="flight-status-aircraft">
          <Plane className="flight-status-aircraft-icon" />
          <div className="flight-status-aircraft-content">
            <span className="flight-status-aircraft-type">{data.aircraft.type}</span>
            {data.aircraft.code && (
              <span className="flight-status-aircraft-reg"> · {data.aircraft.code}</span>
            )}
            {data.aircraft.manufacturer && (
              <span className="flight-status-aircraft-info">
                {data.aircraft.manufacturer}
                {data.aircraft.built && ` · ${data.aircraft.built}`}
                {data.aircraft.age && ` · ${data.aircraft.age}y`}
              </span>
            )}
          </div>
        </div>
      )}

      {data.live?.isLive && (
        <div className="flight-status-live">
          <div className="flight-status-live-indicator" />
          <span className="flight-status-live-text">Live tracking</span>
          {data.live.progress !== null && (
            <span className="flight-status-live-progress">
              ({getProgressPercent()}% complete)
            </span>
          )}
          {data.live.position?.speed && (
            <span className="flight-status-live-speed">
              · {data.live.position.speed} km/h
            </span>
          )}
          {data.live.position?.alt && (
            <span className="flight-status-live-alt">
              · {getAltitude(data.live.position.alt)}
            </span>
          )}
        </div>
      )}

      {data.live?.position && !data.live.isLive && (
        <div className="flight-status-last-pos">
          <MapPin className="flight-status-last-pos-icon" />
          <span>
            Last position: {data.live.position.lat?.toFixed(4)}, {data.live.position.lng?.toFixed(4)}
            {data.live.position.alt && ` · ${getAltitude(data.live.position.alt)}`}
          </span>
        </div>
      )}

      {data.lastUpdate && (
        <div className="flight-status-footer">
          Last updated: {new Date(data.lastUpdate).toLocaleString()}
        </div>
      )}
    </div>
  );
}
