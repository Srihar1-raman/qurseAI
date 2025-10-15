/**
 * Loading Skeleton Component
 * Reusable skeleton loader for various UI elements
 */

interface LoadingSkeletonProps {
  variant?: 'message' | 'conversation' | 'text';
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
          <div key={i} className="conversation-skeleton">
            <div className="skeleton-line" style={{ width: '70%' }}></div>
            <div className="skeleton-line skeleton-small" style={{ width: '40%' }}></div>
          </div>
        ))}
      </>
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

