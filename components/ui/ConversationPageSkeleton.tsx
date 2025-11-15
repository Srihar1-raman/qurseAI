/**
 * Conversation Page Skeleton Component
 * Loading skeleton matching ConversationPageClient structure
 */

export function ConversationPageSkeleton() {
  const skeletonBlobStyle = {
    width: '100%',
    height: '120px',
    borderRadius: '8px',
    background: 'linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-border-hover) 50%, var(--color-bg-secondary) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  };

  const aiBlobStyle = {
    ...skeletonBlobStyle,
    height: '150px',
  };

  return (
    <div className="homepage-container">
      {/* Conversation Content Skeleton - matches conversation-main-content structure */}
      <main className="conversation-main-content">
        <div className="conversation-container">
          <div className="conversation-thread">
            {/* Three message blobs: user, AI, user */}
            {/* User message 1 */}
            <div className="user-message" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '80%', width: '100%' }}>
                <div style={skeletonBlobStyle} />
              </div>
            </div>
            
            {/* AI message */}
            <div className="bot-message" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ maxWidth: '80%', width: '100%' }}>
                <div style={aiBlobStyle} />
              </div>
            </div>
            
            {/* User message 2 */}
            <div className="user-message" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ maxWidth: '80%', width: '100%' }}>
                <div style={skeletonBlobStyle} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Input area skeleton */}
        <div className="input-section">
          <div className="input-section-content">
            <div className="conversation-input-skeleton" />
          </div>
        </div>
      </main>
    </div>
  );
}

