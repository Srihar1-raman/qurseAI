'use client';

import React from 'react';

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
        <span className="wolfram-card-title">Wolfram Alpha</span>
      </div>
      
      <div className="wolfram-card-results">
        {pods.map((pod, index) => (
          <div key={index} className="wolfram-card-pod">
            {pod.title && pod.title !== 'Input' && pod.title !== 'Input interpretation' && (
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
          </div>
        ))}
      </div>
    </div>
  );
}
