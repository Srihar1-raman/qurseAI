'use client';

export default function PaymentSection() {
  return (
    <div className="settings-section">
      <h2>Payment & Billing</h2>
      
      <div className="settings-group">
        <label className="settings-label">Current Plan</label>
        <div className="account-info">
          <div className="account-details">
            <h4>Free Plan</h4>
            <p>0 messages remaining this month</p>
          </div>
          <button className="settings-btn-primary">
            Upgrade Plan
          </button>
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-label">Payment Method</label>
        <div className="account-info">
          <div className="account-details">
            <h4>No payment method</h4>
            <p>Add a payment method to upgrade</p>
          </div>
          <button className="settings-btn-secondary">
            Add Payment Method
          </button>
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-label">Billing History</label>
        <p className="settings-description">No billing history available</p>
      </div>
    </div>
  );
}


