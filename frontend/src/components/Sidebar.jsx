import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  FileCode2,
  GitCompare,
  FileText,
  FlaskConical,
  Settings as SettingsIcon,
  ShieldCheck,
  Radar
} from 'lucide-react';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Infrastructure', path: '/infrastructure', icon: Server },
  { name: 'Configuration Baselines', path: '/baselines', icon: FileCode2 },
  { name: 'Drift Detection', path: '/drift', icon: GitCompare },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Test Scenarios', path: '/test-scenarios', icon: FlaskConical },
  { name: 'Settings', path: '/settings', icon: SettingsIcon },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`app-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon-box">
          <Radar size={22} />
        </div>
        <div className="brand-text">
          <h1>DriftGuard</h1>
          <span>Configuration Audit</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
              end={item.path === '/'}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-badge" title="DriftGuard is strictly read-only and never modifies infrastructure.">
          <ShieldCheck size={16} color="#16a34a" />
          <span>Read-Only Policy Enforced</span>
        </div>
      </div>
    </aside>
  );
}
