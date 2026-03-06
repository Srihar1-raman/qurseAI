'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Plane, Database, Building2, TrendingUp, Wrench, Zap, Info, Activity } from 'lucide-react';
import { getAltitude } from '@/lib/utils';

interface AircraftData {
  hex: string;
  registration: string;
  icao: string | null;
  iata: string | null;
  model: string | null;
  manufacturer: string | null;
  type: string | null;
  category: string | null;
  engine: string | null;
  engineCount: string | null;
  built: number | null;
  age: number | null;
  msn: string | null;
  flag: string;
  latestPosition: {
    lat: number;
    lng: number;
    alt: number | null;
    speed: number | null;
    direction: number | null;
    lastSeen: string;
  } | null;
}

interface AirlineInfoCardProps {
  data: {
    airline: { iataCode: string; icaoCode: string; name: string };
    fleet: AircraftData[];
    fleetStats: {
      totalAircraft: number;
      averageAge: number | null;
      aircraftTypes: [string, number][];
      manufacturers: [string, number][];
    };
    total: number;
    hasMore: boolean;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function AirlineInfoCard({ data }: AirlineInfoCardProps) {
  const { airline, fleet, fleetStats, total, hasMore } = data;

  if (!fleet || fleet.length === 0) {
    return (
      <div className="airline-info-card">
        <div className="airline-info-empty">No fleet information found</div>
      </div>
    );
  }

  const chartData = fleetStats.aircraftTypes.map(([type, count]) => ({
    name: type,
    value: count,
  }));

  const getEngineIcon = (engine: string | null) => {
    if (!engine) return Plane;
    if (engine.toLowerCase().includes('jet')) return Zap;
    return Wrench;
  };

  return (
    <div className="airline-info-card">
      <div className="airline-info-header">
        <div className="airline-info-header-left">
          <Activity className="airline-info-header-icon" />
          <div>
            <span className="airline-info-name">{airline.name}</span>
            <span className="airline-info-codes">
              {airline.iataCode} / {airline.icaoCode}
            </span>
          </div>
        </div>
        <div className="airline-info-fleet-count">
          <span className="airline-info-fleet-value">{total}</span>
          <span className="airline-info-fleet-label">aircraft</span>
          {hasMore && <span className="airline-info-more">(+)</span>}
        </div>
      </div>

      <div className="airline-info-stats-grid">
        <div className="airline-info-stat-box">
          <span className="airline-info-stat-label">Total Aircraft</span>
          <span className="airline-info-stat-value">{fleetStats.totalAircraft}</span>
        </div>
        <div className="airline-info-stat-box">
          <span className="airline-info-stat-label">Average Age</span>
          <span className="airline-info-stat-value">
            {fleetStats.averageAge ? `${fleetStats.averageAge} years` : 'N/A'}
          </span>
        </div>
        <div className="airline-info-stat-box">
          <span className="airline-info-stat-label">Top Aircraft</span>
          <span className="airline-info-stat-value">
            {fleetStats.aircraftTypes[0]?.[0] || 'N/A'}
          </span>
        </div>
        <div className="airline-info-stat-box">
          <span className="airline-info-stat-label">Top Manufacturer</span>
          <span className="airline-info-stat-value">
            {fleetStats.manufacturers[0]?.[0] || 'N/A'}
          </span>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="airline-info-chart-container">
          <div className="airline-info-chart-header">
            <span className="airline-info-chart-title">Fleet by Aircraft Type</span>
          </div>
          <div className="airline-info-chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.value})`}
                  outerRadius={80}
                  fill="#3b82f6"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    color: '#f4f4f5',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    border: '1px solid #3f3f46',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="airline-info-fleet">
        {fleet.map((aircraft, idx) => {
          const EngineIcon = getEngineIcon(aircraft.engine);
          return (
            <div key={idx} className="airline-info-aircraft">
              <div className="airline-info-aircraft-header">
                <div className="airline-info-aircraft-title">
                  <span className="airline-info-reg-number">{aircraft.registration}</span>
                  <span className="airline-info-hex">({aircraft.hex})</span>
                </div>
                <span className="airline-info-country">{aircraft.flag}</span>
              </div>

              <div className="airline-info-aircraft-model">
                <span className="airline-info-model-name">{aircraft.model || 'Unknown'}</span>
                {aircraft.manufacturer && (
                  <span className="airline-info-model-manufacturer">{aircraft.manufacturer}</span>
                )}
              </div>

              <div className="airline-info-aircraft-specs">
                <div className="airline-info-spec">
                  <Building2 className="airline-info-spec-icon" />
                  <div className="airline-info-spec-content">
                    <span className="airline-info-spec-label">Built</span>
                    <span className="airline-info-spec-value">{aircraft.built || 'N/A'}</span>
                  </div>
                </div>
                <div className="airline-info-spec">
                  <TrendingUp className="airline-info-spec-icon" />
                  <div className="airline-info-spec-content">
                    <span className="airline-info-spec-label">Age</span>
                    <span className="airline-info-spec-value">
                      {aircraft.age ? `${aircraft.age}y` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="airline-info-spec">
                  <EngineIcon className="airline-info-spec-icon" />
                  <div className="airline-info-spec-content">
                    <span className="airline-info-spec-label">Engine</span>
                    <span className="airline-info-spec-value">
                      {aircraft.engineCount ? `${aircraft.engineCount}x ${aircraft.engine}` : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="airline-info-spec">
                  <Plane className="airline-info-spec-icon" />
                  <div className="airline-info-spec-content">
                    <span className="airline-info-spec-label">Type</span>
                    <span className="airline-info-spec-value">{aircraft.type || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {aircraft.latestPosition && (
                <div className="airline-info-last-seen">
                  <Info className="airline-info-last-seen-icon" />
                  <span className="airline-info-last-seen-text">
                    Last seen: {new Date(aircraft.latestPosition.lastSeen).toLocaleDateString()}
                  </span>
                  {aircraft.latestPosition.alt && (
                    <span className="airline-info-last-seen-alt">
                      · {getAltitude(aircraft.latestPosition.alt)}
                    </span>
                  )}
                  {aircraft.latestPosition.speed && (
                    <span className="airline-info-last-seen-speed">
                      · {aircraft.latestPosition.speed} km/h
                    </span>
                  )}
                </div>
              )}

              {aircraft.msn && (
                <div className="airline-info-msn">
                  <Database className="airline-info-msn-icon" />
                  <span className="airline-info-msn-text">MSN: {aircraft.msn}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="airline-info-more">
          More aircraft in fleet - use specific search to narrow results
        </div>
      )}
    </div>
  );
}
