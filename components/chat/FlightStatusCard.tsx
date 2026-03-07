'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plane, MapPin, ArrowRight, AlertTriangle, Package, Timer } from 'lucide-react';
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
  live: { isLive: boolean; position: { lat: number | null; lng: number | null; alt: number | null; speed: number | null; direction: number | null } | null; eta: number | null; progress: number | null };
  delay: { minutes: number; departureMinutes: number; arrivalMinutes: number };
  codeshare: { airline: string; flightNumber: string; flightIata: string } | null;
  lastUpdate: string;
}

interface FlightStatusCardProps {
  data: FlightStatusData;
}

export function FlightStatusCard({ data }: FlightStatusCardProps) {
  if (!data.times) {
    return <div className="flight-status-card"><div className="flight-status-card-loading">Loading flight data...</div></div>;
  }

  return (
    <div className="flight-status-card">
      <div className="flight-status-card-map">
        <FlightMap 
          origin={data.route.origin} 
          destination={data.route.destination} 
          position={data.live.position}
          flightNumber={data.flightNumber}
        />
      </div>
      
      <div className="flight-status-card-info">
        <div className="flight-status-card-header">
          <AirlineLogo url={data.airline.logoUrl} iataCode={data.airline.iataCode} name={data.airline.name} className="flight-status-card-logo" />
          <div className="flight-status-card-meta">
            <span className="flight-status-card-number">{data.flightNumber}</span>
            <span className="flight-status-card-airline">{data.airline.name}</span>
          </div>
        </div>

        <div className="flight-status-card-route">
          <div className="flight-status-card-point">
            <span className="flight-status-card-code">{data.route.origin.code}</span>
            <span className="flight-status-card-city">{data.route.origin.city}</span>
            <span className="flight-status-card-time">{formatTime(data.times.local?.departure || '--:--')}</span>
          </div>
          
          <div className="flight-status-card-arrow">
            <ArrowRight className="flight-status-card-arrow-icon" />
            <span className="flight-status-card-duration">{data.duration || '--'}</span>
          </div>
          
          <div className="flight-status-card-point">
            <span className="flight-status-card-code">{data.route.destination.code}</span>
            <span className="flight-status-card-city">{data.route.destination.city}</span>
            <span className="flight-status-card-time">{formatTime(data.times.local?.arrival || '--:--')}</span>
          </div>
        </div>

        <div className="flight-status-card-details">
          <div className="flight-status-card-detail">
            <MapPin className="flight-status-card-detail-icon" />
            <span>Gate {data.gate.departure || '--'}</span>
          </div>
          <div className="flight-status-card-detail">
            <Package className="flight-status-card-detail-icon" />
            <span>Terminal {data.terminal.departure || '--'}</span>
          </div>
          <div className="flight-status-card-detail">
            <Timer className="flight-status-card-detail-icon" />
            <span>{data.aircraft.type || 'Aircraft'}</span>
          </div>
          {data.delay.minutes > 0 && (
            <div className="flight-status-card-detail delay">
              <AlertTriangle className="flight-status-card-detail-icon" />
              <span>+{data.delay.minutes}min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlightMap({ origin, destination, position, flightNumber }: {
  origin: FlightStatusData['route']['origin'];
  destination: FlightStatusData['route']['destination'];
  position: FlightStatusData['live']['position'];
  flightNumber: string;
}) {
  const [icons, setIcons] = useState<{planeIcon?: L.DivIcon; originIcon?: L.DivIcon; destIcon?: L.DivIcon}>({});

  const hasOriginCoords = origin.lat != null && origin.lng != null;
  const hasDestCoords = destination.lat != null && destination.lng != null;
  const hasLivePos = position?.lat != null && position?.lng != null;

  useEffect(() => {
    async function loadIcons() {
      const L = await import('leaflet');
      const planeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="color: #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;
      const originSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="7" font-weight="bold" fill="white">${origin.code}</text></svg>`;
      const destSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="7" font-weight="bold" fill="white">${destination.code}</text></svg>`;

      setIcons({
        planeIcon: L.divIcon({ html: planeSvg, className: 'plane-marker-icon', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] }),
        originIcon: L.divIcon({ html: originSvg, className: 'airport-marker-icon', iconSize: [24, 24], iconAnchor: [12, 12] }),
        destIcon: L.divIcon({ html: destSvg, className: 'airport-marker-icon', iconSize: [24, 24], iconAnchor: [12, 12] }),
      });
    }
    loadIcons();
  }, [origin.code, destination.code]);

  // Default center - show world view if no coords
  let center: [number, number] = [20, 0];
  const hasCoords = hasOriginCoords || hasDestCoords;
  
  if (hasOriginCoords && hasDestCoords) {
    center = [(origin.lat! + destination.lat!) / 2, (origin.lng! + destination.lng!) / 2];
  } else if (hasOriginCoords) {
    center = [origin.lat!, origin.lng!];
  } else if (hasDestCoords) {
    center = [destination.lat!, destination.lng!];
  }

  const routePositions: [number, number][] = [];
  if (hasOriginCoords) routePositions.push([origin.lat!, origin.lng!]);
  if (hasLivePos && hasOriginCoords && hasDestCoords) routePositions.push([position.lat!, position.lng!]);
  if (hasDestCoords) routePositions.push([destination.lat!, destination.lng!]);

  return (
    <MapContainer 
      center={center} 
      zoom={hasCoords ? 4 : 1} 
      className="flight-radar-mini-map" 
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
      
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
          <Popup><div className="flight-radar-popup"><div className="flight-radar-popup-header"><span className="flight-radar-popup-number">{flightNumber}</span></div><div className="flight-radar-popup-route">{origin.code} → {destination.code}</div><div className="flight-radar-popup-stats"><span>{position.speed} km/h</span><span>{position.alt} ft</span></div></div></Popup>
        </Marker>
      )}

      {routePositions.length >= 2 && (
        <Polyline positions={routePositions} pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.8 }} />
      )}
    </MapContainer>
  );
}
