'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plane } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { getAltitude } from '@/lib/utils';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

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
  resolvedTheme?: 'light' | 'dark';
}

export function FlightRadarCard({ data, resolvedTheme = 'light' }: FlightRadarCardProps) {
  const { flights, total } = data;
  const [planeIcon, setPlaneIcon] = useState<L.DivIcon | undefined>(undefined);

  useEffect(() => {
    async function loadIcon() {
      const L = await import('leaflet');
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" style="color: #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <path fill="currentColor" d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
        </svg>
      `;
      setPlaneIcon(L.divIcon({
        html: svg,
        className: 'plane-marker-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      }));
    }
    loadIcon();
  }, []);

  if (!flights || flights.length === 0) {
    return (
      <div className="flight-radar-mini">
        <span className="flight-radar-mini-empty">No live flights</span>
      </div>
    );
  }

  const validFlights = flights.filter(f => f.position && f.position.lat != null && f.position.lng != null);

  if (validFlights.length === 0) {
    return (
      <div className="flight-radar-mini">
        <span className="flight-radar-mini-empty">No live flights with valid positions</span>
      </div>
    );
  }

  const centerLat = validFlights.reduce((sum, f) => sum + f.position!.lat, 0) / validFlights.length;
  const centerLng = validFlights.reduce((sum, f) => sum + f.position!.lng, 0) / validFlights.length;
  
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="flight-radar-mini">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={5} 
        className={`flight-radar-mini-map ${isDark ? 'dark-theme' : 'light-theme'}`}
        scrollWheelZoom={false}
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; CARTO'
        />
        
        {validFlights.map((flight, idx) => (
          <Marker
            key={idx}
            position={[flight.position!.lat, flight.position!.lng]}
            icon={planeIcon as L.DivIcon}
          >
            <Popup>
              <div className={`flight-radar-popup ${isDark ? 'dark-mode' : 'light-mode'}`}>
                <div className="flight-radar-popup-header">
                  <AirlineLogo 
                    url={flight.airline.logoUrl} 
                    iataCode={flight.airline.iataCode}
                    name={flight.airline.iataCode}
                    className="flight-radar-mini-popup-logo" 
                  />
                  <span className="flight-radar-mini-popup-flight">{flight.flightNumber}</span>
                </div>
                <div className="flight-radar-popup-main">
                  <span className="flight-radar-mini-popup-route">{flight.route.origin.code} → {flight.route.destination.code}</span>
                </div>
                <div className="flight-radar-popup-stats">
                  <span>{flight.position!.speed} km/h</span>
                  <span>{flight.position.altitude} ft</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
