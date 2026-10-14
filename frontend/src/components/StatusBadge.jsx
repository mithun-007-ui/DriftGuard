import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Info, 
  AlertOctagon, 
  Clock 
} from 'lucide-react';

export default function StatusBadge({ status, severity, text }) {
  const target = (status || severity || 'UNKNOWN').toUpperCase();

  const getStyleClass = () => {
    switch (target) {
      case 'MATCH':
      case 'COMPLIANT':
        return 'badge-match';
      case 'DRIFT':
      case 'CRITICAL':
        return 'badge-drift';
      case 'WARNING':
      case 'HIGH':
        return 'badge-warning';
      case 'MISSING':
        return 'badge-missing';
      case 'UNEXPECTED':
      case 'LOW':
        return 'badge-unexpected';
      case 'UNAVAILABLE':
      case 'MEDIUM':
        return 'badge-unavailable';
      case 'ERROR':
        return 'badge-error';
      case 'INFO':
        return 'badge-info';
      case 'REAL':
        return 'badge-real';
      case 'SIMULATED':
        return 'badge-simulated';
      default:
        return 'badge-info';
    }
  };

  const getIcon = () => {
    switch (target) {
      case 'MATCH':
      case 'COMPLIANT':
        return <CheckCircle2 size={13} />;
      case 'DRIFT':
      case 'CRITICAL':
      case 'ERROR':
        return <XCircle size={13} />;
      case 'WARNING':
      case 'HIGH':
      case 'MISSING':
        return <AlertTriangle size={13} />;
      case 'UNAVAILABLE':
        return <HelpCircle size={13} />;
      case 'UNEXPECTED':
      case 'LOW':
        return <AlertOctagon size={13} />;
      case 'SIMULATED':
        return <Clock size={13} />;
      default:
        return <Info size={13} />;
    }
  };

  return (
    <span className={`badge ${getStyleClass()}`}>
      {getIcon()}
      <span>{text || target}</span>
    </span>
  );
}
