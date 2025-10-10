'use client';

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearHistoryModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: ClearHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1003,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 8px 32px var(--color-shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: 'var(--color-text)'
        }}>
          Clear Chat History
        </h3>
        <p style={{ 
          margin: '0 0 20px 0', 
          color: 'var(--color-text-secondary)',
          lineHeight: '1.5'
        }}>
          This will permanently delete all your conversations. This action cannot be undone.
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
