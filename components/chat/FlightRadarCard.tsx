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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style="color: #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <path d="M21 0v-2.5l-8-5.5V3.5c0-1.1-.9-2-2-2S10 2.67 10 3.5V9.5L2 14.5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      `;
      setPlaneIcon(L.divIcon({
        html: svg,
        className: 'plane-marker-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
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
