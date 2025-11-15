/**
 * Loading Skeleton Component
 * Reusable skeleton loader for various UI elements
 */

interface LoadingSkeletonProps {
  variant?: 'message' | 'conversation' | 'text' | 'history-search';
  count?: number;
}

export function LoadingSkeleton({ variant = 'text', count = 1 }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (variant === 'message') {
    return (
      <>
        {skeletons.map((i) => (
          <div key={i} className="message-skeleton">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-content">
              <div className="skeleton-line" style={{ width: '80%' }}></div>
              <div className="skeleton-line" style={{ width: '60%' }}></div>
              <div className="skeleton-line" style={{ width: '70%' }}></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === 'conversation') {
    return (
      <>
        {skeletons.map((i) => (
          <div key={i} className="history-tree-item">
            <div className="tree-item-content conversation-skeleton">
              <div className="tree-item-main">
            <div className="skeleton-line" style={{ width: '70%' }}></div>
            <div className="skeleton-line skeleton-small" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === 'history-search') {
    const skeletonBlobStyle = {
      background: 'linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-border-hover) 50%, var(--color-bg-secondary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      borderRadius: '6px',
    };

    return (
      <div className="history-search-container">
        <div className="history-search-input-wrapper">
          {/* Search input skeleton */}
          <div 
            style={{
              ...skeletonBlobStyle,
              width: '100%',
              height: '32px',
            }} 
          />
        </div>
        {/* Clear button skeleton */}
        <div 
          style={{
            ...skeletonBlobStyle,
            width: '80px',
            height: '32px',
            flexShrink: 0,
          }} 
        />
      </div>
    );
  }

  return (
    <>
      {skeletons.map((i) => (
        <div key={i} className="skeleton-line" style={{ marginBottom: '8px' }}></div>
      ))}
    </>
  );
}

