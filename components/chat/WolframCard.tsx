'use client';

import React from 'react';
import { Calculator } from 'lucide-react';

interface PodResult {
  title: string;
  plaintext?: string;
  image?: string;
}

interface WolframCardProps {
  query: string;
  pods: PodResult[];
}

export function WolframCard({ query, pods }: WolframCardProps) {
  return (
    <div className="wolfram-card">
      <div className="wolfram-card-header">
        <Calculator className="wolfram-card-icon" />
        <span className="wolfram-card-title">Wolfram Alpha</span>
      </div>
      
      <div className="wolfram-card-query">
        <span className="wolfram-card-query-label">Query:</span>
        <span className="wolfram-card-query-text">{query}</span>
      </div>

      <div className="wolfram-card-results">
        {pods.map((pod, index) => (
          <div key={index} className="wolfram-card-pod">
            {pod.title && pod.title !== 'Input' && (
              <div className="wolfram-card-pod-title">{pod.title}</div>
            )}
            
            {pod.image && (
              <div className="wolfram-card-image-container">
                <img 
                  src={pod.image} 
                  alt={pod.title} 
                  className="wolfram-card-image"
                />
              </div>
            )}
            
            {pod.plaintext && (
              <div className="wolfram-card-plaintext">
                {pod.plaintext}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
