import React from 'react';

export default function MetricCard({ title, value, icon: Icon, iconBg, iconColor, subtitle, badge }) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-card-label">{title}</span>
        {Icon && (
          <div 
            className="metric-card-icon"
            style={{ backgroundColor: iconBg || '#eff6ff', color: iconColor || '#2563eb' }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <div className="metric-card-val">{value !== undefined ? value : '--'}</div>
        {badge}
      </div>

      {subtitle && <div className="metric-card-desc">{subtitle}</div>}
    </div>
  );
}
