/**
 * Conversation Page Skeleton Component
 * Loading skeleton matching ConversationPageClient structure
 */

export function ConversationPageSkeleton() {
  return (
    <div className="homepage-container">
      {/* Conversation Content Skeleton - matches conversation-main-content structure */}
      <main className="conversation-main-content">
        <div className="conversation-container">
          <div className="conversation-thread">
            {/* Two message blobs: one user, one AI */}
            {/* User message */}
            <div className="user-message" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', maxWidth: '80%', flexDirection: 'row-reverse', marginLeft: 'auto' }}>
                <div className="skeleton-avatar" />
                <div className="skeleton-content" style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
                  <div className="skeleton-line" style={{ width: '50%', height: '16px' }} />
                </div>
              </div>
            </div>
            
            {/* AI message */}
            <div className="bot-message" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', maxWidth: '80%', flexDirection: 'row' }}>
                <div className="skeleton-avatar" />
                <div className="skeleton-content" style={{ flex: 1 }}>
                  <div className="skeleton-line" style={{ width: '85%', height: '16px', marginBottom: '8px' }} />
                  <div className="skeleton-line" style={{ width: '90%', height: '16px', marginBottom: '8px' }} />
                  <div className="skeleton-line" style={{ width: '75%', height: '16px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

