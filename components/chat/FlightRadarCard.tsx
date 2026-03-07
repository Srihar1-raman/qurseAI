'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radar, Navigation, Plane, Gauge, ArrowUpDown } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" style="transform: rotate(${direction - 90}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
      <circle cx="16" cy="16" r="14" fill="rgba(16, 185, 129, 0.9)" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
      <path d="M16 6 L22 18 L16 15 L10 18 Z" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'plane-marker-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createAirportIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ef4444"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'airport-marker-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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
              <span className="flight-radar-hero-subtitle">Regional coverage</span>
            )}
          </div>
        </div>
        
        <div className="flight-radar-hero-right">
          <div className="flight-radar-live-badge">
            <span className="flight-radar-live-dot" />
            <span>LIVE</span>
          </div>
          <div className="flight-radar-total">
            <Plane className="flight-radar-total-icon" />
            <span>{total}</span>
          </div>
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
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                  <div className="flight-radar-popup-header">
                    <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-8 h-8" />
                    <div className="flight-radar-popup-info">
                      <span className="flight-radar-popup-number">{flight.flightNumber}</span>
                      <span className="flight-radar-popup-airline">{flight.airline.iataCode}</span>
                    </div>
                  </div>
                  
                  <div className="flight-radar-popup-route">
                    <span className="flight-radar-popup-origin">{flight.route.origin.code}</span>
                    <ArrowUpDown className="flight-radar-popup-arrow" />
                    <span className="flight-radar-popup-dest">{flight.route.destination.code}</span>
                  </div>
                  
                  <div className="flight-radar-popup-stats">
                    <div className="flight-radar-popup-stat">
                      <Gauge className="flight-radar-popup-stat-icon" />
                      <span>{flight.position.speed} km/h</span>
                    </div>
                    <div className="flight-radar-popup-stat">
                      <ArrowUpDown className="flight-radar-popup-stat-icon" />
                      <span>{getAltitude(flight.position.altitude)}</span>
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
