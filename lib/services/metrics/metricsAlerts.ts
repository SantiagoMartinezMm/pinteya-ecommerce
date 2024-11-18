import { create } from 'zustand';

interface MetricsStore {
  alerts: any[];
  fetchAlerts: () => Promise<void>;
}

export const useMetricsStore = create<MetricsStore>((set) => ({
  alerts: [],
  fetchAlerts: async () => {
    try {
      const response = await fetch('/api/metrics/alerts');
      const data = await response.json();
      set({ alerts: data });
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  },
}));