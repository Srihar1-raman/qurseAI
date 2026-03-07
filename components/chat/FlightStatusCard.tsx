'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plane, MapPin, ArrowRight, Package, Clock } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { formatTime } from '@/lib/utils';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

interface FlightStatusData {
  flightNumber: string;
  airline: { name: string; iataCode: string; icaoCode: string; logoUrl: string | null };
  route: {
    origin: { code: string; icao: string; city: string; airport: string; country: string; lat?: number; lng?: number };
    destination: { code: string; icao: string; city: string; airport: string; country: string; lat?: number; lng?: number };
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
  aircraft: { type: string; code: string; icaoCode: string; manufacturer: string; built: number | null; age: number | null; engine: string; engineCount: string };
  gate: { departure: string; arrival: string };
  terminal: { departure: string; arrival: string };
  baggage: { arrival: string };
  live: { isLive: boolean; progress: number | null; position: { lat: number | null; lng: number | null; alt: number | null; speed: number | null; direction: number | null; eta: number | null } };
  delay: { minutes: number; departureMinutes: number; arrivalMinutes: number };
  codeshare: { airline: string; flightNumber: string; flightIata: string } | null;
  lastUpdate: string;
}

interface FlightStatusCardProps {
  data: FlightStatusData;
  resolvedTheme?: 'light' | 'dark';
}

function getStatusColor(code: string): string {
  const colors: Record<string, string> = {
    'active': '#22c55e',
    'landed': '#22c55e',
    'scheduled': '#3b82f6',
    'cancelled': '#ef4444',
    'incident': '#ef4444',
    'diverted': '#f59e0b',
  };
  return colors[code] || '#3b82f6';
}

function FlightMap({ origin, destination, position, flightNumber, progress, statusColor, resolvedTheme = 'light' }: {
  origin: FlightStatusData['route']['origin'];
  destination: FlightStatusData['route']['destination'];
  position: FlightStatusData['live']['position'];
  flightNumber: string;
  progress: number | null;
  statusColor: string;
  resolvedTheme?: 'light' | 'dark';
}) {
  const [icons, setIcons] = useState<{planeIcon?: L.DivIcon; originIcon?: L.DivIcon; destIcon?: L.DivIcon}>({});

  const hasOriginCoords = origin.lat != null && origin.lng != null;
  const hasDestCoords = destination.lat != null && destination.lng != null;
  const hasLivePos = position?.lat != null && position?.lng != null;
  const hasCoords = hasOriginCoords || hasDestCoords;

  useEffect(() => {
    async function loadIcons() {
      const L = await import('leaflet');
      const planeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style="color: #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5S10 2.67 10 3.5V9.5L2 14.5v-2l-8-2.5V19l-2 1.5V22l3.5-1.5V22l3.5-1.5L13 19v-5.5l8 2.5V19l-2 1.5V22l3.5-1.5L13 19v-5.5l8 2.5z"/></svg>';
      const originSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="white">' + origin.code + '</text></svg>';
      const destSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="white">' + destination.code + '</text></svg>';

      setIcons({
        planeIcon: L.divIcon({ html: planeSvg, className: 'plane-marker-icon', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] }),
        originIcon: L.divIcon({ html: originSvg, className: 'airport-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14] }),
        destIcon: L.divIcon({ html: destSvg, className: 'airport-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14] }),
      });
    }
    loadIcons();
  }, [origin.code, destination.code, statusColor]);

  let center: [number, number] = [20, 0];
  const routePositions: [number, number][] = [];

  if (hasOriginCoords && hasDestCoords) {
    center = [(origin.lat! + destination.lat!) / 2, (origin.lng! + destination.lng!) / 2];
    routePositions.push([origin.lat!, origin.lng!]);
    if (hasLivePos) routePositions.push([position.lat!, position.lng!]);
    routePositions.push([destination.lat!, destination.lng!]);
  } else if (hasOriginCoords) {
    center = [origin.lat!, origin.lng!];
  } else if (hasDestCoords) {
    center = [destination.lat!, destination.lng!];
  }

  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <MapContainer 
      center={center} 
      zoom={hasCoords ? 4 : 1} 
      className={`flight-radar-mini-map ${isDark ? 'dark-theme' : 'light-theme'}`}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={tileUrl} attribution='&copy; CARTO' />
      
      {hasOriginCoords && icons.originIcon && (
        <Marker position={[origin.lat!, origin.lng!]} icon={icons.originIcon}>
          <Popup><div className="flight-radar-popup"><div className="flight-radar-popup-header"><span className="flight-radar-popup-number">{origin.code}</span></div><div className="flight-radar-popup-route">{origin.city}</div></div></Popup>
        </Marker>
      )}

      {hasDestCoords && icons.destIcon && (
        <Marker position={[destination.lat!, destination.lng!]} icon={icons.destIcon}>
          <Popup><div className="flight-radar-popup"><div className="flight-radar-popup-header"><span className="flight-radar-popup-number">{destination.code}</span></div><div className="flight-radar-popup-route">{destination.city}</div></div></Popup>
        </Marker>
      )}

      {hasLivePos && icons.planeIcon && (
        <Marker position={[position.lat!, position.lng!]} icon={icons.planeIcon}>
          <Popup><div className="flight-radar-popup"><div className="flight-radar-popup-header"><span className="flight-radar-popup-number">{flightNumber}</span></div><div className="flight-radar-popup-main"><span className="flight-radar-popup-route">{origin.code} → {destination.code}</span></div><div className="flight-radar-popup-stats"><span>{position.speed} km/h</span><span>{position.alt} ft</span></div></div></Popup>
        </Marker>
      )}

      {routePositions.length >= 2 && (
        <Polyline positions={routePositions} pathOptions={{ color: statusColor, weight: 3, opacity: 0.8 }} />
      )}
    </MapContainer>
  );
}

export function FlightStatusCard({ data, resolvedTheme = 'light' }: FlightStatusCardProps) {
  if (!data.times) {
    return <div className="flight-status-card"><div className="flight-status-card-loading">Loading flight data...</div></div>;
  }

  const statusColor = getStatusColor(data.status.code);

  const hasOriginCoords = data.route.origin.lat != null && data.route.origin.lng != null;
  const hasDestCoords = data.route.destination.lat != null && data.route.destination.lng != null;
  const hasLivePos = data.live.position?.lat != null && data.live.position?.lng != null;
  const hasCoords = hasOriginCoords || hasDestCoords;

  return (
    <div className="flight-status-card">
      <div className="flight-status-card-map">
        <FlightMap 
          origin={data.route.origin}
          destination={data.route.destination}
          position={data.live.position}
          flightNumber={data.flightNumber}
          progress={data.live.progress}
          statusColor={statusColor}
          resolvedTheme={resolvedTheme}
        />
      </div>
      
      <div className="flight-status-card-info">
        <div className="flight-status-card-header">
          <div className="flight-status-card-header-left">
            <div className="flight-status-card-title">
              <span className="flight-status-card-airline">{data.airline.name}</span>
              <span className="flight-status-card-number">{data.flightNumber}</span>
            </div>
            <span className="flight-status-card-aircraft">{data.aircraft.type}</span>
          </div>
          <AirlineLogo url={data.airline.logoUrl} iataCode={data.airline.iataCode} name={data.airline.name} className="flight-status-card-logo" />
        </div>

        <div className="flight-status-card-route">
          <div className="flight-status-card-point origin">
            <span className="flight-status-card-code">{data.route.origin.code}</span>
            <span className="flight-status-card-city">{data.route.origin.city}</span>
            <span className="flight-status-card-time">{formatTime(data.times.local?.departure || '--:--')}</span>
          </div>

          <div className="flight-status-card-arrow">
            <ArrowRight className="flight-status-card-arrow-icon" />
            <span className="flight-status-card-duration">{data.duration || '--'}</span>
          </div>

          <div className="flight-status-card-point destination">
            <span className="flight-status-card-code">{data.route.destination.code}</span>
            <span className="flight-status-card-city">{data.route.destination.city}</span>
            <span className="flight-status-card-time">{formatTime(data.times.local?.arrival || '--:--')}</span>
          </div>
        </div>

        <div className="flight-status-card-duration-label">{data.duration || '--'}</div>

        <div className="flight-status-card-details">
          <div className="flight-status-card-detail-item">
            <span className="flight-status-card-detail-label">
              <MapPin className="flight-status-card-detail-icon" /> Terminal
            </span>
            <span className="flight-status-card-detail-value">
              {data.terminal.departure || '-'} <ArrowRight className="flight-status-card-detail-arrow" /> {data.terminal.arrival || '-'}
            </span>
          </div>

          <div className="flight-status-card-detail-item">
            <span className="flight-status-card-detail-label">
              <MapPin className="flight-status-card-detail-icon" /> Gate
            </span>
            <span className="flight-status-card-detail-value">
              {data.gate.departure || '-'} <ArrowRight className="flight-status-card-detail-arrow" /> {data.gate.arrival || '-'}
            </span>
          </div>

          <div className="flight-status-card-detail-item">
            <span className="flight-status-card-detail-label">
              <Package className="flight-status-card-detail-icon" /> Baggage
            </span>
            <span className="flight-status-card-detail-value">{data.baggage.arrival || '-'}</span>
          </div>

          <div className="flight-status-card-detail-item">
            <span className="flight-status-card-detail-label">
              <Clock className="flight-status-card-detail-icon" /> Delay
            </span>
            <span className={`flight-status-card-detail-value ${data.delay.minutes > 0 ? 'delay' : ''}`}>
              {data.delay.minutes > 0 ? `${data.delay.minutes}m` : 'On Time'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
