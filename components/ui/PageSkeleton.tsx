/**
 * Generic Page Skeleton Component
 * Reusable skeleton loader for page-level loading states
 */

interface PageSkeletonProps {
  variant?: 'settings' | 'info' | 'generic';
}

export function PageSkeleton({ variant = 'generic' }: PageSkeletonProps) {
  return (
    <div className="page-skeleton-container">
      {/* Tabs Skeleton (for settings and info pages) */}
      {(variant === 'settings' || variant === 'info') && (
        <div className="page-skeleton-tabs">
          <div className="page-skeleton-tabs-inner">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="page-skeleton-tab" />
            ))}
          </div>
        </div>
      )}
      
      {/* Content Skeleton */}
      <div className="page-skeleton-content">
        {variant === 'settings' && (
          <>
            {/* Settings section skeleton - simplified, no individual item lines */}
            <div className="page-skeleton-section">
              <div className="skeleton-line" style={{ width: '200px', height: '24px', marginBottom: '24px' }} />
              <div className="skeleton-line" style={{ width: '100%', height: '200px', borderRadius: '8px' }} />
            </div>
          </>
        )}
        
        {variant === 'info' && (
          <>
            {/* Info section skeleton - simplified, no individual item lines */}
            <div className="page-skeleton-section">
              <div className="skeleton-line" style={{ width: '250px', height: '28px', marginBottom: '16px' }} />
              <div className="skeleton-line" style={{ width: '100%', height: '16px', marginBottom: '16px' }} />
              <div className="skeleton-line" style={{ width: '90%', height: '16px', marginBottom: '16px' }} />
              <div className="skeleton-line" style={{ width: '85%', height: '16px', marginBottom: '16px' }} />
              <div className="skeleton-line" style={{ width: '100%', height: '200px', borderRadius: '8px', marginTop: '24px' }} />
            </div>
          </>
        )}
        
        {variant === 'generic' && (
          <>
            {/* Generic content skeleton */}
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton-line" style={{ width: `${70 + i * 3}%`, marginBottom: '12px' }} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

