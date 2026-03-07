'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plane } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { useTheme } from '@/lib/theme-provider';
import { getAltitude } from '@/lib/utils';

interface FlightData {
  flightNumber: string;
  airline: { iataCode: string; icaoCode: string; logoUrl: string | null };
  route: { origin: { code: string; icao: string }; destination: { code: string; icao: string } };
  status: { code: string; display: string; color: string };
  position: {
    lat: number;
    lng: number;
    altitude: number;
    speed: number;
    direction: number;
    verticalSpeed: number;
  };
  aircraft: { hex: string; regNumber: string; icaoCode: string | null; flag: string };
  updated: string;
}

interface FlightRadarCardProps {
  data: {
    flights: FlightData[];
    total: number;
    query: { airport?: string; bbox?: string };
    lastUpdate: string;
  };
}

const createPlaneIcon = () => {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"><path d="M17.8 8.6L12 2.1 6.2 8.6c-.9.9-1.2 2.2-.8 3.4l1.6 4.6c.4 1.1 1.5 1.9 2.7 1.9h4.6c1.2 0 2.3-.8 2.7-1.9l1.6-4.6c.4-1.2.1-2.5-.8-3.4z"/><path d="M12 6.5v11"/></svg>`,
    className: 'plane-marker-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

function MapCenter({ flights }: { flights: FlightData[] }) {
  const map = useMap();
  useEffect(() => {
    if (flights.length > 0) {
      const bounds = L.latLngBounds(flights.map(f => [f.position.lat, f.position.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [flights, map]);
  return null;
}

export function FlightRadarCard({ data }: FlightRadarCardProps) {
  const { flights, total, query, lastUpdate } = data;
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  if (!flights || flights.length === 0) {
    return (
      <div className="flight-radar-mini">
        <span className="flight-radar-mini-empty">No live flights</span>
      </div>
    );
  }

  const centerLat = flights.reduce((sum, f) => sum + f.position.lat, 0) / flights.length;
  const centerLng = flights.reduce((sum, f) => sum + f.position.lng, 0) / flights.length;

  return (
    <div className="flight-radar-mini">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={5} 
        className="flight-radar-mini-map"
        zoomControl={true}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; CARTO'
        />
        <MapCenter flights={flights} />
        
        {flights.map((flight, idx) => (
          <Marker
            key={idx}
            position={[flight.position.lat, flight.position.lng]}
            icon={createPlaneIcon()}
          >
            <Popup>
              <div className="flight-radar-mini-popup">
                <div className="flight-radar-mini-popup-header">
                  <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-8 h-8" />
                  <span className="flight-radar-mini-popup-flight">{flight.flightNumber}</span>
                </div>
                <div className="flight-radar-mini-popup-route">
                  {flight.route.origin.code} → {flight.route.destination.code}
                </div>
                <div className="flight-radar-mini-popup-stats">
                  <span>{flight.position.speed} km/h</span>
                  <span>{getAltitude(flight.position.altitude)}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
