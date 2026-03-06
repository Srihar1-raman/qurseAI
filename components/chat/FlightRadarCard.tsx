'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radar, ArrowRight, Navigation } from 'lucide-react';
import { AirlineLogo } from '@/components/ui/airline-logo';
import { getFlightStatusColor, getAltitude, getDirection } from '@/lib/utils';

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

const createPlaneIcon = (direction: number, color: string) => {
  const svg = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${direction}deg);">
      <path d="M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9L12 2Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'plane-icon',
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
      map.fitBounds(bounds, { padding: [50, 50] });
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
      <div className="flight-radar-header">
        <div className="flight-radar-header-left">
          <Radar className="flight-radar-header-icon" />
          <div>
            <span className="flight-radar-title">Live Flight Radar</span>
            {query.airport && (
              <span className="flight-radar-subtitle">Flights from {query.airport}</span>
            )}
            {query.bbox && (
              <span className="flight-radar-subtitle">Regional flights</span>
            )}
          </div>
        </div>
        <div className="flight-radar-live-indicator">
          <div className="flight-radar-pulse" />
          <span className="flight-radar-live-text">LIVE</span>
        </div>
        <div className="flight-radar-count">{total} flights</div>
      </div>

      <div className="flight-radar-map-container">
        <MapContainer 
          center={[centerLat, centerLng]} 
          zoom={5} 
          className="flight-radar-map"
          style={{ height: '320px', width: '100%', borderRadius: '0 0 16px 16px' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapCenter flights={flights} />
          {flights.map((flight, idx) => {
            const statusColor = getFlightStatusColor(flight.status.code);
            return (
              <Marker
                key={idx}
                position={[flight.position.lat, flight.position.lng]}
                icon={createPlaneIcon(flight.position.direction, statusColor)}
              >
                <Popup>
                  <div className="flight-radar-popup">
                    <div className="flight-radar-popup-header">
                      <AirlineLogo url={flight.airline.logoUrl} name={flight.airline.iataCode} className="w-6 h-6" />
                      <span className="flight-radar-popup-number">{flight.flightNumber}</span>
                    </div>
                    <div className="flight-radar-popup-route">
                      <span>{flight.route.origin.code}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{flight.route.destination.code}</span>
                    </div>
                    <div className="flight-radar-popup-stats">
                      <div>ALT: {getAltitude(flight.position.altitude)}</div>
                      <div>SPD: {flight.position.speed} km/h</div>
                      <div>DIR: {getDirection(flight.position.direction)}</div>
                      <div>TYPE: {flight.aircraft.icaoCode || 'N/A'}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flight-radar-footer">
        <div className="flight-radar-footer-left">
          <Navigation className="flight-radar-footer-icon" />
          <span>Real-time ADS-B data from AirLabs</span>
        </div>
        <span className="flight-radar-updated">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
