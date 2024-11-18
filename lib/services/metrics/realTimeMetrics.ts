import { io, Socket } from 'socket.io-client';
import { Metric } from '@/types/dashboard';
import { create } from 'zustand';

interface MetricsState {
  socket: Socket | null;
  metrics: Metric[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

interface MetricsStore extends MetricsState {
  connect: () => void;
  disconnect: () => void;
  updateMetrics: (metrics: Metric[]) => void;
  setError: (error: string | null) => void;
}

export const useMetricsStore = create<MetricsStore>((set, get) => ({
  socket: null,
  metrics: [],
  isConnected: false,
  lastUpdate: null,
  error: null,

  connect: () => {
    try {
      const socket = io(process.env.NEXT_PUBLIC_METRICS_WS_URL || 'ws://localhost:3001');
      
      socket.on('connect', () => {
        set({ isConnected: true, error: null });
      });

      socket.on('metrics', (newMetrics: Metric[]) => {
        set({ 
          metrics: newMetrics,
          lastUpdate: new Date()
        });
      });

      socket.on('error', (error) => {
        set({ error: error.message });
      });

      set({ socket });
    } catch (error) {
      set({ error: 'Failed to connect to metrics service' });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  updateMetrics: (metrics) => set({ metrics }),
  setError: (error) => set({ error })
}));

interface DashboardStore {
  metrics: any;
  fetchMetrics: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  metrics: null,
  fetchMetrics: async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      set({ metrics: data });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  },
}));