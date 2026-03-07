'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radar, Navigation, Plane, Gauge, ArrowRight } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { useTheme } from '@/lib/theme-provider';
import { getAltitude, getDirection } from '@/lib/utils';

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

const createPlaneIcon = (direction: number) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${direction - 45}deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
      <path d="M17.8 8.6L12 2.1 6.2 8.6c-.9.9-1.2 2.2-.8 3.4l1.6 4.6c.4 1.1 1.5 1.9 2.7 1.9h4.6c1.2 0 2.3-.8 2.7-1.9l1.6-4.6c.4-1.2.1-2.5-.8-3.4z"/>
      <path d="M12 6.5v11"/>
      <path d="M8.5 12.5l-2.5-2.5"/>
      <path d="M15.5 12.5l2.5-2.5"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'plane-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

function MapCenter({ flights }: { flights: FlightData[] }) {
  const map = useMap();
  useEffect(() => {
    if (flights.length > 0) {
      const bounds = L.latLngBounds(flights.map(f => [f.position.lat, f.position.lng]));
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [flights, map]);
  return null;
}

export function FlightRadarCard({ data }: FlightRadarCardProps) {
  const { flights, total, query, lastUpdate } = data;
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';

  if (!flights || flights.length === 0) {
    return (
      <div className="flight-radar-card">
        <div className="flight-radar-empty">No live flights found</div>
      </div>
    );
  }

  const centerLat = flights.reduce((sum, f) => sum + f.position.lat, 0) / flights.length;
  const centerLng = flights.reduce((sum, f) => sum + f.position.lng, 0) / flights.length;

  return (
    <div className="flight-radar-card">
      <div className="flight-radar-hero">
        <div className="flight-radar-hero-left">
          <div className="flight-radar-hero-icon">
            <Radar />
          </div>
          <div className="flight-radar-hero-info">
            <span className="flight-radar-hero-title">Live Flight Radar</span>
            {query.airport && (
              <span className="flight-radar-hero-subtitle">Near {query.airport}</span>
            )}
            {query.bbox && (
              <span className="flight-radar-hero-subtitle">Regional Coverage</span>
            )}
          </div>
        </div>
        
        <div className="flight-radar-total">
          <Plane className="flight-radar-total-icon" />
          <span>{total} flights</span>
        </div>
      </div>

      <div className="flight-radar-map-wrapper">
        <MapContainer 
          center={[centerLat, centerLng]} 
          zoom={5} 
          className="flight-radar-map"
          zoomControl={true}
        >
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapCenter flights={flights} />
          
          {flights.map((flight, idx) => (
            <Marker
              key={idx}
              position={[flight.position.lat, flight.position.lng]}
              icon={createPlaneIcon(flight.position.direction)}
            >
              <Popup>
                <div className="flight-radar-popup">
                  <div className="flight-radar-popup-airline">
                    <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-10 h-10" />
                    <span className="flight-radar-popup-flightnum">{flight.flightNumber}</span>
                  </div>
                  
                  <div className="flight-radar-popup-route-row">
                    <span className="flight-radar-popup-code">{flight.route.origin.code}</span>
                    <ArrowRight className="flight-radar-popup-arrow" />
                    <span className="flight-radar-popup-code">{flight.route.destination.code}</span>
                  </div>
                  
                  <div className="flight-radar-popup-specs">
                    <div className="flight-radar-popup-spec">
                      <Gauge className="flight-radar-popup-spec-icon" />
                      <span className="flight-radar-popup-spec-value">{flight.position.speed}</span>
                      <span className="flight-radar-popup-spec-unit">km/h</span>
                    </div>
                    <div className="flight-radar-popup-spec">
                      <Plane className="flight-radar-popup-spec-icon" />
                      <span className="flight-radar-popup-spec-value">{getAltitude(flight.position.altitude)}</span>
                    </div>
                    <div className="flight-radar-popup-spec">
                      <span className="flight-radar-popup-spec-icon">↑</span>
                      <span className="flight-radar-popup-spec-value">{getDirection(flight.position.direction)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flight-radar-footer">
        <div className="flight-radar-footer-left">
          <Navigation className="flight-radar-footer-icon" />
          <span>Real-time ADS-B data</span>
        </div>
        <span className="flight-radar-updated">
          {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
