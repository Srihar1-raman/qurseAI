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

function WolframPodImage({ src, alt, fallback }: { src: string; alt: string; fallback?: string }) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return fallback ? (
      <div className="wolfram-card-plaintext">{fallback}</div>
    ) : null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="wolfram-card-image"
      onError={() => setFailed(true)}
    />
  );
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
            
            {pod.image ? (
              <div className="wolfram-card-image-container">
                <WolframPodImage
                  src={pod.image}
                  alt={pod.title}
                  fallback={pod.plaintext}
                />
              </div>
            ) : pod.plaintext ? (
              <div className="wolfram-card-plaintext">{pod.plaintext}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
