'use client';

import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plane, Clock, MapPin, ArrowRight, AlertTriangle, Package, Timer } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { useTheme } from '@/lib/theme-provider';
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

const createOriginIcon = () => L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ef4444"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`,
  className: 'origin-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const createDestIcon = () => L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10" fill="#10b981" stroke="#10b981"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`,
  className: 'dest-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapBounds({ origin, destination }: { origin: { lat?: number; lng?: number }; destination: { lat?: number; lng?: number } }) {
  const map = useMap();
  React.useEffect(() => {
    if (origin.lat && origin.lng && destination.lat && destination.lng) {
      const bounds = L.latLngBounds(
        [[origin.lat, origin.lng], [destination.lat, destination.lng]]
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [origin, destination, map]);
  return null;
}

export function FlightStatusCard({ data }: FlightStatusCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  if (!data.times) {
    return (
      <div className="flight-status-simple">
        <div className="flight-status-simple-loading">Loading flight data...</div>
      </div>
    );
  }

  const statusGradient = getFlightStatusGradient(data.status.code);
  
  const getStatusIcon = () => {
    if (data.status.isCancelled) return AlertTriangle;
    if (data.status.isDelayed) return Clock;
    if (data.status.isLanded) return Plane;
    return Plane;
  };

  const StatusIcon = getStatusIcon();
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const hasPosition = data.route.origin.lat && data.route.origin.lng && data.route.destination.lat && data.route.destination.lng;

  return (
    <div className="flight-status-simple">
      <div className="flight-status-simple-header">
        <AirlineLogo url={data.airline.logoUrl} name={data.airline.name} className="w-14 h-14" />
        <div className="flight-status-simple-info">
          <div className="flight-status-simple-top">
            <span className="flight-status-simple-number">{data.flightNumber}</span>
            <div className="flight-status-simple-badge" style={{ background: statusGradient }}>
              <StatusIcon className="flight-status-simple-badge-icon" />
              <span>{data.status.display}</span>
            </div>
          </div>
          <span className="flight-status-simple-airline">{data.airline.name}</span>
        </div>
      </div>

      <div className="flight-status-simple-route">
        <div className="flight-status-simple-point">
          <span className="flight-status-simple-code">{data.route.origin.code}</span>
          <span className="flight-status-simple-city">{data.route.origin.city}</span>
          <span className="flight-status-simple-time">{formatTime(data.times.local?.departure || '--:--')}</span>
        </div>
        
        <div className="flight-status-simple-arrow">
          <ArrowRight className="flight-status-simple-arrow-icon" />
          <span className="flight-status-simple-duration">{data.duration || '--'}</span>
        </div>
        
        <div className="flight-status-simple-point">
          <span className="flight-status-simple-code">{data.route.destination.code}</span>
          <span className="flight-status-simple-city">{data.route.destination.city}</span>
          <span className="flight-status-simple-time">{formatTime(data.times.local?.arrival || '--:--')}</span>
        </div>
      </div>

      {hasPosition && (
        <div className="flight-status-simple-map">
          <MapContainer
            zoom={6}
            className="flight-status-simple-map-container"
            scrollWheelZoom={false}
          >
            <TileLayer url={tileUrl} />
            <MapBounds origin={data.route.origin} destination={data.route.destination} />
            <Polyline
              positions={[
                [data.route.origin.lat!, data.route.origin.lng!],
                [data.route.destination.lat!, data.route.destination.lng!]
              ]}
              color="#8b5cf6"
              weight={2}
              opacity={0.6}
              dashArray="8, 8"
            />
            <Marker position={[data.route.origin.lat!, data.route.origin.lng!]} icon={createOriginIcon()}>
              <Popup>{data.route.origin.code}</Popup>
            </Marker>
            <Marker position={[data.route.destination.lat!, data.route.destination.lng!]} icon={createDestIcon()}>
              <Popup>{data.route.destination.code}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <div className="flight-status-simple-details">
        <div className="flight-status-simple-detail">
          <MapPin className="flight-status-simple-detail-icon" />
          <span>Gate {data.gate.departure || '--'}</span>
        </div>
        <div className="flight-status-simple-detail">
          <Package className="flight-status-simple-detail-icon" />
          <span>Terminal {data.terminal.departure || '--'}</span>
        </div>
        <div className="flight-status-simple-detail">
          <Timer className="flight-status-simple-detail-icon" />
          <span>{data.aircraft.type || 'Aircraft'}</span>
        </div>
        {data.delay.minutes > 0 && (
          <div className="flight-status-simple-detail delay">
            <AlertTriangle className="flight-status-simple-detail-icon" />
            <span>+{data.delay.minutes}min</span>
          </div>
        )}
      </div>
    </div>
  );
}
