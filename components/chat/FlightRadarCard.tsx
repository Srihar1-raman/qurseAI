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
}

export function FlightRadarCard({ data }: FlightRadarCardProps) {
  const { flights, total } = data;
  const [planeIcon, setPlaneIcon] = useState<L.DivIcon | undefined>(undefined);

  useEffect(() => {
    async function loadIcon() {
      const L = await import('leaflet');
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="color: #10b981; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      `;
      setPlaneIcon(L.divIcon({
        html: svg,
        className: 'plane-marker-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
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

  return (
    <div className="flight-radar-mini">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={5} 
        className="flight-radar-mini-map"
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        
        {validFlights.map((flight, idx) => (
          <Marker
            key={idx}
            position={[flight.position!.lat, flight.position!.lng]}
            icon={planeIcon as L.DivIcon}
          >
            <Popup>
              <div className="flight-radar-mini-popup">
                <div className="flight-radar-mini-popup-header">
                  <AirlineLogo 
                    url={flight.airline.logoUrl} 
                    iataCode={flight.airline.iataCode}
                    name={flight.airline.iataCode}
                    className="flight-radar-mini-popup-logo" 
                  />
                  <span className="flight-radar-mini-popup-flight">{flight.flightNumber}</span>
                </div>
                <div className="flight-radar-mini-popup-main">
                  <span className="flight-radar-mini-popup-route">{flight.route.origin.code} → {flight.route.destination.code}</span>
                </div>
                <div className="flight-radar-mini-popup-stats">
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
