import { Metric } from '@/types/dashboard';
import { create } from 'zustand';

interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
}

interface AlertState {
  thresholds: AlertThreshold[];
  activeAlerts: Array<{
    id: string;
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
    timestamp: Date;
  }>;
}

interface AlertStore extends AlertState {
  setThreshold: (threshold: AlertThreshold) => void;
  removeThreshold: (metric: string) => void;
  checkMetrics: (metrics: Metric[]) => void;
  clearAlert: (id: string) => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  thresholds: [],
  activeAlerts: [],

  setThreshold: (threshold) => 
    set((state) => ({
      thresholds: [
        ...state.thresholds.filter(t => t.metric !== threshold.metric),
        threshold
      ]
    })),

  removeThreshold: (metric) =>
    set((state) => ({
      thresholds: state.thresholds.filter(t => t.metric !== metric)
    })),

  checkMetrics: (metrics) => {
    const { thresholds, activeAlerts } = get();
    
    const newAlerts = metrics.flatMap(metric => {
      const threshold = thresholds.find(t => t.metric === metric.name);
      if (!threshold) return [];

      if (metric.value >= threshold.critical) {
        return [{
          id: `${metric.name}-${Date.now()}`,
          metric: metric.name,
          value: metric.value,
          threshold: threshold.critical,
          severity: 'critical' as const,
          timestamp: new Date()
        }];
      }
      
      if (metric.value >= threshold.warning) {
        return [{
          id: `${metric.name}-${Date.now()}`,
          metric: metric.name,
          value: metric.value,
          threshold: threshold.warning,
          severity: 'warning' as const,
          timestamp: new Date()
        }];
      }

      return [];
    });

    set({ activeAlerts: [...activeAlerts, ...newAlerts] });
  },

  clearAlert: (id) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.filter(alert => alert.id !== id)
    }))
}));